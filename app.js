(function startApp() {
  const state = {
    incidents: [],
    plan: null,
    live: false
  };

  const elements = {
    incidentCount: document.getElementById("incidentCount"),
    populationAtRisk: document.getElementById("populationAtRisk"),
    networkCapacity: document.getElementById("networkCapacity"),
    unmetDemand: document.getElementById("unmetDemand"),
    dataStatus: document.getElementById("dataStatus"),
    dataSubtitle: document.getElementById("dataSubtitle"),
    graphComplexity: document.getElementById("graphComplexity"),
    networkMap: document.getElementById("networkMap"),
    incidentTable: document.getElementById("incidentTable"),
    planList: document.getElementById("planList"),
    runtimeChip: document.getElementById("runtimeChip"),
    forecastChart: document.getElementById("forecastChart"),
    forecastError: document.getElementById("forecastError"),
    resultsGrid: document.getElementById("resultsGrid"),
    fastestArrival: document.getElementById("fastestArrival"),
    coveredPeople: document.getElementById("coveredPeople"),
    makespan: document.getElementById("makespan")
  };

  function scenarioFromForm() {
    return {
      people: Number(document.getElementById("scenarioPeople").value || 1000),
      disaster: document.getElementById("scenarioDisaster").value,
      objective: document.getElementById("scenarioObjective").value
    };
  }

  async function refreshData() {
    elements.dataStatus.textContent = "Loading live public disaster feeds...";
    elements.dataSubtitle.textContent = "Contacting USGS earthquake GeoJSON and NASA EONET open natural events.";

    const payload = await window.ResQNetApi.loadDisasterData();
    state.incidents = payload.incidents;
    state.live = payload.live;

    elements.dataStatus.textContent = payload.live
      ? "Live public feeds loaded successfully"
      : "Offline-safe deterministic dataset active";
    elements.dataSubtitle.textContent = payload.notes.join(" · ");

    runOptimization();
  }

  function runOptimization() {
    const scenario = scenarioFromForm();
    const plan = window.ResQNetAlgorithms.solveRescuePlan(
      window.ResQNetData.hubs,
      state.incidents,
      scenario
    );
    state.plan = plan;
    renderAll();
  }

  function renderAll() {
    const totalPeople = state.incidents.reduce((sum, item) => sum + item.people, 0);
    const totalCapacity = window.ResQNetData.hubs.reduce((sum, hub) => sum + window.ResQNetAlgorithms.responseCapacity(hub), 0);
    const edgeCount = Object.values(state.plan.graph.adjacency).reduce((sum, edges) => sum + edges.length, 0);

    elements.incidentCount.textContent = state.incidents.length;
    elements.populationAtRisk.textContent = formatNumber(totalPeople);
    elements.networkCapacity.textContent = formatNumber(state.plan.maxFlow);
    elements.unmetDemand.textContent = formatNumber(state.plan.unmetDemand);
    elements.graphComplexity.textContent = `${state.plan.graph.nodes.length} nodes · ${edgeCount} edges`;
    elements.runtimeChip.textContent = `${state.plan.runtime.toFixed(2)} ms`;
    elements.fastestArrival.textContent = `${state.plan.fastestArrival} min`;
    elements.coveredPeople.textContent = formatNumber(state.plan.maxFlow);
    elements.makespan.textContent = `${state.plan.makespan} min`;

    renderMap();
    renderIncidentTable();
    renderPlan();
    renderForecast(totalCapacity);
    renderResults(totalCapacity);
  }

  function renderMap() {
    const hubs = window.ResQNetData.hubs;
    const incidents = state.plan.incidents;
    const allocations = state.plan.allocations;
    const allocatedKeys = new Set(allocations.map(item => `${item.hubId}:${item.incidentId}`));

    const edges = [];
    hubs.forEach(hub => {
      incidents.forEach(incident => {
        const route = state.plan.graph.adjacency[hub.id].find(edge => edge.to === incident.id);
        if (route && allocatedKeys.has(`${hub.id}:${incident.id}`)) {
          edges.push({ hub, incident, route });
        }
      });
    });

    const edgeHtml = edges.map(edge => renderEdge(edge.hub, edge.incident, edge.route)).join("");
    const hubHtml = hubs.map(hub => `
      <div class="map-node hub" style="left:${hub.x}%; top:${hub.y}%;">
        <span class="node-kind">Hub</span>
        <strong>${escapeHtml(hub.name)}</strong>
        <span>${formatNumber(window.ResQNetAlgorithms.responseCapacity(hub))} capacity</span>
      </div>
    `).join("");
    const incidentHtml = incidents.map(incident => `
      <a class="map-node incident" style="left:${incident.x}%; top:${incident.y}%;" href="${incident.url}" target="_blank" rel="noreferrer">
        <span class="node-kind">${escapeHtml(incident.type)}</span>
        <strong>${escapeHtml(shorten(incident.name, 28))}</strong>
        <span>${formatNumber(incident.people)} people · ${incident.severity}%</span>
      </a>
    `).join("");

    elements.networkMap.innerHTML = `${edgeHtml}${hubHtml}${incidentHtml}`;
  }

  function renderEdge(hub, incident, route) {
    const dx = incident.x - hub.x;
    const dy = incident.y - hub.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const congested = route.capacity < incident.people * 0.22;
    return `
      <div class="edge ${congested ? "congested" : ""}" style="left:${hub.x}%; top:${hub.y}%; width:${length}%; transform:rotate(${angle}deg);"></div>
      <div class="edge-label" style="left:${hub.x + dx / 2}%; top:${hub.y + dy / 2}%;">${route.weight}m · cap ${route.capacity}</div>
    `;
  }

  function renderIncidentTable() {
    elements.incidentTable.innerHTML = state.incidents.map(incident => `
      <tr>
        <td><strong>${escapeHtml(incident.name)}</strong><span>${incident.latitude.toFixed(2)}, ${incident.longitude.toFixed(2)}</span></td>
        <td>${escapeHtml(incident.type)}</td>
        <td><span class="source-badge">${escapeHtml(incident.source)}</span></td>
        <td>${formatNumber(incident.people)}</td>
        <td>${incident.severity}%</td>
        <td>${formatAge(incident.time)}</td>
      </tr>
    `).join("");
  }

  function renderPlan() {
    const top = [...state.plan.allocations].sort((a, b) => {
      if (a.minutes !== b.minutes) return a.minutes - b.minutes;
      return b.people - a.people;
    }).slice(0, 7);

    elements.planList.innerHTML = top.map((allocation, index) => `
      <article class="plan-item">
        <span class="rank">${index + 1}</span>
        <div>
          <h3>${escapeHtml(allocation.hubName)} → ${escapeHtml(shorten(allocation.incidentName, 42))}</h3>
          <p>Move ${formatNumber(allocation.people)} people-equivalent capacity in ${allocation.minutes} minutes. ${allocation.bottleneck ? "This edge is a bottleneck and should receive extra transport." : "Route has spare residual capacity."}</p>
        </div>
        <span class="source-badge">${allocation.bottleneck ? "Bottleneck" : "Flow"}</span>
      </article>
    `).join("");
  }

  function renderForecast(totalCapacity) {
    const forecast = window.ResQNetAlgorithms.forecastDemand(
      window.ResQNetData.historicalDemand,
      state.plan.incidents,
      totalCapacity
    );
    const labels = window.ResQNetData.benchmarkLabels;
    const max = Math.max(...forecast.predictions, ...window.ResQNetData.historicalDemand);

    elements.forecastError.textContent = `Backtest MAPE ${forecast.mape}%`;
    elements.forecastChart.innerHTML = forecast.predictions.map((value, index) => `
      <div class="bar ${index < 3 ? "actual" : ""}" style="height:${Math.max(8, value / max * 100)}%;" data-value="${formatNumber(value)}" data-label="${labels[index]}"></div>
    `).join("");
  }

  function renderResults(totalCapacity) {
    const demand = state.plan.totalDemand;
    const coverage = Math.round(state.plan.coverageRate * 100);
    const bottlenecks = state.plan.allocations.filter(item => item.bottleneck).length;
    const savedMinutes = Math.max(0, Math.round((demand / 33) - state.plan.makespan));

    const results = [
      ["Coverage Rate", `${coverage}%`, "Percent of modeled demand served by max-flow allocation."],
      ["Network Utilization", `${Math.round(state.plan.maxFlow / totalCapacity * 100)}%`, "How hard the response system is being pushed."],
      ["Bottleneck Routes", bottlenecks, "Edges close to capacity saturation."],
      ["Time Saved Proxy", `${savedMinutes} min`, "Compared with naive single-hub dispatch baseline."],
      ["Demand Modeled", formatNumber(demand), "Scenario-adjusted people needing help."],
      ["Algorithm Runtime", `${state.plan.runtime.toFixed(2)} ms`, "Measured in the browser during this run."]
    ];

    elements.resultsGrid.innerHTML = results.map(([label, value, note]) => `
      <article>
        <span>${label}</span>
        <strong>${value}</strong>
        <p>${note}</p>
      </article>
    `).join("");
  }

  function formatNumber(value) {
    return Math.round(value).toLocaleString();
  }

  function formatAge(time) {
    if (!time) return "unknown";
    const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  }

  function shorten(text, length) {
    return text.length > length ? `${text.slice(0, length - 1)}...` : text;
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

  document.getElementById("loadLiveData").addEventListener("click", refreshData);
  document.getElementById("runFullModel").addEventListener("click", runOptimization);
  document.getElementById("optimizeScenario").addEventListener("click", runOptimization);
  document.getElementById("scenarioPeople").addEventListener("change", runOptimization);
  document.getElementById("scenarioDisaster").addEventListener("change", runOptimization);
  document.getElementById("scenarioObjective").addEventListener("change", runOptimization);

  refreshData();
})();
