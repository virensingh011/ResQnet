(function attachAlgorithms() {
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function responseCapacity(hub) {
    return hub.teams * 14 + hub.ambulances * 7 + Math.round(hub.beds * 0.35) + Math.round(hub.kits / 12);
  }

  function buildGraph(hubs, incidents) {
    const nodes = [
      ...hubs.map(hub => ({ ...hub, kind: "hub", capacity: responseCapacity(hub) })),
      ...incidents.map(incident => ({ ...incident, kind: "incident", demand: incident.people }))
    ];

    const adjacency = {};
    nodes.forEach(node => {
      adjacency[node.id] = [];
    });

    hubs.forEach(hub => {
      incidents.forEach(incident => {
        const kmProxy = distance(hub, incident) * 0.72;
        const hazardPenalty = 1 + incident.severity / 180;
        const minutes = Math.round(10 + kmProxy * hazardPenalty);
        const capacity = Math.max(60, Math.round(responseCapacity(hub) * (1.08 - incident.severity / 240)));
        adjacency[hub.id].push({ to: incident.id, weight: minutes, capacity });
      });
    });

    return { nodes, adjacency };
  }

  function dijkstra(graph, startId) {
    const distances = {};
    const previous = {};
    const unvisited = new Set(Object.keys(graph.adjacency));

    unvisited.forEach(id => {
      distances[id] = Infinity;
      previous[id] = null;
    });
    distances[startId] = 0;

    while (unvisited.size) {
      let current = null;
      unvisited.forEach(id => {
        if (current === null || distances[id] < distances[current]) current = id;
      });

      if (current === null || distances[current] === Infinity) break;
      unvisited.delete(current);

      graph.adjacency[current].forEach(edge => {
        const candidate = distances[current] + edge.weight;
        if (candidate < distances[edge.to]) {
          distances[edge.to] = candidate;
          previous[edge.to] = current;
        }
      });
    }

    return { distances, previous };
  }

  function edmondsKarp(hubs, incidents, graph) {
    const source = "source";
    const sink = "sink";
    const residual = {};

    function addEdge(from, to, capacity) {
      residual[from] = residual[from] || {};
      residual[to] = residual[to] || {};
      residual[from][to] = (residual[from][to] || 0) + capacity;
      residual[to][from] = residual[to][from] || 0;
    }

    hubs.forEach(hub => addEdge(source, hub.id, responseCapacity(hub)));
    hubs.forEach(hub => {
      graph.adjacency[hub.id].forEach(edge => addEdge(hub.id, edge.to, edge.capacity));
    });
    incidents.forEach(incident => addEdge(incident.id, sink, incident.people));

    let maxFlow = 0;
    const allocations = [];

    while (true) {
      const queue = [source];
      const parent = { [source]: null };

      for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        Object.entries(residual[current] || {}).forEach(([next, cap]) => {
          if (cap > 0 && !(next in parent)) {
            parent[next] = current;
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
        const prev = parent[node];
        residual[prev][node] -= bottleneck;
        residual[node][prev] += bottleneck;
      }

      maxFlow += bottleneck;
    }

    hubs.forEach(hub => {
      incidents.forEach(incident => {
        const reverseFlow = residual[incident.id] && residual[incident.id][hub.id] ? residual[incident.id][hub.id] : 0;
        if (reverseFlow > 0) {
          const route = graph.adjacency[hub.id].find(edge => edge.to === incident.id);
          allocations.push({
            hubId: hub.id,
            hubName: hub.name,
            incidentId: incident.id,
            incidentName: incident.name,
            people: reverseFlow,
            minutes: route.weight,
            bottleneck: reverseFlow >= route.capacity * 0.92
          });
        }
      });
    });

    return { maxFlow, allocations };
  }

  function forecastDemand(history, incidents, capacity) {
    const intensity = incidents.reduce((sum, incident) => sum + incident.severity * incident.people, 0) / Math.max(1, incidents.reduce((sum, incident) => sum + incident.people, 0));
    const trend = history[history.length - 1] - history[Math.max(0, history.length - 4)];
    const capacityGap = Math.max(0, incidents.reduce((sum, incident) => sum + incident.people, 0) - capacity);
    const predictions = [];

    for (let hour = 1; hour <= 8; hour += 1) {
      const nonlinearPeak = Math.sin((Math.PI * hour) / 9) * intensity * 3.2;
      const projected = history[history.length - 1] + trend * (hour / 4) + nonlinearPeak + capacityGap * 0.08;
      predictions.push(Math.max(0, Math.round(projected)));
    }

    const backtest = history.slice(1).map((actual, index) => {
      const predicted = Math.round(history[index] + (history[index] - (history[index - 1] || history[index])) * 0.6 + intensity);
      return Math.abs(actual - predicted) / Math.max(1, actual);
    });
    const mape = Math.round((backtest.reduce((sum, value) => sum + value, 0) / backtest.length) * 100);

    return { predictions, mape };
  }

  function solveRescuePlan(hubs, incidents, scenario) {
    const start = performance.now();
    const selected = chooseScenarioIncidents(incidents, scenario);
    const graph = buildGraph(hubs, selected);
    const shortest = {};
    hubs.forEach(hub => {
      shortest[hub.id] = dijkstra(graph, hub.id);
    });

    const flow = edmondsKarp(hubs, selected, graph);
    const totalDemand = selected.reduce((sum, incident) => sum + incident.people, 0);
    const fastestArrival = Math.min(...flow.allocations.map(item => item.minutes));
    const makespan = flow.allocations.reduce((max, item) => {
      const waves = Math.ceil(item.people / 110);
      return Math.max(max, item.minutes + waves * 9);
    }, 0);

    const runtime = performance.now() - start;
    return {
      graph,
      incidents: selected,
      shortest,
      ...flow,
      totalDemand,
      unmetDemand: Math.max(0, totalDemand - flow.maxFlow),
      coverageRate: totalDemand ? flow.maxFlow / totalDemand : 0,
      fastestArrival: Number.isFinite(fastestArrival) ? fastestArrival : 0,
      makespan,
      runtime
    };
  }

  function chooseScenarioIncidents(incidents, scenario) {
    const desiredPeople = Number(scenario.people || 1000);
    let candidates = incidents;

    if (scenario.disaster && scenario.disaster !== "auto") {
      const typeMap = {
        earthquake: ["earthquake"],
        flood: ["flood", "storm", "severeStorms"],
        wildfire: ["wildfire", "fire"]
      };
      candidates = incidents.filter(incident => (typeMap[scenario.disaster] || []).includes(incident.type));
    }

    if (!candidates.length) candidates = incidents;
    const ranked = [...candidates].sort((a, b) => b.severity - a.severity);
    const selected = ranked.slice(0, Math.min(4, ranked.length)).map((incident, index) => ({
      ...incident,
      people: index === 0 ? desiredPeople : Math.round(incident.people * 0.48)
    }));

    return selected;
  }

  window.ResQNetAlgorithms = {
    buildGraph,
    dijkstra,
    edmondsKarp,
    forecastDemand,
    solveRescuePlan,
    responseCapacity
  };
})();
