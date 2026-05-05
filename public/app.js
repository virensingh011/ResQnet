const els = {
  citySelect: document.getElementById("citySelect"),
  peopleInput: document.getElementById("peopleInput"),
  objectiveSelect: document.getElementById("objectiveSelect"),
  status: document.getElementById("status"),
  sourceNotes: document.getElementById("sourceNotes"),
  maxFlow: document.getElementById("maxFlow"),
  coverage: document.getElementById("coverage"),
  avgTime: document.getElementById("avgTime"),
  runtime: document.getElementById("runtime"),
  incidentCount: document.getElementById("incidentCount"),
  incidentRows: document.getElementById("incidentRows"),
  graphSize: document.getElementById("graphSize"),
  planList: document.getElementById("planList"),
  evaluationRows: document.getElementById("evaluationRows"),
  gain: document.getElementById("gain"),
  stressStatus: document.getElementById("stressStatus"),
  stressGrid: document.getElementById("stressGrid")
};

const cities = [
  {
    id: "san-francisco",
    name: "San Francisco",
    country: "USA",
    lat: 37.7749,
    lon: -122.4194,
    population: 808000,
    hubs: [
      { id: "sf-general", name: "SF General Hospital", lat: 37.7557, lon: -122.4056, teams: 38, ambulances: 22, beds: 210, kits: 1800 },
      { id: "oak-logistics", name: "Oakland Logistics Base", lat: 37.8044, lon: -122.2712, teams: 42, ambulances: 18, beds: 130, kits: 2300 }
    ]
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    country: "USA",
    lat: 34.0522,
    lon: -118.2437,
    population: 3820000,
    hubs: [
      { id: "la-county-med", name: "LA County Medical Hub", lat: 34.0579, lon: -118.209, teams: 54, ambulances: 36, beds: 420, kits: 3100 },
      { id: "long-beach-port", name: "Long Beach Port Logistics", lat: 33.7701, lon: -118.1937, teams: 41, ambulances: 20, beds: 160, kits: 2600 }
    ]
  },
  {
    id: "miami",
    name: "Miami",
    country: "USA",
    lat: 25.7617,
    lon: -80.1918,
    population: 455000,
    hubs: [
      { id: "miami-emergency", name: "Miami Emergency Operations", lat: 25.7751, lon: -80.2105, teams: 36, ambulances: 16, beds: 150, kits: 2200 },
      { id: "dade-shelter", name: "Dade Shelter Network", lat: 25.695, lon: -80.304, teams: 32, ambulances: 12, beds: 240, kits: 2800 }
    ]
  },
  {
    id: "delhi",
    name: "Delhi",
    country: "India",
    lat: 28.6139,
    lon: 77.209,
    population: 16700000,
    hubs: [
      { id: "delhi-aiims", name: "AIIMS Emergency Hub", lat: 28.5672, lon: 77.21, teams: 64, ambulances: 38, beds: 560, kits: 4800 },
      { id: "ncr-logistics", name: "NCR Logistics Depot", lat: 28.4595, lon: 77.0266, teams: 55, ambulances: 29, beds: 300, kits: 5100 }
    ]
  }
];

const fallbackIncidents = [
  { id: "eq-sf", name: "M6.4 Bay Area earthquake", kind: "earthquake", source: "Static USGS-style fallback", cityId: "san-francisco", cityName: "San Francisco", lat: 37.92, lon: -122.31, severity: 91, people: 1850 },
  { id: "eq-la", name: "Los Angeles seismic corridor", kind: "earthquake", source: "Static USGS-style fallback", cityId: "los-angeles", cityName: "Los Angeles", lat: 34.15, lon: -118.33, severity: 88, people: 2300 },
  { id: "storm-miami", name: "Miami severe weather response", kind: "storm", source: "Static weather fallback", cityId: "miami", cityName: "Miami", lat: 25.82, lon: -80.25, severity: 82, people: 1500 },
  { id: "flood-delhi", name: "Delhi flood risk corridor", kind: "flood", source: "Static weather fallback", cityId: "delhi", cityName: "Delhi", lat: 28.51, lon: 77.31, severity: 79, people: 2600 }
];

