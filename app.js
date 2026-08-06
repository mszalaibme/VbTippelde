const STORAGE_KEY = "vb-tippliga-2026-v4";
const CURRENT_USER_KEY = "vb-tippliga-current-user-v4";
const CURRENT_USER_NAME_KEY = "vb-tippliga-current-user-name-v1";
const CURRENT_USER_COOKIE = "vb_tippliga_current_user";
const REMINDER_KEY = "vb-tippliga-reminders-v1";
const APP_VERSION = "v52";
const WHATS_NEW_KEY = "vb-tippliga-whats-new";
const PASSWORD_ITERATIONS = 150000;
const REMINDER_LEAD_MS = 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 5 * 60 * 1000;
const MISSING_TIP_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;
const SYSTEM_ADMIN_ID = "__system_admin__";
const SYSTEM_ADMIN_NAME = "admin";
const SYSTEM_ADMIN_PASSWORD = "admin8520";
const TEAM_COMPETITION_TEAMS = [
  { id: "team-a", name: "A csapat", color: "#2f855a", soft: "#e4f4ea" },
  { id: "team-b", name: "B csapat", color: "#c26a22", soft: "#fff0dc" },
  { id: "team-c", name: "C csapat", color: "#6b46c1", soft: "#f0eaff" }
];

const seedMatches = [];

const roundOf32Slots = [
  { no: 73, home: { group: "A", rank: 2 }, away: { group: "B", rank: 2 } },
  { no: 74, home: { group: "E", rank: 1 }, away: { groups: ["A", "B", "C", "D", "F"], rank: 3, fallback: "A/B/C/D/F csoport 3." } },
  { no: 75, home: { group: "F", rank: 1 }, away: { group: "C", rank: 2 } },
  { no: 76, home: { group: "C", rank: 1 }, away: { group: "F", rank: 2 } },
  { no: 77, home: { group: "I", rank: 1 }, away: { groups: ["C", "D", "F", "G", "H"], rank: 3, fallback: "C/D/F/G/H csoport 3." } },
  { no: 78, home: { group: "E", rank: 2 }, away: { group: "I", rank: 2 } },
  { no: 79, home: { group: "A", rank: 1 }, away: { groups: ["C", "E", "F", "H", "I"], rank: 3, fallback: "C/E/F/H/I csoport 3." } },
  { no: 80, home: { group: "L", rank: 1 }, away: { groups: ["E", "H", "I", "J", "K"], rank: 3, fallback: "E/H/I/J/K csoport 3." } },
  { no: 81, home: { group: "D", rank: 1 }, away: { groups: ["B", "E", "F", "I", "J"], rank: 3, fallback: "B/E/F/I/J csoport 3." } },
  { no: 82, home: { group: "G", rank: 1 }, away: { groups: ["A", "E", "H", "I", "J"], rank: 3, fallback: "A/E/H/I/J csoport 3." } },
  { no: 83, home: { group: "K", rank: 2 }, away: { group: "L", rank: 2 } },
  { no: 84, home: { group: "H", rank: 1 }, away: { group: "J", rank: 2 } },
  { no: 85, home: { group: "B", rank: 1 }, away: { groups: ["E", "F", "G", "I", "J"], rank: 3, fallback: "E/F/G/I/J csoport 3." } },
  { no: 86, home: { group: "J", rank: 1 }, away: { group: "H", rank: 2 } },
  { no: 87, home: { group: "K", rank: 1 }, away: { groups: ["D", "E", "I", "J", "L"], rank: 3, fallback: "D/E/I/J/L csoport 3." } },
  { no: 88, home: { group: "D", rank: 2 }, away: { group: "G", rank: 2 } }
];

const bracketLeafOrder = [73, 75, 74, 77, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87];

const knockoutBracketRounds = [
  {
    title: "Legjobb 32",
    matches: roundOf32Slots
  },
  {
    title: "NyolcaddÃ¶ntÅ‘",
    matches: [
      { no: 89, homeFrom: 73, awayFrom: 75 },
      { no: 90, homeFrom: 74, awayFrom: 77 },
      { no: 91, homeFrom: 76, awayFrom: 78 },
      { no: 92, homeFrom: 79, awayFrom: 80 },
      { no: 93, homeFrom: 83, awayFrom: 84 },
      { no: 94, homeFrom: 81, awayFrom: 82 },
      { no: 95, homeFrom: 86, awayFrom: 88 },
      { no: 96, homeFrom: 85, awayFrom: 87 }
    ]
  },
  {
    title: "NegyeddÃ¶ntÅ‘",
    matches: [
      { no: 97, homeFrom: 89, awayFrom: 90 },
      { no: 98, homeFrom: 93, awayFrom: 94 },
      { no: 99, homeFrom: 91, awayFrom: 92 },
      { no: 100, homeFrom: 95, awayFrom: 96 }
    ]
  },
  {
    title: "ElÅ‘dÃ¶ntÅ‘",
    matches: [
      { no: 101, homeFrom: 97, awayFrom: 98 },
      { no: 102, homeFrom: 99, awayFrom: 100 }
    ]
  },
  {
    title: "DÃ¶ntÅ‘k",
    matches: [
      { no: 103, homeFrom: 101, awayFrom: 102, sourceType: "loser", note: "Bronzmeccs" },
      { no: 104, homeFrom: 101, awayFrom: 102, note: "DÃ¶ntÅ‘" }
    ]
  }
];

let state = loadState();
let currentUserId = localStorage.getItem(CURRENT_USER_KEY) || readPersistentUserCookie();
let serverSyncAvailable = false;
let suppressServerSave = false;
let standingsMode = "players";
let tipsUserFilter = "all";

function hasWebCrypto() {
  return Boolean(window.crypto?.subtle && window.crypto?.getRandomValues);
}

function shouldUseServerStorage() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
}

function readPersistentUserCookie() {
  const prefix = `${CURRENT_USER_COOKIE}=`;
  const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

function storePersistentUserCookie(userId) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CURRENT_USER_COOKIE}=${encodeURIComponent(userId)}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
}

function clearPersistentUserCookie() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CURRENT_USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function createId() {
  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  const random = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(random);
  } else {
    for (let index = 0; index < random.length; index += 1) {
      random[index] = Math.floor(Math.random() * 256);
    }
  }
  random[6] = (random[6] & 0x0f) | 0x40;
  random[8] = (random[8] & 0x3f) | 0x80;
  const hex = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const els = {
  loginPanel: document.querySelector("#loginPanel"),
  dashboard: document.querySelector("#dashboard"),
  loginForm: document.querySelector("#loginForm"),
  loginName: document.querySelector("#loginName"),
  loginPassword: document.querySelector("#loginPassword"),
  openPasswordResetBtn: document.querySelector("#openPasswordResetBtn"),
  closePasswordResetBtn: document.querySelector("#closePasswordResetBtn"),
  passwordResetDialog: document.querySelector("#passwordResetDialog"),
  passwordResetForm: document.querySelector("#passwordResetForm"),
  passwordResetName: document.querySelector("#passwordResetName"),
  passwordResetMessage: document.querySelector("#passwordResetMessage"),
  whatsNewDialog: document.querySelector("#whatsNewDialog"),
  closeWhatsNewBtn: document.querySelector("#closeWhatsNewBtn"),
  loginMessage: document.querySelector("#loginMessage"),
  sessionBox: document.querySelector("#sessionBox"),
  welcomeTitle: document.querySelector("#welcomeTitle"),
  myScore: document.querySelector("#myScore"),
  pendingCount: document.querySelector("#pendingCount"),
  passwordGate: document.querySelector("#passwordGate"),
  tabs: document.querySelector("#mainTabs"),
  matchesView: document.querySelector("#matchesView"),
  standingsView: document.querySelector("#standingsView"),
  myTipsView: document.querySelector("#myTipsView"),
  tipsView: document.querySelector("#tipsView"),
  resultsView: document.querySelector("#resultsView"),
  playedView: document.querySelector("#playedView"),
  adminView: document.querySelector("#adminView"),
  scrollTopBtn: document.querySelector("#scrollTopBtn")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return normalizeState(JSON.parse(saved));
  }
  const initial = {
    users: [],
    matches: seedMatches,
    predictions: [],
    predictionSubmissions: [],
    resultSubmissions: [],
    passwordResetRequests: [],
    hiddenMissingTips: [],
    teamAssignments: {},
    approvedResults: []
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedStateForStorage(initial)));
  return initial;
}

function normalizeState(value) {
  return {
    users: (value.users || []).filter((user) => !isSystemAdminRecord(user)).map(normalizeUser),
    matches: (value.matches || seedMatches).map((match) => ({ group: "", ...match })),
    predictions: value.predictions || [],
    predictionSubmissions: value.predictionSubmissions || [],
    resultSubmissions: value.resultSubmissions || [],
    passwordResetRequests: value.passwordResetRequests || [],
    hiddenMissingTips: value.hiddenMissingTips || [],
    teamAssignments: value.teamAssignments || {},
    approvedResults: value.approvedResults || []
  };
}

function isSystemAdminRecord(user) {
  return Boolean(
    user?.isSystemAdmin ||
    user?.id === SYSTEM_ADMIN_ID ||
    user?.name?.toLowerCase() === SYSTEM_ADMIN_NAME
  );
}

function systemAdminUser() {
  return {
    id: SYSTEM_ADMIN_ID,
    name: SYSTEM_ADMIN_NAME,
    isAdmin: true,
    isSystemAdmin: true,
    mustChangePassword: false,
    createdAt: "system"
  };
}

function isSystemAdminLogin(name, password) {
  return name.trim().toLowerCase() === SYSTEM_ADMIN_NAME && password === SYSTEM_ADMIN_PASSWORD;
}

function normalizeUser(user) {
  const normalized = { ...user };
  delete normalized.password;
  return {
    passwordSalt: "",
    passwordHash: "",
    passwordVersion: 2,
    passwordIterations: PASSWORD_ITERATIONS,
    isAdmin: false,
    isSystemAdmin: false,
    mustChangePassword: false,
    ...normalized
  };
}

function saveState() {
  stripPlainPasswords(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedStateForStorage(state)));
  if ((shouldUseServerStorage() || serverSyncAvailable) && !suppressServerSave) {
    fetch("/api/state", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state)
    }).catch(() => {
      serverSyncAvailable = false;
    });
  }
}

function stripPlainPasswords(value) {
  (value.users || []).forEach((user) => {
    delete user.password;
  });
}

function sanitizedStateForStorage(value) {
  const clean = {
    ...value,
    users: (value.users || []).filter((user) => !isSystemAdminRecord(user)).map((user) => {
      const normalized = { ...user };
      delete normalized.password;
      return normalized;
    })
  };
  return clean;
}

async function loadServerState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    const remoteState = normalizeState(await response.json());
    serverSyncAvailable = true;
    suppressServerSave = true;
    state = remoteState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedStateForStorage(state)));
    if (currentUserId && currentUserId !== SYSTEM_ADMIN_ID && !state.users.some((user) => user.id === currentUserId)) {
      const savedName = localStorage.getItem(CURRENT_USER_NAME_KEY);
      const restoredUser = savedName
        ? state.users.find((user) => user.name.toLowerCase() === savedName.toLowerCase())
        : null;
      if (restoredUser) storeCurrentUser(restoredUser);
    }
    suppressServerSave = false;
    render();
    checkMatchReminders();
  } catch (error) {
    serverSyncAvailable = false;
  }
}

function getUser() {
  if (currentUserId === SYSTEM_ADMIN_ID) return systemAdminUser();
  return state.users.find((user) => user.id === currentUserId) || null;
}

function storeCurrentUser(user) {
  const userId = typeof user === "string" ? user : user.id;
  currentUserId = userId;
  localStorage.setItem(CURRENT_USER_KEY, userId);
  storePersistentUserCookie(userId);
  if (typeof user !== "string" && user.name) {
    localStorage.setItem(CURRENT_USER_NAME_KEY, user.name);
  }
}

function clearCurrentUser() {
  currentUserId = null;
  localStorage.removeItem(CURRENT_USER_KEY);
  clearPersistentUserCookie();
}

function playerUsers() {
  return state.users.filter((user) => !user.isSystemAdmin);
}

function canPlay(user) {
  return Boolean(user && !user.isSystemAdmin && !user.mustChangePassword);
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function hashPassword(password, saltBase64) {
  if (shouldUseServerStorage() || !hasWebCrypto()) {
    throw new Error("A bÃ¶ngÃ©szÅ‘ ezen a cÃ­men nem tÃ¡mogatja a biztonsÃ¡gos helyi jelszÃ³kezelÃ©st.");
  }
  const salt = saltBase64 ? base64ToBytes(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  return {
    salt: bytesToBase64(salt),
    hash: bytesToBase64(new Uint8Array(bits))
  };
}

async function apiPost(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error("Nem sikerÃ¼lt elÃ©rni a szervert. FrissÃ­tsd az oldalt, vagy ellenÅ‘rizd, hogy fut-e az API.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Az API vÃ©gpont nem talÃ¡lhatÃ³. A Caddy valÃ³szÃ­nÅ±leg nem proxyzza a /api kÃ©rÃ©seket a Node szerverre.");
    }
    if (response.status === 405) {
      throw new Error("Az API vÃ©gpont nem fogadja ezt a kÃ©rÃ©st. EllenÅ‘rizd a Caddy proxyzÃ¡st Ã©s a futÃ³ Node szervert.");
    }
    throw new Error(data.error || `A szerver nem tudta feldolgozni a kÃ©rÃ©st. (${response.status})`);
  }
  return data;
}

function syncStateFromServer(nextState) {
  if (!nextState) return;
  state = normalizeState(nextState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedStateForStorage(state)));
  serverSyncAvailable = true;
}

