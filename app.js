const REMINDER_KEY = "vb-tippliga-reminders-v1";
const REMINDER_LEAD_MS = 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 5 * 60 * 1000;

const seedMatches = [];

const defaultConfig = {
  admin: {
    passwordIterations: 150000,
    systemAdmin: {
      id: "__system_admin__",
      name: "admin"
    }
  },
  knockoutBracket: []
};

let state = loadState();
let config = normalizeConfig({});
let currentUserId = null;
let serverSyncAvailable = true;
let suppressServerSave = false;
let dashboardFlash = null;

function shouldUseServerStorage() {
  return true;
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
  dashboardMessage: document.querySelector("#dashboardMessage"),
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
  return normalizeState({});
}

function normalizeConfig(value) {
  const systemAdmin = {
    ...defaultConfig.admin.systemAdmin,
    ...(value?.admin?.systemAdmin || {})
  };
  return {
    admin: {
      passwordIterations: value?.admin?.passwordIterations || defaultConfig.admin.passwordIterations,
      systemAdmin
    },
    knockoutBracket: Array.isArray(value?.knockoutBracket) ? value.knockoutBracket : defaultConfig.knockoutBracket
  };
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
  const systemAdmin = config.admin.systemAdmin;
  return Boolean(
    user?.isSystemAdmin ||
    user?.id === systemAdmin.id ||
    user?.name?.toLowerCase() === systemAdmin.name?.toLowerCase()
  );
}

function systemAdminUser() {
  const systemAdmin = config.admin.systemAdmin;
  return {
    id: systemAdmin.id,
    name: systemAdmin.name,
    isAdmin: true,
    isSystemAdmin: true,
    mustChangePassword: false,
    createdAt: "system"
  };
}

function normalizeUser(user) {
  const normalized = { ...user };
  delete normalized.password;
  return {
    isAdmin: false,
    isSystemAdmin: false,
    mustChangePassword: false,
    ...normalized
  };
}

async function loadServerState() {
  try {
    const data = await apiPost("bootstrap", {});
    applyServerData(data);
    render();
    checkMatchReminders();
  } catch (error) {
    serverSyncAvailable = false;
  }
}

function getUser() {
  if (currentUserId === config.admin.systemAdmin.id) return systemAdminUser();
  return state.users.find((user) => user.id === currentUserId) || null;
}

function playerUsers() {
  return state.users.filter((user) => !user.isSystemAdmin);
}

function canPlay(user) {
  return Boolean(user && !user.isSystemAdmin && !user.mustChangePassword);
}

async function apiPost(path, payload) {
  const url = path.startsWith("/")
    ? path
    : `/api/rest.php?action=${encodeURIComponent(path)}`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload || {})
    });
  } catch (error) {
    throw new Error("Nem sikerült elérni a szervert. Frissítsd az oldalt, vagy ellenőrizd, hogy fut-e az API.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(data.error || "Az API végpont nem található.");
    }
    if (response.status === 405) {
      throw new Error(data.error || "Az API végpont nem fogadja ezt a kérést.");
    }
    throw new Error(data.error || `A szerver nem tudta feldolgozni a kérést. (${response.status})`);
  }
  return data;
}

