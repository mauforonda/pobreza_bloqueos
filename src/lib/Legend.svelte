<script>
  import {onMount} from "svelte";

  export let domain;
  let collapsed = false;

  const colorRange = ["#009474FF", "#F1F4EEFF", "#B0986CFF"];
  const bloqueoBorderColor = "#3b3431";

  const percentFormatter = new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const durationDomainMax = 28;
  const durationMinRadius = 2.5;
  const durationMaxRadius = 9.5;

  function formatPercent(value) {
    return percentFormatter.format(value) + "%";
  }

  $: ticks = [
    domain.min,
    domain.min + (domain.max - domain.min) / 2,
    domain.max,
  ];

  $: circleLegend = [
    {label: "1 día de duración", value: 1},
    {label: "7 días", value: 7},
    {label: "28 días", value: 28},
  ];

  function durationScale(value) {
    return (
      durationMinRadius +
      (durationMaxRadius - durationMinRadius) *
        Math.sqrt(Math.max(0, Math.min(durationDomainMax, value)) / durationDomainMax)
    );
  }

  $: circleLegendLayout = circleLegend.map((item) => ({
    ...item,
    radius: durationScale(item.value),
  }));

  function toggleLegend() {
    collapsed = !collapsed;
  }

  onMount(() => {
    const syncViewport = () => {
      if (window.innerWidth > 720) {
        collapsed = false;
      }
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  });
</script>

<aside class:legend-panel--collapsed={collapsed} class="legend-panel" aria-label="Leyenda del mapa">
  <section class="legend-title">Pobreza y Bloqueos</section>
  <div class="legend-panel__body" id="legend-panel-body">
    <section class="legend-block">
      <div class="legend-block__section">Pobreza</div>
      <div class="legend-block__title">
        Porcentaje de la población que es pobre
      </div>
      <div class="legend-color">
        <svg viewBox="0 0 320 56" role="img" aria-label="Escala de pobreza">
          <defs>
            <linearGradient id="pobreza-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stop-color={colorRange[0]} />
              <stop offset="50%" stop-color={colorRange[1]} />
              <stop offset="100%" stop-color={colorRange[2]} />
            </linearGradient>
          </defs>
          <rect x="12" y="5" width="296" height="14" rx="3" fill="url(#pobreza-gradient)" />
          {#each ticks as tick, index}
            <g transform={`translate(${12 + (296 * index) / 2}, 0)`}>
              <line x1="0" y1="30" x2="0" y2="38" class="legend-tick" />
              <text x="0" y="40" text-anchor={index === 0 ? "start" : index === 2 ? "end" : "middle"}>
                {formatPercent(tick)}
              </text>
            </g>
          {/each}
        </svg>
      </div>
      <div class="legend-block__source">
        Necesidades Básicas Insatisfechas (CPV 2024)
      </div>
    </section>

    <div class="legend-block__separator" aria-hidden="true"></div>

    <section class="legend-block legend-block--bloqueos">
      <div class="legend-block__section">Bloqueos</div>
      <div class="legend-block__title">
        Puntos de bloqueo desde el 1 de mayo
      </div>
      <div class="legend-bloqueos">
        <div class="legend-circles">
          <svg viewBox="0 0 228 98" role="img" aria-label="Leyenda de duración de bloqueos">
            <g transform="translate(8, 6)">
              {#each circleLegendLayout as item, index}
                <circle
                  cx="24"
                  cy={18 + index * 18}
                  r={item.radius}
                  fill="rgba(242, 133, 93, 0.12)"
                  stroke={bloqueoBorderColor}
                  stroke-width="1"
                  opacity="0.95"
                />
                <line
                  x1={24 + item.radius}
                  x2="96"
                  y1={18 + index * 18}
                  y2={18 + index * 18}
                  stroke={bloqueoBorderColor}
                  stroke-dasharray="2,2"
                  opacity="0.65"
                />
                <text x="104" y={21 + index * 18}>{item.label}</text>
              {/each}
            </g>
          </svg>
        </div>
        <div class="legend-status">
          <div class="legend-status__item">
            <span class="legend-status__swatch legend-status__swatch--active"></span>
            <span>activo</span>
          </div>
          <div class="legend-status__item">
            <span class="legend-status__swatch legend-status__swatch--inactive"></span>
            <span>inactivo</span>
          </div>
        </div>
      </div>
      <div class="legend-block__source">
        Administradora Boliviana de Carreteras
      </div>
    </section>
  </div>
  <button
    class="legend-panel__toggle"
    type="button"
    aria-expanded={!collapsed}
    aria-controls="legend-panel-body"
    aria-label={collapsed ? "Expandir panel" : "Ocultar panel"}
    on:click={toggleLegend}
  >
    <span class="legend-panel__toggle-icon" aria-hidden="true"></span>
  </button>
</aside>

<style>
  .legend-panel {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 20;
    width: min(24rem, calc(100vw - 2rem));
    display: grid;
    gap: 0.75rem;
    padding: 0.85rem 0.95rem;
    border: 1px solid rgba(23, 23, 23, 0.08);
    border-radius: 0.1rem;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(10px);
    box-shadow: 0 16px 40px rgba(15, 15, 15, 0.18);
    --legend-text-size: 0.7rem;
  }

  .legend-panel__body {
    display: grid;
    gap: 0.75rem;
    max-height: min(60vh, 21rem);
    margin-top: 0.5rem;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 180ms ease,
      transform 220ms ease,
      max-height 220ms ease;
  }

  .legend-block {
    display: grid;
    gap: 0.4rem;
  }

  .legend-block__section {
    font-size: .8rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .legend-title {
    font-size: .95rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .legend-block__title {
    font-size: var(--legend-text-size);
    line-height: 1.25;
  }

  .legend-block__source {
    color: #7e756c;
    font-size: var(--legend-text-size);
    line-height: 1.25;
  }

  .legend-color svg {
    display: block;
    width: 320px;
    max-width: 100%;
    height: auto;
    font-size: var(--legend-text-size);
  }

  .legend-color text,
  .legend-circle__label,
  .legend-status span {
    fill: #7e756c;
    color: #7e756c;
    font-size: var(--legend-text-size);
  }

  .legend-bloqueos {
    display: flex;
    gap: 0.35rem 0.55rem;
    align-items: center;
    justify-items: start;
  }

  .legend-circles svg {
    display: block;
    width: 100%;
    max-width: 228px;
    height: auto;
    overflow: visible;
    font-size: var(--legend-text-size);
  }

  .legend-circle__label {
    font-weight: 700;
  }

  .legend-circles text {
    fill: #7e756c;
    font-size: var(--legend-text-size);
    dominant-baseline: middle;
  }

  .legend-circle__label {
    fill: #7e756c;
    font-size: var(--legend-text-size);
    dominant-baseline: hanging;
  }

  .legend-status {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    align-content: start;
  }

  .legend-status__item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: #7e756c;
    font-size: var(--legend-text-size);
    line-height: 1;
  }

  .legend-status__swatch {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 999px;
    border: 1px solid rgba(59, 52, 49, 0.8);
    flex: 0 0 auto;
  }

  .legend-block__separator {
    width: 100%;
    height: 1px;
    margin: 0.05rem 0 0.1rem;
    background: rgba(126, 117, 108, 0.18);
  }

  .legend-panel__toggle {
    display: none;
    position: absolute;
    bottom: 0.35rem;
    right: 0%;
    z-index: 2;
    align-items: center;
    justify-content: center;
    width: 1.9rem;
    height: 1.9rem;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    color: #7e756c;
    font: inherit;
    cursor: pointer;
    transform: translateX(-50%);
    transition:
      background-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease;
  }

  .legend-panel__toggle:hover {
    background: rgba(255, 255, 255, 0.98);
    color: #111111;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  }

  .legend-panel__toggle:focus-visible {
    outline: none;
    background: rgba(255, 255, 255, 0.98);
    color: #111111;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  }

  .legend-panel__toggle-icon {
    display: block;
    width: 0.5rem;
    height: 0.5rem;
    border-left: 1.5px solid currentColor;
    border-top: 1.5px solid currentColor;
    transform: translateY(0.08rem) rotate(45deg);
    transition: transform 160ms ease;
  }

  .legend-panel--collapsed {
    padding-bottom: 0rem;
  }

  .legend-panel--collapsed .legend-panel__body {
    max-height: 0;
    margin-top: 0;
    padding-bottom: 0;
    opacity: 0;
    overflow: hidden;
    transform: translateY(-0.35rem);
    pointer-events: none;
  }

  .legend-panel--collapsed .legend-panel__toggle-icon {
    transform: translateY(-0.08rem) rotate(225deg);
  }

  .legend-status__swatch--active {
    background: #EB4A40FF;
  }

  .legend-status__swatch--inactive {
    background: #F2855DFF;
  }

  @media (max-width: 720px) {
    .legend-panel {
      top: 0.75rem;
      left: 0.75rem;
      right: 0.75rem;
      width: auto;
      max-width: none;
    }

    .legend-panel__toggle {
      display: inline-flex;
    }

    .legend-bloqueos {
      grid-template-columns: 1fr;
    }

    .legend-status {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.3rem 0.6rem;
    }

    .legend-circles svg {
      max-width: none;
    }
  }
</style>
