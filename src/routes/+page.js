import { feature } from "topojson-client";
import { base } from "$app/paths";
import {
  CHOROPLETH_INDICATOR_ORDER,
  CHOROPLETH_INDICATORS,
} from "$lib/indicators";

export const ssr = false;
export const prerender = true;

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");

  return lines.filter(Boolean).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]]),
    );
  });
}

export async function load({ fetch }) {
  const [
    topologyResponse,
    dataResponse,
    namesResponse,
    bloqueosResponse,
    caminosResponse,
  ] = await Promise.all([
    fetch(`${base}/municipios.topo.json`),
    fetch(`${base}/data.csv`),
    fetch(`${base}/municipios.nombres.json`),
    fetch(`${base}/bloqueos.csv`),
    fetch(`${base}/caminos.json`),
  ]);

  const [topology, csvText, nombres, bloqueosText, caminosTopo] =
    await Promise.all([
      topologyResponse.json(),
      dataResponse.text(),
      namesResponse.json(),
      bloqueosResponse.text(),
      caminosResponse.json(),
    ]);

  const rowsByCodigo = new Map();
  const indicatorDefs = CHOROPLETH_INDICATOR_ORDER.map(
    (key) => CHOROPLETH_INDICATORS[key],
  ).filter(Boolean);
  const domains = Object.fromEntries(
    indicatorDefs.map((indicator) => [
      indicator.key,
      {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
      },
    ]),
  );

  for (const row of parseCsv(csvText)) {
    const codigo = String(row.codigo).padStart(6, "0");
    const stats = Object.fromEntries(
      indicatorDefs.map((indicator) => [
        indicator.key,
        roundToThreeDecimals(Number(row[indicator.field])),
      ]),
    );

    rowsByCodigo.set(codigo, stats);

    for (const indicator of indicatorDefs) {
      const value = stats[indicator.key];

      if (!Number.isFinite(value)) continue;

      domains[indicator.key].min = Math.min(domains[indicator.key].min, value);
      domains[indicator.key].max = Math.max(domains[indicator.key].max, value);
    }
  }

  const municipioFeatures = feature(
    topology,
    topology.objects.municipios_full,
  ).features;
  const features = [];

  for (const item of municipioFeatures) {
    const codigo = item.properties?.municipio;
    const stats = rowsByCodigo.get(codigo);

    if (!codigo || !stats) continue;

    const municipio = nombres[codigo] ?? codigo;

    features.push({
      type: "Feature",
      id: codigo,
      properties: {
        codigo,
        municipio,
        ...stats,
      },
      geometry: item.geometry,
    });
  }

  const normalizedDomains = Object.fromEntries(
    Object.entries(domains).map(([key, domain]) => [
      key,
      domain.min === Number.POSITIVE_INFINITY
        ? {min: 0, max: 1}
        : domain,
    ]),
  );

  return {
    choropleth: {
      type: "FeatureCollection",
      features,
    },
    bloqueos: parseBloqueosCsv(bloqueosText),
    caminos: topojsonToGeojson(caminosTopo),
    domains: normalizedDomains,
  };
}

function roundToThreeDecimals(value) {
  if (!Number.isFinite(value)) return Number.NaN;
  return Math.round(value * 1000) / 1000;
}

function parseBloqueosCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");

  return {
    type: "FeatureCollection",
    features: lines.filter(Boolean).map((line, index) => {
      const values = line.split(",");
      const row = Object.fromEntries(
        headers.map((header, headerIndex) => [header, values[headerIndex]]),
      );

      return {
        type: "Feature",
        id: index,
        properties: {
          duracion: Number(row.duracion),
          activo: row.activo === "True",
        },
        geometry: {
          type: "Point",
          coordinates: [Number(row.x), Number(row.y)],
        },
      };
    }),
  };
}

function topojsonToGeojson(topo) {
  const objectName = Object.keys(topo.objects ?? {})[0];
  const object = objectName ? topo.objects[objectName] : null;

  if (!object) {
    return { type: "FeatureCollection", features: [] };
  }

  return feature(topo, object);
}
