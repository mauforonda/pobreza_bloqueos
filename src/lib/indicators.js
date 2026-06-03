const percentFormatter = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatPercent(value) {
  return `${percentFormatter.format(value)}%`;
}

export const CHOROPLETH_INDICATOR_LIST = [
  {
    key: "nbi_24",
    label: "Pobreza",
    description: "Porcentaje de la población que es pobre",
    source: "Necesidades Básicas Insatisfechas (CPV 2024)",
    tooltipSuffix: "de la población es pobre",
    colors: ["rgb(144, 179, 171)", "rgb(222, 230, 215)", "rgb(153, 134, 97)"],
    field: "nbi_24",
    formatValue: formatPercent,
  },
  {
    key: "pdc_pct",
    label: "Votación al PDC",
    description: "Porcentaje de votos totales en segunda vuelta electoral",
    source: "Órgano Electoral Plurinacional",
    tooltipSuffix: "de la población habilitada votó por el PDC",
    colors: ["#919191", "#bec8cc", "#51a2ab"],
    field: "pdc_pct",
    formatValue: formatPercent,
  },
  {
    key: "identidad_pueblo_pct",
    label: "Autoidentificación indígena",
    description: "Porcentaje de la población que se identifica como indígena",
    source: "Censo de Población y Vivienda 2024",
    tooltipSuffix: "de la población se identifica como indígena",
    colors: ["rgb(244, 247, 236)", "#D4D5BFFF", "rgb(142, 180, 123)"],
    field: "identidad_pueblo_pct",
    formatValue: formatPercent,
  },
  {
    key: "nacimiento_municipio_match_pct",
    label: "Baja movilidad",
    description: "Porcentaje de la población que vive en el mismo municipio donde nació",
    source: "Censo de Población y Vivienda 2024",
    tooltipSuffix: "de la población que vive en el mismo municipio donde nació",
    colors: ["rgb(192, 197, 173)", "rgb(220, 233, 214)", "rgb(161, 146, 210)"],
    field: "nacimiento_municipio_match_pct",
    formatValue: formatPercent,
  },
];

export const CHOROPLETH_INDICATORS = Object.fromEntries(
  CHOROPLETH_INDICATOR_LIST.map((indicator) => [indicator.key, indicator]),
);

export const CHOROPLETH_INDICATOR_ORDER = CHOROPLETH_INDICATOR_LIST.map(
  (indicator) => indicator.key,
);

export const DEFAULT_CHOROPLETH_INDICATOR_KEY = "identidad_pueblo_pct";

export function getChoroplethIndicator(key) {
  return (
    CHOROPLETH_INDICATORS[key] ??
    CHOROPLETH_INDICATORS[DEFAULT_CHOROPLETH_INDICATOR_KEY]
  );
}

export function buildChoroplethExpression(indicator, domain) {
  const min = domain?.min ?? 0;
  const max = domain?.max ?? 1;
  const middle = min + (max - min) / 2;

  return [
    "interpolate",
    ["linear"],
    ["to-number", ["get", indicator.field]],
    min,
    indicator.colors[0],
    middle,
    indicator.colors[1],
    max,
    indicator.colors[2],
  ];
}
