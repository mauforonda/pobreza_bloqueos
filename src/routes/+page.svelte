<script>
  import { browser } from "$app/environment";
  import ChoroplethMap from "$lib/ChoroplethMap.svelte";
  import {
    DEFAULT_CHOROPLETH_INDICATOR_KEY,
    getChoroplethIndicator,
  } from "$lib/indicators";
  import Legend from "$lib/Legend.svelte";
  import { onMount } from "svelte";

  export let data;

  let selectedIndicatorKey = DEFAULT_CHOROPLETH_INDICATOR_KEY;
  let hydrated = false;
  let legendCollapsed = false;
  const STORAGE_KEY = "choropleth:selectedIndicatorKey";
  const LEGEND_STORAGE_KEY = "legend:collapsed";

  $: indicator = getChoroplethIndicator(selectedIndicatorKey);
  $: domain = data.domains[selectedIndicatorKey];

  onMount(() => {
    if (!browser) return;

    try {
      const storedKey = window.localStorage.getItem(STORAGE_KEY);
      if (storedKey && data.domains?.[storedKey]) {
        selectedIndicatorKey = storedKey;
      }
      const storedLegendCollapsed = window.localStorage.getItem(
        LEGEND_STORAGE_KEY,
      );
      if (storedLegendCollapsed !== null) {
        legendCollapsed = storedLegendCollapsed === "true";
      }
    } catch {
      // Ignore storage failures and fall back to the default indicator.
    }

    hydrated = true;
  });

  $: if (browser && hydrated) {
    try {
      window.localStorage.setItem(STORAGE_KEY, selectedIndicatorKey);
      window.localStorage.setItem(LEGEND_STORAGE_KEY, String(legendCollapsed));
    } catch {
      // Ignore storage failures.
    }
  }
</script>

<svelte:head>
  <title>Pobreza y bloqueos</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />
  <link
    rel="icon"
    href="https://mauforonda.github.io/images/icon.svg"
    type="image/svg"
    sizes="32x32"
  />
</svelte:head>

<div class="app-shell">
  <ChoroplethMap
    choropleth={data.choropleth}
    bloqueos={data.bloqueos}
    caminos={data.caminos}
    indicator={indicator}
    domain={domain}
  />
  <Legend
    bind:selectedIndicatorKey
    bind:collapsed={legendCollapsed}
    domains={data.domains}
  />
  <div class="credito">
    <img
      class="credito__logo"
      src="https://mauforonda.github.io/images/icon.svg"
      alt=""
    />
    <span class="credito__text">Creado por Mauricio Foronda</span>
  </div>
</div>
