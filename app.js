const STORAGE_KEY = "vb-tippliga-2026-v4";
const CURRENT_USER_KEY = "vb-tippliga-current-user-v4";
const REMINDER_KEY = "vb-tippliga-reminders-v1";
const PASSWORD_ITERATIONS = 150000;
const REMINDER_LEAD_MS = 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 5 * 60 * 1000;
const SYSTEM_ADMIN_ID = "__system_admin__";
const SYSTEM_ADMIN_NAME = "admin";
const SYSTEM_ADMIN_PASSWORD = "admin8520";

const seedMatches = [];

const knockoutBracket = [
  {
    title: "32-es kör",
    matches: [
      { no: 73, home: "A csoport 2.", away: "B csoport 2." },
      { no: 74, home: "E csoport 1.", away: "A/B/C/D/F csoport 3." },
      { no: 75, home: "F csoport 1.", away: "C csoport 2." },
      { no: 76, home: "C csoport 1.", away: "F csoport 2." },
      { no: 77, home: "I csoport 1.", away: "C/D/F/G/H csoport 3." },
      { no: 78, home: "E csoport 2.", away: "I csoport 2." },
      { no: 79, home: "A csoport 1.", away: "C/E/F/H/I csoport 3." },
      { no: 80, home: "L csoport 1.", away: "E/H/I/J/K csoport 3." },
      { no: 81, home: "D csoport 1.", away: "B/E/F/I/J csoport 3." },
      { no: 82, home: "G csoport 1.", away: "A/E/H/I/J csoport 3." },
      { no: 83, home: "K csoport 2.", away: "L csoport 2." },
      { no: 84, home: "H csoport 1.", away: "J csoport 2." },
      { no: 85, home: "B csoport 1.", away: "E/F/G/I/J csoport 3." },
      { no: 86, home: "J csoport 1.", away: "H csoport 2." },
      { no: 87, home: "K csoport 1.", away: "D/E/I/J/L csoport 3." },
      { no: 88, home: "D csoport 2.", away: "G csoport 2." }
    ]
  },
  {
    title: "Nyolcaddöntő",
    matches: [
      { no: 89, home: "73. meccs győztese", away: "75. meccs győztese" },
      { no: 90, home: "74. meccs győztese", away: "77. meccs győztese" },
      { no: 91, home: "76. meccs győztese", away: "78. meccs győztese" },
      { no: 92, home: "79. meccs győztese", away: "80. meccs győztese" },
      { no: 93, home: "83. meccs győztese", away: "84. meccs győztese" },
      { no: 94, home: "81. meccs győztese", away: "82. meccs győztese" },
      { no: 95, home: "86. meccs győztese", away: "88. meccs győztese" },
      { no: 96, home: "85. meccs győztese", away: "87. meccs győztese" }
    ]
  },
  {
    title: "Negyeddöntő",
    matches: [
      { no: 97, home: "89. meccs győztese", away: "90. meccs győztese" },
      { no: 98, home: "93. meccs győztese", away: "94. meccs győztese" },
      { no: 99, home: "91. meccs győztese", away: "92. meccs győztese" },
      { no: 100, home: "95. meccs győztese", away: "96. meccs győztese" }
    ]
  },
  {
    title: "Elődöntő",
    matches: [
      { no: 101, home: "97. meccs győztese", away: "98. meccs győztese" },
      { no: 102, home: "99. meccs győztese", away: "100. meccs győztese" }
    ]
  },
  {
    title: "Döntők",
    matches: [
      { no: 103, home: "101. meccs vesztese", away: "102. meccs vesztese", note: "Bronzmeccs" },
      { no: 104, home: "101. meccs győztese", away: "102. meccs győztese", note: "Döntő" }
    ]
  }
];

let state = loadState();
let currentUserId = localStorage.getItem(CURRENT_USER_KEY);
let serverSyncAvailable = false;
let suppressServerSave = false;

function hasWebCrypto() {
  return Boolean(window.crypto?.subtle && window.crypto?.getRandomValues);
}

function shouldUseServerStorage() {
  return window.location.protocol === "http:" || window.location.protocol === "https:";
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
  adminView: document.querySelector("#adminView")
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
      currentUserId = null;
      localStorage.removeItem(CURRENT_USER_KEY);
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
    throw new Error("A böngésző ezen a címen nem támogatja a biztonságos helyi jelszókezelést.");
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
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "A szerver nem tudta feldolgozni a kérést.");
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
    throw new Error("Ezen a címen a jelszókezeléshez futó szerver kell.");
  }
}

