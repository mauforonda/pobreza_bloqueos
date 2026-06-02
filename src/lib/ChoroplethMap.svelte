<script>
  import {onMount} from "svelte";
  import "maplibre-gl/dist/maplibre-gl.css";

  export let choropleth;
  export let bloqueos;
  export let caminos;
  export let domain;

  let container;

  const baseStyle =
    "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json";
  const labelTiles = [
    "https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png",
  ];
  const fillColors = ["#009474FF", "#F1F4EEFF", "#B0986CFF"];
  const bloqueoColor = "#F8B58BFF";
  const bloqueoActiveColor = "#EB4A40FF";
  const municipalityBorderColor = "rgba(255, 255, 255, 0.85)";
  const bloqueoBorderColor = "#3b3431";
  const DEPARTAMENTOS = [
    "Chuquisaca",
    "La Paz",
    "Cochabamba",
    "Oruro",
    "Potosí",
    "Tarija",
    "Santa Cruz",
    "Beni",
    "Pando",
  ];

  function departmentFromCodigo(codigo) {
    const index = Number(codigo?.[1]) - 1;
    return DEPARTAMENTOS[index] ?? "";
  }

  function municipalityPopupHTML(feature) {
    const props = feature.properties ?? {};
    return `
      <div class="popup-card">
        <div class="popup-card__eyebrow">${departmentFromCodigo(props.codigo)}</div>
        <div class="popup-card__title">${props.municipio ?? "Municipio sin nombre"}</div>
        <div class="popup-card__body">
          <span class="popup-card__value">${Number(props.nbi_24 ?? 0).toFixed(2)}%</span>
          <span class="popup-card__category">de la población es pobre</span>
        </div>
      </div>
    `;
  }

  function bloqueoPopupHTML(feature) {
    const props = feature.properties ?? {};
    const estado = props.activo ? "Bloqueo activo" : "Bloqueo no activo";
    const duracion = Number(props.duracion ?? 0).toFixed(1);
    return `
      <div class="popup-card">
        <div class="popup-card__eyebrow">${estado}</div>
        <div class="popup-card__body">
          <span class="popup-card__value">${duracion}</span> días
        </div>
      </div>
    `;
  }

  onMount(() => {
    let cancelled = false;
    let map;
    let popup;
    let resize;
    let handleMove;
    let handleClick;
    let handleLeaveMunicipios;
    let handleLeaveBloqueos;
    let currentMunicipioId = null;
    let currentBloqueoId = null;

    const clearSelected = (source, id) => {
      if (id === null || id === undefined) return;
      map?.setFeatureState({source, id}, {selected: false});
    };

    const setSelected = (source, id, value) => {
      if (id === null || id === undefined) return;
      map?.setFeatureState({source, id}, {selected: value});
    };

    const clearMunicipioSelection = () => {
      clearSelected("municipios", currentMunicipioId);
      currentMunicipioId = null;
    };

    const clearBloqueoSelection = () => {
      clearSelected("bloqueos", currentBloqueoId);
      currentBloqueoId = null;
    };

    const showMunicipio = (feature, lngLat) => {
      const nextId = feature.id ?? null;
      if (currentMunicipioId !== nextId) {
        clearMunicipioSelection();
        clearBloqueoSelection();
        currentMunicipioId = nextId;
        setSelected("municipios", currentMunicipioId, true);
      }
      popup.setLngLat(lngLat).setHTML(municipalityPopupHTML(feature)).addTo(map);
    };

    const showBloqueo = (feature, lngLat) => {
      const nextId = feature.id ?? null;
      if (currentBloqueoId !== nextId) {
        clearBloqueoSelection();
        clearMunicipioSelection();
        currentBloqueoId = nextId;
        setSelected("bloqueos", currentBloqueoId, true);
      }
      popup.setLngLat(lngLat).setHTML(bloqueoPopupHTML(feature)).addTo(map);
    };

    (async () => {
      const {default: maplibregl} = await import("maplibre-gl");

      if (cancelled) return;

      map = new maplibregl.Map({
        container,
        style: baseStyle,
        center: [-64.7, -16.8],
        zoom: 5.1,
        minZoom: 4.2,
        maxZoom: 12,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({showCompass: false}),
        "bottom-right",
      );

      popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 14,
      });

      const addDataLayers = () => {
        map.addSource("municipios", {
          type: "geojson",
          data: choropleth,
          generateId: true,
        });

        map.addLayer({
          id: "municipios-fill",
          type: "fill",
          source: "municipios",
          paint: {
            "fill-color": [
              "interpolate",
              ["linear"],
              ["to-number", ["get", "nbi_24"]],
              domain.min,
              fillColors[0],
              (domain.min + domain.max) / 2,
              fillColors[1],
              domain.max,
              fillColors[2],
            ],
            "fill-opacity": 0.88,
          },
        });

        map.addLayer({
          id: "municipios-line",
          type: "line",
          source: "municipios",
          paint: {
            "line-color": municipalityBorderColor,
            "line-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              2.6,
              0.55,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              1,
              0.9,
            ],
          },
        });

        map.addSource("caminos", {
          type: "geojson",
          data: caminos,
        });

        map.addLayer({
          id: "caminos-line",
          type: "line",
          source: "caminos",
          paint: {
            "line-color": bloqueoBorderColor,
            "line-width": 1.5,
            "line-opacity": 0.1,
          },
        });

        map.addSource("bloqueos", {
          type: "geojson",
          data: bloqueos,
          generateId: true,
        });

        map.addLayer({
          id: "bloqueos-points",
          type: "circle",
          source: "bloqueos",
          paint: {
            "circle-color": [
              "case",
              ["boolean", ["get", "activo"], false],
              bloqueoActiveColor,
              bloqueoColor,
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["to-number", ["get", "duracion"]],
              0,
              2.5,
              28,
              9.5,
            ],
            "circle-opacity": 0.8,
            "circle-stroke-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              2,
              0.2,
            ],
            "circle-stroke-color": bloqueoBorderColor,
            "circle-stroke-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              1,
              0.8,
            ],
          },
        });

        map.addSource("labels", {
          type: "raster",
          tiles: labelTiles,
          tileSize: 256,
        });

        map.addLayer({
          id: "labels",
          type: "raster",
          source: "labels",
          paint: {
            "raster-opacity": 0.9,
          },
        });
      };

      if (map.loaded()) {
        addDataLayers();
      } else {
        map.once("load", addDataLayers);
      }

      const getMunicipioAtPoint = (point) =>
        map.queryRenderedFeatures(point, {layers: ["municipios-fill"]})[0] ??
        null;

      const getBloqueoAtPoint = (point) =>
        map.queryRenderedFeatures(point, {layers: ["bloqueos-points"]})[0] ??
        null;

      handleMove = (event) => {
        const bloqueoFeature = getBloqueoAtPoint(event.point);
        const municipioFeature = getMunicipioAtPoint(event.point);

        map.getCanvas().style.cursor =
          bloqueoFeature || municipioFeature ? "pointer" : "";

        if (bloqueoFeature) {
          showBloqueo(bloqueoFeature, event.lngLat);
          return;
        }

        if (municipioFeature) {
          showMunicipio(municipioFeature, event.lngLat);
          return;
        }

        if (window.innerWidth > 720) {
          clearBloqueoSelection();
          clearMunicipioSelection();
          popup.remove();
        }
      };

      handleClick = (event) => {
        const bloqueoFeature = getBloqueoAtPoint(event.point);
        const municipioFeature = getMunicipioAtPoint(event.point);

        if (bloqueoFeature) {
          showBloqueo(bloqueoFeature, event.lngLat);
          return;
        }

        if (municipioFeature) {
          showMunicipio(municipioFeature, event.lngLat);
          return;
        }

        if (window.innerWidth > 720) popup.remove();
      };

      handleLeaveMunicipios = () => {
        clearMunicipioSelection();
      };

      handleLeaveBloqueos = () => {
        clearBloqueoSelection();
      };

      map.on("mousemove", handleMove);
      map.on("click", handleClick);
      map.on("mouseleave", "municipios-fill", handleLeaveMunicipios);
      map.on("mouseleave", "bloqueos-points", handleLeaveBloqueos);

      resize = () => map.resize();
      window.addEventListener("resize", resize);
    })();

    return () => {
      cancelled = true;
      if (resize) window.removeEventListener("resize", resize);
      map?.off("mousemove", handleMove);
      map?.off("click", handleClick);
      map?.off("mouseleave", "municipios-fill", handleLeaveMunicipios);
      map?.off("mouseleave", "bloqueos-points", handleLeaveBloqueos);
      popup?.remove();
      map?.remove();
    };
  });
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: fixed;
    inset: 0;
  }
</style>