async function ensureServerPasswordApi() {
  if (serverSyncAvailable) return;
  await loadServerState();
  if (!serverSyncAvailable) {
    throw new Error("Nem sikerÃ¼lt kapcsolÃ³dni az API-hoz. FrissÃ­tsd az oldalt, vagy ellenÅ‘rizd a szervert.");
  }
}

async function setUserPassword(user, password) {
  if (shouldUseServerStorage()) {
    const data = await apiPost("/api/admin-set-password", {
      adminId: currentUserId,
      userId: user.id,
      password
    });
    syncStateFromServer(data.state);
    return;
  }
  if (!hasWebCrypto()) {
    await ensureServerPasswordApi();
    const data = await apiPost("/api/admin-set-password", {
      adminId: currentUserId,
      userId: user.id,
      password
    });
    syncStateFromServer(data.state);
    return;
  }
  const result = await hashPassword(password);
  user.passwordSalt = result.salt;
  user.passwordHash = result.hash;
  user.passwordVersion = 2;
  user.passwordIterations = PASSWORD_ITERATIONS;
  delete user.password;
}

async function verifyPassword(user, password) {
  if (shouldUseServerStorage() || !hasWebCrypto()) {
    return false;
  }
  if (!user.passwordHash || !user.passwordSalt) return false;
  const result = await hashPassword(password, user.passwordSalt);
  return result.hash === user.passwordHash;
}

async function createUserByAdmin(name, password, isAdmin) {
  const admin = getUser();
  const normalized = name.trim();
  if (!admin?.isAdmin) throw new Error("Nincs jogosultsÃ¡g felhasznÃ¡lÃ³ lÃ©trehozÃ¡sÃ¡hoz.");
  if (!normalized || !password) throw new Error("NÃ©v Ã©s jelszÃ³ is kell.");
  if (state.users.some((item) => item.name.toLowerCase() === normalized.toLowerCase())) {
    throw new Error("Ez a nÃ©v mÃ¡r lÃ©tezik.");
  }
  const user = {
    id: createId(),
    name: normalized,
    isAdmin,
    isSystemAdmin: false,
    mustChangePassword: true,
    createdByAdmin: admin.id,
    createdAt: new Date().toISOString()
  };
  if (shouldUseServerStorage()) {
    const data = await apiPost("/api/admin-create-user", {
      adminId: admin.id,
      name: normalized,
      password,
      isAdmin
    });
    syncStateFromServer(data.state);
    return data.user;
  }
  if (serverSyncAvailable || !hasWebCrypto()) {
    await ensureServerPasswordApi();
    const data = await apiPost("/api/admin-create-user", {
      adminId: admin.id,
      name: normalized,
      password,
      isAdmin
    });
    syncStateFromServer(data.state);
    return data.user;
  }
  await setUserPassword(user, password);
  state.users.push(user);
  saveState();
  return user;
}

async function loginUser(name, password) {
  const normalized = name.trim();
  if (shouldUseServerStorage()) {
    const data = await apiPost("/api/login", { name: normalized, password });
    syncStateFromServer(data.state);
    return data.user;
  }
  if (!hasWebCrypto()) {
    await ensureServerPasswordApi();
    const data = await apiPost("/api/login", { name: normalized, password });
    syncStateFromServer(data.state);
    return data.user;
  }
  if (isSystemAdminLogin(normalized, password)) {
    return systemAdminUser();
  }
  const user = state.users.find((item) => item.name.toLowerCase() === normalized.toLowerCase());
  if (!user) throw new Error("Nincs ilyen felhasznÃ¡lÃ³.");
  if (!(await verifyPassword(user, password))) throw new Error("HibÃ¡s jelszÃ³.");
  return user;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("hu-HU", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStamp(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function localDateTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function matchById(matchId) {
  return state.matches.find((match) => match.id === matchId);
}

function userById(userId) {
  return state.users.find((user) => user.id === userId);
}

function approvedFor(matchId) {
  return state.approvedResults.find((result) => result.matchId === matchId);
}

function approvedRows() {
  return state.approvedResults
    .map((result) => ({ result, match: matchById(result.matchId) }))
    .filter((row) => row.match)
    .sort((a, b) => new Date(a.match.kickoff) - new Date(b.match.kickoff));
}

function pendingFor(matchId) {
  return state.resultSubmissions
    .filter((item) => item.matchId === matchId && item.status === "pending")
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0] || null;
}

function effectiveResultFor(matchId) {
  const approved = approvedFor(matchId);
  if (approved) return { result: approved, status: "approved" };
  const pending = pendingFor(matchId);
  if (pending) return { result: pending, status: "pending" };
  return { result: null, status: "none" };
}

function myPrediction(matchId) {
  return state.predictions.find((prediction) => prediction.matchId === matchId && prediction.userId === currentUserId);
}

function pendingPredictionFor(userId, matchId) {
  return state.predictionSubmissions
    .filter((item) => item.userId === userId && item.matchId === matchId && item.status === "pending")
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0] || null;
}

function predictionSummary(prediction) {
  if (!prediction) return "";
  const qualifier = prediction.qualifier ? `, tovÃ¡bbjutÃ³: ${prediction.qualifier}` : "";
  return `${prediction.homeGoals}-${prediction.awayGoals}${qualifier}`;
}

function missingTipKey(userId, matchId) {
  return `${userId}:${matchId}`;
}

function missingTipRows(matchFilter) {
  const hidden = new Set(state.hiddenMissingTips || []);
  return state.matches
    .filter(matchFilter)
    .map((match) => ({ match, result: effectiveResultFor(match.id).result }))
    .sort((a, b) => new Date(a.match.kickoff) - new Date(b.match.kickoff))
    .flatMap(({ match, result }) => playerUsers().map((user) => ({ match, result, user })))
    .filter(({ match, user }) => !state.predictions.some((prediction) => prediction.userId === user.id && prediction.matchId === match.id))
    .filter(({ match, user }) => !pendingPredictionFor(user.id, match.id))
    .filter(({ match, user }) => !hidden.has(missingTipKey(user.id, match.id)));
}

function missingPastTipRows() {
  const now = Date.now();
  return missingTipRows((match) => new Date(match.kickoff).getTime() <= now || Boolean(approvedFor(match.id)));
}

function missingUpcomingTipRows() {
  const now = Date.now();
  const deadline = now + MISSING_TIP_LOOKAHEAD_MS;
  return missingTipRows((match) => {
    const kickoff = new Date(match.kickoff).getTime();
    return kickoff > now && kickoff <= deadline;
  });
}

function missingTipsHtml(rows, emptyMessage) {
  return rows.map(({ match, result, user }) => {
    const resultLabel = result
      ? `${match.home} ${result.homeGoals}-${result.awayGoals} ${match.away}`
      : `${match.home} - ${match.away}`;
    return `
      <div class="approval-row">
        <div>
          <span class="pill warn">nincs tipp</span>
          <strong>${user.name}: ${resultLabel}</strong>
          ${result?.qualifier ? `<span>TovÃ¡bbjutÃ³: ${result.qualifier}</span>` : ""}
          ${!result ? `<span class="muted">MÃ©g nincs eredmÃ©ny rÃ¶gzÃ­tve.</span>` : ""}
          <span>${formatDate(match.kickoff)} Â· ${match.label}</span>
        </div>
        <div class="approval-actions">
          <button type="button" data-fill-missing-tip="${user.id}:${match.id}">Tipp feltÃ¶ltÃ©se</button>
          <button class="secondary" type="button" data-hide-missing-tip="${user.id}:${match.id}">Elrejt</button>
        </div>
      </div>`;
  }).join("") || `<p class="empty">${emptyMessage}</p>`;
}

function upcomingMissingTipsHtml(rows, emptyMessage) {
  const byUser = new Map();
  rows.forEach((row) => {
    const userRows = byUser.get(row.user.id) || { user: row.user, rows: [] };
    userRows.rows.push(row);
    byUser.set(row.user.id, userRows);
  });
  return Array.from(byUser.values()).map(({ user, rows: userRows }) => `
    <div class="approval-row upcoming-tip-reminder">
      <div>
        <strong>${user.name}</strong>
        <div class="upcoming-tip-matches">
          ${userRows.map(({ match }) => `
            <span>${match.home} - ${match.away}</span>
            <span>${formatDate(match.kickoff)}</span>`).join("")}
        </div>
      </div>
    </div>`).join("") || `<p class="empty">${emptyMessage}</p>`;
}

function pendingPasswordResetRequests() {
  return (state.passwordResetRequests || [])
    .filter((request) => request.status === "pending")
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
}

function isLocked(match) {
  return Date.now() >= new Date(match.kickoff).getTime();
}

function hasStarted(match) {
  return Date.now() >= new Date(match.kickoff).getTime();
}

function outcome(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

function impliedQualifier(match, homeGoals, awayGoals, qualifier) {
  const result = outcome(Number(homeGoals), Number(awayGoals));
  if (result === "home") return match.home;
  if (result === "away") return match.away;
  return qualifier || "";
}

function calculatePredictionScore(prediction) {
  return predictionScoreDetails(prediction).points;
}

function predictionScoreDetails(prediction) {
  const match = matchById(prediction.matchId);
  const { result, status } = effectiveResultFor(prediction.matchId);
  if (!match || !result) return { points: 0, status: "none", exact: false };
  return scorePredictionAgainstResult(prediction, match, result, status);
}

function scorePredictionAgainstResult(prediction, match, result, status) {
  let points = 0;
  const exact = Number(prediction.homeGoals) === Number(result.homeGoals) && Number(prediction.awayGoals) === Number(result.awayGoals);
  if (exact) {
    points += 2;
  } else if (outcome(prediction.homeGoals, prediction.awayGoals) === outcome(result.homeGoals, result.awayGoals)) {
    points += 1;
  }

  if (match.stage === "knockout") {
    const predictedQualifier = impliedQualifier(match, prediction.homeGoals, prediction.awayGoals, prediction.qualifier);
    const actualQualifier = impliedQualifier(match, result.homeGoals, result.awayGoals, result.qualifier);
    if (predictedQualifier && actualQualifier && predictedQualifier === actualQualifier) points += 1;
  }

  return { points, status, exact };
}

function teamById(teamId) {
  return TEAM_COMPETITION_TEAMS.find((team) => team.id === teamId) || null;
}

function userTeamId(userId) {
  return state.teamAssignments?.[userId] || "";
}

function groupLabel(group) {
  const value = String(group || "").trim();
  if (!value) return "Csoport nincs megadva";
  return value.toLowerCase().includes("csoport") ? value : `${value} csoport`;
}

function getTeamStandings() {
  const playerRows = getStandings();
  const rowByUser = new Map(playerRows.map((row) => [row.user.id, row]));
  const teams = TEAM_COMPETITION_TEAMS.map((team) => {
    const members = playerUsers().filter((user) => userTeamId(user.id) === team.id);
    const memberRows = members.map((user) => rowByUser.get(user.id) || { user, points: 0, predictions: 0, exact: 0, provisional: false });
    return {
      team,
      members,
      memberRows,
      points: memberRows.reduce((sum, row) => sum + row.points, 0),
      exact: memberRows.reduce((sum, row) => sum + row.exact, 0),
      predictions: memberRows.reduce((sum, row) => sum + row.predictions, 0),
      provisional: memberRows.some((row) => row.provisional),
      leaderStreak: 0
    };
  });
  const leaderInfo = getTeamLeaderInfo();
  teams.forEach((row) => {
    row.leaderStreak = leaderInfo.leaderId === row.team.id ? leaderInfo.streak : 0;
    row.isLeader = leaderInfo.leaderId === row.team.id;
    row.isTiedLeader = leaderInfo.tiedLeaderIds.includes(row.team.id);
  });
  return teams.sort((a, b) => b.points - a.points || b.exact - a.exact || a.team.name.localeCompare(b.team.name, "hu"));
}

function getTeamLeaderInfo() {
  const assignments = state.teamAssignments || {};
  const scores = Object.fromEntries(TEAM_COMPETITION_TEAMS.map((team) => [team.id, 0]));
  const resultRows = state.matches
    .map((match) => ({ match, effective: effectiveResultFor(match.id) }))
    .filter((row) => row.effective.result)
    .sort((a, b) => new Date(a.match.kickoff) - new Date(b.match.kickoff));
  let leaderId = "";
  let streak = 0;

  resultRows.forEach(({ match, effective }) => {
    state.predictions
      .filter((prediction) => prediction.matchId === match.id)
      .forEach((prediction) => {
        const teamId = assignments[prediction.userId];
        if (!teamId || !(teamId in scores)) return;
        scores[teamId] += scorePredictionAgainstResult(prediction, match, effective.result, effective.status).points;
      });

    const max = Math.max(...Object.values(scores));
    const leaders = TEAM_COMPETITION_TEAMS.filter((team) => scores[team.id] === max && max > 0).map((team) => team.id);
    const nextLeaderId = leaders.length === 1 ? leaders[0] : "";
    if (!nextLeaderId) {
      leaderId = "";
      streak = 0;
    } else if (nextLeaderId === leaderId) {
      streak += 1;
    } else {
      leaderId = nextLeaderId;
      streak = 1;
    }
  });

  const currentRows = TEAM_COMPETITION_TEAMS.map((team) => ({
    id: team.id,
    points: playerUsers()
      .filter((user) => assignments[user.id] === team.id)
      .reduce((sum, user) => sum + (getStandings().find((row) => row.user.id === user.id)?.points || 0), 0)
  }));
  const max = Math.max(...currentRows.map((row) => row.points));
  const tiedLeaderIds = currentRows.filter((row) => row.points === max && max > 0).map((row) => row.id);
  return { leaderId: tiedLeaderIds.length === 1 ? leaderId : "", tiedLeaderIds, streak };
}

function getStandings() {
  return playerUsers()
    .map((user) => {
      const predictions = state.predictions.filter((prediction) => prediction.userId === user.id);
      const scored = predictions.map(predictionScoreDetails);
      const points = scored.reduce((sum, item) => sum + item.points, 0);
      const exact = scored.filter((item) => item.exact).length;
      const provisional = scored.some((item) => item.status === "pending");
      return { user, points, predictions: predictions.length, exact, provisional };
    })
    .sort((a, b) => b.points - a.points || b.exact - a.exact || a.user.name.localeCompare(b.user.name, "hu"));
}

function render() {
  const user = getUser();
  els.loginPanel.classList.toggle("hidden", Boolean(user));
  els.dashboard.classList.toggle("hidden", !user);
  renderSession(user);
  if (!user) return;
  els.welcomeTitle.textContent = `Szia, ${user.name}!`;
  document.querySelectorAll(".admin-only").forEach((item) => item.classList.toggle("hidden", !user.isAdmin));
  document.querySelectorAll(".player-only").forEach((item) => item.classList.toggle("hidden", !canPlay(user)));
  els.myScore.textContent = user.isSystemAdmin ? "-" : getStandings().find((row) => row.user.id === user.id)?.points || 0;
  const pendingBox = els.pendingCount.closest("div");
  pendingBox.classList.toggle("hidden", !user.isAdmin);
  els.pendingCount.textContent =
    state.resultSubmissions.filter((item) => item.status === "pending").length +
    state.predictionSubmissions.filter((item) => item.status === "pending").length +
    pendingPasswordResetRequests().length;
  renderPasswordGate(user);
  updateVisibleTabs(user);
  if (user.mustChangePassword) return;
  renderMatches();
  renderStandings();
  renderMyTips();
  renderTips();
  renderResults();
  renderPlayed();
  renderAdmin();
  showWhatsNewIfNeeded(user);
}

function whatsNewStorageKey(userId) {
  return `${WHATS_NEW_KEY}:${userId}`;
}

function showWhatsNewIfNeeded(user) {
  if (!user || user.mustChangePassword || !els.whatsNewDialog || els.whatsNewDialog.open) return;
  if (localStorage.getItem(whatsNewStorageKey(user.id)) === APP_VERSION) return;
  els.whatsNewDialog.querySelectorAll(".admin-whats-new").forEach((item) => item.classList.toggle("hidden", !user.isAdmin));
  if (typeof els.whatsNewDialog.showModal === "function") {
    els.whatsNewDialog.showModal();
  } else {
    els.whatsNewDialog.setAttribute("open", "");
  }
}

function closeWhatsNew() {
  const user = getUser();
  if (user) localStorage.setItem(whatsNewStorageKey(user.id), APP_VERSION);
  if (typeof els.whatsNewDialog.close === "function") {
    els.whatsNewDialog.close();
  } else {
    els.whatsNewDialog.removeAttribute("open");
  }
}

function renderSession(user) {
  if (!user) {
    els.sessionBox.innerHTML = "";
    return;
  }
  els.sessionBox.innerHTML = `
    <span>${user.name}${user.isAdmin ? " Â· admin" : ""}</span>
    ${user.isSystemAdmin ? "" : `<details class="password-menu">
      <summary>JelszÃ³</summary>
      <form id="sessionPasswordForm">
        ${passwordFieldHtml("oldPassword", "RÃ©gi jelszÃ³", "current-password")}
        ${passwordFieldHtml("newPassword", "Ãšj jelszÃ³", "new-password")}
        ${passwordFieldHtml("newPasswordConfirm", "Ãšj jelszÃ³ mÃ©g egyszer", "new-password")}
        <button class="password-save" type="submit">JelszÃ³ mentÃ©se</button>
        <p class="form-message"></p>
      </form>
    </details>`}
    <button type="button" id="notificationsBtn">${notificationsEnabled() ? "Ã‰rtesÃ­tÃ©sek: be" : "Ã‰rtesÃ­tÃ©sek"}</button>
    <button type="button" id="logoutBtn">KilÃ©pÃ©s</button>`;
  document.querySelector("#sessionPasswordForm")?.addEventListener("submit", changeOwnPassword);
  document.querySelector("#notificationsBtn").addEventListener("click", enableMatchNotifications);
  document.querySelector("#logoutBtn").addEventListener("click", logoutUser);
  const passwordForm = document.querySelector("#sessionPasswordForm");
  if (passwordForm) setupPasswordToggles(passwordForm);
}

function passwordFieldHtml(name, label, autocomplete = "off") {
  return `
    <label class="password-field">
      <span>${label}</span>
      <span class="password-input-wrap">
        <input name="${name}" type="password" autocomplete="${autocomplete}" required />
        <button class="password-toggle" type="button" data-toggle-password="${name}" aria-label="${label} megjelenÃ­tÃ©se">Mutat</button>
      </span>
    </label>`;
}

function setupPasswordToggles(root) {
  root.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".password-input-wrap")?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Rejt" : "Mutat";
      button.setAttribute("aria-label", show ? "JelszÃ³ elrejtÃ©se" : "JelszÃ³ megjelenÃ­tÃ©se");
    });
  });
}