async function setUserPassword(user, password) {
  if (shouldUseServerStorage() || !hasWebCrypto()) {
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
  if (!admin?.isAdmin) throw new Error("Nincs jogosultság felhasználó létrehozásához.");
  if (!normalized || !password) throw new Error("Név és jelszó is kell.");
  if (state.users.some((item) => item.name.toLowerCase() === normalized.toLowerCase())) {
    throw new Error("Ez a név már létezik.");
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
  if (shouldUseServerStorage() || serverSyncAvailable || !hasWebCrypto()) {
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
  if (shouldUseServerStorage() || !hasWebCrypto()) {
    await ensureServerPasswordApi();
    const data = await apiPost("/api/login", { name: normalized, password });
    syncStateFromServer(data.state);
    return data.user;
  }
  if (isSystemAdminLogin(normalized, password)) {
    return systemAdminUser();
  }
  const user = state.users.find((item) => item.name.toLowerCase() === normalized.toLowerCase());
  if (!user) throw new Error("Nincs ilyen felhasználó.");
  if (!(await verifyPassword(user, password))) throw new Error("Hibás jelszó.");
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

function missingTipKey(userId, matchId) {
  return `${userId}:${matchId}`;
}

function missingApprovedTipRows() {
  const hidden = new Set(state.hiddenMissingTips || []);
  return approvedRows()
    .flatMap(({ match, result }) => playerUsers().map((user) => ({ match, result, user })))
    .filter(({ match, user }) => !state.predictions.some((prediction) => prediction.userId === user.id && prediction.matchId === match.id))
    .filter(({ match, user }) => !hidden.has(missingTipKey(user.id, match.id)));
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
}

function renderSession(user) {
  if (!user) {
    els.sessionBox.innerHTML = "";
    return;
  }
  els.sessionBox.innerHTML = `
    <span>${user.name}${user.isAdmin ? " · admin" : ""}</span>
    ${user.isSystemAdmin ? "" : `<details class="password-menu">
      <summary>Jelszó</summary>
      <form id="sessionPasswordForm">
        ${passwordFieldHtml("oldPassword", "Régi jelszó", "current-password")}
        ${passwordFieldHtml("newPassword", "Új jelszó", "new-password")}
        ${passwordFieldHtml("newPasswordConfirm", "Új jelszó még egyszer", "new-password")}
        <button class="password-save" type="submit">Jelszó mentése</button>
        <p class="form-message"></p>
      </form>
    </details>`}
    <button type="button" id="notificationsBtn">${notificationsEnabled() ? "Értesítések: be" : "Értesítések"}</button>
    <button type="button" id="logoutBtn">Kilépés</button>`;
  document.querySelector("#sessionPasswordForm")?.addEventListener("submit", changeOwnPassword);
  document.querySelector("#notificationsBtn").addEventListener("click", enableMatchNotifications);
  document.querySelector("#logoutBtn").addEventListener("click", () => {
    currentUserId = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    render();
  });
  const passwordForm = document.querySelector("#sessionPasswordForm");
  if (passwordForm) setupPasswordToggles(passwordForm);
}

function passwordFieldHtml(name, label, autocomplete = "off") {
  return `
    <label class="password-field">
      <span>${label}</span>
      <span class="password-input-wrap">
        <input name="${name}" type="password" autocomplete="${autocomplete}" required />
        <button class="password-toggle" type="button" data-toggle-password="${name}" aria-label="${label} megjelenítése">Mutat</button>
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
      button.setAttribute("aria-label", show ? "Jelszó elrejtése" : "Jelszó megjelenítése");
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
      <p class="section-kicker">Első belépés</p>
      <h2 id="forcedPasswordTitle">Jelszó módosítása szükséges</h2>
      <p class="muted">Az első belépés után új jelszót kell beállítanod. Addig nem tudod használni az oldalt.</p>
      <form id="forcedPasswordForm" class="admin-prediction-form">
        ${passwordFieldHtml("newPassword", "Új jelszó", "new-password")}
        ${passwordFieldHtml("newPasswordConfirm", "Új jelszó még egyszer", "new-password")}
        <button class="password-save" type="submit">Jelszó mentése</button>
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

async function enableMatchNotifications() {
  if (!("Notification" in window)) {
    alert("Ez a böngésző nem támogatja az értesítéseket.");
    return;
  }
  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Az értesítések nincsenek engedélyezve.");
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
  const title = "Meccs kezdődik 1 óra múlva";
  const body = `${match.home} - ${match.away} · ${formatDate(match.kickoff)}`;
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
      node.querySelector(".kickoff").textContent = formatDate(match.kickoff);
      node.querySelector(".home").textContent = match.home;
      node.querySelector(".away").textContent = match.away;
      node.querySelector(".status-line").innerHTML = statusHtml(match, prediction, resultInfo, locked);
      if (pendingPrediction) {
        node.querySelector(".status-line").insertAdjacentHTML("beforeend", `<span class="pill warn">Tippmódosítás jóváhagyásra vár</span>`);
      }
      node.querySelector(".history-grid").innerHTML = historyHtml(match);

      const predictionForm = node.querySelector(".prediction-form");
      predictionForm.dataset.matchId = match.id;
      predictionForm.homeGoals.value = shownPrediction?.homeGoals ?? "";
      predictionForm.awayGoals.value = shownPrediction?.awayGoals ?? "";
      predictionForm.homeGoals.disabled = locked;
      predictionForm.awayGoals.disabled = locked;
      const predictionButton = predictionForm.querySelector("button");
      predictionButton.textContent = shownPrediction ? "Tipp módosítása" : "Tipp mentése";
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
    grid.innerHTML = `<p class="empty">Nincs aktuálisan tippelhető meccs.</p>`;
  }
}

function statusHtml(match, prediction, resultInfo, locked) {
  const chunks = [];
  const result = resultInfo.result;
  chunks.push(`<span class="pill ${locked ? "warn" : "info"}">${locked ? "Tippelés lezárva" : "Nyitott meccs"}</span>`);
  if (prediction) {
    const qualifier = prediction.qualifier ? `, továbbjutó: ${prediction.qualifier}` : "";
    const score = predictionScoreDetails(prediction);
    chunks.push(`<span>Mentett tipped: <strong>${prediction.homeGoals}-${prediction.awayGoals}</strong>${qualifier}</span>`);
    if (result && resultInfo.status === "approved") chunks.push(`<span class="pill">Pont: ${score.points}</span>`);
    if (getUser()?.isAdmin) chunks.push(`<span>Időbélyeg: ${formatStamp(prediction.updatedAt)}</span>`);
  } else {
    chunks.push("<span>Még nincs tipped.</span>");
  }
  if (result) {
    if (resultInfo.status === "pending") {
      chunks.push(`<span class="pill warn">Eredmény hozzáadva, jóváhagyásra vár</span>`);
    } else {
      const qualifier = result.qualifier ? `, továbbjutó: ${result.qualifier}` : "";
      chunks.push(`<span class="pill">Jóváhagyott: ${result.homeGoals}-${result.awayGoals}${qualifier}</span>`);
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
          <h3>${team} korábbi meccsei</h3>
          ${
            rows.map(({ result, match: played }) => {
              const qualifier = result.qualifier ? `, továbbjutó: ${result.qualifier}` : "";
              return `<p><strong>${played.home} ${result.homeGoals}-${result.awayGoals} ${played.away}</strong><span>${formatDate(played.kickoff)}${qualifier}</span></p>`;
            }).join("") || `<p class="muted">Még nincs korábbi jóváhagyott eredmény.</p>`
          }
        </div>`;
    })
    .join("");
}

function fillQualifierSelect(select, match) {
  select.innerHTML = `<option value="">Válassz továbbjutót</option><option value="${match.home}">${match.home}</option><option value="${match.away}">${match.away}</option>`;
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
  const rows = getStandings();
  els.standingsView.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Név</th><th>Pont</th><th>Telitalálat</th><th>Tippek száma</th></tr></thead>
        <tbody>
          ${rows.map((row, index) => `<tr><td>${index + 1}</td><td><strong>${row.user.name}</strong>${row.user.isAdmin ? " · admin" : ""}</td><td><strong>${row.points}</strong>${row.provisional ? `<br><span class="pill warn">nem végleges</span>` : ""}</td><td>${row.exact}</td><td>${row.predictions}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">Még nincs versenyző.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function resultText(matchId) {
  const { result, status } = effectiveResultFor(matchId);
  if (!result) return { html: `<span class="muted">Még nincs eredmény</span>`, status };
  const qualifier = result.qualifier ? `<br><small>Továbbjutó: ${result.qualifier}</small>` : "";
  const label = status === "pending" ? `<br><span class="pill warn">nem végleges</span>` : "";
  return {
    html: `<strong>${result.homeGoals}-${result.awayGoals}</strong>${qualifier}${label}`,
    status
  };
}

function renderMyTips() {
  const user = getUser();
  const rows = state.predictions
    .filter((prediction) => prediction.userId === user?.id)
    .slice()
    .sort((a, b) => new Date(matchById(a.matchId).kickoff) - new Date(matchById(b.matchId).kickoff))
    .map((prediction) => {
      const match = matchById(prediction.matchId);
      const score = predictionScoreDetails(prediction);
      return { prediction, match, score, result: resultText(prediction.matchId) };
    });

  els.myTipsView.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Meccs</th><th>Tippem</th><th>Végeredmény</th><th>Pont</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td><strong>${row.match.home} - ${row.match.away}</strong><br><small>${formatDate(row.match.kickoff)}</small></td>
              <td>${row.prediction.homeGoals}-${row.prediction.awayGoals}${row.prediction.qualifier ? `<br><small>Továbbjutó: ${row.prediction.qualifier}</small>` : ""}</td>
              <td>${row.result.html}</td>
              <td><strong>${row.score.points}</strong>${row.score.status === "pending" ? `<br><span class="pill warn">nem végleges</span>` : ""}</td>
            </tr>`).join("") || `<tr><td colspan="4" class="empty">Még nincs mentett tipped.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

async function changeOwnPassword(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const user = getUser();
  const message = form.querySelector(".form-message");
  if (!user) return;
  if (form.newPassword.value !== form.newPasswordConfirm.value) {
    message.textContent = "A két új jelszó nem egyezik.";
    return;
  }
  if (shouldUseServerStorage() || !hasWebCrypto()) {
    try {
      await ensureServerPasswordApi();
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
      message.textContent = "Jelszó módosítva.";
      form.closest("details")?.removeAttribute("open");
      render();
    } catch (error) {
      message.textContent = error.message;
    }
    return;
  }
  if (form.oldPassword) {
    if (!(await verifyPassword(user, form.oldPassword.value))) {
      message.textContent = "A régi jelszó nem stimmel.";
      return;
    }
  }
  await setUserPassword(user, form.newPassword.value);
  user.mustChangePassword = false;
  user.passwordChangedAt = new Date().toISOString();
  saveState();
  form.reset();
  message.textContent = "Jelszó módosítva.";
  form.closest("details")?.removeAttribute("open");
  render();
}

function renderTips() {
  const isAdmin = Boolean(getUser()?.isAdmin);
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

  els.tipsView.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Játékos</th><th>Meccs</th><th>Tipp</th>${isAdmin ? "<th>Időbélyeg</th>" : ""}<th>Pont</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td><strong>${row.user?.name || "Ismeretlen"}</strong></td>
              <td>${row.match.home} - ${row.match.away}<br><small>${formatDate(row.match.kickoff)}</small></td>
              <td>${row.prediction.homeGoals}-${row.prediction.awayGoals}${row.prediction.qualifier ? `<br><small>Továbbjutó: ${row.prediction.qualifier}</small>` : ""}</td>
              ${isAdmin ? `<td>${formatStamp(row.prediction.updatedAt)}${row.late ? `<br><span class="pill bad">meccs után</span>` : ""}</td>` : ""}
              <td><strong>${row.score.points}</strong>${row.score.status === "pending" ? `<br><span class="pill warn">nem végleges</span>` : ""}</td>
            </tr>`).join("") || `<tr><td colspan="${isAdmin ? 5 : 4}" class="empty">Még nincs mentett tipp.</td></tr>`}
        </tbody>
      </table>
    </div>`;
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
      <h3>Eredmény beküldése</h3>
      ${resultMatches.map((match) => resultFormHtml(match, isAdmin)).join("") || `<p class="empty">Minden meccsnek van végleges eredménye.</p>`}
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
        ${pending ? `<span class="pill warn">Függő: ${pending.homeGoals}-${pending.awayGoals}${pending.qualifier ? `, továbbjutó: ${pending.qualifier}` : ""}</span>` : ""}
        ${pending ? `<span>Beküldte: ${pendingUser?.name || "Ismeretlen"}</span>` : ""}
      </div>
      <div class="teams">
        <strong>${match.home}</strong>
        <span>vs</span>
        <strong>${match.away}</strong>
      </div>
      <form class="result-form" data-match-id="${match.id}">
        <div class="score-inputs">
          <label>Hazai <input name="homeGoals" type="number" min="0" max="20" required /></label>
          <label>Vendég <input name="awayGoals" type="number" min="0" max="20" required /></label>
        </div>
        <label class="result-qualifier hidden">
          Továbbjutó döntetlennél
          <select name="qualifier">
            <option value="">Válassz továbbjutót</option>
          </select>
        </label>
        <div class="result-actions">
          <button type="submit" class="${pending ? "edit-mode" : ""}">${pending ? "Módosítás" : "Beküldés"}</button>
          ${isAdmin && pending ? `<button type="button" class="secondary" data-approve="${pending.id}">Jóváhagyás</button>` : ""}
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
        <span class="pill">Végleges</span>
      </div>
      <div class="teams">
        <strong>${match.home}</strong>
        <span>${result.homeGoals}-${result.awayGoals}</span>
        <strong>${match.away}</strong>
      </div>
      ${result.qualifier ? `<p class="muted">Továbbjutó: <strong>${result.qualifier}</strong></p>` : ""}
      ${exactPredictorsHtml(match, result)}
      ${isAdmin ? `
        <form class="approved-result-form" data-match-id="${match.id}">
          <div class="score-inputs">
            <label>Hazai <input name="homeGoals" type="number" min="0" max="20" required value="${result.homeGoals}" /></label>
            <label>Vendég <input name="awayGoals" type="number" min="0" max="20" required value="${result.awayGoals}" /></label>
          </div>
          <label class="result-qualifier hidden">
            Továbbjutó döntetlennél
            <select name="qualifier">
              <option value="">Válassz továbbjutót</option>
            </select>
          </label>
          <button type="submit">Végleges eredmény módosítása</button>
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
        <span class="pill warn">Nem végleges</span>
        <span>Beküldte: ${user?.name || "Ismeretlen"}</span>
      </div>
      <div class="teams">
        <strong>${match.home}</strong>
        <span>${result.homeGoals}-${result.awayGoals}</span>
        <strong>${match.away}</strong>
      </div>
      ${result.qualifier ? `<p class="muted">Továbbjutó: <strong>${result.qualifier}</strong></p>` : ""}
      ${exactPredictorsHtml(match, result)}
      ${isAdmin ? `<button type="button" class="secondary" data-approve="${result.id}">Jóváhagyás</button>` : ""}
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
    ? `<p class="muted">Pontos találat: <strong>${names.join(", ")}</strong></p>`
    : `<p class="muted">Pontos találat: nincs</p>`;
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
      row.advance = index < 2 ? "Továbbjutó" : "";
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
  if (!groups.length) return `<p class="empty">Nincs csoportkörös meccs a listában.</p>`;
  return `
    <div class="group-grid">
      ${groups.map(({ group, rows }) => `
        <div class="table-wrap group-table">
          <h3>${group}. csoport</h3>
          <table>
            <thead><tr><th>#</th><th>Csapat</th><th>M</th><th>GY</th><th>D</th><th>V</th><th>GK</th><th>P</th><th>Állás</th></tr></thead>
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

function plannedMatchFor(slot) {
  const home = normalizeBracketText(slot.home);
  const away = normalizeBracketText(slot.away);
  return state.matches.find((match) => {
    if (match.stage !== "knockout") return false;
    const matchHome = normalizeBracketText(match.home);
    const matchAway = normalizeBracketText(match.away);
    return (matchHome === home && matchAway === away) || (matchHome === away && matchAway === home);
  });
}

function bracketSlotHtml(slot) {
  const match = plannedMatchFor(slot);
  const resultInfo = match ? effectiveResultFor(match.id) : { result: null, status: "" };
  const score = resultInfo.result ? `${resultInfo.result.homeGoals}-${resultInfo.result.awayGoals}` : "";
  const qualifier = resultInfo.result?.qualifier ? `<span class="bracket-winner">Továbbjutó: ${resultInfo.result.qualifier}</span>` : "";
  const status = resultInfo.status === "approved"
    ? `<span class="pill">végleges</span>`
    : resultInfo.status === "pending"
      ? `<span class="pill warn">nem végleges</span>`
      : "";
  return `
    <article class="bracket-match">
      <div class="bracket-match-head">
        <span class="bracket-no">${slot.no}. meccs</span>
        ${slot.note ? `<span class="pill info">${slot.note}</span>` : ""}
        ${status}
      </div>
      <div class="bracket-teams">
        <span>${match?.home || slot.home}</span>
        <strong>${score || "vs"}</strong>
        <span>${match?.away || slot.away}</span>
      </div>
      ${qualifier}
    </article>`;
}

function knockoutBracketHtml() {
  return `
    <div class="bracket-scroll">
      <div class="bracket-grid">
        ${knockoutBracket.map((round) => `
          <section class="bracket-round">
            <h4>${round.title}</h4>
            ${round.matches.map(bracketSlotHtml).join("")}
          </section>`).join("")}
      </div>
    </div>
    <p class="muted bracket-note">A harmadik helyezetteknél a pontos csoportpárosítás attól függ, melyik nyolc harmadik helyezett jut tovább.</p>`;
}

function renderPlayed() {
  const isAdmin = Boolean(getUser()?.isAdmin);
  const rows = state.matches
    .map((match) => ({ match, ...effectiveResultFor(match.id) }))
    .filter((row) => row.result)
    .sort((a, b) => new Date(a.match.kickoff) - new Date(b.match.kickoff));

  els.playedView.innerHTML = `
    <div class="panel">
      <h3>Csoportállás</h3>
      ${groupStandingsHtml()}
    </div>
    <div class="panel">
      <h3>Kieséses ág</h3>
      ${knockoutBracketHtml()}
    </div>
    <div class="panel">
      <h3>Eredmények</h3>
      ${rows.map((row) => row.status === "approved"
        ? finalResultHtml(row.match, row.result, isAdmin)
        : pendingResultHtml(row.match, row.result, isAdmin)
      ).join("") || `<p class="empty">Még nincs beküldött eredmény.</p>`}
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
  const missingTips = missingApprovedTipRows();
  els.adminView.innerHTML = `
    <div class="panel">
      <h3>Admin jóváhagyás</h3>
      ${pending.map((item) => {
        const match = matchById(item.matchId);
        const user = userById(item.userId);
        return `
          <div class="approval-row">
            <div>
              <span class="pill warn">függőben</span>
              <strong>${match.home} ${item.homeGoals}-${item.awayGoals} ${match.away}</strong>
              ${item.qualifier ? `<span>Továbbjutó: ${item.qualifier}</span>` : ""}
              <span>Beküldte: ${user?.name || "Ismeretlen"} · ${formatStamp(item.submittedAt)}</span>
            </div>
            <div class="approval-actions">
              <button type="button" data-approve="${item.id}">Jóváhagyás</button>
              <button class="danger" type="button" data-reject="${item.id}">Elutasítás</button>
            </div>
          </div>`;
      }).join("") || `<p class="empty">Nincs jóváhagyásra váró eredmény.</p>`}
    </div>
    <div class="panel">
      <h3>Tippmódosítások jóváhagyása</h3>
      ${pendingPredictions.map((item) => {
        const match = matchById(item.matchId);
        const user = userById(item.userId);
        return `
          <div class="approval-row">
            <div>
              <span class="pill warn">függőben</span>
              <strong>${user?.name || "Ismeretlen"}: ${match.home} ${item.homeGoals}-${item.awayGoals} ${match.away}</strong>
              ${item.qualifier ? `<span>Továbbjutó: ${item.qualifier}</span>` : ""}
              <span>${formatStamp(item.submittedAt)}</span>
            </div>
            <div class="approval-actions">
              <button type="button" data-approve-prediction="${item.id}">Jóváhagyás</button>
              <button class="danger" type="button" data-reject-prediction="${item.id}">Elutasítás</button>
            </div>
          </div>`;
      }).join("") || `<p class="empty">Nincs jóváhagyásra váró tippmódosítás.</p>`}
    </div>
    <div class="panel">
      <h3>Jelszó-visszaállítási kérések</h3>
      ${passwordRequests.map((item) => {
        const requestUser = userById(item.userId);
        return `
          <div class="approval-row password-reset-row">
            <div>
              <span class="pill warn">jelszó kérés</span>
              <strong>${requestUser?.name || item.requestedName}</strong>
              <span>${formatStamp(item.requestedAt)}</span>
            </div>
            <div class="approval-actions">
              ${requestUser ? `<input data-reset-request-password="${item.id}" type="text" placeholder="új jelszó" />` : `<span class="muted">Nincs ilyen játékos</span>`}
              ${requestUser ? `<button type="button" data-reset-request="${item.id}">Jelszó beállítása</button>` : ""}
              <button class="secondary" type="button" data-close-reset-request="${item.id}">Lezárás</button>
            </div>
          </div>`;
      }).join("") || `<p class="empty">Nincs jelszó-visszaállítási kérés.</p>`}
    </div>
    <div class="panel">
      <h3>Hiányzó tippek lezárt meccseken</h3>
      ${missingTips.map(({ match, result, user }) => `
        <div class="approval-row">
          <div>
            <span class="pill warn">nincs tipp</span>
            <strong>${user.name}: ${match.home} ${result.homeGoals}-${result.awayGoals} ${match.away}</strong>
            ${result.qualifier ? `<span>Továbbjutó: ${result.qualifier}</span>` : ""}
            <span>${formatDate(match.kickoff)} · ${match.label}</span>
          </div>
          <div class="approval-actions">
            <button type="button" data-fill-missing-tip="${user.id}:${match.id}">Tipp feltöltése</button>
            <button class="secondary" type="button" data-hide-missing-tip="${user.id}:${match.id}">Elrejt</button>
          </div>
        </div>`).join("") || `<p class="empty">Nincs hiányzó tipp jóváhagyott eredményű meccsen.</p>`}
    </div>
    <div class="panel">
      <h3>Utólagos tipp rögzítése</h3>
      <form id="adminPredictionForm" class="admin-prediction-form">
        <div class="score-inputs">
          <label>Játékos <select name="userId" required></select></label>
          <label>Meccs <select name="matchId" required></select></label>
        </div>
        <div class="score-inputs">
          <label>Hazai <input name="homeGoals" type="number" min="0" max="20" required /></label>
          <label>Vendég <input name="awayGoals" type="number" min="0" max="20" required /></label>
        </div>
        <label class="admin-qualifier-row hidden">
          Továbbjutó döntetlen tippnél
          <select name="qualifier">
            <option value="">Válassz továbbjutót</option>
          </select>
        </label>
        <button type="submit">Tipp mentése játékosnak</button>
      </form>
    </div>
    <div class="panel">
      <h3>Meccs hozzáadása kézzel</h3>
      <form id="manualMatchForm" class="admin-prediction-form">
        <div class="score-inputs">
          <label>Hazai csapat <input name="home" required /></label>
          <label>Idegen csapat <input name="away" required /></label>
        </div>
        <div class="score-inputs">
          <label>Időpont <input name="kickoff" type="datetime-local" required /></label>
          <label>Meccs státusz <input name="label" placeholder="pl. Csoportkör, Nyolcaddöntő" required /></label>
        </div>
        <label>Csoport <input name="group" placeholder="opcionális" /></label>
        <button type="submit">Meccs hozzáadása</button>
        <p class="form-message"></p>
      </form>
    </div>
    <div class="panel">
      <h3>Meccsek feltöltése CSV-ből</h3>
      <form id="matchUploadForm" class="admin-prediction-form">
        <label>CSV fájl <input name="csvFile" type="file" accept=".csv,text/csv" required /></label>
        <label class="checkbox-line"><input name="replaceMatches" type="checkbox" /> Meglévő meccsek cseréje</label>
        <button type="submit">Meccsek feltöltése</button>
        <p class="muted">Mezők: hazai csapat, idegen csapat, időpont, meccs status. A csoport oszlop opcionális.</p>
        <p class="form-message"></p>
      </form>
    </div>
    <div class="panel">
      <h3>Meccsek szerkesztése</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Hazai</th><th>Idegen</th><th>Időpont</th><th>Státusz</th><th>Csoport</th><th></th></tr></thead>
          <tbody>
            ${state.matches.slice().sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).map((match) => `
              <tr data-match-edit="${match.id}">
                <td><input name="home" value="${match.home}" /></td>
                <td><input name="away" value="${match.away}" /></td>
                <td><input name="kickoff" type="datetime-local" value="${localDateTimeValue(match.kickoff)}" /></td>
                <td><input name="label" value="${match.label}" /></td>
                <td><input name="group" value="${match.group || ""}" /></td>
                <td><button type="button" class="secondary" data-save-match="${match.id}">Mentés</button></td>
              </tr>`).join("") || `<tr><td colspan="6" class="empty">Nincs feltöltött meccs.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <h3>Játékosok kezelése</h3>
      <form id="createUserForm" class="admin-prediction-form">
        <div class="score-inputs">
          <label>Felhasználónév <input name="name" autocomplete="off" required /></label>
          <label>Ideiglenes jelszó <input name="password" type="text" required /></label>
        </div>
        <label class="checkbox-line"><input name="isAdmin" type="checkbox" /> Admin jog</label>
        <button type="submit">Felhasználó létrehozása</button>
        <p class="form-message"></p>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Név</th><th>Szerep</th><th>Új jelszó</th><th>Műveletek</th></tr></thead>
          <tbody>
            ${state.users.map((item) => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.isSystemAdmin ? "alap admin" : item.isAdmin ? "admin játékos" : "játékos"}${item.mustChangePassword ? `<br><span class="pill warn">jelszócsere kell</span>` : ""}</td>
                <td><input data-reset-password="${item.id}" type="text" placeholder="új jelszó" /></td>
                <td>
                  <div class="result-actions">
                    ${item.isSystemAdmin ? ""
                      : item.isAdmin
                      ? `<button type="button" class="secondary" data-admin-role="${item.id}" data-admin-role-value="0" ${item.id === currentUserId ? "disabled" : ""}>Admin elvétele</button>`
                      : `<button type="button" class="secondary" data-admin-role="${item.id}" data-admin-role-value="1">Admin adása</button>`}
                    <button type="button" class="secondary" data-reset-user="${item.id}">Jelszó visszaállítása</button>
                    <button type="button" class="danger" data-delete-user="${item.id}" ${item.id === currentUserId || item.isSystemAdmin ? "disabled" : ""}>Törlés</button>
                  </div>
                </td>
              </tr>`).join("") || `<tr><td colspan="4" class="empty">Nincs játékos.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <h3>Karbantartás</h3>
      <button class="secondary" type="button" id="exportBtn">Adatok exportálása JSON-ként</button>
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
  els.adminView.querySelector("#exportBtn").addEventListener("click", exportData);
}

function setupAdminPredictionForm() {
  const form = els.adminView.querySelector("#adminPredictionForm");
  if (!form) return;
  form.userId.innerHTML = playerUsers()
    .map((user) => `<option value="${user.id}">${user.name}${user.isAdmin ? " · admin" : ""}</option>`)
    .join("");
  form.matchId.innerHTML = state.matches
    .slice()
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .map((match) => `<option value="${match.id}">${formatDate(match.kickoff)} · ${match.home} - ${match.away}</option>`)
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
  if (!requestedName) throw new Error("Add meg a felhasználóneved.");
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
  if (shouldUseServerStorage() || !hasWebCrypto()) {
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
    message.textContent = "Felhasználó létrehozva. Első belépéskor jelszót kell módosítania.";
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
    message.textContent = "Hibás időpont.";
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
  message.textContent = "Meccs hozzáadva.";
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
    if (rows.length < 2) throw new Error("A CSV üres.");
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
    message.textContent = `${imported.length} meccs feltöltve.`;
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
  const label = csvValue(headers, row, ["meccsstatus", "status", "szakasz", "stage"]) || "Csoportkör";
  const group = csvValue(headers, row, ["csoport", "group"]);
  if (!home || !away || !kickoff) throw new Error(`Hiányzó adat a(z) ${index + 2}. sorban.`);
  const date = parseCsvDate(kickoff);
  if (Number.isNaN(date.getTime())) throw new Error(`Hibás időpont a(z) ${index + 2}. sorban.`);
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

function deleteUser(userId) {
  if (!getUser()?.isAdmin || userId === currentUserId) return;
  if (userById(userId)?.isSystemAdmin) return;
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

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const user = await loginUser(els.loginName.value, els.loginPassword.value);
    currentUserId = user.id;
    localStorage.setItem(CURRENT_USER_KEY, user.id);
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

els.passwordResetDialog.addEventListener("click", (event) => {
  if (event.target === els.passwordResetDialog) {
    closePasswordResetDialog();
  }
});

els.passwordResetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    requestPasswordReset(els.passwordResetName.value);
    els.loginMessage.textContent = "A jelszó-visszaállítási kérés elküldve az adminoknak.";
    els.passwordResetForm.reset();
    closePasswordResetDialog();
  } catch (error) {
    els.passwordResetMessage.textContent = error.message;
  }
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.classList.contains("hidden")) return;
    activateTab(tab.dataset.view);
  });
});

if (shouldUseServerStorage()) {
  state = normalizeState({});
  loadServerState().finally(() => {
    render();
    checkMatchReminders();
  });
} else {
  render();
  loadServerState();
  checkMatchReminders();
}
setInterval(checkMatchReminders, 60 * 1000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A PWA telepíthetőség HTTPS-en vagy localhoston működik; file:// alatt csendben kihagyjuk.
    });
  });
}
