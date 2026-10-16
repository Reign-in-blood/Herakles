import {
  exportAllData,
  getAllMeasurements,
  getAllSessions,
  getProfile,
  importBackup,
  saveMeasurement,
  saveProfile
} from "./storage.js";

const profileButton = document.querySelector(".profile-button");
const appShell = document.querySelector(".app-shell");
const backButton = document.querySelector("#back-home-button");
const navHome = document.querySelector('[data-nav="home"]');
const navSettings = document.querySelector('[data-nav="settings"]');
const startWorkoutButton = document.querySelector("#start-workout-button");
const systemPanel = document.querySelector("#system-panel");
const TEMPORARY_WORKOUT_KEYS = [
  "herakles.activeSession.v1",
  "herakles.sessionCategory.v1",
  "herakles.restTimer.v1"
];

const GOAL_LABELS = {
  weight_loss: "Perte de poids",
  weight_gain: "Prise de poids",
  fitness: "Remise en forme",
  muscle_gain: "Prise de muscle",
  strength: "Force",
  endurance: "Endurance"
};

let profileScreen = null;
let currentCalendarDate = new Date();
let sessionsCache = [];
let measurementsCache = [];
let profileCache = null;

function ensureStylesheet() {
  if (document.querySelector('link[href="./src/profile.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./src/profile.css";
  document.head.append(link);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  if (hours) return `${hours} h ${String(minutes).padStart(2, "0")}`;
  return `${minutes} min`;
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function clearTemporaryWorkoutState() {
  try {
    TEMPORARY_WORKOUT_KEYS.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem("herakles.sessionDraft.v1");
  } catch (error) {
    console.warn("Temporary workout state could not be cleared after restore", error);
  }
}

function createProfileScreen() {
  if (profileScreen) return profileScreen;

  profileScreen = document.createElement("section");
  profileScreen.id = "profile-screen";
  profileScreen.className = "profile-screen";
  profileScreen.hidden = true;
  profileScreen.setAttribute("aria-labelledby", "profile-title");
  profileScreen.innerHTML = `
    <header class="profile-heading">
      <p class="section-kicker">Profil local</p>
      <h1 id="profile-title">Utilisateur</h1>
      <p>Ces données restent sur cet appareil et servent au suivi de progression.</p>
    </header>

    <form id="profile-form" class="profile-card profile-form">
      <div class="profile-card-heading">
        <h2>Informations</h2>
        <span>Enregistrées localement</span>
      </div>
      <div class="profile-field-grid">
        <label>Sexe
          <select id="profile-sex" required>
            <option value="">Choisir</option>
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
        </label>
        <label>Taille (cm)
          <input id="profile-height" type="number" min="100" max="250" step="1" inputmode="numeric" required>
        </label>
        <label>Objectif de séances / 7 jours
          <select id="profile-weekly-sessions" required>
            ${[1, 2, 3, 4, 5, 6, 7].map((value) => `<option value="${value}">${value}</option>`).join("")}
          </select>
        </label>
        <label>Objectif principal
          <select id="profile-goal" required>
            <option value="fitness">Remise en forme</option>
            <option value="weight_loss">Perte de poids</option>
            <option value="weight_gain">Prise de poids</option>
            <option value="muscle_gain">Prise de muscle</option>
            <option value="strength">Force</option>
            <option value="endurance">Endurance</option>
          </select>
        </label>
        <label id="profile-target-weight-field" hidden>Poids recherché (kg)
          <input id="profile-target-weight" type="number" min="30" max="350" step="0.1" inputmode="decimal">
        </label>
      </div>
      <button class="button button-primary" type="submit">Enregistrer le profil</button>
      <p id="profile-message" class="flow-message" role="status" aria-live="polite"></p>
    </form>

    <section class="profile-card weight-section" aria-labelledby="weight-title">
      <div class="profile-card-heading">
        <div><p class="section-kicker">Suivi</p><h2 id="weight-title">Poids</h2></div>
        <span id="weight-latest">Aucune mesure</span>
      </div>
      <form id="weight-form" class="weight-entry-form">
        <label>Poids aujourd’hui (kg)
          <input id="weight-value" type="number" min="30" max="350" step="0.1" inputmode="decimal" required>
        </label>
        <button class="button button-secondary" type="submit">Enregistrer aujourd’hui</button>
      </form>
      <p id="weight-message" class="flow-message" role="status" aria-live="polite"></p>
      <div id="weight-chart" class="weight-chart" role="img" aria-label="Évolution du poids"></div>
      <div id="weight-chart-legend" class="weight-chart-legend"></div>
    </section>

    <section class="profile-card agenda-section" aria-labelledby="agenda-title">
      <div class="agenda-heading">
        <div><p class="section-kicker">Historique</p><h2 id="agenda-title">Agenda des séances</h2></div>
        <div class="agenda-controls">
          <button id="agenda-prev" class="icon-button" type="button" aria-label="Mois précédent">←</button>
          <button id="agenda-next" class="icon-button" type="button" aria-label="Mois suivant">→</button>
        </div>
      </div>
      <strong id="agenda-month" class="agenda-month"></strong>
      <div class="agenda-weekdays" aria-hidden="true"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div>
      <div id="agenda-grid" class="agenda-grid"></div>
      <div id="agenda-day-details" class="agenda-day-details"><p>Sélectionne un jour contenant une séance.</p></div>
    </section>
  `;

  const backReference = document.querySelector("#back-home-button");
  appShell.insertBefore(profileScreen, backReference);
  bindProfileEvents();
  return profileScreen;
}

function isWeightGoal(goal) {
  return goal === "weight_loss" || goal === "weight_gain";
}

function updateTargetWeightVisibility() {
  const goal = profileScreen.querySelector("#profile-goal").value;
  const field = profileScreen.querySelector("#profile-target-weight-field");
  const input = profileScreen.querySelector("#profile-target-weight");
  const visible = isWeightGoal(goal);
  field.hidden = !visible;
  input.required = visible;
}

function bindProfileEvents() {
  const form = profileScreen.querySelector("#profile-form");
  const goal = profileScreen.querySelector("#profile-goal");
  const weightForm = profileScreen.querySelector("#weight-form");

  goal.addEventListener("change", () => {
    updateTargetWeightVisibility();
    void refreshWeightChart();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = profileScreen.querySelector("#profile-message");
    const targetWeight = profileScreen.querySelector("#profile-target-weight").value;
    const goalValue = goal.value;

    try {
      profileCache = await saveProfile({
        sex: profileScreen.querySelector("#profile-sex").value,
        height_cm: Number(profileScreen.querySelector("#profile-height").value),
        weekly_sessions_goal: Number(profileScreen.querySelector("#profile-weekly-sessions").value),
        goal: goalValue,
        target_weight_kg: isWeightGoal(goalValue) ? Number(targetWeight) : null
      });
      message.textContent = "Profil enregistré sur cet appareil.";
      await refreshWeightChart();
    } catch (error) {
      console.error("Profile save failed", error);
      message.textContent = "Impossible d’enregistrer le profil.";
    }
  });

  weightForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = profileScreen.querySelector("#weight-message");
    const weight = Number(profileScreen.querySelector("#weight-value").value);

    try {
      await saveMeasurement({
        id: `weight-${localDateKey()}`,
        measured_at: new Date().toISOString(),
        weight_kg: weight
      });
      message.textContent = "Poids enregistré pour aujourd’hui.";
      measurementsCache = await getAllMeasurements();
      renderWeightChart();
    } catch (error) {
      console.error("Weight save failed", error);
      message.textContent = "Impossible d’enregistrer le poids.";
    }
  });

  profileScreen.querySelector("#agenda-prev").addEventListener("click", () => {
    currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1);
    renderAgenda();
  });

  profileScreen.querySelector("#agenda-next").addEventListener("click", () => {
    currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
    renderAgenda();
  });
}

