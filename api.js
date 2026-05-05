(function attachApi() {
  const USGS_DAY_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
  const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=8&days=30";

  async function fetchJson(url, timeoutMs = 6500) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadDisasterData() {
    const results = await Promise.allSettled([
      fetchJson(USGS_DAY_URL),
      fetchJson(EONET_URL)
    ]);

    const incidents = [];
    const sourceNotes = [];

    if (results[0].status === "fulfilled") {
      incidents.push(...parseUsgs(results[0].value));
      sourceNotes.push(`USGS earthquakes loaded: ${results[0].value.features.length}`);
    } else {
      sourceNotes.push("USGS blocked or unavailable; fallback earthquake fixture active");
    }

    if (results[1].status === "fulfilled") {
      incidents.push(...parseEonet(results[1].value));
      sourceNotes.push(`NASA EONET events loaded: ${results[1].value.events.length}`);
    } else {
      sourceNotes.push("NASA EONET blocked or unavailable; fallback natural-event fixtures active");
    }

    const usable = incidents.filter(item => Number.isFinite(item.x) && Number.isFinite(item.y));
    if (usable.length >= 3) {
      return {
        incidents: normalizeIncidents(usable).slice(0, 8),
        live: true,
        notes: sourceNotes
      };
    }

    return {
      incidents: normalizeIncidents(window.ResQNetData.fallbackIncidents),
      live: false,
      notes: [...sourceNotes, "Using deterministic fallback dataset for reproducible offline review"]
    };
  }

  function parseUsgs(feed) {
    return (feed.features || []).map((feature, index) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      const magnitude = Number(feature.properties.mag || 4.5);
      const people = Math.round(350 + Math.pow(magnitude, 2.6) * 35 + (feature.properties.tsunami ? 700 : 0));
      return {
        id: feature.id || `usgs_${index}`,
        name: feature.properties.place || "USGS earthquake",
        type: "earthquake",
        source: "USGS",
        latitude,
        longitude,
        x: projectLongitude(longitude),
        y: projectLatitude(latitude),
        magnitude,
        people,
        severity: Math.min(99, Math.round(45 + magnitude * 8 + (feature.properties.sig || 0) / 22)),
        time: feature.properties.time,
        url: feature.properties.url
      };
    });
  }

  function parseEonet(payload) {
    return (payload.events || []).map((event, index) => {
      const geometry = (event.geometry || [])[event.geometry.length - 1] || {};
      const coordinates = geometry.coordinates || [0, 0];
      const longitude = Array.isArray(coordinates[0]) ? coordinates[0][0][0] : coordinates[0];
      const latitude = Array.isArray(coordinates[0]) ? coordinates[0][0][1] : coordinates[1];
      const category = (event.categories && event.categories[0] && event.categories[0].id) || "natural";
      const type = normalizeType(category);
      const magnitude = Number(event.magnitudeValue || hazardMagnitude(type));
      const people = Math.round(420 + magnitude * 115 + typeDemandBoost(type));

      return {
        id: event.id || `eonet_${index}`,
        name: event.title || "NASA EONET event",
        type,
        source: "NASA EONET",
        latitude,
        longitude,
        x: projectLongitude(longitude),
        y: projectLatitude(latitude),
        magnitude,
        people,
        severity: Math.min(98, Math.round(58 + magnitude * 4 + typeDemandBoost(type) / 42)),
        time: geometry.date ? new Date(geometry.date).getTime() : Date.now(),
        url: event.link || "https://eonet.gsfc.nasa.gov/"
      };
    });
  }

  function normalizeType(category) {
    const text = String(category).toLowerCase();
    if (text.includes("wildfire")) return "wildfire";
    if (text.includes("storm")) return "storm";
    if (text.includes("flood")) return "flood";
    if (text.includes("volcano")) return "volcano";
    return "flood";
  }

  function hazardMagnitude(type) {
    return {
      wildfire: 6.4,
      storm: 7.1,
      flood: 6.8,
      volcano: 5.9
    }[type] || 5.5;
  }

  function typeDemandBoost(type) {
    return {
      earthquake: 760,
      flood: 620,
      storm: 540,
      wildfire: 460,
      volcano: 380
    }[type] || 340;
  }

  function projectLongitude(longitude) {
    return Math.max(12, Math.min(88, ((Number(longitude) + 180) / 360) * 76 + 12));
  }

  function projectLatitude(latitude) {
    return Math.max(12, Math.min(86, 86 - ((Number(latitude) + 90) / 180) * 74));
  }

  function normalizeIncidents(incidents) {
    return incidents
      .filter(item => item.people > 0)
      .sort((a, b) => b.severity * b.people - a.severity * a.people)
      .map((item, index) => ({
        ...item,
        id: item.id || `incident_${index}`,
        x: Math.max(12, Math.min(88, item.x)),
        y: Math.max(12, Math.min(86, item.y)),
        severity: Math.max(10, Math.min(99, item.severity)),
        people: Math.max(80, Math.round(item.people))
      }));
  }

  window.ResQNetApi = {
    loadDisasterData
  };
})();
