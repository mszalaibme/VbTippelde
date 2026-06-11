const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const PASSWORD_ITERATIONS = 150000;
const SYSTEM_ADMIN_ID = "__system_admin__";
const BOOTSTRAP_ADMIN_NAME = "admin";
const BOOTSTRAP_ADMIN_PASSWORD = "admin8520";

const EMPTY_STATE = {
  users: [],
  matches: [],
  predictions: [],
  resultSubmissions: [],
  predictionSubmissions: [],
  passwordResetRequests: [],
  hiddenMissingTips: [],
  teamAssignments: {},
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
  res.writeHead(status, { "content-type": MIME[".json"], "cache-control": "no-store" });
  res.end(JSON.stringify(payload));
}

function sendOptions(res) {
  res.writeHead(204, {
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "cache-control": "no-store"
  });
  res.end();
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
  const state = { ...EMPTY_STATE, ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
  return withSystemAdmin(state);
}

function writeState(state) {
  ensureStateFile();
  const safeState = { ...EMPTY_STATE, ...state };
  safeState.users = (safeState.users || [])
    .filter((user) => !isSystemAdminUser(user))
    .map((user) => {
    const clean = { ...user };
    delete clean.password;
    return clean;
  });
  fs.writeFileSync(STATE_FILE, JSON.stringify(safeState, null, 2));
}

function hashPassword(password, saltValue) {
  const salt = saltValue ? Buffer.from(saltValue, "base64") : crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 32, "sha256");
  return {
    passwordSalt: salt.toString("base64"),
    passwordHash: hash.toString("base64"),
    passwordVersion: 2,
    passwordIterations: PASSWORD_ITERATIONS
  };
}

function setPassword(user, password) {
  Object.assign(user, hashPassword(password));
  delete user.password;
}

function systemAdminUser() {
  return {
    id: SYSTEM_ADMIN_ID,
    name: BOOTSTRAP_ADMIN_NAME,
    isAdmin: true,
    isSystemAdmin: true,
    mustChangePassword: false,
    createdAt: "system"
  };
}

function isSystemAdminUser(user) {
  return user?.isSystemAdmin || user?.id === SYSTEM_ADMIN_ID || String(user?.name || "").toLowerCase() === BOOTSTRAP_ADMIN_NAME.toLowerCase();
}

function withSystemAdmin(state) {
  state.users = state.users || [];
  state.users = state.users.filter((user) => !isSystemAdminUser(user));
  state.users.unshift(systemAdminUser());
  return state;
}

function verifyPassword(user, password) {
  if (isSystemAdminUser(user)) {
    return password === BOOTSTRAP_ADMIN_PASSWORD;
  }
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const candidate = hashPassword(password, user.passwordSalt).passwordHash;
  const stored = Buffer.from(user.passwordHash, "base64");
  const incoming = Buffer.from(candidate, "base64");
  return stored.length === incoming.length && crypto.timingSafeEqual(stored, incoming);
}

function publicUser(user) {
  const clean = { ...user };
  delete clean.password;
  return clean;
}

function findUserByName(state, name) {
  const normalized = String(name || "").trim().toLowerCase();
  return state.users.find((user) => user.name.toLowerCase() === normalized);
}