function fillProfileForm() {
  const profile = profileCache;
  if (!profile) {
    updateTargetWeightVisibility();
    return;
  }

  profileScreen.querySelector("#profile-sex").value = profile.sex || "";
  profileScreen.querySelector("#profile-height").value = profile.height_cm || "";
  profileScreen.querySelector("#profile-weekly-sessions").value = String(profile.weekly_sessions_goal || 3);
  profileScreen.querySelector("#profile-goal").value = profile.goal || "fitness";
  profileScreen.querySelector("#profile-target-weight").value = profile.target_weight_kg ?? "";
  updateTargetWeightVisibility();
}

async function refreshWeightChart() {
  measurementsCache = await getAllMeasurements();
  renderWeightChart();
}

function renderWeightChart() {
  const root = profileScreen.querySelector("#weight-chart");
  const legend = profileScreen.querySelector("#weight-chart-legend");
  const latestLabel = profileScreen.querySelector("#weight-latest");
  root.replaceChildren();
  legend.replaceChildren();

  if (!measurementsCache.length) {
    latestLabel.textContent = "Aucune mesure";
    const empty = document.createElement("p");
    empty.className = "weight-chart-empty";
    empty.textContent = "Enregistre ton poids pour démarrer le graphique.";
    root.append(empty);
    return;
  }

  const latest = measurementsCache.at(-1);
  latestLabel.textContent = `${Number(latest.weight_kg).toLocaleString("fr-FR")} kg · ${formatShortDate(latest.measured_at)}`;

  const pointsData = measurementsCache.map((item) => ({
    time: new Date(item.measured_at).getTime(),
    weight: Number(item.weight_kg),
    date: item.measured_at
  })).filter((item) => Number.isFinite(item.time) && Number.isFinite(item.weight));

  if (!pointsData.length) return;

  const target = Number(profileCache?.target_weight_kg);
  const goal = profileCache?.goal;
  const includeTarget = isWeightGoal(goal) && Number.isFinite(target) && target > 0;
  const weights = pointsData.map((item) => item.weight).concat(includeTarget ? [target] : []);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const padding = Math.max(1.5, (maxWeight - minWeight) * 0.2);
  const chartMin = minWeight - padding;
  const chartMax = maxWeight + padding;

  const width = 640;
  const height = 260;
  const left = 46;
  const right = 18;
  const top = 18;
  const bottom = 38;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const firstTime = pointsData[0].time;
  const lastTime = pointsData.at(-1).time;
  const timeRange = Math.max(1, lastTime - firstTime);
  const xFor = (time, index) => pointsData.length === 1
    ? left + innerWidth / 2
    : left + ((time - firstTime) / timeRange) * innerWidth;
  const yFor = (weight) => top + ((chartMax - weight) / (chartMax - chartMin || 1)) * innerHeight;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "weight-chart-svg");
  svg.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 4; index += 1) {
    const ratio = index / 3;
    const weight = chartMax - (chartMax - chartMin) * ratio;
    const y = top + innerHeight * ratio;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", left);
    line.setAttribute("x2", width - right);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", "weight-grid-line");
    svg.append(line);

    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", left - 8);
    label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "weight-axis-label");
    label.textContent = weight.toFixed(1);
    svg.append(label);
  }

  if (includeTarget) {
    const latestWeight = pointsData.at(-1).weight;
    const achieved = goal === "weight_loss" ? latestWeight <= target : latestWeight >= target;
    const targetLine = document.createElementNS(svg.namespaceURI, "line");
    targetLine.setAttribute("x1", left);
    targetLine.setAttribute("x2", width - right);
    targetLine.setAttribute("y1", yFor(target));
    targetLine.setAttribute("y2", yFor(target));
    targetLine.setAttribute("class", `weight-target-line${achieved ? " is-achieved" : ""}`);
    svg.append(targetLine);

    const targetLabel = document.createElementNS(svg.namespaceURI, "text");
    targetLabel.setAttribute("x", width - right);
    targetLabel.setAttribute("y", yFor(target) - 7);
    targetLabel.setAttribute("text-anchor", "end");
    targetLabel.setAttribute("class", `weight-target-label${achieved ? " is-achieved" : ""}`);
    targetLabel.textContent = `Objectif ${target.toLocaleString("fr-FR")} kg`;
    svg.append(targetLabel);

    const legendTarget = document.createElement("span");
    legendTarget.className = `weight-legend-target${achieved ? " is-achieved" : ""}`;
    legendTarget.textContent = achieved ? "Objectif atteint" : `${GOAL_LABELS[goal]} · objectif ${target.toLocaleString("fr-FR")} kg`;
    legend.append(legendTarget);
  }

  const polyline = document.createElementNS(svg.namespaceURI, "polyline");
  polyline.setAttribute("points", pointsData.map((item, index) => `${xFor(item.time, index)},${yFor(item.weight)}`).join(" "));
  polyline.setAttribute("class", "weight-progress-line");
  svg.append(polyline);

  pointsData.forEach((item, index) => {
    const circle = document.createElementNS(svg.namespaceURI, "circle");
    circle.setAttribute("cx", xFor(item.time, index));
    circle.setAttribute("cy", yFor(item.weight));
    circle.setAttribute("r", 5);
    circle.setAttribute("class", "weight-progress-point");
    svg.append(circle);
  });

  const firstDate = document.createElementNS(svg.namespaceURI, "text");
  firstDate.setAttribute("x", left);
  firstDate.setAttribute("y", height - 10);
  firstDate.setAttribute("class", "weight-axis-label");
  firstDate.textContent = formatShortDate(pointsData[0].date);
  svg.append(firstDate);

  const lastDate = document.createElementNS(svg.namespaceURI, "text");
  lastDate.setAttribute("x", width - right);
  lastDate.setAttribute("y", height - 10);
  lastDate.setAttribute("text-anchor", "end");
  lastDate.setAttribute("class", "weight-axis-label");
  lastDate.textContent = formatShortDate(pointsData.at(-1).date);
  svg.append(lastDate);

  root.append(svg);
}

