# Graph-Based Emergency Routing System with Risk-Aware Path Optimization

Advanced real-time crisis optimization system made by **Viren Singh**.

This version is built around a single map-centered decision UI that makes the algorithmic pipeline visible:

```text
Input: hazard data + graph nodes + route stress
Process: weighted graph routing + capacity flow
Output: safest feasible path + risk score
```

It can run with the Node.js backend for live data, and it can also be hosted as static files on GitHub Pages using the browser fallback engine.

## Upgrades included

- Real USGS earthquake feed ingestion.
- Real weather ingestion with Open-Meteo.
- Node.js backend API.
- Proper Dijkstra shortest-path implementation.
- Proper Edmonds-Karp max-flow implementation.
- Map-centered rescue routing UI.
- Visible Input -> Process -> Output decision pipeline.
- Interactive Cytoscape.js graph visualization with draggable nodes and clickable nodes/edges.
- Dijkstra and A* route comparison toggle.
- Animated path traversal for the selected route.
- Disaster simulation sliders for flood level, earthquake severity, and traffic congestion.
- Scenario presets for earthquake, flood, and normal traffic modes.
- Route explanation panel with node risk, edge weight, avoided risky nodes, and cost breakdown.
- Performance metrics dashboard with nodes visited, path cost, and JS execution time.
- Route stress control that directly changes graph edge cost and capacity.
- Risk-weighted route ranking using severity, demand, stress, and travel time.
- Evaluation table comparing baseline planning vs ResQNet.
- Research-style explanation of graph model, risk weighting, capacity flow, and decision output.
- Static GitHub Pages fallback with in-browser Dijkstra and max-flow logic.

## Run locally

Requires Node.js 18 or newer.

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Useful API routes

```text
/api/cities
/api/live?city=all
/api/optimize?city=all&people=1000&objective=balanced
/api/optimize?city=all&people=1000&objective=balanced&stress=blocked
/api/evaluate?city=all&people=1000&objective=balanced
/api/stress?cities=40&incidents=220
```

## Check code

```bash
npm run check
npm run stress
```

## GitHub hosting

This project is GitHub-hostable in two ways:

1. GitHub Pages can host the static frontend. Open `index.html`; it redirects to `public/index.html`. In this mode the app uses the browser fallback engine.
2. A Node host such as Render, Railway, Fly.io, or GitHub Codespaces can run `server.js` for live USGS and Open-Meteo data.

For GitHub Pages, commit the project and set Pages to deploy from the repository root. No backend secrets are required.

## Data sources

- USGS Earthquake GeoJSON feeds: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- Open-Meteo forecast API: https://open-meteo.com/en/docs

## Disclaimer

This is an educational research prototype. It is not an official emergency
management system and must not be used for real rescue operations without
professional validation and verified operational data.
