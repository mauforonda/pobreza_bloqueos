<script>
  import ChoroplethMap from "$lib/ChoroplethMap.svelte";
  import Legend from "$lib/Legend.svelte";

  export let data;
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
    domain={data.domain}
  />
  <Legend domain={data.domain} />
  <div class="credito">
    <img
      class="credito__logo"
      src="https://mauforonda.github.io/images/icon.svg"
      alt=""
    />
    <span class="credito__text">Creado por Mauricio Foronda</span>
  </div>
</div>