async function apiUpload(formData) {
  let response;
  try {
    response = await fetch("/api/upload.php", {
      method: "POST",
      credentials: "same-origin",
      body: formData
    });
  } catch (error) {
    throw new Error("Nem sikerült feltölteni a fájlt.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `A szerver nem tudta feldolgozni a feltöltést. (${response.status})`);
  }
  return data;
}

function syncStateFromServer(nextState) {
  if (!nextState) return;
  state = normalizeState(nextState);
  serverSyncAvailable = true;
}

function setMessageState(node, type, text) {
  if (!node) return;
  node.textContent = text || "";
  node.classList.toggle("hidden", !text);
  node.classList.toggle("is-success", type === "success");
  node.classList.toggle("is-error", type === "error");
}

function clearFormMessage(form) {
  setMessageState(form?.querySelector(".form-message"), "", "");
}

function setFormMessage(form, type, text) {
  setMessageState(form?.querySelector(".form-message"), type, text);
}

function setDashboardFlash(type, text) {
  dashboardFlash = text ? { type, text } : null;
  setMessageState(els.dashboardMessage, type, text);
}

function clearDashboardFlash() {
  dashboardFlash = null;
  setMessageState(els.dashboardMessage, "", "");
}

function applyServerData(data) {
  if (!data) return;
  if (data.config) {
    config = normalizeConfig(data.config);
  }
  syncStateFromServer(data.state);
  if (Object.prototype.hasOwnProperty.call(data, "user")) {
    currentUserId = data.user?.id || null;
  }
}

async function createUserByAdmin(name, password, isAdmin) {
  const admin = getUser();
  const normalized = name.trim();
  if (!admin?.isAdmin) throw new Error("Nincs jogosultság felhasználó létrehozásához.");
  if (!normalized || !password) throw new Error("Név és jelszó is kell.");
  if (state.users.some((item) => item.name.toLowerCase() === normalized.toLowerCase())) {
    throw new Error("Ez a név már létezik.");
  }
  const data = await apiPost("admin-create-user", {
    name: normalized,
    password,
    isAdmin
  });
  applyServerData(data);
  return data.createdUser;
}

async function loginUser(name, password) {
  const normalized = name.trim();
  const data = await apiPost("login", { name: normalized, password });
  applyServerData(data);
  return data.user;
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
  setMessageState(els.dashboardMessage, dashboardFlash?.type || "", dashboardFlash?.text || "");
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
  document.querySelector("#logoutBtn").addEventListener("click", async () => {
    const data = await apiPost("logout", {});
    clearDashboardFlash();
    applyServerData(data);
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

async function savePrediction(event) {
  event.preventDefault();
  const user = getUser();
  const form = event.currentTarget;
  const match = matchById(form.dataset.matchId);
  if (!canPlay(user) || !match || isLocked(match) || approvedFor(match.id)) return;

  const homeGoals = Number(form.homeGoals.value);
  const awayGoals = Number(form.awayGoals.value);
  const qualifier = homeGoals === awayGoals ? form.qualifier.value : "";

  try {
    const data = await apiPost("save-prediction", {
      matchId: match.id,
      homeGoals,
      awayGoals,
      qualifier
    });
    applyServerData(data);
  } catch (error) {
    alert(error.message);
  }
  render();
}

async function submitResult(event) {
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
  try {
    const data = await apiPost("submit-result", {
      matchId: match.id,
      homeGoals,
      awayGoals,
      qualifier
    });
    applyServerData(data);
    form.reset();
  } catch (error) {
    alert(error.message);
  }
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
  try {
    const data = form.oldPassword
      ? await apiPost("change-password", {
        oldPassword: form.oldPassword.value,
        newPassword: form.newPassword.value
      })
      : await apiPost("complete-first-password-change", {
        newPassword: form.newPassword.value
      });
    applyServerData(data);
    form.reset();
    message.textContent = "Jelszó módosítva.";
    form.closest("details")?.removeAttribute("open");
    render();
  } catch (error) {
    message.textContent = error.message;
  }
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
        ${config.knockoutBracket.map((round) => `
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
      <form id="stateUploadForm" class="admin-prediction-form">
        <label>JSON visszatöltés <input name="stateFile" type="file" accept=".json,application/json" required /></label>
        <button class="secondary" type="submit">Adatok feltöltése JSON-ból</button>
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
  els.adminView.querySelector("#exportBtn").addEventListener("click", exportData);
  els.adminView.querySelector("#stateUploadForm").addEventListener("submit", importStateFromJson);
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

async function hideMissingTip(value) {
  if (!getUser()?.isAdmin) return;
  try {
    const data = await apiPost("hide-missing-tip", { key: value });
    applyServerData(data);
    setDashboardFlash("success", "A hiányzó tipp elrejtve.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function requestPasswordReset(name) {
  const requestedName = name.trim();
  if (!requestedName) throw new Error("Add meg a felhasználóneved.");
  const data = await apiPost("password-reset-request", { name: requestedName });
  applyServerData(data);
}

async function resetPasswordFromRequest(requestId) {
  const request = state.passwordResetRequests.find((item) => item.id === requestId);
  const input = els.adminView.querySelector(`[data-reset-request-password="${requestId}"]`);
  const user = request ? userById(request.userId) : null;
  if (!request || !input || !user || !getUser()?.isAdmin) return;
  if (!input.value) {
    setDashboardFlash("error", "Adj meg új jelszót a visszaállításhoz.");
    return;
  }
  try {
    const data = await apiPost("resolve-password-reset", {
      requestId,
      password: input.value
    });
    applyServerData(data);
    setDashboardFlash("success", "A jelszó beállítva, a kérés lezárva.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function closePasswordResetRequest(requestId) {
  const request = state.passwordResetRequests.find((item) => item.id === requestId);
  if (!request || !getUser()?.isAdmin) return;
  try {
    const data = await apiPost("close-password-reset", { requestId });
    applyServerData(data);
    setDashboardFlash("success", "A jelszó-visszaállítási kérés lezárva.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function createUserFromAdminForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormMessage(form);
  try {
    await createUserByAdmin(form.name.value, form.password.value, form.isAdmin.checked);
    form.reset();
    setDashboardFlash("success", "Felhasználó létrehozva. Első belépéskor jelszót kell módosítania.");
    render();
  } catch (error) {
    setFormMessage(form, "error", error.message);
  }
}

async function saveAdminPrediction(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const match = matchById(form.matchId.value);
  const user = userById(form.userId.value);
  if (!getUser()?.isAdmin) return;
  if (!match || !user) {
    setDashboardFlash("error", "Válassz érvényes játékost és meccset.");
    return;
  }

  const homeGoals = Number(form.homeGoals.value);
  const awayGoals = Number(form.awayGoals.value);
  const qualifier = match.stage === "knockout" && homeGoals === awayGoals ? form.qualifier.value : "";
  try {
    const data = await apiPost("save-admin-prediction", {
      userId: user.id,
      matchId: match.id,
      homeGoals,
      awayGoals,
      qualifier
    });
    applyServerData(data);
    setDashboardFlash("success", "A tipp rögzítve lett a játékosnak.");
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
  render();
}

async function addManualMatch(event) {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormMessage(form);
  if (!getUser()?.isAdmin) return;

  const kickoff = new Date(form.kickoff.value);
  if (Number.isNaN(kickoff.getTime())) {
    setFormMessage(form, "error", "Hibás időpont.");
    return;
  }

  const label = form.label.value.trim() || "Meccs";
  try {
    const data = await apiPost("add-match", {
      home: form.home.value.trim(),
      away: form.away.value.trim(),
      kickoff: kickoff.toISOString(),
      label,
      group: form.group.value.trim()
    });
    applyServerData(data);
    form.reset();
    setDashboardFlash("success", "Meccs hozzáadva.");
    render();
  } catch (error) {
    setFormMessage(form, "error", error.message);
  }
}

async function importMatchesFromCsv(event) {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormMessage(form);
  const file = form.csvFile.files[0];
  if (!getUser()?.isAdmin) return;
  if (!file) {
    setFormMessage(form, "error", "Válassz CSV fájlt.");
    return;
  }
  try {
    const formData = new FormData();
    formData.append("kind", "matches-csv");
    formData.append("csvFile", file);
    if (form.replaceMatches.checked) formData.append("replaceMatches", "1");
    const data = await apiUpload(formData);
    applyServerData(data);
    form.reset();
    setDashboardFlash("success", `${data.imported || 0} meccs feltöltve.`);
    render();
  } catch (error) {
    setFormMessage(form, "error", error.message);
  }
}

async function importStateFromJson(event) {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormMessage(form);
  const file = form.stateFile.files[0];
  if (!getUser()?.isAdmin) return;
  if (!file) {
    setFormMessage(form, "error", "Válassz JSON fájlt.");
    return;
  }
  try {
    const formData = new FormData();
    formData.append("kind", "state-json");
    formData.append("stateFile", file);
    const data = await apiUpload(formData);
    applyServerData(data);
    form.reset();
    setDashboardFlash("success", "Adatok feltöltve.");
    render();
  } catch (error) {
    setFormMessage(form, "error", error.message);
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

async function saveEditedMatch(matchId) {
  const row = els.adminView.querySelector(`[data-match-edit="${matchId}"]`);
  const match = matchById(matchId);
  if (!row || !match || !getUser()?.isAdmin) return;
  const kickoff = new Date(row.querySelector('[name="kickoff"]').value);
  if (Number.isNaN(kickoff.getTime())) {
    setDashboardFlash("error", "Hibás időpont.");
    return;
  }
  try {
    const data = await apiPost("save-match", {
      matchId,
      home: row.querySelector('[name="home"]').value.trim(),
      away: row.querySelector('[name="away"]').value.trim(),
      kickoff: kickoff.toISOString(),
      label: row.querySelector('[name="label"]').value.trim() || "Meccs",
      group: row.querySelector('[name="group"]').value.trim()
    });
    applyServerData(data);
    setDashboardFlash("success", "A meccs módosításai elmentve.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function resetUserPassword(userId) {
  const input = els.adminView.querySelector(`[data-reset-password="${userId}"]`);
  const user = userById(userId);
  if (!input || !user || !getUser()?.isAdmin) return;
  if (!input.value) {
    setDashboardFlash("error", "Adj meg új jelszót.");
    return;
  }
  try {
    const data = await apiPost("admin-set-password", {
      userId,
      password: input.value
    });
    applyServerData(data);
    setDashboardFlash("success", "A felhasználó jelszava visszaállítva.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function setUserAdminRole(userId, isAdmin) {
  const user = userById(userId);
  if (!user || !getUser()?.isAdmin) return;
  if (user.isSystemAdmin) return;
  if (user.id === currentUserId && !isAdmin) return;
  try {
    const data = await apiPost("set-admin-role", { userId, isAdmin });
    applyServerData(data);
    setDashboardFlash("success", isAdmin ? "Az admin jog megadva." : "Az admin jog elvéve.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function deleteUser(userId) {
  if (!getUser()?.isAdmin || userId === currentUserId) return;
  if (userById(userId)?.isSystemAdmin) return;
  try {
    const data = await apiPost("delete-user", { userId });
    applyServerData(data);
    setDashboardFlash("success", "A felhasználó törölve.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function approveResult(submissionId) {
  const submission = state.resultSubmissions.find((item) => item.id === submissionId);
  if (!submission) return;
  try {
    const data = await apiPost("approve-result", { submissionId });
    applyServerData(data);
    setDashboardFlash("success", "Az eredmény jóváhagyva.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function updateApprovedResult(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const match = matchById(form.dataset.matchId);
  const existing = approvedFor(form.dataset.matchId);
  if (!match || !existing || !getUser()?.isAdmin) return;

  const homeGoals = Number(form.homeGoals.value);
  const awayGoals = Number(form.awayGoals.value);
  const qualifier = match.stage === "knockout"
    ? (homeGoals === awayGoals ? form.qualifier.value : impliedQualifier(match, homeGoals, awayGoals, ""))
    : "";
  try {
    const data = await apiPost("update-approved-result", {
      matchId: form.dataset.matchId,
      homeGoals,
      awayGoals,
      qualifier
    });
    applyServerData(data);
    setDashboardFlash("success", "A végleges eredmény módosítva.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function rejectResult(submissionId) {
  const submission = state.resultSubmissions.find((item) => item.id === submissionId);
  if (!submission) return;
  try {
    const data = await apiPost("reject-result", { submissionId });
    applyServerData(data);
    setDashboardFlash("success", "Az eredménybeküldés elutasítva.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function approvePredictionSubmission(submissionId) {
  const submission = state.predictionSubmissions.find((item) => item.id === submissionId);
  if (!submission || !getUser()?.isAdmin) return;
  try {
    const data = await apiPost("approve-prediction-submission", { submissionId });
    applyServerData(data);
    setDashboardFlash("success", "A tippmódosítás jóváhagyva.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function rejectPredictionSubmission(submissionId) {
  const submission = state.predictionSubmissions.find((item) => item.id === submissionId);
  if (!submission || !getUser()?.isAdmin) return;
  try {
    const data = await apiPost("reject-prediction-submission", { submissionId });
    applyServerData(data);
    setDashboardFlash("success", "A tippmódosítás elutasítva.");
    render();
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

async function exportData() {
  try {
    const response = await fetch("/api/export.php", {
      method: "POST",
      credentials: "same-origin"
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Nem sikerült exportálni az adatokat.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vb-tippliga-2026-adatok.json";
    link.click();
    URL.revokeObjectURL(url);
    setDashboardFlash("success", "Az adatok exportálása elindult.");
  } catch (error) {
    setDashboardFlash("error", error.message);
  }
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const user = await loginUser(els.loginName.value, els.loginPassword.value);
    currentUserId = user.id;
    clearDashboardFlash();
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

els.passwordResetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await requestPasswordReset(els.passwordResetName.value);
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
