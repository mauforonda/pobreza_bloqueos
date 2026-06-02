#!/usr/bin/env python3

"""Construye un CSV de bloqueos recientes listo para el mapa.

La lógica replica la heurística del script de referencia:
- se conservan solo filas del sistema de transitabilidad vinculadas a conflictos;
- observaciones a menos de 500 m y separadas por menos de 24 horas se consolidan
  como un mismo bloqueo, de forma transitiva;
- se publica un CSV plano con `x`, `y`, `duracion` y `activo`.

El corte temporal se fija en el 1 de mayo de 2026 y se retienen los bloqueos
que se solapan con esa ventana.
"""

from __future__ import annotations

import heapq
import math
from io import StringIO
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
import requests

URL_FUENTE = (
    "https://raw.githubusercontent.com/mauforonda/transitabilidad-bolivia/"
    "refs/heads/master/data.csv"
)

TZ_BOLIVIA = ZoneInfo("America/La_Paz")
FECHA_CORTE = pd.Timestamp("2026-05-01", tz=TZ_BOLIVIA)
UMBRAL_DISTANCIA_METROS = 500.0
UMBRAL_BRECHA_TIEMPO = pd.Timedelta(hours=24)

# Celda angular conservadora para prefiltrar candidatos cercanos.
TAM_CELDA_GRADOS = UMBRAL_DISTANCIA_METROS / 100_000.0

RUTA_BASE = Path(__file__).resolve().parent
RUTA_SALIDA = RUTA_BASE / "static" / "bloqueos.csv"
COLUMNAS_FECHA = ["fecha_consulta", "fecha_reporte", "fecha_fin"]


def descargar_fuente(url: str) -> pd.DataFrame:
    """Descarga la tabla pública y normaliza sus columnas básicas."""

    response = requests.get(url, timeout=120)
    response.raise_for_status()

    tabla = pd.read_csv(StringIO(response.text), parse_dates=COLUMNAS_FECHA)
    for columna in COLUMNAS_FECHA:
        tabla[columna] = pd.to_datetime(tabla[columna], errors="coerce")
        tabla[columna] = tabla[columna].dt.tz_localize(TZ_BOLIVIA)

    tabla["estado"] = tabla["estado"].astype(str)
    tabla["latitud"] = pd.to_numeric(tabla["latitud"], errors="coerce")
    tabla["longitud"] = pd.to_numeric(tabla["longitud"], errors="coerce")
    return tabla


def filtrar_conflictos(tabla: pd.DataFrame) -> pd.DataFrame:
    """Conserva solo eventos vinculados a conflictos con fechas válidas."""

    filtrada = tabla.loc[
        tabla["estado"].str.contains("conflictos", case=False, na=False)
        & tabla["fecha_reporte"].notna(),
        ["fecha_reporte", "fecha_fin", "latitud", "longitud"],
    ].copy()
    return filtrada.sort_values(["fecha_reporte", "fecha_fin"]).reset_index(drop=True)


def distancia_haversine_metres(
    latitud_1: float,
    longitud_1: float,
    latitud_2: float,
    longitud_2: float,
) -> float:
    """Calcula la distancia geodésica aproximada entre dos coordenadas."""

    radio_tierra = 6_371_000.0
    latitud_1_rad = math.radians(latitud_1)
    latitud_2_rad = math.radians(latitud_2)
    delta_latitud = math.radians(latitud_2 - latitud_1)
    delta_longitud = math.radians(longitud_2 - longitud_1)

    a = (
        math.sin(delta_latitud / 2.0) ** 2
        + math.cos(latitud_1_rad)
        * math.cos(latitud_2_rad)
        * math.sin(delta_longitud / 2.0) ** 2
    )
    return 2.0 * radio_tierra * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def celda_espacial(latitud: float, longitud: float) -> tuple[int, int]:
    """Asigna una coordenada a una celda para prefiltrar vecinos."""

    return (
        math.floor(latitud / TAM_CELDA_GRADOS),
        math.floor(longitud / TAM_CELDA_GRADOS),
    )


