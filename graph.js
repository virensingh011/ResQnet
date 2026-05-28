function haversineKm(a, b) {
  const radius = 6371;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

function hubCapacity(hub) {
  return Math.round(hub.teams * 18 + hub.ambulances * 9 + hub.beds * 0.45 + hub.kits / 18);
}

const stressProfiles = {
  normal: { label: "Normal", multiplier: 1, capacityPenalty: 0, riskBonus: 0 },
  congested: { label: "Congested", multiplier: 1.28, capacityPenalty: 0.12, riskBonus: 8 },
  blocked: { label: "Blocked", multiplier: 1.62, capacityPenalty: 0.28, riskBonus: 16 }
};

function buildRescueGraph(cities, incidents, options = {}) {
  const stressProfile = stressProfiles[options.stress] || stressProfiles.normal;
  const hubs = cities.flatMap(city => city.hubs.map(hub => ({
    ...hub,
    city: city.name,
    cityId: city.id,
    capacity: hubCapacity(hub)
  })));
  const nodes = [
    ...hubs.map(hub => ({ id: hub.id, type: "hub", label: hub.name })),
    ...incidents.map(incident => ({ id: incident.id, type: "incident", label: incident.name }))
  ];

  const adjacency = new Map(nodes.map(node => [node.id, []]));
  const edges = [];

  for (const hub of hubs) {
    for (const incident of incidents) {
      const distanceKm = haversineKm(hub, incident);
      const isRegionalRoute = hub.cityId === incident.cityId || distanceKm <= 350;
      if (!isRegionalRoute) continue;

      const speedKmh = incident.kind === "earthquake" ? 38 : incident.kind === "storm" ? 34 : 42;
      const hazardPenalty = 1 + incident.severity / 210;
      const demandPenalty = 1 + Math.min(0.42, incident.people / 12000);
      const travelMinutes = Math.round((8 + (distanceKm / speedKmh) * 60) * hazardPenalty * demandPenalty * stressProfile.multiplier);
      const riskWeight = Math.min(100, Math.round(incident.severity * 0.55 + Math.min(35, incident.people / 120) + stressProfile.riskBonus));
      const capacity = Math.max(20, Math.round(
        hub.capacity
        * Math.max(0.16, 1 - distanceKm / 2600)
        * (1 - incident.severity / 340)
        * (1 - stressProfile.capacityPenalty)
      ));
      const edge = { from: hub.id, to: incident.id, weight: travelMinutes, capacity, distanceKm: Math.round(distanceKm), riskWeight };
      adjacency.get(hub.id).push(edge);
      edges.push(edge);
    }
  }

  return { nodes, hubs, incidents, adjacency, edges, stressProfile };
}

function dijkstra(adjacency, startId) {
  const distances = {};
  const previous = {};
  const queue = new Set(adjacency.keys());

  for (const node of queue) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[startId] = 0;

  while (queue.size) {
    let current = null;
    for (const node of queue) {
      if (current === null || distances[node] < distances[current]) current = node;
    }

    if (current === null || distances[current] === Infinity) break;
    queue.delete(current);

    for (const edge of adjacency.get(current) || []) {
      const candidate = distances[current] + edge.weight;
      if (candidate < distances[edge.to]) {
        distances[edge.to] = candidate;
        previous[edge.to] = current;
      }
    }
  }

  return { distances, previous };
}

function edmondsKarp({ hubs, incidents, edges }) {
  const source = "source";
  const sink = "sink";
  const residual = new Map();

  function ensure(node) {
    if (!residual.has(node)) residual.set(node, new Map());
  }

  function addEdge(from, to, capacity) {
    ensure(from);
    ensure(to);
    residual.get(from).set(to, (residual.get(from).get(to) || 0) + capacity);
    residual.get(to).set(from, residual.get(to).get(from) || 0);
  }

  for (const hub of hubs) addEdge(source, hub.id, hub.capacity);
  for (const edge of edges) addEdge(edge.from, edge.to, edge.capacity);
  for (const incident of incidents) addEdge(incident.id, sink, incident.people);

  let maxFlow = 0;

  while (true) {
    const parent = new Map([[source, null]]);
    const queue = [source];

    for (let i = 0; i < queue.length; i += 1) {
      const node = queue[i];
      for (const [next, capacity] of residual.get(node).entries()) {
        if (capacity > 0 && !parent.has(next)) {
          parent.set(next, node);
          queue.push(next);
        }
      }
    }

    if (!parent.has(sink)) break;

    let bottleneck = Infinity;
    for (let node = sink; node !== source; node = parent.get(node)) {
      const prev = parent.get(node);
      bottleneck = Math.min(bottleneck, residual.get(prev).get(node));
    }

    for (let node = sink; node !== source; node = parent.get(node)) {
      const prev = parent.get(node);
      residual.get(prev).set(node, residual.get(prev).get(node) - bottleneck);
      residual.get(node).set(prev, residual.get(node).get(prev) + bottleneck);
    }

    maxFlow += bottleneck;
  }

  const allocations = [];
  for (const edge of edges) {
    const flow = residual.get(edge.to).get(edge.from) || 0;
    if (flow > 0) {
      allocations.push({
        from: edge.from,
        to: edge.to,
        people: flow,
        travelMinutes: edge.weight,
        capacity: edge.capacity,
        utilization: flow / edge.capacity,
        riskWeight: edge.riskWeight,
        distanceKm: edge.distanceKm
      });
    }
  }

  return { maxFlow, allocations };
}

module.exports = {
  buildRescueGraph,
  dijkstra,
  edmondsKarp,
  haversineKm,
  hubCapacity,
  stressProfiles
};
