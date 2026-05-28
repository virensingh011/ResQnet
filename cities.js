const cities = [
  {
    id: "san-francisco",
    name: "San Francisco",
    country: "USA",
    lat: 37.7749,
    lon: -122.4194,
    population: 808000,
    risk: { earthquake: 0.95, flood: 0.28, storm: 0.31 },
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
    risk: { earthquake: 0.9, flood: 0.2, storm: 0.25 },
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
    risk: { earthquake: 0.05, flood: 0.78, storm: 0.94 },
    hubs: [
      { id: "miami-emergency", name: "Miami Emergency Operations", lat: 25.7751, lon: -80.2105, teams: 36, ambulances: 16, beds: 150, kits: 2200 },
      { id: "dade-shelter", name: "Dade Shelter Network", lat: 25.695, lon: -80.304, teams: 32, ambulances: 12, beds: 240, kits: 2800 }
    ]
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    lat: 40.7128,
    lon: -74.006,
    population: 8258000,
    risk: { earthquake: 0.18, flood: 0.55, storm: 0.72 },
    hubs: [
      { id: "nyc-health", name: "NYC Health Command", lat: 40.7122, lon: -74.002, teams: 62, ambulances: 42, beds: 520, kits: 4200 },
      { id: "jersey-logistics", name: "Jersey Logistics Yard", lat: 40.7357, lon: -74.1724, teams: 45, ambulances: 28, beds: 220, kits: 3600 }
    ]
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
    population: 14000000,
    risk: { earthquake: 0.98, flood: 0.42, storm: 0.64 },
    hubs: [
      { id: "tokyo-med", name: "Tokyo Metropolitan Medical Base", lat: 35.6895, lon: 139.6917, teams: 78, ambulances: 48, beds: 650, kits: 5200 },
      { id: "yokohama-port", name: "Yokohama Port Response", lat: 35.4437, lon: 139.638, teams: 52, ambulances: 31, beds: 320, kits: 4300 }
    ]
  },
  {
    id: "delhi",
    name: "Delhi",
    country: "India",
    lat: 28.6139,
    lon: 77.209,
    population: 16700000,
    risk: { earthquake: 0.58, flood: 0.66, storm: 0.48 },
    hubs: [
      { id: "delhi-aiims", name: "AIIMS Emergency Hub", lat: 28.5672, lon: 77.21, teams: 64, ambulances: 38, beds: 560, kits: 4800 },
      { id: "ncr-logistics", name: "NCR Logistics Depot", lat: 28.4595, lon: 77.0266, teams: 55, ambulances: 29, beds: 300, kits: 5100 }
    ]
  }
];

module.exports = { cities };
