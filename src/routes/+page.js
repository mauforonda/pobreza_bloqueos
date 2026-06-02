import {feature} from "topojson-client";
import {base} from "$app/paths";

export const ssr = false;
export const prerender = true;

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");

  return lines
    .filter(Boolean)
    .map((line) => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
}

export async function load({fetch}) {
  const [topologyResponse, dataResponse, namesResponse, bloqueosResponse, caminosResponse] =
    await Promise.all([
      fetch(`${base}/municipios.topo.json`),
      fetch(`${base}/data.csv`),
      fetch(`${base}/municipios.nombres.json`),
      fetch(`${base}/bloqueos.csv`),
      fetch(`${base}/caminos.json`),
  ]);

  const [topology, csvText, nombres, bloqueosText, caminosTopo] = await Promise.all([
    topologyResponse.json(),
    dataResponse.text(),
    namesResponse.json(),
    bloqueosResponse.text(),
    caminosResponse.json(),
  ]);

  const rowsByCodigo = new Map();
  const domains = {
    nbi_24: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY},
    pdc_pct: {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY},
  };

  for (const row of parseCsv(csvText)) {
    const codigo = row.codigo;
    const stats = {
      nbi_24: roundToThreeDecimals(Number(row.nbi_24)),
      pdc_pct: roundToThreeDecimals(Number(row.pdc_pct)),
    };

    rowsByCodigo.set(codigo, stats);

    domains.nbi_24.min = Math.min(domains.nbi_24.min, stats.nbi_24);
    domains.nbi_24.max = Math.max(domains.nbi_24.max, stats.nbi_24);
    domains.pdc_pct.min = Math.min(domains.pdc_pct.min, stats.pdc_pct);
    domains.pdc_pct.max = Math.max(domains.pdc_pct.max, stats.pdc_pct);
  }

  const municipioFeatures = feature(topology, topology.objects.municipios_full).features;
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
        nbi_24: stats.nbi_24,
        pdc_pct: stats.pdc_pct
      },
      geometry: item.geometry
    });
  }

  return {
    choropleth: {
      type: "FeatureCollection",
      features
    },
    bloqueos: parseBloqueosCsv(bloqueosText),
    caminos: topojsonToGeojson(caminosTopo),
    domains
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
    features: lines
      .filter(Boolean)
      .map((line, index) => {
        const values = line.split(",");
        const row = Object.fromEntries(
          headers.map((header, headerIndex) => [header, values[headerIndex]])
        );

        return {
          type: "Feature",
          id: index,
          properties: {
            duracion: Number(row.duracion),
            activo: row.activo === "True"
          },
          geometry: {
            type: "Point",
            coordinates: [Number(row.x), Number(row.y)]
          }
        };
      })
  };
}

function topojsonToGeojson(topo) {
  const objectName = Object.keys(topo.objects ?? {})[0];
  const object = objectName ? topo.objects[objectName] : null;

  if (!object) {
    return {type: "FeatureCollection", features: []};
  }

  return feature(topo, object);
}