function renderPasswordGate(user) {
  if (!els.passwordGate) return;
  els.passwordGate.classList.toggle("hidden", !user.mustChangePassword);
  if (!user.mustChangePassword) {
    els.passwordGate.innerHTML = "";
    return;
  }
  els.passwordGate.innerHTML = `
    <div class="password-gate-backdrop" role="presentation"></div>
    <div class="modal-card password-gate-panel" role="dialog" aria-modal="true" aria-labelledby="forcedPasswordTitle">
      <p class="section-kicker">ElsÅ‘ belÃ©pÃ©s</p>
      <h2 id="forcedPasswordTitle">JelszÃ³ mÃ³dosÃ­tÃ¡sa szÃ¼ksÃ©ges</h2>
      <p class="muted">Az elsÅ‘ belÃ©pÃ©s utÃ¡n Ãºj jelszÃ³t kell beÃ¡llÃ­tanod. Addig nem tudod hasznÃ¡lni az oldalt.</p>
      <form id="forcedPasswordForm" class="admin-prediction-form">
        ${passwordFieldHtml("newPassword", "Ãšj jelszÃ³", "new-password")}
        ${passwordFieldHtml("newPasswordConfirm", "Ãšj jelszÃ³ mÃ©g egyszer", "new-password")}
        <button class="password-save" type="submit">JelszÃ³ mentÃ©se</button>
        <p class="form-message"></p>
      </form>
    </div>`;
  els.passwordGate.querySelector("#forcedPasswordForm").addEventListener("submit", changeOwnPassword);
  setupPasswordToggles(els.passwordGate);
}

function activateTab(viewName) {
  const target = document.querySelector(`.tab[data-view="${viewName}"]:not(.hidden)`)
    || document.querySelector(".tab:not(.hidden)");
  document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === target));
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  if (target) {
    document.querySelector(`#${target.dataset.view}View`)?.classList.add("active");
  }
}

function updateVisibleTabs(user) {
  if (!els.tabs) return;
  els.tabs.classList.toggle("hidden", user.mustChangePassword);
  document.querySelectorAll(".view").forEach((item) => item.classList.toggle("hidden", user.mustChangePassword));
  if (user.mustChangePassword) return;

  const active = document.querySelector(".tab.active");
  if (!active || active.classList.contains("hidden")) {
    activateTab(user.isSystemAdmin ? "admin" : "matches");
  }
}

function notificationsEnabled() {
  return localStorage.getItem(REMINDER_KEY) === "enabled" && "Notification" in window && Notification.permission === "granted";
}

function logoutUser() {
  clearCurrentUser();
  render();
}

async function enableMatchNotifications() {
  if (!("Notification" in window)) {
    alert("Ez a bÃ¶ngÃ©szÅ‘ nem tÃ¡mogatja az Ã©rtesÃ­tÃ©seket.");
    return;
  }
  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Az Ã©rtesÃ­tÃ©sek nincsenek engedÃ©lyezve.");
    return;
  }
  localStorage.setItem(REMINDER_KEY, "enabled");
  renderSession(getUser());
  checkMatchReminders();
}

function reminderSentKey(matchId) {
  return `${REMINDER_KEY}:${matchId}`;
}

function reminderWasSent(matchId) {
  return localStorage.getItem(reminderSentKey(matchId)) === "sent";
}

function markReminderSent(matchId) {
  localStorage.setItem(reminderSentKey(matchId), "sent");
}

async function showMatchNotification(match) {
  const title = "Meccs kezdÅ‘dik 1 Ã³ra mÃºlva";
  const body = `${match.home} - ${match.away} Â· ${formatDate(match.kickoff)}`;
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(title, {
          body,
          tag: `match-${match.id}`,
          icon: "assets/icon-192.png",
          badge: "assets/icon-192.png"
        });
        return;
      }
    }
    new Notification(title, { body, tag: `match-${match.id}`, icon: "assets/icon-192.png" });
  } catch (error) {
    new Notification(title, { body });
  }
}

function checkMatchReminders() {
  if (!notificationsEnabled()) return;
  const now = Date.now();
  state.matches.forEach((match) => {
    if (approvedFor(match.id) || reminderWasSent(match.id)) return;
    const reminderAt = new Date(match.kickoff).getTime() - REMINDER_LEAD_MS;
    const due = now >= reminderAt && now <= reminderAt + REMINDER_WINDOW_MS;
    if (!due) return;
    markReminderSent(match.id);
    showMatchNotification(match);
  });
}

function renderMatches() {
  if (!canPlay(getUser())) {
    els.matchesView.innerHTML = "";
    return;
  }
  const template = document.querySelector("#matchTemplate");
  els.matchesView.innerHTML = `<div class="match-grid"></div>`;
  const grid = els.matchesView.querySelector(".match-grid");

  state.matches
    .slice()
    .filter((match) => !approvedFor(match.id))
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .forEach((match) => {
      const node = template.content.firstElementChild.cloneNode(true);
      const prediction = myPrediction(match.id);
      const resultInfo = effectiveResultFor(match.id);
      const pendingPrediction = getUser() ? pendingPredictionFor(getUser().id, match.id) : null;
      const shownPrediction = prediction || pendingPrediction;
      const locked = isLocked(match);

      node.querySelector(".stage").textContent = match.label;
      if (match.stage === "group") {
        node.querySelector(".stage").insertAdjacentHTML("afterend", `<span class="pill group-pill">${groupLabel(match.group)}</span>`);
      }
      node.querySelector(".kickoff").textContent = formatDate(match.kickoff);
      node.querySelector(".home").textContent = match.home;
      node.querySelector(".away").textContent = match.away;
      node.querySelector(".status-line").innerHTML = statusHtml(match, prediction, resultInfo, locked);
      if (pendingPrediction) {
        node.querySelector(".status-line").insertAdjacentHTML("beforeend", `<span class="pill warn">TippmÃ³dosÃ­tÃ¡s jÃ³vÃ¡hagyÃ¡sra vÃ¡r</span>`);
        node.querySelector(".status-line").insertAdjacentHTML("afterend", `
          <div class="pending-tip-box">
            <strong>Leadott mÃ³dosÃ­tÃ¡sod:</strong>
            <span>${predictionSummary(pendingPrediction)}</span>
            <small>Ez mÃ©g nem szÃ¡mÃ­t bele a pontjaidba, amÃ­g admin jÃ³vÃ¡ nem hagyja.</small>
          </div>`);
      }
      node.querySelector(".history-grid").innerHTML = historyHtml(match);

      const predictionForm = node.querySelector(".prediction-form");
      predictionForm.dataset.matchId = match.id;
      predictionForm.homeGoals.value = shownPrediction?.homeGoals ?? "";
      predictionForm.awayGoals.value = shownPrediction?.awayGoals ?? "";
      predictionForm.homeGoals.disabled = locked;
      predictionForm.awayGoals.disabled = locked;
      const predictionButton = predictionForm.querySelector("button");
      predictionButton.textContent = shownPrediction ? "Tipp mÃ³dosÃ­tÃ¡sa" : "Tipp mentÃ©se";
      predictionButton.classList.toggle("edit-mode", Boolean(shownPrediction));
      predictionButton.disabled = locked;
      fillQualifierSelect(predictionForm.qualifier, match);
      predictionForm.qualifier.value = shownPrediction?.qualifier ?? "";

      updatePredictionQualifierVisibility(predictionForm, match);
      predictionForm.addEventListener("input", () => updatePredictionQualifierVisibility(predictionForm, match));
      predictionForm.addEventListener("submit", savePrediction);

      grid.appendChild(node);
    });

  if (!grid.children.length) {
    grid.innerHTML = `<p class="empty">Nincs aktuÃ¡lisan tippelhetÅ‘ meccs.</p>`;
  }
}

function statusHtml(match, prediction, resultInfo, locked) {
  const chunks = [];
  const result = resultInfo.result;
  chunks.push(`<span class="pill ${locked ? "warn" : "info"}">${locked ? "TippelÃ©s lezÃ¡rva" : "Nyitott meccs"}</span>`);
  if (prediction) {
    const qualifier = prediction.qualifier ? `, tovÃ¡bbjutÃ³: ${prediction.qualifier}` : "";
    const score = predictionScoreDetails(prediction);
    chunks.push(`<span>Mentett tipped: <strong>${prediction.homeGoals}-${prediction.awayGoals}</strong>${qualifier}</span>`);
    if (result && resultInfo.status === "approved") chunks.push(`<span class="pill">Pont: ${score.points}</span>`);
    if (getUser()?.isAdmin) chunks.push(`<span>IdÅ‘bÃ©lyeg: ${formatStamp(prediction.updatedAt)}</span>`);
  } else {
    chunks.push("<span>MÃ©g nincs tipped.</span>");
  }
  if (result) {
    if (resultInfo.status === "pending") {
      chunks.push(`<span class="pill warn">EredmÃ©ny hozzÃ¡adva, jÃ³vÃ¡hagyÃ¡sra vÃ¡r</span>`);
    } else {
      const qualifier = result.qualifier ? `, tovÃ¡bbjutÃ³: ${result.qualifier}` : "";
      chunks.push(`<span class="pill">JÃ³vÃ¡hagyott: ${result.homeGoals}-${result.awayGoals}${qualifier}</span>`);
    }
  }
  return chunks.join("");
}

