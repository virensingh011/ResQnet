window.ResQNetData = {
  hubs: [
    { id: "hub_north", name: "North Medical Hub", x: 22, y: 25, teams: 34, ambulances: 18, beds: 120, kits: 900 },
    { id: "hub_central", name: "Central Logistics Base", x: 44, y: 58, teams: 46, ambulances: 22, beds: 180, kits: 1600 },
    { id: "hub_south", name: "South Rapid Response", x: 24, y: 78, teams: 28, ambulances: 14, beds: 90, kits: 700 },
    { id: "hub_east", name: "East Airlift Node", x: 77, y: 36, teams: 38, ambulances: 16, beds: 100, kits: 1100 }
  ],

  fallbackIncidents: [
    {
      id: "fallback_eq_001",
      name: "M6.7 earthquake near coastal urban belt",
      type: "earthquake",
      source: "Research fallback",
      latitude: 34.05,
      longitude: -118.25,
      x: 74,
      y: 68,
      magnitude: 6.7,
      people: 1850,
      severity: 92,
      time: Date.now() - 1000 * 60 * 42,
      url: "https://earthquake.usgs.gov/"
    },
    {
      id: "fallback_flood_001",
      name: "Open flood event affecting river basin",
      type: "flood",
      source: "Research fallback",
      latitude: 28.61,
      longitude: 77.2,
      x: 58,
      y: 31,
      magnitude: 7.8,
      people: 1320,
      severity: 84,
      time: Date.now() - 1000 * 60 * 110,
      url: "https://eonet.gsfc.nasa.gov/"
    },
    {
      id: "fallback_fire_001",
      name: "Wildfire perimeter expanding near dry corridor",
      type: "wildfire",
      source: "Research fallback",
      latitude: 39.73,
      longitude: -104.99,
      x: 38,
      y: 18,
      magnitude: 6.1,
      people: 760,
      severity: 73,
      time: Date.now() - 1000 * 60 * 190,
      url: "https://eonet.gsfc.nasa.gov/"
    },
    {
      id: "fallback_storm_001",
      name: "Severe storm track threatening coastal shelters",
      type: "storm",
      source: "Research fallback",
      latitude: 25.76,
      longitude: -80.19,
      x: 70,
      y: 22,
      magnitude: 5.8,
      people: 980,
      severity: 79,
      time: Date.now() - 1000 * 60 * 70,
      url: "https://eonet.gsfc.nasa.gov/"
    }
  ],

  historicalDemand: [420, 510, 620, 760, 910, 1080, 1190, 1285],

  benchmarkLabels: [
    "Now",
    "+1h",
    "+2h",
    "+3h",
    "+4h",
    "+5h",
    "+6h",
    "Peak"
  ]
};
