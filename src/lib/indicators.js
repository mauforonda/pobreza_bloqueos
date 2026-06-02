const percentFormatter = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatPercent(value) {
  return `${percentFormatter.format(value)}%`;
}

export const CHOROPLETH_INDICATORS = {
  nbi_24: {
    key: "nbi_24",
    label: "Pobreza",
    description: "Porcentaje de la población que es pobre",
    source: "Necesidades Básicas Insatisfechas (CPV 2024)",
    tooltipSuffix: "de la población es pobre",
    colors: ["#009474FF", "#F1F4EEFF", "#B0986CFF"],
    field: "nbi_24",
    formatValue: formatPercent,
  },
  pdc_pct: {
    key: "pdc_pct",
    label: "Votación al PDC",
    description: "Porcentaje de votos totales en segunda vuelta electoral",
    source: "Órgano Electoral Plurinacional",
    tooltipSuffix: "de la población habilitada votó por el PDC",
    colors: ["#9f9a95", "#d0ddde", "#1b7c85"],
    field: "pdc_pct",
    formatValue: formatPercent,
  },
};

export const CHOROPLETH_INDICATOR_ORDER = ["nbi_24", "pdc_pct"];

export function getChoroplethIndicator(key) {
  return CHOROPLETH_INDICATORS[key] ?? CHOROPLETH_INDICATORS.nbi_24;
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
