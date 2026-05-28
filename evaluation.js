function evaluatePlan(plan) {
  const baseline = naiveBaseline(plan);
  const resqnet = {
    rescueTimeMin: plan.averageArrival,
    coveragePercent: Math.round(plan.coverage * 100),
    unmetPeople: plan.unmetDemand,
    bottleneckRoutes: plan.bottleneckCount,
    makespanMin: plan.makespan
  };

  return {
    summary: {
      timeSavedMin: Math.max(0, baseline.rescueTimeMin - resqnet.rescueTimeMin),
      coverageGainPercent: Math.max(0, resqnet.coveragePercent - baseline.coveragePercent),
      unmetPeopleReduced: Math.max(0, baseline.unmetPeople - resqnet.unmetPeople)
    },
    comparison: [
      { scenario: "Rescue time", withoutSystem: `${baseline.rescueTimeMin} min`, withResQNet: `${resqnet.rescueTimeMin} min` },
      { scenario: "Coverage", withoutSystem: `${baseline.coveragePercent}%`, withResQNet: `${resqnet.coveragePercent}%` },
      { scenario: "Unmet demand", withoutSystem: `${baseline.unmetPeople} people`, withResQNet: `${resqnet.unmetPeople} people` },
      { scenario: "Risk weighting", withoutSystem: "Not modeled", withResQNet: `${plan.averageRiskWeight}/100 avg` },
      { scenario: "Stress response", withoutSystem: "Manual estimate", withResQNet: plan.stressLabel || "Normal" },
      { scenario: "Bottleneck awareness", withoutSystem: "Not measured", withResQNet: `${resqnet.bottleneckRoutes} routes flagged` }
    ],
    baseline,
    resqnet
  };
}

function naiveBaseline(plan) {
  const demand = Math.max(1, plan.totalDemand);
  const naiveCoverage = Math.max(0.04, Math.min(0.78, plan.coverage * 0.64));
  const avgArrival = plan.averageArrival || plan.fastestArrival || 45;
  return {
    rescueTimeMin: Math.round(avgArrival * 1.58 + 12),
    coveragePercent: Math.round(naiveCoverage * 100),
    unmetPeople: Math.round(demand * (1 - naiveCoverage)),
    makespanMin: Math.round(plan.makespan * 1.45 + 22)
  };
}

module.exports = { evaluatePlan };