function renderAgendaDayDetails(dateKey, sessions) {
  const root = profileScreen.querySelector("#agenda-day-details");
  root.replaceChildren();

  const title = document.createElement("strong");
  const date = new Date(`${dateKey}T12:00:00`);
  title.textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  root.append(title);

  if (!sessions.length) {
    const empty = document.createElement("p");
    empty.textContent = "Aucune séance enregistrée ce jour-là.";
    root.append(empty);
    return;
  }

  sessions.forEach((session) => {
    const item = document.createElement("article");
    item.className = "agenda-session-item";
    const name = document.createElement("strong");
    name.textContent = session.theme_id ? `Séance · ${session.theme_id}` : "Séance";
    const detail = document.createElement("span");
    const exerciseCount = session.summary?.exercise_count ?? session.exercises?.length ?? 0;
    detail.textContent = `${exerciseCount} exercice${exerciseCount > 1 ? "s" : ""} · ${formatDuration(session.duration_seconds)}`;
    item.append(name, detail);
    root.append(item);
  });
}

function renderAgenda() {
  const grid = profileScreen.querySelector("#agenda-grid");
  const monthLabel = profileScreen.querySelector("#agenda-month");
  grid.replaceChildren();

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  monthLabel.textContent = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month, 1));

  const sessionsByDay = new Map();
  sessionsCache.forEach((session) => {
    if (!session.started_at) return;
    const key = localDateKey(session.started_at);
    if (!sessionsByDay.has(key)) sessionsByDay.set(key, []);
    sessionsByDay.get(key).push(session);
  });

  const firstDay = new Date(year, month, 1);
  const leading = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let index = 0; index < leading; index += 1) {
    const spacer = document.createElement("span");
    spacer.className = "agenda-day is-empty";
    grid.append(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = localDateKey(date);
    const sessions = sessionsByDay.get(key) || [];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `agenda-day${sessions.length ? " has-session" : ""}${key === localDateKey() ? " is-today" : ""}`;
    button.innerHTML = `<span>${day}</span>${sessions.length ? `<small>${sessions.length}</small>` : ""}`;
    button.setAttribute("aria-label", sessions.length ? `${day}, ${sessions.length} séance${sessions.length > 1 ? "s" : ""}` : String(day));
    button.addEventListener("click", () => renderAgendaDayDetails(key, sessions));
    grid.append(button);
  }
}