function historyHtml(match) {
  return [match.home, match.away]
    .map((team) => {
      const rows = approvedRows().filter((row) => {
        const earlier = new Date(row.match.kickoff) < new Date(match.kickoff);
        return earlier && (row.match.home === team || row.match.away === team);
      });
      return `
        <div class="history-panel">
          <h3>${team} korÃ¡bbi meccsei</h3>
          ${
            rows.map(({ result, match: played }) => {
              const qualifier = result.qualifier ? `, tovÃ¡bbjutÃ³: ${result.qualifier}` : "";
              return `<p><strong>${played.home} ${result.homeGoals}-${result.awayGoals} ${played.away}</strong><span>${formatDate(played.kickoff)}${qualifier}</span></p>`;
            }).join("") || `<p class="muted">MÃ©g nincs korÃ¡bbi jÃ³vÃ¡hagyott eredmÃ©ny.</p>`
          }
        </div>`;
    })
    .join("");
}

function fillQualifierSelect(select, match) {
  const currentValue = select.value;
  select.innerHTML = `<option value="">Válassz továbbjutót</option><option value="${match.home}">${match.home}</option><option value="${match.away}">${match.away}</option>`;
  if (currentValue === match.home || currentValue === match.away) {
    select.value = currentValue;
  }
}

function updatePredictionQualifierVisibility(form, match) {
  const row = form.closest(".match-card").querySelector(".qualifier-row");
  const drawTip = form.homeGoals.value !== "" && form.homeGoals.value === form.awayGoals.value;
  const show = match.stage === "knockout" && drawTip;
  row.classList.toggle("hidden", !show);
  form.qualifier.required = show;
  form.qualifier.disabled = isLocked(match) || !show;
}

function updateResultQualifierRequirement(form, match) {
  const row = form.querySelector(".result-qualifier");
  const drawResult = form.homeGoals.value !== "" && form.homeGoals.value === form.awayGoals.value;
  const show = match.stage === "knockout" && drawResult;
  row.classList.toggle("hidden", !show);
  form.qualifier.required = show;
  form.qualifier.disabled = !show;
}

function savePrediction(event) {
  event.preventDefault();
  const user = getUser();
  const form = event.currentTarget;
  const match = matchById(form.dataset.matchId);
  if (!canPlay(user) || !match || isLocked(match) || approvedFor(match.id)) return;

  const homeGoals = Number(form.homeGoals.value);
  const awayGoals = Number(form.awayGoals.value);
  const qualifier = homeGoals === awayGoals ? form.qualifier.value : "";

  if (pendingFor(match.id)) {
    state.predictionSubmissions.push({
      id: createId(),
      userId: user.id,
      matchId: match.id,
      homeGoals,
      awayGoals,
      qualifier,
      status: "pending",
      submittedAt: new Date().toISOString()
    });
    saveState();
    render();
    return;
  }

  const existing = myPrediction(match.id);
  if (existing) {
    existing.homeGoals = homeGoals;
    existing.awayGoals = awayGoals;
    existing.qualifier = qualifier;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.predictions.push({
      id: createId(),
      userId: user.id,
      matchId: match.id,
      homeGoals,
      awayGoals,
      qualifier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  saveState();
  render();
}

function submitResult(event) {
  event.preventDefault();
  const user = getUser();
  const form = event.currentTarget;
  const match = matchById(form.dataset.matchId);
  if (!user || !match) return;

  const homeGoals = Number(form.homeGoals.value);
  const awayGoals = Number(form.awayGoals.value);
  const qualifier = match.stage === "knockout"
    ? (homeGoals === awayGoals ? form.qualifier.value : impliedQualifier(match, homeGoals, awayGoals, ""))
    : "";
  if (user.isAdmin) {
    upsertApprovedResult({
      matchId: match.id,
      homeGoals,
      awayGoals,
      qualifier,
      approvedBy: user.id
    });
    form.reset();
    saveState();
    render();
    return;
  }
  state.resultSubmissions.push({
    id: createId(),
    userId: user.id,
    matchId: match.id,
    homeGoals,
    awayGoals,
    qualifier,
    status: "pending",
    submittedAt: new Date().toISOString()
  });
  form.reset();
  saveState();
  render();
}

function renderStandings() {
  const content = standingsMode === "teams" ? teamStandingsHtml() : playerStandingsHtml();
  els.standingsView.innerHTML = `
    <div class="standings-switch" role="tablist" aria-label="Tabella nÃ©zetek">
      <button type="button" class="${standingsMode === "players" ? "active" : ""}" data-standings-mode="players">
        <span>Sima tabella</span>
      </button>
      <button type="button" class="${standingsMode === "teams" ? "active" : ""}" data-standings-mode="teams">
        <span>Csapatverseny tabella</span>
      </button>
    </div>
    ${content}`;
  els.standingsView.querySelectorAll("[data-standings-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      standingsMode = button.dataset.standingsMode;
      renderStandings();
    });
  });
}

