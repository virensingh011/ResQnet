const { optimizeCrisisPlan } = require("./optimizer");

function runStressTest({ cityCount = 25, incidentCount = 120 } = {}) {
  const cities = makeSyntheticCities(cityCount);
  const incidents = makeSyntheticIncidents(incidentCount, cities);
  const startedAt = performance.now();
  const plan = optimizeCrisisPlan({ cities, incidents, people: 1000, objective: "coverage" });
  const runtimeMs = Number((performance.now() - startedAt).toFixed(3));

  return {
    generatedCities: cityCount,
    generatedIncidents: incidentCount,
    nodes: plan.nodes,
    edges: plan.edges,
    allocations: plan.allocations.length,
    maxFlow: plan.maxFlow,
    coverage: plan.coverage,
    runtimeMs,
    status: runtimeMs < 250 ? "pass" : "review"
  };
}

function makeSyntheticCities(count) {
  return Array.from({ length: count }, (_, index) => {
    const lat = 24 + (index % 12) * 3.6;
    const lon = -125 + Math.floor(index / 12) * 18;
    return {
      id: `synthetic-city-${index}`,
      name: `Synthetic City ${index + 1}`,
      lat,
      lon,
      population: 180000 + index * 42000,
      risk: { earthquake: 0.35 + (index % 5) * 0.08, flood: 0.3 + (index % 4) * 0.11, storm: 0.28 + (index % 6) * 0.09 },
      hubs: [
        { id: `synthetic-hub-${index}-a`, name: `Hub ${index + 1}A`, lat: lat + 0.1, lon: lon - 0.1, teams: 24 + index % 18, ambulances: 10 + index % 12, beds: 80 + index % 100, kits: 900 + index * 22 },
        { id: `synthetic-hub-${index}-b`, name: `Hub ${index + 1}B`, lat: lat - 0.12, lon: lon + 0.1, teams: 18 + index % 15, ambulances: 8 + index % 10, beds: 70 + index % 90, kits: 760 + index * 19 }
      ]
    };
  });
}

function makeSyntheticIncidents(count, cities) {
  return Array.from({ length: count }, (_, index) => {
    const city = cities[index % cities.length];
    const kind = ["earthquake", "storm", "flood"][index % 3];
    return {
      id: `synthetic-incident-${index}`,
      name: `Synthetic ${kind} ${index + 1}`,
      kind,
      source: "Stress generator",
      cityId: city.id,
      cityName: city.name,
      lat: city.lat + ((index % 7) - 3) * 0.08,
      lon: city.lon + ((index % 5) - 2) * 0.09,
      magnitude: 4 + (index % 8) * 0.4,
      severity: 42 + (index % 55),
      people: 240 + (index % 30) * 55,
      ageMinutes: index * 3,
      url: "#"
    };
  });
}

if (require.main === module) {
  console.log(JSON.stringify(runStressTest({ cityCount: 40, incidentCount: 220 }), null, 2));
}

module.exports = { runStressTest };
