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
  const [topologyResponse, csvResponse, namesResponse, bloqueosResponse, caminosResponse] =
    await Promise.all([
      fetch(`${base}/municipios.topo.json`),
      fetch(`${base}/nbi.csv`),
      fetch(`${base}/municipios.nombres.json`),
      fetch(`${base}/bloqueos.csv`),
      fetch(`${base}/caminos.json`),
  ]);

  const [topology, csvText, nombres, bloqueosText, caminosTopo] = await Promise.all([
    topologyResponse.json(),
    csvResponse.text(),
    namesResponse.json(),
    bloqueosResponse.text(),
    caminosResponse.json(),
  ]);

  const rowsByCodigo = new Map(
    parseCsv(csvText).map((row) => [
      row.codigo,
      {
        nbi_12: Number(row.nbi_12),
        nbi_24: Number(row.nbi_24),
        poblacion: Number(row.poblacion)
      }
    ])
  );

  const municipioFeatures = feature(topology, topology.objects.municipios_full).features;
  const features = [];
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const item of municipioFeatures) {
    const codigo = item.properties?.municipio;
    const stats = rowsByCodigo.get(codigo);

    if (!codigo || !stats) continue;

    const municipio = nombres[codigo] ?? codigo;
    min = Math.min(min, stats.nbi_24);
    max = Math.max(max, stats.nbi_24);

    features.push({
      type: "Feature",
      id: codigo,
      properties: {
        codigo,
        municipio,
        nbi_24: stats.nbi_24
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
    domain: {min, max}
  };
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