function playerStandingsHtml() {
  const rows = getStandings();
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>NÃ©v</th><th>Pont</th><th>TelitalÃ¡lat</th><th>Tippek szÃ¡ma</th></tr></thead>
        <tbody>
          ${rows.map((row, index) => `<tr><td>${index + 1}</td><td><strong>${row.user.name}</strong>${row.user.isAdmin ? " Â· admin" : ""}</td><td><strong>${row.points}</strong>${row.provisional ? `<br><span class="pill warn">nem vÃ©gleges</span>` : ""}</td><td>${row.exact}</td><td>${row.predictions}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">MÃ©g nincs versenyzÅ‘.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function teamStandingsHtml() {
  const rows = getTeamStandings();
  return `
    <div class="team-standings-grid">
      ${rows.map((row, index) => `
        <article class="team-standing-card ${row.isLeader ? "leader" : ""}" style="--team-color: ${row.team.color}; --team-soft: ${row.team.soft};">
          <div class="team-standing-head">
            <span class="team-rank">#${index + 1}</span>
            <div>
              <h3>${row.team.name}</h3>
              <p>${row.members.length ? row.members.map((member) => member.name).join(", ") : "MÃ©g nincs jÃ¡tÃ©kos ebben a csapatban."}</p>
            </div>
            <strong>${row.points}</strong>
          </div>
          <div class="team-standing-meta">
            <span>${row.exact} telitalÃ¡lat</span>
            ${
              row.isLeader
                ? `<span class="leader-streak">${row.leaderStreak} meccse vezet</span>`
                : row.isTiedLeader
                ? `<span class="leader-streak">holtversenyben elsÅ‘</span>`
                : ""
            }
            ${row.provisional ? `<span class="pill warn">nem vÃ©gleges</span>` : ""}
          </div>
          <div class="team-members">
            ${row.memberRows.map((member) => `
              <div>
                <span>${member.user.name}</span>
                <strong>${member.points} pont</strong>
              </div>`).join("") || `<p class="empty small">Nincs beosztott jÃ¡tÃ©kos.</p>`}
          </div>
        </article>`).join("")}
    </div>`;
}

function resultText(matchId) {
  const { result, status } = effectiveResultFor(matchId);
  if (!result) return { html: `<span class="muted">MÃ©g nincs eredmÃ©ny</span>`, status };
  const qualifier = result.qualifier ? `<br><small>TovÃ¡bbjutÃ³: ${result.qualifier}</small>` : "";
  const label = status === "pending" ? `<br><span class="pill warn">nem vÃ©gleges</span>` : "";
  return {
    html: `<strong>${result.homeGoals}-${result.awayGoals}</strong>${qualifier}${label}`,
    status
  };
}

function renderMyTips() {
  const user = getUser();
  const orderedUsers = playerUsers()
    .slice()
    .sort((a, b) => {
      if (a.id === user?.id) return -1;
      if (b.id === user?.id) return 1;
      return a.name.localeCompare(b.name, "hu");
    });
  const matches = state.matches
    .slice()
    .filter((match) => Boolean(approvedFor(match.id)))
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));

  els.myTipsView.innerHTML = `
    <div class="tips-accordion">
      ${matches.map((match, index) => {
        const result = resultText(match.id);
        const rows = orderedUsers.map((player) => {
          const prediction = state.predictions.find((item) => item.userId === player.id && item.matchId === match.id);
          const pending = pendingPredictionFor(player.id, match.id);
          const score = prediction ? predictionScoreDetails(prediction) : null;
          return { player, prediction, pending, score };
        });
        return `
          <details class="tips-match" ${index === 0 ? "open" : ""}>
            <summary>
              <span>
                <strong>${match.home} - ${match.away}</strong>
                <small>${formatDate(match.kickoff)} Â· ${match.label}${match.group ? ` Â· ${groupLabel(match.group)}` : ""}</small>
              </span>
              <span class="tips-result">${result.html}</span>
            </summary>
            <div class="scroll-hint">A tÃ¡blÃ¡zat oldalra gÃ¶rgethetÅ‘.</div>
            <div class="table-wrap compact-scroll">
              <table class="tips-table">
                <thead><tr><th>JÃ¡tÃ©kos</th><th>Tipp</th><th>Pont</th></tr></thead>
                <tbody>
                  ${rows.map((row) => `
                    <tr class="${row.player.id === user?.id ? "own-tip-row" : ""}">
                      <td><strong>${row.player.name}</strong></td>
                      <td>
                        ${row.prediction ? predictionSummary(row.prediction) : `<span class="muted">nincs tipp</span>`}
                        ${row.pending ? `<br><span class="pill warn">JÃ³vÃ¡hagyÃ¡sra vÃ¡r: ${predictionSummary(row.pending)}</span>` : ""}
                      </td>
                      <td>${row.score ? `<strong>${row.score.points}</strong>${row.score.status === "pending" ? `<br><span class="pill warn">nem vÃ©gleges</span>` : ""}` : "-"}</td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>
          </details>`;
      }).join("") || `<p class="empty">MÃ©g nincs megjelenÃ­thetÅ‘ tipp.</p>`}
    </div>`;
}

async function changeOwnPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const user = getUser();
  const message = form.querySelector(".form-message");
  if (!user) return;
  if (form.newPassword.value !== form.newPasswordConfirm.value) {
    message.textContent = "A kÃ©t Ãºj jelszÃ³ nem egyezik.";
    return;
  }
  if (shouldUseServerStorage() || !hasWebCrypto()) {
    try {
      const data = form.oldPassword
        ? await apiPost("/api/change-password", {
          userId: user.id,
          oldPassword: form.oldPassword.value,
          newPassword: form.newPassword.value
        })
        : await apiPost("/api/complete-first-password-change", {
          userId: user.id,
          newPassword: form.newPassword.value
        });
      syncStateFromServer(data.state);
      form.reset();
      message.textContent = "JelszÃ³ mÃ³dosÃ­tva.";
      form.closest("details")?.removeAttribute("open");
      render();
    } catch (error) {
      message.textContent = error.message;
    }
    return;
  }
  if (form.oldPassword) {
    if (!(await verifyPassword(user, form.oldPassword.value))) {
      message.textContent = "A rÃ©gi jelszÃ³ nem stimmel.";
      return;
    }
  }
  await setUserPassword(user, form.newPassword.value);
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date().toISOString();
  saveState();
  form.reset();
  message.textContent = "JelszÃ³ mÃ³dosÃ­tva.";
  form.closest("details")?.removeAttribute("open");
  render();
}

function renderTips() {
  const isAdmin = Boolean(getUser()?.isAdmin);
  const users = playerUsers().slice().sort((a, b) => a.name.localeCompare(b.name, "hu"));
  const rows = state.predictions
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((prediction) => {
      const match = matchById(prediction.matchId);
      const user = userById(prediction.userId);
      const score = predictionScoreDetails(prediction);
      const late = new Date(prediction.updatedAt) >= new Date(match.kickoff);
      return { prediction, match, user, score, late };
    });
  if (tipsUserFilter !== "all" && !users.some((user) => user.id === tipsUserFilter)) tipsUserFilter = "all";
  const filteredRows = tipsUserFilter === "all"
    ? rows
    : rows.filter((row) => row.prediction.userId === tipsUserFilter);

  els.tipsView.innerHTML = `
    <div class="panel tips-filter-panel">
      <label class="tips-filter">
        JÃ¡tÃ©kos
        <select id="tipsUserFilter">
          <option value="all">Minden jÃ¡tÃ©kos</option>
          ${users.map((user) => `<option value="${user.id}" ${user.id === tipsUserFilter ? "selected" : ""}>${user.name}</option>`).join("")}
        </select>
      </label>
      <div class="table-wrap">
        <table>
          <thead><tr><th>JÃ¡tÃ©kos</th><th>Meccs</th><th>Tipp</th>${isAdmin ? "<th>IdÅ‘bÃ©lyeg</th>" : ""}<th>Pont</th></tr></thead>
          <tbody>
            ${filteredRows.map((row) => `
              <tr>
                <td><strong>${row.user?.name || "Ismeretlen"}</strong></td>
                <td>${row.match.home} - ${row.match.away}<br><small>${formatDate(row.match.kickoff)}</small></td>
                <td>${row.prediction.homeGoals}-${row.prediction.awayGoals}${row.prediction.qualifier ? `<br><small>TovÃ¡bbjutÃ³: ${row.prediction.qualifier}</small>` : ""}</td>
                ${isAdmin ? `<td>${formatStamp(row.prediction.updatedAt)}${row.late ? `<br><span class="pill bad">meccs utÃ¡n</span>` : ""}</td>` : ""}
                <td><strong>${row.score.points}</strong>${row.score.status === "pending" ? `<br><span class="pill warn">nem vÃ©gleges</span>` : ""}</td>
              </tr>`).join("") || `<tr><td colspan="${isAdmin ? 5 : 4}" class="empty">Nincs mentett tipp a kivÃ¡lasztott jÃ¡tÃ©kostÃ³l.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
  els.tipsView.querySelector("#tipsUserFilter")?.addEventListener("change", (event) => {
    tipsUserFilter = event.target.value;
    renderTips();
  });
}

function renderResults() {
  const isAdmin = Boolean(getUser()?.isAdmin);
  const approved = state.approvedResults
    .slice()
    .sort((a, b) => new Date(matchById(a.matchId).kickoff) - new Date(matchById(b.matchId).kickoff));
  const resultMatches = state.matches
    .filter((match) => !approvedFor(match.id))
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  els.resultsView.innerHTML = `
    <div class="panel">
      <h3>EredmÃ©ny bekÃ¼ldÃ©se</h3>
      ${resultMatches.map((match) => resultFormHtml(match, isAdmin)).join("") || `<p class="empty">Minden meccsnek van vÃ©gleges eredmÃ©nye.</p>`}
    </div>`;

  els.resultsView.querySelectorAll(".result-form").forEach((form) => {
    const match = matchById(form.dataset.matchId);
    if (!match) return;
    fillQualifierSelect(form.qualifier, match);
    updateResultQualifierRequirement(form, match);
    form.addEventListener("input", () => updateResultQualifierRequirement(form, match));
    form.addEventListener("submit", submitResult);
  });
  els.resultsView.querySelectorAll(".approved-result-form").forEach((form) => {
    const match = matchById(form.dataset.matchId);
    if (!match) return;
    fillQualifierSelect(form.qualifier, match);
    form.qualifier.value = approvedFor(match.id)?.qualifier || "";
    updateResultQualifierRequirement(form, match);
    form.addEventListener("input", () => updateResultQualifierRequirement(form, match));
    form.addEventListener("submit", updateApprovedResult);
  });
  els.resultsView.querySelectorAll("[data-approve]").forEach((button) => button.addEventListener("click", () => approveResult(button.dataset.approve)));
}

function resultFormHtml(match, isAdmin) {
  const pending = pendingFor(match.id);
  const pendingUser = pending ? userById(pending.userId) : null;
  return `
    <article class="result-card">
      <div class="match-meta">
        <span class="pill">${match.label}</span>
        <span class="kickoff">${formatDate(match.kickoff)}</span>
        ${pending ? `<span class="pill warn">FÃ¼ggÅ‘: ${pending.homeGoals}-${pending.awayGoals}${pending.qualifier ? `, tovÃ¡bbjutÃ³: ${pending.qualifier}` : ""}</span>` : ""}
        ${pending ? `<span>BekÃ¼ldte: ${pendingUser?.name || "Ismeretlen"}</span>` : ""}
      </div>
      <div class="teams">
        <strong>${match.home}</strong>
        <span>vs</span>
        <strong>${match.away}</strong>
      </div>
      <form class="result-form" data-match-id="${match.id}">
        <div class="score-inputs">
          <label>Hazai <input name="homeGoals" type="number" min="0" max="20" required /></label>
          <label>VendÃ©g <input name="awayGoals" type="number" min="0" max="20" required /></label>
        </div>
        <label class="result-qualifier hidden">
          TovÃ¡bbjutÃ³ dÃ¶ntetlennÃ©l
          <select name="qualifier">
            <option value="">VÃ¡lassz tovÃ¡bbjutÃ³t</option>
          </select>
        </label>
        <div class="result-actions">
          <button type="submit" class="${pending ? "edit-mode" : ""}">${pending ? "MÃ³dosÃ­tÃ¡s" : "BekÃ¼ldÃ©s"}</button>
          ${isAdmin && pending ? `<button type="button" class="secondary" data-approve="${pending.id}">JÃ³vÃ¡hagyÃ¡s</button>` : ""}
        </div>
      </form>
    </article>`;
}

function finalResultHtml(match, result, isAdmin) {
  return `
    <article class="result-card final-result">
      <div class="match-meta">
        <span class="pill">${match.label}</span>
        <span class="kickoff">${formatDate(match.kickoff)}</span>
        <span class="pill">VÃ©gleges</span>
      </div>
      <div class="teams">
        <strong>${match.home}</strong>
        <span>${result.homeGoals}-${result.awayGoals}</span>
        <strong>${match.away}</strong>
      </div>
      ${result.qualifier ? `<p class="muted">TovÃ¡bbjutÃ³: <strong>${result.qualifier}</strong></p>` : ""}
      ${exactPredictorsHtml(match, result)}
      ${isAdmin ? `
        <form class="approved-result-form" data-match-id="${match.id}">
          <div class="score-inputs">
            <label>Hazai <input name="homeGoals" type="number" min="0" max="20" required value="${result.homeGoals}" /></label>
            <label>VendÃ©g <input name="awayGoals" type="number" min="0" max="20" required value="${result.awayGoals}" /></label>
          </div>
          <label class="result-qualifier hidden">
            TovÃ¡bbjutÃ³ dÃ¶ntetlennÃ©l
            <select name="qualifier">
              <option value="">VÃ¡lassz tovÃ¡bbjutÃ³t</option>
            </select>
          </label>
          <button type="submit">VÃ©gleges eredmÃ©ny mÃ³dosÃ­tÃ¡sa</button>
        </form>` : ""}
    </article>`;
}

function pendingResultHtml(match, result, isAdmin) {
  const user = userById(result.userId);
  return `
    <article class="result-card">
      <div class="match-meta">
        <span class="pill">${match.label}</span>
        <span class="kickoff">${formatDate(match.kickoff)}</span>
        <span class="pill warn">Nem vÃ©gleges</span>
        <span>BekÃ¼ldte: ${user?.name || "Ismeretlen"}</span>
      </div>
      <div class="teams">
        <strong>${match.home}</strong>
        <span>${result.homeGoals}-${result.awayGoals}</span>
        <strong>${match.away}</strong>
      </div>
      ${result.qualifier ? `<p class="muted">TovÃ¡bbjutÃ³: <strong>${result.qualifier}</strong></p>` : ""}
      ${exactPredictorsHtml(match, result)}
      ${isAdmin ? `<button type="button" class="secondary" data-approve="${result.id}">JÃ³vÃ¡hagyÃ¡s</button>` : ""}
    </article>`;
}

function exactPredictorsHtml(match, result) {
  const names = state.predictions
    .filter((prediction) => prediction.matchId === match.id)
    .filter((prediction) => {
      const scoreExact = Number(prediction.homeGoals) === Number(result.homeGoals) && Number(prediction.awayGoals) === Number(result.awayGoals);
      if (!scoreExact) return false;
      if (match.stage !== "knockout") return true;
      const predicted = impliedQualifier(match, prediction.homeGoals, prediction.awayGoals, prediction.qualifier);
      const actual = impliedQualifier(match, result.homeGoals, result.awayGoals, result.qualifier);
      return predicted === actual;
    })
    .map((prediction) => userById(prediction.userId))
    .filter((user) => user && !user.isSystemAdmin)
    .map((user) => user.name);
  return names.length
    ? `<p class="muted">Pontos talÃ¡lat: <strong>${names.join(", ")}</strong></p>`
    : `<p class="muted">Pontos talÃ¡lat: nincs</p>`;
}

function emptyGroupRow(team, group) {
  return { team, group, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, rank: 0, advance: "" };
}

function groupStandings() {
  const groups = new Map();
  state.matches
    .filter((match) => match.stage === "group" && match.group)
    .forEach((match) => {
      if (!groups.has(match.group)) groups.set(match.group, new Map());
      const table = groups.get(match.group);
      if (!table.has(match.home)) table.set(match.home, emptyGroupRow(match.home, match.group));
      if (!table.has(match.away)) table.set(match.away, emptyGroupRow(match.away, match.group));

      const { result } = effectiveResultFor(match.id);
      if (!result) return;
      const home = table.get(match.home);
      const away = table.get(match.away);
      const hg = Number(result.homeGoals);
      const ag = Number(result.awayGoals);
      home.played += 1;
      away.played += 1;
      home.gf += hg;
      home.ga += ag;
      away.gf += ag;
      away.ga += hg;
      if (hg > ag) {
        home.won += 1; home.points += 3; away.lost += 1;
      } else if (ag > hg) {
        away.won += 1; away.points += 3; home.lost += 1;
      } else {
        home.draw += 1; away.draw += 1; home.points += 1; away.points += 1;
      }
      home.gd = home.gf - home.ga;
      away.gd = away.gf - away.ga;
    });

  const result = Array.from(groups.entries()).map(([group, table]) => {
    const rows = Array.from(table.values()).sort(sortGroupRows);
    rows.forEach((row, index) => {
      row.rank = index + 1;
      row.advance = index < 2 ? "TovÃ¡bbjutÃ³" : "";
    });
    return { group, rows };
  }).sort((a, b) => a.group.localeCompare(b.group, "hu"));

  const thirds = result.map((group) => group.rows[2]).filter(Boolean).sort(sortGroupRows);
  thirds.slice(0, 8).forEach((row) => {
    if (!row.advance) row.advance = "Legjobb 3.";
  });
  return result;
}

function sortGroupRows(a, b) {
  return b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team, "hu");
}

function groupStandingsHtml() {
  const groups = groupStandings();
  if (!groups.length) return `<p class="empty">Nincs csoportkÃ¶rÃ¶s meccs a listÃ¡ban.</p>`;
  return `
    <div class="group-grid">
      ${groups.map(({ group, rows }) => `
        <div class="table-wrap group-table">
          <h3>${group}. csoport</h3>
          <table>
            <thead><tr><th>#</th><th>Csapat</th><th>M</th><th>GY</th><th>D</th><th>V</th><th>GK</th><th>P</th><th>ÃllÃ¡s</th></tr></thead>
            <tbody>
              ${rows.map((row) => `
                <tr>
                  <td>${row.rank}</td>
                  <td><strong>${row.team}</strong></td>
                  <td>${row.played}</td>
                  <td>${row.won}</td>
                  <td>${row.draw}</td>
                  <td>${row.lost}</td>
                  <td>${row.gd}</td>
                  <td><strong>${row.points}</strong></td>
                  <td>${row.advance ? `<span class="pill">${row.advance}</span>` : ""}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`).join("")}
    </div>`;
}

function normalizeBracketText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupPositionTeam(seed) {
  if (!seed?.group || !seed?.rank) return "";
  const group = groupStandings().find((item) => item.group === seed.group);
  return group?.rows[seed.rank - 1]?.team || "";
}

function seedLabel(seed) {
  if (!seed) return "";
  if (seed.groups?.length) return seed.fallback || `${seed.groups.join("/")} csoport ${seed.rank}.`;
  const team = groupPositionTeam(seed);
  if (team) return team;
  return seed.fallback || `${seed.group} csoport ${seed.rank}.`;
}

function seedCandidateLabels(seed) {
  if (!seed) return [];
  if (seed.groups?.length) {
    return seed.groups
      .map((group) => groupPositionTeam({ group, rank: seed.rank }))
      .filter(Boolean);
  }
  const label = seedLabel(seed);
  return label ? [label] : [];
}

function bracketSlotByNo(no) {
  return knockoutBracketRounds.flatMap((round) => round.matches).find((slot) => slot.no === no);
}

function bracketMatchTeams(slot) {
  if (slot.home && slot.away) {
    return {
      home: seedLabel(slot.home),
      away: seedLabel(slot.away),
      homeSource: slot.home.fallback || `${slot.home.group} csoport ${slot.home.rank}.`,
      awaySource: slot.away.fallback || `${slot.away.group} csoport ${slot.away.rank}.`
    };
  }
  const sourceType = slot.sourceType || "winner";
  return {
    home: bracketParticipantLabel(slot.homeFrom, sourceType),
    away: bracketParticipantLabel(slot.awayFrom, sourceType),
    homeSource: `${slot.homeFrom}. meccs ${sourceType === "loser" ? "vesztese" : "gyÅ‘ztese"}`,
    awaySource: `${slot.awayFrom}. meccs ${sourceType === "loser" ? "vesztese" : "gyÅ‘ztese"}`
  };
}

function plannedMatchFor(slot) {
  const teams = bracketMatchTeams(slot);
  const homeCandidates = slot.home && slot.away ? seedCandidateLabels(slot.home) : [teams.home];
  const awayCandidates = slot.home && slot.away ? seedCandidateLabels(slot.away) : [teams.away];
  const homeSet = new Set(homeCandidates.map(normalizeBracketText).filter(Boolean));
  const awaySet = new Set(awayCandidates.map(normalizeBracketText).filter(Boolean));
  if (!homeSet.size || !awaySet.size) return null;
  return state.matches.find((match) => {
    if (match.stage !== "knockout") return false;
    const matchHome = normalizeBracketText(match.home);
    const matchAway = normalizeBracketText(match.away);
    return (homeSet.has(matchHome) && awaySet.has(matchAway)) || (homeSet.has(matchAway) && awaySet.has(matchHome));
  });
}

function bracketParticipantLabel(matchNo, type = "winner") {
  const sourceSlot = bracketSlotByNo(matchNo);
  if (!sourceSlot) return `${matchNo}. meccs ${type === "loser" ? "vesztese" : "gyÅ‘ztese"}`;
  const sourceMatch = plannedMatchFor(sourceSlot);
  if (!sourceMatch) return `${matchNo}. meccs ${type === "loser" ? "vesztese" : "gyÅ‘ztese"}`;
  const { result } = effectiveResultFor(sourceMatch.id);
  if (!result) return `${matchNo}. meccs ${type === "loser" ? "vesztese" : "gyÅ‘ztese"}`;
  const winner = knockoutWinner(sourceMatch, result);
  if (!winner) return `${matchNo}. meccs ${type === "loser" ? "vesztese" : "gyÅ‘ztese"}`;
  if (type === "winner") return winner;
  return winner === sourceMatch.home ? sourceMatch.away : sourceMatch.home;
}

function knockoutWinner(match, result) {
  if (!match || !result) return "";
  if (result.qualifier) return result.qualifier;
  const homeGoals = Number(result.homeGoals);
  const awayGoals = Number(result.awayGoals);
  if (homeGoals > awayGoals) return match.home;
  if (awayGoals > homeGoals) return match.away;
  return "";
}

function bracketTeamHtml(name, source) {
  const showSource = normalizeBracketText(name) !== normalizeBracketText(source);
  return `<strong>${name}</strong>${showSource ? `<small>${source}</small>` : ""}`;
}

function bracketRowForSlot(slot) {
  if (!slot) return 1;
  if (slot.no === 103) return bracketRowForNo(104) + 10;
  if (!slot.homeFrom || !slot.awayFrom) {
    const index = bracketLeafOrder.indexOf(slot.no);
    return index >= 0 ? index * 2 + 3 : 1;
  }
  return (bracketRowForNo(slot.homeFrom) + bracketRowForNo(slot.awayFrom)) / 2;
}

function bracketRowForNo(matchNo) {
  return bracketRowForSlot(bracketSlotByNo(matchNo));
}

function bracketJoinRows(slot) {
  if (!slot?.homeFrom || !slot?.awayFrom) return 0;
  return Math.abs(bracketRowForNo(slot.homeFrom) - bracketRowForNo(slot.awayFrom));
}

function bracketSpanForRound(roundIndex) {
  return [2, 4, 8, 16, 8][roundIndex] || 2;
}

function bracketLayout(roundIndex, slot) {
  const span = bracketSpanForRound(roundIndex);
  const centerRow = bracketRowForSlot(slot);
  return {
    row: centerRow - span / 2,
    span,
    join: bracketJoinRows(slot)
  };
}

function bracketSlotHtml(slot, matchIndex, roundIndex) {
  const teams = bracketMatchTeams(slot);
  const match = plannedMatchFor(slot);
  const resultInfo = match ? effectiveResultFor(match.id) : { result: null, status: "" };
  const score = resultInfo.result ? `${resultInfo.result.homeGoals}-${resultInfo.result.awayGoals}` : "";
  const winner = match && resultInfo.result ? knockoutWinner(match, resultInfo.result) : "";
  const qualifier = winner ? `<span class="bracket-winner">TovÃ¡bbjutÃ³: ${winner}</span>` : "";
  const status = resultInfo.status === "approved"
    ? `<span class="pill">vÃ©gleges</span>`
    : resultInfo.status === "pending"
      ? `<span class="pill warn">nem vÃ©gleges</span>`
      : "";
  const layout = bracketLayout(roundIndex, slot);
  const terminal = roundIndex === knockoutBracketRounds.length - 1 ? " bracket-terminal" : "";
  const detached = slot.no === 103 ? " bracket-detached" : "";
  const connector = roundIndex > 0 && !detached ? `<span class="bracket-join" aria-hidden="true"></span>` : "";
  return `
    <article class="bracket-match${terminal}${detached}" data-round="${roundIndex}" style="--bracket-row: ${layout.row}; --bracket-span: ${layout.span}; --join-height: ${layout.join * 74}px;">
      ${connector}
      <div class="bracket-match-head">
        <span class="bracket-no">${slot.no}. meccs</span>
        ${slot.note ? `<span class="pill info">${slot.note}</span>` : ""}
        ${status}
      </div>
      <div class="bracket-teams">
        <span>${bracketTeamHtml(match?.home || teams.home, teams.homeSource)}</span>
        <strong>${score || "vs"}</strong>
        <span>${bracketTeamHtml(match?.away || teams.away, teams.awaySource)}</span>
      </div>
      ${qualifier}
    </article>`;
}

function knockoutBracketHtml() {
  return `
    <div class="bracket-scroll">
      <div class="bracket-grid">
        ${knockoutBracketRounds.map((round, roundIndex) => `
          <section class="bracket-round" data-round="${roundIndex}">
            <h4>${round.title}</h4>
            ${round.matches.map((slot, matchIndex) => bracketSlotHtml(slot, matchIndex, roundIndex)).join("")}
          </section>`).join("")}
      </div>
    </div>
    <p class="muted bracket-note">Az Ã¡g a FIFA meccsszÃ¡main alapul. A legjobb 32-es pÃ¡rok a csoportÃ¡llÃ¡sbÃ³l Ã©s a feltÃ¶ltÃ¶tt meccsekbÅ‘l jÃ¶nnek, a kÃ©sÅ‘bbi kÃ¶rÃ¶k pedig az elÅ‘zÅ‘ meccsek tovÃ¡bbjutÃ³ibÃ³l Ã©pÃ¼lnek fel.</p>`;
}

function renderPlayed() {
  const isAdmin = Boolean(getUser()?.isAdmin);
  const rows = state.matches
    .map((match) => ({ match, ...effectiveResultFor(match.id) }))
    .filter((row) => row.result)
    .sort((a, b) => new Date(a.match.kickoff) - new Date(b.match.kickoff));

  els.playedView.innerHTML = `
    <div class="panel">
      <h3>KiesÃ©ses Ã¡g</h3>
      ${knockoutBracketHtml()}
    </div>
    <div class="panel">
      <h3>CsoportÃ¡llÃ¡s</h3>
      ${groupStandingsHtml()}
    </div>
    <div class="panel">
      <h3>EredmÃ©nyek</h3>
      ${rows.map((row) => row.status === "approved"
        ? finalResultHtml(row.match, row.result, isAdmin)
        : pendingResultHtml(row.match, row.result, isAdmin)
      ).join("") || `<p class="empty">MÃ©g nincs bekÃ¼ldÃ¶tt eredmÃ©ny.</p>`}
    </div>`;

  els.playedView.querySelectorAll(".approved-result-form").forEach((form) => {
    const match = matchById(form.dataset.matchId);
    if (!match) return;
    fillQualifierSelect(form.qualifier, match);
    form.qualifier.value = approvedFor(match.id)?.qualifier || "";
    updateResultQualifierRequirement(form, match);
    form.addEventListener("input", () => updateResultQualifierRequirement(form, match));
    form.addEventListener("submit", updateApprovedResult);
  });
  els.playedView.querySelectorAll("[data-approve]").forEach((button) => button.addEventListener("click", () => approveResult(button.dataset.approve)));
}

function renderAdmin() {
  const user = getUser();
  if (!user?.isAdmin) {
    els.adminView.innerHTML = "";
    return;
  }

  const pending = state.resultSubmissions.filter((item) => item.status === "pending");
  const pendingPredictions = state.predictionSubmissions.filter((item) => item.status === "pending");
  const passwordRequests = pendingPasswordResetRequests();
  const missingPastTips = missingPastTipRows();
  const missingUpcomingTips = missingUpcomingTipRows();
  els.adminView.innerHTML = `
    <div class="panel">
      <h3>Admin jÃ³vÃ¡hagyÃ¡s</h3>
      ${pending.map((item) => {
        const match = matchById(item.matchId);
        const user = userById(item.userId);
        const relatedPredictionCount = pendingPredictions.filter((prediction) => prediction.matchId === item.matchId).length;
        return `
          <div class="approval-row">
            <div>
              <span class="pill warn">fÃ¼ggÅ‘ben</span>
              <strong>${match.home} ${item.homeGoals}-${item.awayGoals} ${match.away}</strong>
              ${item.qualifier ? `<span>TovÃ¡bbjutÃ³: ${item.qualifier}</span>` : ""}
              <span>BekÃ¼ldte: ${user?.name || "Ismeretlen"} Â· ${formatStamp(item.submittedAt)}</span>
              ${relatedPredictionCount ? `<span class="pill warn">${relatedPredictionCount} fÃ¼ggÅ‘ tippmÃ³dosÃ­tÃ¡s ennÃ©l a meccsnÃ©l</span>` : ""}
            </div>
            <div class="approval-actions">
              <button type="button" data-approve="${item.id}">JÃ³vÃ¡hagyÃ¡s</button>
              <button class="danger" type="button" data-reject="${item.id}">ElutasÃ­tÃ¡s</button>
            </div>
          </div>`;
      }).join("") || `<p class="empty">Nincs jÃ³vÃ¡hagyÃ¡sra vÃ¡rÃ³ eredmÃ©ny.</p>`}
    </div>
    <div class="panel">
      <h3>TippmÃ³dosÃ­tÃ¡sok jÃ³vÃ¡hagyÃ¡sa</h3>
      ${pendingPredictions.map((item) => {
        const match = matchById(item.matchId);
        const user = userById(item.userId);
        const resultInfo = effectiveResultFor(item.matchId);
        const resultStatus = resultInfo.status === "approved"
          ? "az eredmÃ©ny mÃ¡r vÃ©gleges"
          : resultInfo.status === "pending"
          ? "az eredmÃ©ny mÃ©g jÃ³vÃ¡hagyÃ¡sra vÃ¡r"
          : "mÃ©g nincs eredmÃ©ny";
        return `
          <div class="approval-row">
            <div>
              <span class="pill warn">fÃ¼ggÅ‘ben</span>
              <strong>${user?.name || "Ismeretlen"}: ${match.home} ${item.homeGoals}-${item.awayGoals} ${match.away}</strong>
              ${item.qualifier ? `<span>TovÃ¡bbjutÃ³: ${item.qualifier}</span>` : ""}
              <span class="pill info">${resultStatus}</span>
              <span>${formatStamp(item.submittedAt)}</span>
            </div>
            <div class="approval-actions">
              <button type="button" data-approve-prediction="${item.id}">JÃ³vÃ¡hagyÃ¡s</button>
              <button class="danger" type="button" data-reject-prediction="${item.id}">ElutasÃ­tÃ¡s</button>
            </div>
          </div>`;
      }).join("") || `<p class="empty">Nincs jÃ³vÃ¡hagyÃ¡sra vÃ¡rÃ³ tippmÃ³dosÃ­tÃ¡s.</p>`}
    </div>
    <div class="panel">
      <h3>JelszÃ³-visszaÃ¡llÃ­tÃ¡si kÃ©rÃ©sek</h3>
      ${passwordRequests.map((item) => {
        const requestUser = userById(item.userId);
        return `
          <div class="approval-row password-reset-row">
            <div>
              <span class="pill warn">jelszÃ³ kÃ©rÃ©s</span>
              <strong>${requestUser?.name || item.requestedName}</strong>
              <span>${formatStamp(item.requestedAt)}</span>
            </div>
            <div class="approval-actions">
              ${requestUser ? `<input data-reset-request-password="${item.id}" type="text" placeholder="Ãºj jelszÃ³" />` : `<span class="muted">Nincs ilyen jÃ¡tÃ©kos</span>`}
              ${requestUser ? `<button type="button" data-reset-request="${item.id}">JelszÃ³ beÃ¡llÃ­tÃ¡sa</button>` : ""}
              <button class="secondary" type="button" data-close-reset-request="${item.id}">LezÃ¡rÃ¡s</button>
            </div>
          </div>`;
      }).join("") || `<p class="empty">Nincs jelszÃ³-visszaÃ¡llÃ­tÃ¡si kÃ©rÃ©s.</p>`}
    </div>
    <div class="panel">
      <h3>HiÃ¡nyzÃ³ tippek elmÃºlt meccseken (${missingPastTips.length})</h3>
      ${missingTipsHtml(missingPastTips, "Nincs hiÃ¡nyzÃ³ tipp elmÃºlt meccsen.")}
    </div>
    <div class="panel">
      <h3>HiÃ¡nyzÃ³ tippek a kÃ¶vetkezÅ‘ 24 Ã³rÃ¡ban (${missingUpcomingTips.length})</h3>
      ${upcomingMissingTipsHtml(missingUpcomingTips, "Nincs hiÃ¡nyzÃ³ tipp a kÃ¶vetkezÅ‘ 24 Ã³rÃ¡ban kezdÅ‘dÅ‘ meccseken.")}
    </div>
    <div class="panel">
      <h3>UtÃ³lagos tipp rÃ¶gzÃ­tÃ©se</h3>
      <form id="adminPredictionForm" class="admin-prediction-form">
        <div class="score-inputs">
          <label>JÃ¡tÃ©kos <select name="userId" required></select></label>
          <label>Meccs <select name="matchId" required></select></label>
        </div>
        <div class="score-inputs">
          <label>Hazai <input name="homeGoals" type="number" min="0" max="20" required /></label>
          <label>VendÃ©g <input name="awayGoals" type="number" min="0" max="20" required /></label>
        </div>
        <label class="admin-qualifier-row hidden">
          TovÃ¡bbjutÃ³ dÃ¶ntetlen tippnÃ©l
          <select name="qualifier">
            <option value="">VÃ¡lassz tovÃ¡bbjutÃ³t</option>
          </select>
        </label>
        <button type="submit">Tipp mentÃ©se jÃ¡tÃ©kosnak</button>
      </form>
    </div>
    <div class="panel">
      <h3>Meccs hozzÃ¡adÃ¡sa kÃ©zzel</h3>
      <form id="manualMatchForm" class="admin-prediction-form">
        <div class="score-inputs">
          <label>Hazai csapat <input name="home" required /></label>
          <label>Idegen csapat <input name="away" required /></label>
        </div>
        <div class="score-inputs">
          <label>IdÅ‘pont <input name="kickoff" type="datetime-local" required /></label>
          <label>Meccs stÃ¡tusz <input name="label" placeholder="pl. CsoportkÃ¶r, NyolcaddÃ¶ntÅ‘" required /></label>
        </div>
        <label>Csoport <input name="group" placeholder="opcionÃ¡lis" /></label>
        <button type="submit">Meccs hozzÃ¡adÃ¡sa</button>
        <p class="form-message"></p>
      </form>
    </div>
    <div class="panel">
      <h3>Meccsek feltÃ¶ltÃ©se CSV-bÅ‘l</h3>
      <form id="matchUploadForm" class="admin-prediction-form">
        <label>CSV fÃ¡jl <input name="csvFile" type="file" accept=".csv,text/csv" required /></label>
        <label class="checkbox-line"><input name="replaceMatches" type="checkbox" /> MeglÃ©vÅ‘ meccsek cserÃ©je</label>
        <button type="submit">Meccsek feltÃ¶ltÃ©se</button>
        <p class="muted">MezÅ‘k: hazai csapat, idegen csapat, idÅ‘pont, meccs status. A csoport oszlop opcionÃ¡lis.</p>
        <p class="form-message"></p>
      </form>
    </div>
    <div class="panel">
      <h3>Meccsek szerkesztÃ©se</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Hazai</th><th>Idegen</th><th>IdÅ‘pont</th><th>StÃ¡tusz</th><th>Csoport</th><th></th></tr></thead>
          <tbody>
            ${state.matches.slice().sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).map((match) => `
              <tr data-match-edit="${match.id}">
                <td><input name="home" value="${match.home}" /></td>
                <td><input name="away" value="${match.away}" /></td>
                <td><input name="kickoff" type="datetime-local" value="${localDateTimeValue(match.kickoff)}" /></td>
                <td><input name="label" value="${match.label}" /></td>
                <td><input name="group" value="${match.group || ""}" /></td>
                <td><button type="button" class="secondary" data-save-match="${match.id}">MentÃ©s</button></td>
              </tr>`).join("") || `<tr><td colspan="6" class="empty">Nincs feltÃ¶ltÃ¶tt meccs.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <h3>JÃ¡tÃ©kosok kezelÃ©se</h3>
      <form id="createUserForm" class="admin-prediction-form">
        <div class="score-inputs">
          <label>FelhasznÃ¡lÃ³nÃ©v <input name="name" autocomplete="off" required /></label>
          <label>Ideiglenes jelszÃ³ <input name="password" type="text" required /></label>
        </div>
        <label class="checkbox-line"><input name="isAdmin" type="checkbox" /> Admin jog</label>
        <button type="submit">FelhasznÃ¡lÃ³ lÃ©trehozÃ¡sa</button>
        <p class="form-message"></p>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>NÃ©v</th><th>Szerep</th><th>Ãšj jelszÃ³</th><th>MÅ±veletek</th></tr></thead>
          <tbody>
            ${state.users.map((item) => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.isSystemAdmin ? "alap admin" : item.isAdmin ? "admin jÃ¡tÃ©kos" : "jÃ¡tÃ©kos"}${item.mustChangePassword ? `<br><span class="pill warn">jelszÃ³csere kell</span>` : ""}</td>
                <td><input data-reset-password="${item.id}" type="text" placeholder="Ãºj jelszÃ³" /></td>
                <td>
                  <div class="result-actions">
                    ${item.isSystemAdmin ? ""
                      : item.isAdmin
                      ? `<button type="button" class="secondary" data-admin-role="${item.id}" data-admin-role-value="0" ${item.id === currentUserId ? "disabled" : ""}>Admin elvÃ©tele</button>`
                      : `<button type="button" class="secondary" data-admin-role="${item.id}" data-admin-role-value="1">Admin adÃ¡sa</button>`}
                    <button type="button" class="secondary" data-reset-user="${item.id}">JelszÃ³ visszaÃ¡llÃ­tÃ¡sa</button>
                    <button type="button" class="danger" data-delete-user="${item.id}" ${item.id === currentUserId || item.isSystemAdmin ? "disabled" : ""}>TÃ¶rlÃ©s</button>
                  </div>
                </td>
              </tr>`).join("") || `<tr><td colspan="4" class="empty">Nincs jÃ¡tÃ©kos.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <h3>Csapatverseny beosztÃ¡s</h3>
      <div class="team-admin-grid">
        ${playerUsers().map((item) => `
          <label class="team-assignment-row">
            <span>${item.name}${item.isAdmin ? " Â· admin" : ""}</span>
            <select data-team-assignment="${item.id}">
              <option value="">Nincs csapatban</option>
              ${TEAM_COMPETITION_TEAMS.map((team) => `<option value="${team.id}" ${userTeamId(item.id) === team.id ? "selected" : ""}>${team.name}</option>`).join("")}
            </select>
          </label>`).join("") || `<p class="empty">Nincs beoszthatÃ³ jÃ¡tÃ©kos.</p>`}
      </div>
    </div>
    <div class="panel">
      <h3>KarbantartÃ¡s</h3>
      <button class="secondary" type="button" id="exportBtn">Adatok exportÃ¡lÃ¡sa JSON-kÃ©nt</button>
      <form id="importDataForm" class="admin-prediction-form">
        <label>KorÃ¡bbi mentÃ©s <input name="dataFile" type="file" accept="application/json,.json" required /></label>
        <p class="muted">A visszaÃ¡llÃ­tÃ¡s a jelenlegi felhasznÃ¡lÃ³kat, meccseket, tippeket Ã©s eredmÃ©nyeket teljesen felÃ¼lÃ­rja.</p>
        <button class="danger" type="submit">Adatok visszaÃ¡llÃ­tÃ¡sa JSON-bÅ‘l</button>
        <p class="form-message"></p>
      </form>
    </div>`;

  els.adminView.querySelectorAll("[data-approve]").forEach((button) => button.addEventListener("click", () => approveResult(button.dataset.approve)));
  els.adminView.querySelectorAll("[data-reject]").forEach((button) => button.addEventListener("click", () => rejectResult(button.dataset.reject)));
  els.adminView.querySelectorAll("[data-approve-prediction]").forEach((button) => button.addEventListener("click", () => approvePredictionSubmission(button.dataset.approvePrediction)));
  els.adminView.querySelectorAll("[data-reject-prediction]").forEach((button) => button.addEventListener("click", () => rejectPredictionSubmission(button.dataset.rejectPrediction)));
  els.adminView.querySelectorAll("[data-reset-request]").forEach((button) => button.addEventListener("click", () => resetPasswordFromRequest(button.dataset.resetRequest)));
  els.adminView.querySelectorAll("[data-close-reset-request]").forEach((button) => button.addEventListener("click", () => closePasswordResetRequest(button.dataset.closeResetRequest)));
  els.adminView.querySelectorAll("[data-fill-missing-tip]").forEach((button) => button.addEventListener("click", () => fillMissingTip(button.dataset.fillMissingTip)));
  els.adminView.querySelectorAll("[data-hide-missing-tip]").forEach((button) => button.addEventListener("click", () => hideMissingTip(button.dataset.hideMissingTip)));
  els.adminView.querySelector("#createUserForm").addEventListener("submit", createUserFromAdminForm);
  setupAdminPredictionForm();
  els.adminView.querySelector("#manualMatchForm").addEventListener("submit", addManualMatch);
  els.adminView.querySelector("#matchUploadForm").addEventListener("submit", importMatchesFromCsv);
  els.adminView.querySelectorAll("[data-save-match]").forEach((button) => button.addEventListener("click", () => saveEditedMatch(button.dataset.saveMatch)));
  els.adminView.querySelectorAll("[data-admin-role]").forEach((button) => button.addEventListener("click", () => setUserAdminRole(button.dataset.adminRole, button.dataset.adminRoleValue === "1")));
  els.adminView.querySelectorAll("[data-reset-user]").forEach((button) => button.addEventListener("click", () => resetUserPassword(button.dataset.resetUser)));
  els.adminView.querySelectorAll("[data-delete-user]").forEach((button) => button.addEventListener("click", () => deleteUser(button.dataset.deleteUser)));
  els.adminView.querySelectorAll("[data-team-assignment]").forEach((select) => select.addEventListener("change", () => setUserTeam(select.dataset.teamAssignment, select.value)));
  els.adminView.querySelector("#exportBtn").addEventListener("click", exportData);
  els.adminView.querySelector("#importDataForm").addEventListener("submit", importData);
}

function setupAdminPredictionForm() {
  const form = els.adminView.querySelector("#adminPredictionForm");
  if (!form) return;
  form.userId.innerHTML = playerUsers()
    .map((user) => `<option value="${user.id}">${user.name}${user.isAdmin ? " Â· admin" : ""}</option>`)
    .join("");
  form.matchId.innerHTML = state.matches
    .slice()
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .map((match) => `<option value="${match.id}">${formatDate(match.kickoff)} Â· ${match.home} - ${match.away}</option>`)
    .join("");

  const update = () => {
    const match = matchById(form.matchId.value);
    if (!match) return;
    fillQualifierSelect(form.qualifier, match);
    const drawTip = form.homeGoals.value !== "" && form.homeGoals.value === form.awayGoals.value;
    const show = match.stage === "knockout" && drawTip;
    form.querySelector(".admin-qualifier-row").classList.toggle("hidden", !show);
    form.qualifier.required = show;
    form.qualifier.disabled = !show;
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", saveAdminPrediction);
  update();
}

function fillMissingTip(value) {
  const [userId, matchId] = value.split(":");
  const form = els.adminView.querySelector("#adminPredictionForm");
  if (!form || !userById(userId) || !matchById(matchId)) return;
  form.userId.value = userId;
  form.matchId.value = matchId;
  form.homeGoals.value = "";
  form.awayGoals.value = "";
  form.qualifier.value = "";
  form.dispatchEvent(new Event("change"));
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  form.homeGoals.focus();
}

function hideMissingTip(value) {
  if (!getUser()?.isAdmin) return;
  if (!state.hiddenMissingTips.includes(value)) {
    state.hiddenMissingTips.push(value);
  }
  saveState();
  render();
}

function requestPasswordReset(name) {
  const requestedName = name.trim();
  if (!requestedName) throw new Error("Add meg a felhasznÃ¡lÃ³neved.");
  const user = state.users.find((item) => item.name.toLowerCase() === requestedName.toLowerCase());
  const existing = state.passwordResetRequests.find((item) => {
    const sameKnownUser = user && item.userId === user.id;
    const sameName = item.requestedName.toLowerCase() === requestedName.toLowerCase();
    return item.status === "pending" && (sameKnownUser || sameName);
  });
  if (existing) return;
  state.passwordResetRequests.push({
    id: createId(),
    userId: user?.id || "",
    requestedName,
    status: "pending",
    requestedAt: new Date().toISOString()
  });
  saveState();
}

async function resetPasswordFromRequest(requestId) {
  const request = state.passwordResetRequests.find((item) => item.id === requestId);
  const input = els.adminView.querySelector(`[data-reset-request-password="${requestId}"]`);
  const user = request ? userById(request.userId) : null;
  if (!request || !input || !user || !getUser()?.isAdmin || !input.value) return;
  if (shouldUseServerStorage()) {
    const data = await apiPost("/api/resolve-password-reset", {
      adminId: currentUserId,
      requestId,
      password: input.value
    });
    syncStateFromServer(data.state);
    render();
    return;
  }
  if (!hasWebCrypto()) {
    await ensureServerPasswordApi();
    const data = await apiPost("/api/resolve-password-reset", {
      adminId: currentUserId,
      requestId,
      password: input.value
    });
    syncStateFromServer(data.state);
    render();
    return;
  }
  await setUserPassword(user, input.value);
  const updatedUser = userById(user.id);
  if (updatedUser) updatedUser.mustChangePassword = true;
  request.status = "resolved";
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = currentUserId;
  saveState();
  render();
}

function closePasswordResetRequest(requestId) {
  const request = state.passwordResetRequests.find((item) => item.id === requestId);
  if (!request || !getUser()?.isAdmin) return;
  request.status = "closed";
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = currentUserId;
  saveState();
  render();
}

async function createUserFromAdminForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector(".form-message");
  try {
    await createUserByAdmin(form.name.value, form.password.value, form.isAdmin.checked);
    form.reset();
    message.textContent = "FelhasznÃ¡lÃ³ lÃ©trehozva. ElsÅ‘ belÃ©pÃ©skor jelszÃ³t kell mÃ³dosÃ­tania.";
    render();
  } catch (error) {
    message.textContent = error.message;
  }
}

function saveAdminPrediction(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const match = matchById(form.matchId.value);
  const user = userById(form.userId.value);
  if (!match || !user || !getUser()?.isAdmin) return;

  const homeGoals = Number(form.homeGoals.value);
  const awayGoals = Number(form.awayGoals.value);
  const qualifier = match.stage === "knockout" && homeGoals === awayGoals ? form.qualifier.value : "";
  let prediction = state.predictions.find((item) => item.userId === user.id && item.matchId === match.id);
  if (!prediction) {
    prediction = {
      id: createId(),
      userId: user.id,
      matchId: match.id,
      createdAt: new Date().toISOString()
    };
    state.predictions.push(prediction);
  }
  prediction.homeGoals = homeGoals;
  prediction.awayGoals = awayGoals;
  prediction.qualifier = qualifier;
  prediction.updatedAt = new Date().toISOString();
  prediction.enteredByAdmin = currentUserId;
  state.hiddenMissingTips = state.hiddenMissingTips.filter((key) => key !== missingTipKey(user.id, match.id));
  saveState();
  render();
}

function addManualMatch(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector(".form-message");
  if (!getUser()?.isAdmin) return;

  const kickoff = new Date(form.kickoff.value);
  if (Number.isNaN(kickoff.getTime())) {
    message.textContent = "HibÃ¡s idÅ‘pont.";
    return;
  }

  const label = form.label.value.trim() || "Meccs";
  state.matches.push({
    id: `manual-${Date.now()}`,
    home: form.home.value.trim(),
    away: form.away.value.trim(),
    kickoff: kickoff.toISOString(),
    label,
    group: form.group.value.trim(),
    stage: label.toLowerCase().includes("csoport") ? "group" : "knockout"
  });
  saveState();
  form.reset();
  message.textContent = "Meccs hozzÃ¡adva.";
  render();
}

async function importMatchesFromCsv(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector(".form-message");
  const file = form.csvFile.files[0];
  if (!file || !getUser()?.isAdmin) return;
  try {
    const text = await readCsvFileText(file);
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("A CSV Ã¼res.");
    const headers = rows[0].map(normalizeHeader);
    const imported = rows.slice(1)
      .filter((row) => row.some((cell) => cell.trim()))
      .map((row, index) => csvRowToMatch(headers, row, index));
    if (form.replaceMatches.checked) {
      const keepIds = new Set(imported.map((match) => match.id));
      state.matches = imported;
      state.predictions = state.predictions.filter((item) => keepIds.has(item.matchId));
      state.predictionSubmissions = state.predictionSubmissions.filter((item) => keepIds.has(item.matchId));
      state.resultSubmissions = state.resultSubmissions.filter((item) => keepIds.has(item.matchId));
      state.approvedResults = state.approvedResults.filter((item) => keepIds.has(item.matchId));
      state.hiddenMissingTips = state.hiddenMissingTips.filter((key) => keepIds.has(key.split(":")[1]));
    } else {
      state.matches.push(...imported);
    }
    saveState();
    form.reset();
    message.textContent = `${imported.length} meccs feltÃ¶ltve.`;
    render();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function readCsvFileText(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!utf8.includes("\uFFFD")) return utf8.replace(/^\uFEFF/, "");
  try {
    return new TextDecoder("windows-1250").decode(buffer).replace(/^\uFEFF/, "");
  } catch (error) {
    return utf8.replace(/^\uFEFF/, "");
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const delimiter = (text.split("\n")[0].match(/;/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value) {
  return value.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function csvValue(headers, row, names) {
  const index = headers.findIndex((header) => names.includes(header));
  return index >= 0 ? row[index] || "" : "";
}

function csvRowToMatch(headers, row, index) {
  const home = csvValue(headers, row, ["hazaicsapat", "hazai", "home"]);
  const away = csvValue(headers, row, ["idegencsapat", "idegen", "vendeg", "away"]);
  const kickoff = csvValue(headers, row, ["idopont", "datum", "date", "kickoff"]);
  const label = csvValue(headers, row, ["meccsstatus", "status", "szakasz", "stage"]) || "CsoportkÃ¶r";
  const group = csvValue(headers, row, ["csoport", "group"]);
  if (!home || !away || !kickoff) throw new Error(`HiÃ¡nyzÃ³ adat a(z) ${index + 2}. sorban.`);
  const date = parseCsvDate(kickoff);
  if (Number.isNaN(date.getTime())) throw new Error(`HibÃ¡s idÅ‘pont a(z) ${index + 2}. sorban.`);
  return {
    id: `csv-${Date.now()}-${index}`,
    home,
    away,
    kickoff: date.toISOString(),
    label,
    group,
    stage: label.toLowerCase().includes("csoport") ? "group" : "knockout"
  };
}

function parseCsvDate(value) {
  const trimmed = value.trim();
  const budapest = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*(CEST|CET)?$/i);
  if (budapest) {
    const [, year, month, day, hour, minute, second = "00", zone = "CEST"] = budapest;
    const offset = zone.toUpperCase() === "CET" ? "+01:00" : "+02:00";
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`);
  }
  return new Date(trimmed);
}

function saveEditedMatch(matchId) {
  const row = els.adminView.querySelector(`[data-match-edit="${matchId}"]`);
  const match = matchById(matchId);
  if (!row || !match || !getUser()?.isAdmin) return;
  const kickoff = new Date(row.querySelector('[name="kickoff"]').value);
  if (Number.isNaN(kickoff.getTime())) return;
  match.home = row.querySelector('[name="home"]').value.trim();
  match.away = row.querySelector('[name="away"]').value.trim();
  match.kickoff = kickoff.toISOString();
  match.label = row.querySelector('[name="label"]').value.trim() || "Meccs";
  match.group = row.querySelector('[name="group"]').value.trim();
  match.stage = match.label.toLowerCase().includes("csoport") ? "group" : "knockout";
  saveState();
  render();
}

async function resetUserPassword(userId) {
  const input = els.adminView.querySelector(`[data-reset-password="${userId}"]`);
  const user = userById(userId);
  if (!input || !user || !getUser()?.isAdmin || !input.value) return;
  await setUserPassword(user, input.value);
  const updatedUser = userById(user.id);
  if (updatedUser) updatedUser.mustChangePassword = true;
  saveState();
  render();
}

function setUserAdminRole(userId, isAdmin) {
  const user = userById(userId);
  if (!user || !getUser()?.isAdmin) return;
  if (user.isSystemAdmin) return;
  if (user.id === currentUserId && !isAdmin) return;
  user.isAdmin = isAdmin;
  saveState();
  render();
}

function setUserTeam(userId, teamId) {
  const user = userById(userId);
  if (!user || user.isSystemAdmin || !getUser()?.isAdmin) return;
  state.teamAssignments = state.teamAssignments || {};
  if (teamId && teamById(teamId)) {
    state.teamAssignments[userId] = teamId;
  } else {
    delete state.teamAssignments[userId];
  }
  saveState();
  render();
}

function deleteUser(userId) {
  if (!getUser()?.isAdmin || userId === currentUserId) return;
  if (userById(userId)?.isSystemAdmin) return;
  if (state.teamAssignments) delete state.teamAssignments[userId];
  state.users = state.users.filter((user) => user.id !== userId);
  state.predictions = state.predictions.filter((prediction) => prediction.userId !== userId);
  state.predictionSubmissions = state.predictionSubmissions.filter((submission) => submission.userId !== userId);
  state.resultSubmissions = state.resultSubmissions.filter((submission) => submission.userId !== userId);
  state.hiddenMissingTips = state.hiddenMissingTips.filter((key) => key.split(":")[0] !== userId);
  saveState();
  render();
}

function upsertApprovedResult({ matchId, homeGoals, awayGoals, qualifier, approvedBy }) {
  state.approvedResults = state.approvedResults.filter((result) => result.matchId !== matchId);
  state.approvedResults.push({
    id: createId(),
    matchId,
    homeGoals,
    awayGoals,
    qualifier,
    approvedAt: new Date().toISOString(),
    approvedBy
  });
  state.resultSubmissions
    .filter((item) => item.matchId === matchId && item.status === "pending")
    .forEach((item) => {
      item.status = "rejected";
      item.reviewedAt = new Date().toISOString();
    });
}

function approveResult(submissionId) {
  const submission = state.resultSubmissions.find((item) => item.id === submissionId);
  if (!submission) return;
  upsertApprovedResult({
    matchId: submission.matchId,
    homeGoals: submission.homeGoals,
    awayGoals: submission.awayGoals,
    qualifier: submission.qualifier,
    approvedBy: currentUserId
  });
  submission.status = "approved";
  submission.reviewedAt = new Date().toISOString();
  saveState();
  render();
}

function updateApprovedResult(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const match = matchById(form.dataset.matchId);
  const existing = approvedFor(form.dataset.matchId);
  if (!match || !existing || !getUser()?.isAdmin) return;

  const homeGoals = Number(form.homeGoals.value);
  const awayGoals = Number(form.awayGoals.value);
  existing.homeGoals = homeGoals;
  existing.awayGoals = awayGoals;
  existing.qualifier = match.stage === "knockout"
    ? (homeGoals === awayGoals ? form.qualifier.value : impliedQualifier(match, homeGoals, awayGoals, ""))
    : "";
  existing.approvedAt = new Date().toISOString();
  existing.approvedBy = currentUserId;
  saveState();
  render();
}

function rejectResult(submissionId) {
  const submission = state.resultSubmissions.find((item) => item.id === submissionId);
  if (!submission) return;
  submission.status = "rejected";
  submission.reviewedAt = new Date().toISOString();
  saveState();
  render();
}

function approvePredictionSubmission(submissionId) {
  const submission = state.predictionSubmissions.find((item) => item.id === submissionId);
  if (!submission || !getUser()?.isAdmin) return;
  let prediction = state.predictions.find((item) => item.userId === submission.userId && item.matchId === submission.matchId);
  if (!prediction) {
    prediction = {
      id: createId(),
      userId: submission.userId,
      matchId: submission.matchId,
      createdAt: submission.submittedAt
    };
    state.predictions.push(prediction);
  }
  prediction.homeGoals = submission.homeGoals;
  prediction.awayGoals = submission.awayGoals;
  prediction.qualifier = submission.qualifier;
  prediction.updatedAt = new Date().toISOString();
  prediction.approvedByAdmin = currentUserId;
  submission.status = "approved";
  submission.reviewedAt = new Date().toISOString();
  saveState();
  render();
}

function rejectPredictionSubmission(submissionId) {
  const submission = state.predictionSubmissions.find((item) => item.id === submissionId);
  if (!submission || !getUser()?.isAdmin) return;
  submission.status = "rejected";
  submission.reviewedAt = new Date().toISOString();
  saveState();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vb-tippliga-2026-adatok.json";
  link.click();
  URL.revokeObjectURL(url);
}

function updateScrollTopButton() {
  els.scrollTopBtn?.classList.toggle("is-visible", window.scrollY > 360);
}

async function importData(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector(".form-message");
  const file = form.dataFile.files[0];
  if (!getUser()?.isAdmin || !file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
      throw new Error("A kivÃ¡lasztott fÃ¡jl nem Ã©rvÃ©nyes adatmentÃ©s.");
    }
    if (!window.confirm("Biztosan visszaÃ¡llÃ­tod ezt a mentÃ©st? A jelenlegi adatok teljesen felÃ¼lÃ­rÃ³dnak.")) return;

    state = normalizeState(imported);
    stripPlainPasswords(state);
    saveState();
    form.reset();
    if (currentUserId !== SYSTEM_ADMIN_ID && !state.users.some((user) => user.id === currentUserId)) {
      clearCurrentUser();
    }
    render();
    els.adminView.querySelector("#importDataForm .form-message")?.append("Az adatok visszaÃ¡llÃ­tÃ¡sa elkÃ©szÃ¼lt.");
  } catch (error) {
    message.textContent = error instanceof SyntaxError
      ? "A fÃ¡jl nem Ã©rvÃ©nyes JSON formÃ¡tumÃº."
      : error.message;
  }
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const user = await loginUser(els.loginName.value, els.loginPassword.value);
    storeCurrentUser(user);
    els.loginMessage.textContent = "";
    els.loginForm.reset();
    render();
  } catch (error) {
    els.loginMessage.textContent = error.message;
  }
});

function openPasswordResetDialog() {
  els.passwordResetForm.reset();
  els.passwordResetMessage.textContent = "";
  if (typeof els.passwordResetDialog.showModal === "function") {
    els.passwordResetDialog.showModal();
  } else {
    els.passwordResetDialog.setAttribute("open", "");
  }
  els.passwordResetName.focus();
}

function closePasswordResetDialog() {
  if (typeof els.passwordResetDialog.close === "function") {
    els.passwordResetDialog.close();
  } else {
    els.passwordResetDialog.removeAttribute("open");
  }
}

els.openPasswordResetBtn.addEventListener("click", openPasswordResetDialog);

els.closePasswordResetBtn.addEventListener("click", () => {
  closePasswordResetDialog();
});

els.closeWhatsNewBtn?.addEventListener("click", closeWhatsNew);

els.whatsNewDialog?.addEventListener("click", (event) => {
  if (event.target === els.whatsNewDialog) closeWhatsNew();
});

els.passwordResetDialog.addEventListener("click", (event) => {
  if (event.target === els.passwordResetDialog) {
    closePasswordResetDialog();
  }
});

els.passwordResetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    requestPasswordReset(els.passwordResetName.value);
    els.loginMessage.textContent = "A jelszÃ³-visszaÃ¡llÃ­tÃ¡si kÃ©rÃ©s elkÃ¼ldve az adminoknak.";
    els.passwordResetForm.reset();
    closePasswordResetDialog();
  } catch (error) {
    els.passwordResetMessage.textContent = error.message;
  }
});

els.sessionBox.addEventListener("click", (event) => {
  if (event.target.closest("#logoutBtn")) {
    event.preventDefault();
    logoutUser();
  }
});

els.scrollTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", updateScrollTopButton, { passive: true });

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.classList.contains("hidden")) return;
    activateTab(tab.dataset.view);
  });
});

const savedUserName = localStorage.getItem(CURRENT_USER_NAME_KEY);
if (savedUserName && els.loginName && !els.loginName.value) {
  els.loginName.value = savedUserName;
}

if (shouldUseServerStorage()) {
  render();
  updateScrollTopButton();
  loadServerState().finally(checkMatchReminders);
} else {
  render();
  updateScrollTopButton();
  loadServerState();
  checkMatchReminders();
}
setInterval(checkMatchReminders, 60 * 1000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A PWA telepÃ­thetÅ‘sÃ©g HTTPS-en vagy localhoston mÅ±kÃ¶dik; file:// alatt csendben kihagyjuk.
    });
  });
}