async function loadProfileData() {
  [profileCache, measurementsCache, sessionsCache] = await Promise.all([
    getProfile(),
    getAllMeasurements(),
    getAllSessions()
  ]);
  fillProfileForm();
  renderWeightChart();
  renderAgenda();
}

function hideKnownScreens() {
  ["home-screen", "exercise-flow", "session-panel", "exercise-recap", "rest-timer", "system-panel", "session-recap"].forEach((id) => {
    const screen = document.getElementById(id);
    if (screen) screen.hidden = true;
  });
}

async function openProfile() {
  const screen = createProfileScreen();
  hideKnownScreens();
  screen.hidden = false;
  backButton.hidden = false;
  profileButton.classList.add("is-current");
  navHome?.classList.remove("is-current");
  navSettings?.classList.remove("is-current");
  window.scrollTo(0, 0);

  try {
    await loadProfileData();
  } catch (error) {
    console.error("Profile loading failed", error);
    screen.querySelector("#profile-message").textContent = "Impossible de charger les données locales.";
  }
}

function closeProfileVisualState() {
  if (profileScreen) profileScreen.hidden = true;
  profileButton.classList.remove("is-current");
}

function setupBackupControls() {
  if (!systemPanel || document.querySelector("#data-backup-block")) return;

  const block = document.createElement("div");
  block.id = "data-backup-block";
  block.className = "update-block data-backup-block";
  block.innerHTML = `
    <p class="section-kicker">Données</p>
    <p class="update-status">Sauvegarde locale des séances, du profil et du suivi du poids.</p>
    <div class="update-actions backup-actions">
      <button id="export-data-button" class="button button-secondary" type="button">Exporter mes données</button>
      <label class="button button-secondary import-data-label" for="import-data-input">Importer mes données</label>
      <input id="import-data-input" type="file" accept="application/json,.json" hidden>
    </div>
    <p id="backup-status" class="update-status" role="status" aria-live="polite"></p>
  `;
  systemPanel.append(block);

  const status = block.querySelector("#backup-status");
  block.querySelector("#export-data-button").addEventListener("click", async () => {
    try {
      status.textContent = "Préparation de la sauvegarde…";
      const backup = await exportAllData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `herakles-backup-${localDateKey()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      status.textContent = "Sauvegarde exportée.";
    } catch (error) {
      console.error("Backup export failed", error);
      status.textContent = "Impossible d’exporter les données.";
    }
  });

  block.querySelector("#import-data-input").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      status.textContent = "Lecture de la sauvegarde…";
      const backup = JSON.parse(await file.text());
      const confirmed = window.confirm(
        "Restaurer cette sauvegarde ? Les données locales actuelles (profil, poids, séances et réglages) seront remplacées par le contenu du fichier."
      );
      if (!confirmed) {
        event.target.value = "";
        status.textContent = "Import annulé.";
        return;
      }
      await importBackup(backup);
      clearTemporaryWorkoutState();
      status.textContent = "Sauvegarde restaurée. Actualisation…";
      window.setTimeout(() => window.location.reload(), 400);
    } catch (error) {
      console.error("Backup import failed", error);
      status.textContent = "Fichier de sauvegarde invalide ou import impossible.";
      event.target.value = "";
    }
  });
}

ensureStylesheet();
createProfileScreen();
setupBackupControls();

profileButton.setAttribute("aria-label", "Profil utilisateur");
profileButton.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  void openProfile();
}, true);

backButton.addEventListener("click", (event) => {
  if (!profileScreen || profileScreen.hidden) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeProfileVisualState();
  navHome?.click();
}, true);

[navHome, navSettings, startWorkoutButton].filter(Boolean).forEach((button) => {
  button.addEventListener("click", closeProfileVisualState, true);
});
