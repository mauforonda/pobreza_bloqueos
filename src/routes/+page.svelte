<script>
  import ChoroplethMap from "$lib/ChoroplethMap.svelte";
  import {getChoroplethIndicator} from "$lib/indicators";
  import Legend from "$lib/Legend.svelte";

  export let data;

  let selectedIndicatorKey = "nbi_24";

  $: indicator = getChoroplethIndicator(selectedIndicatorKey);
  $: domain = data.domains[selectedIndicatorKey];
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
