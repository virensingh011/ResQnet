# Next-Level ResQNet

Advanced Real-Time Crisis Optimization System made by **Viren Singh**.

This is now a real backend-powered system, not only a frontend simulation.

## Upgrades included

- Real USGS earthquake feed ingestion.
- Real weather ingestion with Open-Meteo.
- Node.js backend API.
- Proper Dijkstra shortest-path implementation.
- Proper Edmonds-Karp max-flow implementation.
- Evaluation table comparing baseline vs ResQNet.
- Multiple cities and multi-hub rescue planning.
- Stress testing for scaling behavior.

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
/api/evaluate?city=all&people=1000&objective=balanced
/api/stress?cities=40&incidents=220
```

## Check code

```bash
npm run check
npm run stress
```

## GitHub note

GitHub Pages can host static frontend files, but it cannot run a Node.js backend.
For the full system, run with `npm start`, GitHub Codespaces, Render, Railway, Fly.io,
or another Node hosting platform.

## Data sources

- USGS Earthquake GeoJSON feeds: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- Open-Meteo forecast API: https://open-meteo.com/en/docs

## Disclaimer

This is an educational research prototype. It is not an official emergency
management system and must not be used for real rescue operations without
professional validation and verified operational data.