def consolidar_bloqueos(tabla: pd.DataFrame, ahora: pd.Timestamp) -> pd.DataFrame:
    """Consolida observaciones en episodios usando cercanía espacial y temporal."""

    if tabla.empty:
        return tabla.copy()

    bloqueos = tabla.copy()
    bloqueos["fecha_fin_efectiva"] = bloqueos["fecha_fin"].fillna(ahora)
    bloqueos = bloqueos.sort_values(
        ["fecha_reporte", "fecha_fin_efectiva", "latitud", "longitud"],
        kind="stable",
    ).reset_index(drop=True)

    total = len(bloqueos)
    padres = list(range(total))
    rangos = [0] * total

    def encontrar(indice: int) -> int:
        while padres[indice] != indice:
            padres[indice] = padres[padres[indice]]
            indice = padres[indice]
        return indice

    def unir(indice_a: int, indice_b: int) -> None:
        raiz_a = encontrar(indice_a)
        raiz_b = encontrar(indice_b)
        if raiz_a == raiz_b:
            return
        if rangos[raiz_a] < rangos[raiz_b]:
            padres[raiz_a] = raiz_b
            return
        if rangos[raiz_a] > rangos[raiz_b]:
            padres[raiz_b] = raiz_a
            return
        padres[raiz_b] = raiz_a
        rangos[raiz_a] += 1

    celdas_activas: dict[tuple[int, int], set[int]] = {}
    heap_eventos_activos: list[tuple[pd.Timestamp, int]] = []

    for indice, fila in bloqueos.iterrows():
        fecha_reporte = fila["fecha_reporte"]
        latitud = fila["latitud"]
        longitud = fila["longitud"]
        umbral_inicio = fecha_reporte - UMBRAL_BRECHA_TIEMPO

        while heap_eventos_activos and heap_eventos_activos[0][0] < umbral_inicio:
            _, indice_expirado = heapq.heappop(heap_eventos_activos)
            latitud_expirada = bloqueos.at[indice_expirado, "latitud"]
            longitud_expirada = bloqueos.at[indice_expirado, "longitud"]
            if pd.isna(latitud_expirada) or pd.isna(longitud_expirada):
                continue
            celda_expirada = celda_espacial(latitud_expirada, longitud_expirada)
            activos = celdas_activas.get(celda_expirada)
            if activos is None:
                continue
            activos.discard(indice_expirado)
            if not activos:
                del celdas_activas[celda_expirada]

        if pd.notna(latitud) and pd.notna(longitud):
            celda = celda_espacial(latitud, longitud)
            vecinos: set[int] = set()
            for delta_latitud in (-1, 0, 1):
                for delta_longitud in (-1, 0, 1):
                    vecinos.update(
                        celdas_activas.get(
                            (celda[0] + delta_latitud, celda[1] + delta_longitud),
                            set(),
                        )
                    )

            for indice_vecino in vecinos:
                if (
                    distancia_haversine_metres(
                        latitud,
                        longitud,
                        bloqueos.at[indice_vecino, "latitud"],
                        bloqueos.at[indice_vecino, "longitud"],
                    )
                    <= UMBRAL_DISTANCIA_METROS
                ):
                    unir(indice, indice_vecino)

            celdas_activas.setdefault(celda, set()).add(indice)

        heapq.heappush(heap_eventos_activos, (fila["fecha_fin_efectiva"], indice))

    bloqueos["episodio_id"] = [encontrar(indice) for indice in range(total)]

    episodios = []
    for _, grupo in bloqueos.groupby("episodio_id", sort=False):
        grupo_ordenado = grupo.sort_values(
            ["fecha_reporte", "fecha_fin_efectiva"],
            kind="stable",
        )
        representativo = grupo_ordenado.iloc[-1]
        fecha_inicio = grupo_ordenado["fecha_reporte"].min()
        fecha_fin = (
            pd.NaT
            if grupo_ordenado["fecha_fin"].isna().any()
            else grupo_ordenado["fecha_fin"].max()
        )
        fecha_fin_efectiva = ahora if pd.isna(fecha_fin) else fecha_fin
        episodios.append(
            {
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "x": representativo["longitud"],
                "y": representativo["latitud"],
                "activo": bool(pd.isna(fecha_fin)),
                "duracion": (fecha_fin_efectiva - fecha_inicio) / pd.Timedelta(days=1),
            }
        )

    return (
        pd.DataFrame(episodios)
        .sort_values(
            ["activo", "fecha_inicio", "duracion", "y", "x"],
            ascending=[False, True, False, True, True],
            kind="stable",
        )
        .reset_index(drop=True)
    )


def filtrar_desde_corte(tabla: pd.DataFrame, corte: pd.Timestamp, ahora: pd.Timestamp) -> pd.DataFrame:
    """Retiene episodios que se solapan con la ventana a partir del corte."""

    mascara = (tabla["fecha_inicio"] <= ahora) & (
        tabla["fecha_fin"].isna() | (tabla["fecha_fin"] >= corte)
    )
    return tabla.loc[mascara, ["x", "y", "duracion", "activo"]].copy()


def main() -> None:
    """Genera `static/bloqueos.csv`."""

    ahora = pd.Timestamp.now(tz=TZ_BOLIVIA).floor("s")
    conflictos = filtrar_conflictos(descargar_fuente(URL_FUENTE))
    episodios = consolidar_bloqueos(conflictos, ahora)
    bloqueos = filtrar_desde_corte(episodios, FECHA_CORTE, ahora)

    RUTA_SALIDA.parent.mkdir(parents=True, exist_ok=True)
    bloqueos.to_csv(RUTA_SALIDA, index=False, float_format="%.5f")
    print(RUTA_SALIDA)


if __name__ == "__main__":
    main()
