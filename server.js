const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const EMPTY_STATE = {
  users: [],
  matches: [],
  predictions: [],
  resultSubmissions: [],
  predictionSubmissions: [],
  hiddenMissingTips: [],
  approvedResults: []
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function ensureStateFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(EMPTY_STATE, null, 2));
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": MIME[".json"] });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 10_000_000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(path.join(ROOT, requested.replace(/^\/+/, "")));
  if (!filePath.startsWith(ROOT) || filePath.includes(`${path.sep}data${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

function readState() {
  ensureStateFile();
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function writeState(state) {
  ensureStateFile();
  (state.users || []).forEach((user) => {
    delete user.password;
  });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

ensureStateFile();

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/state") && req.method === "GET") {
      ensureStateFile();
      res.writeHead(200, { "content-type": MIME[".json"], "cache-control": "no-store" });
      fs.createReadStream(STATE_FILE).pipe(res);
      return;
    }

    if (req.url.startsWith("/api/state") && req.method === "PUT") {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body.toString("utf8"));
      const state = {
        users: parsed.users || [],
        matches: parsed.matches || [],
        predictions: parsed.predictions || [],
        predictionSubmissions: parsed.predictionSubmissions || [],
        hiddenMissingTips: parsed.hiddenMissingTips || [],
        resultSubmissions: parsed.resultSubmissions || [],
        approvedResults: parsed.approvedResults || []
      };
      ensureStateFile();
      writeState(state);
      sendJson(res, 200, { ok: true });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`VB TippLiga server running on http://127.0.0.1:${PORT}`);
});