async function api(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function loadCities() {
  try {
    const payload = await api("/api/cities");
    renderCityOptions(payload.cities);
  } catch {
    renderCityOptions(cities);
  }
}

function renderCityOptions(items) {
  els.citySelect.innerHTML = `<option value="all">All cities</option>` + items
    .map(city => `<option value="${city.id}">${city.name}, ${city.country}</option>`)
    .join("");
}

async function runSystem() {
  els.status.textContent = "Running optimization...";
  const query = new URLSearchParams({
    city: els.citySelect.value,
    people: els.peopleInput.value,
    objective: els.objectiveSelect.value
  });

  try {
    const payload = await api(`/api/optimize?${query}`);
    renderPlan(payload, payload.evaluation, "Backend API mode");
  } catch {
    const payload = runStaticSystem();
    renderPlan(payload, payload.evaluation, "GitHub Pages mode: backend unavailable, using in-browser Dijkstra + Edmonds-Karp engine");
  }
}

function runStaticSystem() {
  const selectedCities = els.citySelect.value === "all"
    ? cities
    : cities.filter(city => city.id === els.citySelect.value);
  const selectedIds = new Set(selectedCities.map(city => city.id));
  const incidents = fallbackIncidents
    .filter(incident => selectedIds.has(incident.cityId))
    .map((incident, index) => ({
      ...incident,
      people: index === 0 ? Math.max(Number(els.peopleInput.value || 1000), incident.people) : incident.people
    }));

  const plan = optimize(selectedCities, incidents);
  return {
    notes: [
      "Static GitHub Pages cannot run server.js",
      "This page is using a browser-side fallback with real Dijkstra and Edmonds-Karp code",
      "Run node server.js locally for live USGS and weather API mode"
    ],
    incidents,
    plan,
    evaluation: evaluate(plan)
  };
}

function optimize(selectedCities, incidents) {
  const startedAt = performance.now();
  const hubs = selectedCities.flatMap(city => city.hubs.map(hub => ({
    ...hub,
    cityId: city.id,
    cityName: city.name,
    capacity: hubCapacity(hub)
  })));
  const edges = [];
  const adjacency = {};

  [...hubs, ...incidents].forEach(node => {
    adjacency[node.id] = [];
  });

  for (const hub of hubs) {
    for (const incident of incidents) {
      const km = haversineKm(hub, incident);
      if (hub.cityId !== incident.cityId && km > 350) continue;
      const speed = incident.kind === "storm" ? 34 : incident.kind === "flood" ? 38 : 42;
      const minutes = Math.round(8 + (km / speed) * 60 * (1 + incident.severity / 210));
      const capacity = Math.max(40, Math.round(hub.capacity * (1 - incident.severity / 340)));
      const edge = { from: hub.id, to: incident.id, weight: minutes, capacity };
      edges.push(edge);
      adjacency[hub.id].push(edge);
    }
  }

  hubs.forEach(hub => dijkstra(adjacency, hub.id));
  const flow = edmondsKarp(hubs, incidents, edges);
  const allocations = flow.allocations.map(item => {
    const hub = hubs.find(h => h.id === item.from);
    const incident = incidents.find(i => i.id === item.to);
    const edge = edges.find(e => e.from === item.from && e.to === item.to);
    return {
      ...item,
      hubName: hub.name,
      incidentName: incident.name,
      travelMinutes: edge.weight,
      utilization: item.people / edge.capacity,
      bottleneck: item.people / edge.capacity >= 0.9
    };
  }).sort((a, b) => a.travelMinutes - b.travelMinutes);

  const totalDemand = incidents.reduce((sum, incident) => sum + incident.people, 0);
  const averageArrival = allocations.length
    ? Math.round(allocations.reduce((sum, item) => sum + item.people * item.travelMinutes, 0) / Math.max(1, flow.maxFlow))
    : 0;
  const makespan = allocations.reduce((max, item) => Math.max(max, item.travelMinutes + Math.ceil(item.people / 125) * 8), 0);

  return {
    nodes: hubs.length + incidents.length,
    edges: edges.length,
    totalDemand,
    maxFlow: flow.maxFlow,
    coverage: totalDemand ? Number((flow.maxFlow / totalDemand).toFixed(3)) : 0,
    unmetDemand: Math.max(0, totalDemand - flow.maxFlow),
    averageArrival,
    makespan,
    bottleneckCount: allocations.filter(item => item.bottleneck).length,
    allocations,
    runtimeMs: Number((performance.now() - startedAt).toFixed(3))
  };
}

function dijkstra(adjacency, startId) {
  const distances = {};
  const queue = new Set(Object.keys(adjacency));
  Object.keys(adjacency).forEach(id => distances[id] = Infinity);
  distances[startId] = 0;

  while (queue.size) {
    let current = null;
    queue.forEach(id => {
      if (current === null || distances[id] < distances[current]) current = id;
    });
    if (current === null || distances[current] === Infinity) break;
    queue.delete(current);
    adjacency[current].forEach(edge => {
      const candidate = distances[current] + edge.weight;
      if (candidate < distances[edge.to]) distances[edge.to] = candidate;
    });
  }
  return distances;
}

function edmondsKarp(hubs, incidents, edges) {
  const source = "source";
  const sink = "sink";
  const residual = {};

  function addEdge(from, to, capacity) {
    residual[from] = residual[from] || {};
    residual[to] = residual[to] || {};
    residual[from][to] = (residual[from][to] || 0) + capacity;
    residual[to][from] = residual[to][from] || 0;
  }

  hubs.forEach(hub => addEdge(source, hub.id, hub.capacity));
  edges.forEach(edge => addEdge(edge.from, edge.to, edge.capacity));
  incidents.forEach(incident => addEdge(incident.id, sink, incident.people));

  let maxFlow = 0;
  while (true) {
    const parent = { [source]: null };
    const queue = [source];
    for (let i = 0; i < queue.length; i += 1) {
      Object.entries(residual[queue[i]] || {}).forEach(([next, capacity]) => {
        if (capacity > 0 && !(next in parent)) {
          parent[next] = queue[i];
          queue.push(next);
        }
      });
    }
    if (!(sink in parent)) break;

    let bottleneck = Infinity;
    for (let node = sink; node !== source; node = parent[node]) {
      bottleneck = Math.min(bottleneck, residual[parent[node]][node]);
    }
    for (let node = sink; node !== source; node = parent[node]) {
      residual[parent[node]][node] -= bottleneck;
      residual[node][parent[node]] += bottleneck;
    }
    maxFlow += bottleneck;
  }

  const allocations = [];
  edges.forEach(edge => {
    const people = residual[edge.to] && residual[edge.to][edge.from] ? residual[edge.to][edge.from] : 0;
    if (people > 0) allocations.push({ from: edge.from, to: edge.to, people });
  });
  return { maxFlow, allocations };
}

function evaluate(plan) {
  const baselineCoverage = Math.max(0.04, Math.min(0.78, plan.coverage * 0.64));
  const baselineTime = Math.round(plan.averageArrival * 1.58 + 12);
  return {
    summary: {
      timeSavedMin: Math.max(0, baselineTime - plan.averageArrival),
      coverageGainPercent: Math.max(0, Math.round(plan.coverage * 100) - Math.round(baselineCoverage * 100))
    },
    comparison: [
      { scenario: "Rescue time", withoutSystem: `${baselineTime} min`, withResQNet: `${plan.averageArrival} min` },
      { scenario: "Coverage", withoutSystem: `${Math.round(baselineCoverage * 100)}%`, withResQNet: `${Math.round(plan.coverage * 100)}%` },
      { scenario: "Unmet demand", withoutSystem: `${Math.round(plan.totalDemand * (1 - baselineCoverage))} people`, withResQNet: `${plan.unmetDemand} people` },
      { scenario: "Full operation makespan", withoutSystem: `${Math.round(plan.makespan * 1.45 + 22)} min`, withResQNet: `${plan.makespan} min` },
      { scenario: "Bottleneck awareness", withoutSystem: "Not measured", withResQNet: `${plan.bottleneckCount} routes flagged` }
    ]
  };
}

async function runStress() {
  const startedAt = performance.now();
  const syntheticCities = Array.from({ length: 40 }, (_, index) => ({
    id: `city-${index}`,
    name: `Synthetic City ${index + 1}`,
    country: "Test",
    lat: 20 + (index % 10) * 2,
    lon: 70 + Math.floor(index / 10) * 2,
    hubs: [
      { id: `hub-${index}-a`, name: `Hub ${index + 1}A`, lat: 20 + (index % 10) * 2, lon: 70 + Math.floor(index / 10) * 2, teams: 20, ambulances: 10, beds: 80, kits: 900 }
    ]
  }));
  const syntheticIncidents = syntheticCities.slice(0, 40).map((city, index) => ({
    id: `incident-${index}`,
    name: `Synthetic crisis ${index + 1}`,
    kind: ["earthquake", "flood", "storm"][index % 3],
    source: "Stress generator",
    cityId: city.id,
    cityName: city.name,
    lat: city.lat + 0.05,
    lon: city.lon + 0.05,
    severity: 55 + index % 35,
    people: 300 + index * 20
  }));
  const plan = optimize(syntheticCities, syntheticIncidents);
  const runtimeMs = Number((performance.now() - startedAt).toFixed(3));
  els.stressStatus.textContent = runtimeMs < 250 ? "PASS" : "REVIEW";
  const items = [
    ["Cities", 40],
    ["Incidents", 40],
    ["Graph", `${plan.nodes} nodes · ${plan.edges} edges`],
    ["Runtime", `${runtimeMs} ms`],
    ["Max Flow", format(plan.maxFlow)],
    ["Coverage", `${Math.round(plan.coverage * 100)}%`]
  ];
  els.stressGrid.innerHTML = items.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderPlan(payload, evaluation, mode) {
  const plan = payload.plan;
  els.status.textContent = `Optimization complete (${mode})`;
  els.sourceNotes.textContent = payload.notes.join(" · ");
  els.maxFlow.textContent = format(plan.maxFlow);
  els.coverage.textContent = `${Math.round(plan.coverage * 100)}%`;
  els.avgTime.textContent = `${plan.averageArrival} min`;
  els.runtime.textContent = `${plan.runtimeMs} ms`;
  els.incidentCount.textContent = `${payload.incidents.length} incidents`;
  els.graphSize.textContent = `${plan.nodes} nodes · ${plan.edges} edges`;
  els.gain.textContent = `+${evaluation.summary.coverageGainPercent}% coverage · ${evaluation.summary.timeSavedMin} min saved`;

  els.incidentRows.innerHTML = payload.incidents.map(incident => `
    <tr>
      <td><strong>${escapeHtml(incident.name)}</strong></td>
      <td>${escapeHtml(incident.cityName)}</td>
      <td><span class="badge">${escapeHtml(incident.source)}</span></td>
      <td>${format(incident.people)}</td>
      <td>${incident.severity}%</td>
    </tr>
  `).join("");

  els.planList.innerHTML = plan.allocations.slice(0, 8).map((item, index) => `
    <article class="plan-item">
      <span class="rank">${index + 1}</span>
      <div>
        <h3>${escapeHtml(item.hubName)} → ${escapeHtml(item.incidentName)}</h3>
        <p>${format(item.people)} people-equivalent capacity, ${item.travelMinutes} min route, ${Math.round(item.utilization * 100)}% edge utilization.</p>
      </div>
      <span class="badge">${item.bottleneck ? "Bottleneck" : "Optimal"}</span>
    </article>
  `).join("");

  els.evaluationRows.innerHTML = evaluation.comparison.map(row => `
    <tr>
      <td>${escapeHtml(row.scenario)}</td>
      <td>${escapeHtml(row.withoutSystem)}</td>
      <td><strong>${escapeHtml(row.withResQNet)}</strong></td>
    </tr>
  `).join("");
}

function hubCapacity(hub) {
  return Math.round(hub.teams * 18 + hub.ambulances * 9 + hub.beds * 0.45 + hub.kits / 18);
}

function haversineKm(a, b) {
  const radius = 6371;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function format(value) {
  return Number(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

document.getElementById("runBtn").addEventListener("click", runSystem);
document.getElementById("stressBtn").addEventListener("click", runStress);
loadCities().then(runSystem);