async function readJsonBody(req) {
  const body = await readRequestBody(req);
  return JSON.parse(body.toString("utf8") || "{}");
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    sendOptions(res);
    return true;
  }

  if (url.pathname === "/api/state" && req.method === "GET") {
    sendJson(res, 200, readState());
    return true;
  }

  if (url.pathname === "/api/state" && req.method === "PUT") {
    const parsed = await readJsonBody(req);
    const state = {
      users: parsed.users || [],
      matches: parsed.matches || [],
      predictions: parsed.predictions || [],
      predictionSubmissions: parsed.predictionSubmissions || [],
      passwordResetRequests: parsed.passwordResetRequests || [],
      hiddenMissingTips: parsed.hiddenMissingTips || [],
      teamAssignments: parsed.teamAssignments || {},
      resultSubmissions: parsed.resultSubmissions || [],
      approvedResults: parsed.approvedResults || []
    };
    writeState(state);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/register" && req.method === "POST") {
    sendJson(res, 410, { error: "A nyilvános regisztráció ki van kapcsolva. Kérj hozzáférést az admintól." });
    return true;
  }

  if (url.pathname === "/api/admin-create-user" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = readState();
    const admin = state.users.find((item) => item.id === body.adminId);
    if (!admin?.isAdmin) {
      sendJson(res, 403, { error: "Nincs jogosultság felhasználó létrehozásához." });
      return true;
    }
    const name = String(body.name || "").trim();
    if (!name || !body.password) {
      sendJson(res, 400, { error: "Név és jelszó is kell." });
      return true;
    }
    if (findUserByName(state, name)) {
      sendJson(res, 409, { error: "Ez a név már létezik." });
      return true;
    }
    const user = {
      id: crypto.randomUUID(),
      name,
      isAdmin: Boolean(body.isAdmin),
      isSystemAdmin: false,
      mustChangePassword: true,
      createdByAdmin: admin.id,
      createdAt: new Date().toISOString()
    };
    setPassword(user, body.password);
    state.users.push(user);
    writeState(state);
    sendJson(res, 200, { ok: true, user: publicUser(user), state: readState() });
    return true;
  }

  if (url.pathname === "/api/login" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = readState();
    const user = findUserByName(state, body.name);
    if (!user) {
      sendJson(res, 404, { error: "Nincs ilyen felhasználó." });
      return true;
    }
    if (!verifyPassword(user, body.password)) {
      sendJson(res, 401, { error: "Hibás jelszó." });
      return true;
    }
    sendJson(res, 200, { ok: true, user: publicUser(user), state });
    return true;
  }

  if (url.pathname === "/api/change-password" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = readState();
    const user = state.users.find((item) => item.id === body.userId);
    if (isSystemAdminUser(user)) {
      sendJson(res, 403, { error: "Az alap admin jelszava be van építve az appba." });
      return true;
    }
    if (!user || !verifyPassword(user, body.oldPassword)) {
      sendJson(res, 401, { error: "A régi jelszó nem stimmel." });
      return true;
    }
    setPassword(user, body.newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date().toISOString();
    writeState(state);
    sendJson(res, 200, { ok: true, state: readState() });
    return true;
  }

  if (url.pathname === "/api/complete-first-password-change" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = readState();
    const user = state.users.find((item) => item.id === body.userId);
    if (!user || !user.mustChangePassword || !body.newPassword) {
      sendJson(res, 403, { error: "A jelszó módosítása nem engedélyezett." });
      return true;
    }
    setPassword(user, body.newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date().toISOString();
    writeState(state);
    sendJson(res, 200, { ok: true, state: readState() });
    return true;
  }

  if (url.pathname === "/api/admin-set-password" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = readState();
    const admin = state.users.find((item) => item.id === body.adminId);
    const user = state.users.find((item) => item.id === body.userId);
    if (isSystemAdminUser(user)) {
      sendJson(res, 403, { error: "Az alap admin jelszava be van építve az appba." });
      return true;
    }
    if (!admin?.isAdmin || !user || !body.password) {
      sendJson(res, 403, { error: "Nincs jogosultság a jelszó visszaállításához." });
      return true;
    }
    setPassword(user, body.password);
    if (!user.isSystemAdmin) user.mustChangePassword = true;
    writeState(state);
    sendJson(res, 200, { ok: true, state: readState() });
    return true;
  }

  if (url.pathname === "/api/resolve-password-reset" && req.method === "POST") {
    const body = await readJsonBody(req);
    const state = readState();
    const admin = state.users.find((item) => item.id === body.adminId);
    const request = state.passwordResetRequests.find((item) => item.id === body.requestId);
    const user = request ? state.users.find((item) => item.id === request.userId) : null;
    if (isSystemAdminUser(user)) {
      sendJson(res, 403, { error: "Az alap admin jelszava be van építve az appba." });
      return true;
    }
    if (!admin?.isAdmin || !request || !user || !body.password) {
      sendJson(res, 403, { error: "Nincs jogosultság a jelszó visszaállításához." });
      return true;
    }
    setPassword(user, body.password);
    if (!user.isSystemAdmin) user.mustChangePassword = true;
    request.status = "resolved";
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = admin.id;
    writeState(state);
    sendJson(res, 200, { ok: true, state: readState() });
    return true;
  }

  return false;
}

ensureStateFile();

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/") && await handleApi(req, res)) {
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`VB TippLiga server running on http://${HOST}:${PORT}`);
});
