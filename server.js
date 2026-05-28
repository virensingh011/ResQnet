const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const { cities } = require("./src/cities");
const { loadLiveSignals } = require("./src/dataSources");
const { optimizeCrisisPlan } = require("./src/optimizer");
const { evaluatePlan } = require("./src/evaluation");
const { runStressTest } = require("./src/stressTest");

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(body);
}

function sendStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

async function handleApi(req, res, url) {
  const cityId = url.searchParams.get("city") || "all";
  const people = Number(url.searchParams.get("people") || 1000);
  const objective = url.searchParams.get("objective") || "balanced";
  const stress = url.searchParams.get("stress") || "normal";
  const selectedCities = cityId === "all" ? cities : cities.filter(city => city.id === cityId);

  if (!selectedCities.length) {
    sendJson(res, 404, { error: `Unknown city "${cityId}"` });
    return;
  }

  if (url.pathname === "/api/cities") {
    sendJson(res, 200, { cities });
    return;
  }

  if (url.pathname === "/api/live") {
    const signals = await loadLiveSignals(selectedCities);
    sendJson(res, 200, signals);
    return;
  }

  if (url.pathname === "/api/optimize") {
    const signals = await loadLiveSignals(selectedCities);
    const plan = optimizeCrisisPlan({
      cities: selectedCities,
      incidents: signals.incidents,
      people,
      objective,
      stress
    });
    sendJson(res, 200, { ...signals, plan, evaluation: evaluatePlan(plan) });
    return;
  }

  if (url.pathname === "/api/evaluate") {
    const signals = await loadLiveSignals(selectedCities);
    const plan = optimizeCrisisPlan({
      cities: selectedCities,
      incidents: signals.incidents,
      people,
      objective,
      stress
    });
    sendJson(res, 200, evaluatePlan(plan));
    return;
  }

  if (url.pathname === "/api/stress") {
    const cityCount = Number(url.searchParams.get("cities") || 25);
    const incidentCount = Number(url.searchParams.get("incidents") || 120);
    sendJson(res, 200, runStressTest({ cityCount, incidentCount }));
    return;
  }

  sendJson(res, 404, { error: "Unknown API route" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      res.end();
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    sendStatic(req, res);
  } catch (error) {
    sendJson(res, 500, {
      error: "Server error",
      message: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Next-Level ResQNet running at http://localhost:${PORT}`);
});
