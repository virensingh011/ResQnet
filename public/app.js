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

async function api(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function loadCities() {
  const { cities } = await api("/api/cities");
  els.citySelect.innerHTML = `<option value="all">All cities</option>` + cities
    .map(city => `<option value="${city.id}">${city.name}, ${city.country}</option>`)
    .join("");
}

async function runSystem() {
  try {
    els.status.textContent = "Fetching live data and optimizing rescue graph...";
    const query = new URLSearchParams({
      city: els.citySelect.value,
      people: els.peopleInput.value,
      objective: els.objectiveSelect.value
    });

    const payload = await api(`/api/optimize?${query}`);
    renderPlan(payload, payload.evaluation);
  } catch (error) {
    els.status.textContent = "System error";
    els.sourceNotes.textContent = error.message;
  }
}

function renderPlan(payload, evaluation) {
  const plan = payload.plan;
  els.status.textContent = "Real-time optimization complete";
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

async function runStress() {
  try {
    els.stressStatus.textContent = "Running...";
    const result = await api("/api/stress?cities=40&incidents=220");
    els.stressStatus.textContent = result.status.toUpperCase();
    const items = [
      ["Cities", result.generatedCities],
      ["Incidents", result.generatedIncidents],
      ["Graph", `${result.nodes} nodes · ${result.edges} edges`],
      ["Runtime", `${result.runtimeMs} ms`],
      ["Max Flow", format(result.maxFlow)],
      ["Coverage", `${Math.round(result.coverage * 100)}%`]
    ];
    els.stressGrid.innerHTML = items.map(([label, value]) => `
      <article><span>${label}</span><strong>${value}</strong></article>
    `).join("");
  } catch (error) {
    els.stressStatus.textContent = "Error";
    els.stressGrid.innerHTML = `<article><span>Message</span><strong>${escapeHtml(error.message)}</strong></article>`;
  }
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

loadCities().then(runSystem).catch(error => {
  els.status.textContent = "Backend not reachable";
  els.sourceNotes.textContent = error.message;
});
