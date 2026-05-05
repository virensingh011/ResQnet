const { buildRescueGraph, dijkstra, edmondsKarp } = require("./graph");

function optimizeCrisisPlan({ cities, incidents, people = 1000, objective = "balanced" }) {
  const startedAt = performance.now();
  const selectedIncidents = selectIncidents(incidents, people, objective);
  const graph = buildRescueGraph(cities, selectedIncidents);
  const shortestRoutes = {};

  for (const hub of graph.hubs) {
    shortestRoutes[hub.id] = dijkstra(graph.adjacency, hub.id);
  }

  const flow = edmondsKarp(graph);
  const totalDemand = selectedIncidents.reduce((sum, incident) => sum + incident.people, 0);
  const allocationDetails = flow.allocations
    .map(allocation => {
      const hub = graph.hubs.find(item => item.id === allocation.from);
      const incident = selectedIncidents.find(item => item.id === allocation.to);
      return {
        ...allocation,
        hubName: hub.name,
        hubCity: hub.city,
        incidentName: incident.name,
        incidentKind: incident.kind,
        incidentCity: incident.cityName,
        bottleneck: allocation.utilization >= 0.9
      };
    })
    .sort((a, b) => a.travelMinutes - b.travelMinutes || b.people - a.people);

  const fastestArrival = allocationDetails.length ? Math.min(...allocationDetails.map(item => item.travelMinutes)) : 0;
  const makespan = allocationDetails.reduce((max, item) => {
    const waves = Math.ceil(item.people / 125);
    return Math.max(max, item.travelMinutes + waves * 8);
  }, 0);
  const averageArrival = allocationDetails.length
    ? Math.round(allocationDetails.reduce((sum, item) => sum + item.travelMinutes * item.people, 0) / Math.max(1, flow.maxFlow))
    : 0;

  return {
    objective,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    incidents: selectedIncidents,
    totalDemand,
    maxFlow: flow.maxFlow,
    unmetDemand: Math.max(0, totalDemand - flow.maxFlow),
    coverage: totalDemand ? Number((flow.maxFlow / totalDemand).toFixed(3)) : 0,
    fastestArrival,
    averageArrival,
    makespan,
    bottleneckCount: allocationDetails.filter(item => item.bottleneck).length,
    allocations: allocationDetails,
    runtimeMs: Number((performance.now() - startedAt).toFixed(3))
  };
}

function selectIncidents(incidents, people, objective) {
  const ranked = [...incidents].sort((a, b) => {
    const scoreA = scoreIncident(a, objective);
    const scoreB = scoreIncident(b, objective);
    return scoreB - scoreA;
  });

  return ranked.slice(0, Math.min(6, ranked.length)).map((incident, index) => ({
    ...incident,
    people: index === 0 ? Math.max(people, incident.people) : incident.people
  }));
}

function scoreIncident(incident, objective) {
  const base = incident.people * 0.62 + incident.severity * 18;
  if (objective === "coverage") return base + incident.people * 0.28;
  if (objective === "fastest") return base - incident.ageMinutes * 0.9;
  return base + incident.severity * 6;
}

module.exports = { optimizeCrisisPlan };
