import { countSessions, openDatabase, getAllSessions } from "./storage.js";
import { initWorkoutPlanner } from "./workout-planner.js";
import { cloneWorkoutData } from "./workout-plans.js";
import { initNotificationControls } from "./notifications.js";
import { CATEGORIES, EXERCISES, RESISTANCE_LABELS } from "./exercises.js";
import { initRestTimer } from "./rest-timer.js";

const storageStatus = document.querySelector("#storage-status");
const sessionCount = document.querySelector("#session-count");
const networkStatus = document.querySelector("#network-status");
const installButton = document.querySelector("#install-button");
const updateDialog = document.querySelector("#update-dialog");
const postponeUpdateButton = document.querySelector("#postpone-update-button");
const applyUpdateButton = document.querySelector("#apply-update-button");
const updateStatus = document.querySelector("#update-status");

let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;
let waitingServiceWorker = null;
let reloadingForUpdate = false;
let postponedWorker = null;
let previousFocus = null;

async function initStorage() {
  try {
    const db = await openDatabase();
    db.close();

    const count = await countSessions();
    storageStatus.textContent = "IndexedDB prêt";
    sessionCount.textContent = `${count} séance${count === 1 ? "" : "s"} enregistrée${count === 1 ? "" : "s"}`;
  } catch (error) {
    console.error("IndexedDB initialization failed", error);
    storageStatus.textContent = "Stockage indisponible";
    sessionCount.textContent = "Vérifier les permissions du navigateur";
  }
}

function updateNetworkStatus() {
  networkStatus.textContent = navigator.onLine ? "En ligne" : "Hors ligne";
}

function closeUpdateDialog() {
  updateDialog.hidden = true;
  document.body.classList.remove("update-dialog-open");
  previousFocus?.focus?.();
}

function showAvailableUpdate(worker) {
  waitingServiceWorker = worker;
  if (postponedWorker === worker || !updateDialog.hidden) return;

  previousFocus = document.activeElement;
  updateStatus.textContent = "";
  applyUpdateButton.disabled = false;
  postponeUpdateButton.disabled = false;
  applyUpdateButton.textContent = "Installer";
  updateDialog.hidden = false;
  document.body.classList.add("update-dialog-open");
  postponeUpdateButton.focus();
}

function watchInstallingWorker(worker) {
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      showAvailableUpdate(worker);
    }
  });
}

async function checkForUpdate() {
  if (!serviceWorkerRegistration || !navigator.onLine) return;

  if (serviceWorkerRegistration.waiting) {
    showAvailableUpdate(serviceWorkerRegistration.waiting);
    return;
  }

  try {
    await serviceWorkerRegistration.update();
    if (serviceWorkerRegistration.waiting) {
      showAvailableUpdate(serviceWorkerRegistration.waiting);
    }
  } catch (error) {
    console.warn("Service worker update check failed", error);
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js");

    if (serviceWorkerRegistration.waiting) {
      showAvailableUpdate(serviceWorkerRegistration.waiting);
    }

    if (serviceWorkerRegistration.installing) {
      watchInstallingWorker(serviceWorkerRegistration.installing);
    }

    serviceWorkerRegistration.addEventListener("updatefound", () => {
      if (serviceWorkerRegistration.installing) {
        watchInstallingWorker(serviceWorkerRegistration.installing);
      }
    });

    await checkForUpdate();
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
}

const manualUpdateButton = document.querySelector("#check-update-button");
const manualUpdateStatus = document.querySelector("#manual-update-status");

manualUpdateButton.addEventListener("click", async () => {
  manualUpdateButton.disabled = true;
  manualUpdateStatus.textContent = "Recherche en cours…";

  try {
    if (!navigator.onLine) throw new Error("offline");

    const registration = serviceWorkerRegistration || await navigator.serviceWorker?.getRegistration("./");
    if (!registration) throw new Error("no service worker");

    serviceWorkerRegistration = registration;
    postponedWorker = null;
    await registration.update();

    if (registration.installing) {
      const worker = registration.installing;
      await new Promise((resolve) => {
        const check = () => {
          if (worker.state === "installed" || worker.state === "redundant") {
            worker.removeEventListener("statechange", check);
            resolve();
          }
        };

        worker.addEventListener("statechange", check);
        check();
      });
    }

    if (registration.waiting) {
      manualUpdateStatus.textContent = "Mise à jour disponible.";
      showAvailableUpdate(registration.waiting);
    } else {
      manualUpdateStatus.textContent = "Aucune mise à jour disponible.";
    }
  } catch (error) {
    console.warn("Manual update check failed", error);
    manualUpdateStatus.textContent = "Recherche impossible. Vérifie la connexion et réessaie.";
  } finally {
    manualUpdateButton.disabled = false;
  }
});

postponeUpdateButton.addEventListener("click", () => {
  postponedWorker = waitingServiceWorker || serviceWorkerRegistration?.waiting;
  closeUpdateDialog();
});

updateDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    postponeUpdateButton.click();
  }

  if (event.key === "Tab") {
    const buttons = [postponeUpdateButton, applyUpdateButton];
    const current = buttons.indexOf(document.activeElement);

    if (event.shiftKey && current === 0) {
      event.preventDefault();
      applyUpdateButton.focus();
    } else if (!event.shiftKey && current === 1) {
      event.preventDefault();
      postponeUpdateButton.focus();
    }
  }
});

applyUpdateButton.addEventListener("click", () => {
  const worker = waitingServiceWorker || serviceWorkerRegistration?.waiting;

  if (!worker) {
    closeUpdateDialog();
    return;
  }

  applyUpdateButton.disabled = true;
  applyUpdateButton.textContent = "Installation…";
  postponeUpdateButton.disabled = true;
  updateStatus.textContent = "Installation de la nouvelle version…";
  worker.postMessage({ type: "SKIP_WAITING" });
});

navigator.serviceWorker?.addEventListener("controllerchange", () => {
  if (reloadingForUpdate) return;
  reloadingForUpdate = true;
  window.location.reload();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("online", () => {
  updateNetworkStatus();
  void checkForUpdate();
});

window.addEventListener("offline", updateNetworkStatus);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void checkForUpdate();
  }
});

function initHome() {
  const ACTIVE_KEY = "herakles.activeSession.v1";
  const CALORIE_REFERENCE_WEIGHT_KG = 75;
  const STRENGTH_MET = 5;
  const CARDIO_MET = 6;

  const home = document.querySelector("#home-screen");
  const flow = document.querySelector("#exercise-flow");
  const sessionPanel = document.querySelector("#session-panel");
  const overview = document.createElement("section");
  overview.id = "workout-overview";
  overview.className = "workout-overview";
  overview.hidden = true;
  flow.insertAdjacentElement("afterend", overview);

  const globalClock = document.createElement("aside");
  globalClock.id = "workout-global-clock";
  globalClock.className = "workout-global-clock";
  globalClock.hidden = true;
  globalClock.setAttribute("aria-label", "Chronomètre global de la séance");
  globalClock.innerHTML = '<span>Séance en cours</span><strong id="workout-clock-time">00:00:00</strong>';
  document.body.append(globalClock);

  let exerciseRecap = document.querySelector("#exercise-recap");
  if (!exerciseRecap) {
    exerciseRecap = document.createElement("section");
    exerciseRecap.id = "exercise-recap";
    exerciseRecap.className = "exercise-recap";
    exerciseRecap.hidden = true;
    exerciseRecap.setAttribute("aria-labelledby", "exercise-recap-title");
    exerciseRecap.innerHTML = `
      <header class="exercise-recap-heading">
        <p class="section-kicker">Récapitulatif de l’exercice</p>
        <h1 id="exercise-recap-title">Exercice terminé</h1>
        <p id="recap-exercise-name" class="exercise-recap-name">Exercice</p>
      </header>
      <div class="exercise-recap-grid">
        <article class="exercise-recap-stat">
          <span aria-hidden="true">◷</span>
          <div><small>Durée de l’exercice</small><strong id="recap-exercise-duration">00:00</strong></div>
        </article>
        <article class="exercise-recap-stat">
          <span aria-hidden="true">↻</span>
          <div><small>Répétitions</small><strong id="recap-exercise-reps">0</strong></div>
        </article>
        <article class="exercise-recap-stat">
          <span aria-hidden="true">▥</span>
          <div><small>Volume total</small><strong id="recap-exercise-volume">0 kg</strong></div>
        </article>
        <article class="exercise-recap-stat">
          <span aria-hidden="true">♨</span>
          <div><small>Calories estimées</small><strong id="recap-exercise-calories">—</strong></div>
        </article>
      </div>
      <p id="recap-calorie-note" class="exercise-recap-note"></p>
      <button id="save-exercise-button" class="button button-primary exercise-recap-save" type="button">✓ Enregistrer l’exercice</button>
    `;
    sessionPanel.insertAdjacentElement("afterend", exerciseRecap);
  }

  const timer = document.querySelector("#rest-timer");
  const system = document.querySelector("#system-panel");
  const back = document.querySelector("#back-home-button");
  const navHome = document.querySelector('[data-nav="home"]');
  const navSettings = document.querySelector('[data-nav="settings"]');
  const date = document.querySelector("#today-date");
  const time = document.querySelector("#today-time");
  const chart = document.querySelector("#activity-chart");
  const timerPresets = document.querySelector("#timer-presets");

  const categoryList = document.querySelector("#category-list");
  const exerciseList = document.querySelector("#exercise-list");
  const freeButton = document.querySelector("#free-exercise-button");
  const config = document.querySelector("#exercise-config");
  const configSubmit = config.querySelector('button[type="submit"]');
  const flowTitle = document.querySelector("#exercise-flow-title");
  const flowIntro = document.querySelector("#exercise-flow-intro");
  const flowMessage = document.querySelector("#exercise-flow-message");

  const sessionSets = document.querySelector("#session-sets");
  const sessionTitle = document.querySelector("#session-exercise-title");
  const sessionProgress = document.querySelector("#session-progress");
  const sessionElapsed = document.querySelector("#session-elapsed");
  const sessionFeedback = document.querySelector("#session-feedback");

  const recapExerciseName = document.querySelector("#recap-exercise-name");
  const recapDuration = document.querySelector("#recap-exercise-duration");
  const recapReps = document.querySelector("#recap-exercise-reps");
  const recapVolume = document.querySelector("#recap-exercise-volume");
  const recapCalories = document.querySelector("#recap-exercise-calories");
  const recapCalorieNote = document.querySelector("#recap-calorie-note");
  const saveExerciseButton = document.querySelector("#save-exercise-button");
  const recapRepsLabel = recapReps.parentElement?.querySelector("small");
  const recapVolumeLabel = recapVolume.parentElement?.querySelector("small");

  let exerciseStep = "categories";
  let currentCategory = null;
  let selectedExercise = null;
  let activeSession = null;
  let pendingSetIndex = null;
  let initialScreen = "home";
  let selectedPlannedUid = null;
  let cardioPreparation = null;
  let planner = null;

  const chartData = {
    7: { labels: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"], values: [58,102,36,53,69,18,47] },
    30: { labels: ["S1","S2","S3","S4"], values: [78,98,67,105] },
    84: { labels: ["S1","S2","S3","S4","S5","S6"], values: [45,76,88,60,101,94] }
  };

  function drawChart(period) {
    const data = chartData[period];
    chart.replaceChildren();

    const axis = document.createElement("div");
    axis.className = "chart-axis";
    ["120 min","90 min","60 min","30 min","0"].forEach((label) => {
      const el = document.createElement("span");
      el.textContent = label;
      axis.append(el);
    });
    chart.append(axis);

    data.values.forEach((value, index) => {
      const column = document.createElement("div");
      column.className = "chart-column";
      const bar = document.createElement("div");
      bar.className = "chart-bar" + (index === 2 || index === data.values.length - 1 ? " is-muted" : "");
      bar.style.height = `${value / 120 * 100}%`;
      const label = document.createElement("span");
      label.className = "chart-day";
      label.textContent = data.labels[index];
      column.append(bar, label);
      chart.append(column);
    });
  }

  function currentExercise() {
    return activeSession?.current_exercise || null;
  }

  function showScreen(screen) {
    const profileScreen = document.querySelector("#profile-screen");
    if (profileScreen) profileScreen.hidden = true;
    home.hidden = screen !== "home";
    flow.hidden = screen !== "exercise";
    overview.hidden = screen !== "overview";
    document.querySelector("#workout-planner")?.toggleAttribute("hidden", screen !== "planner");
    sessionPanel.hidden = screen !== "session";
    exerciseRecap.hidden = screen !== "recap";
    timer.hidden = screen !== "timer";
    system.hidden = screen !== "settings";
    timerPresets.hidden = screen === "timer" && pendingSetIndex !== null;
    back.hidden = screen === "home";

    navHome.classList.toggle("is-current", screen === "home");
    navSettings.classList.toggle("is-current", screen === "settings");

    if (screen === "home") navHome.setAttribute("aria-current", "page");
    else navHome.removeAttribute("aria-current");

    if (screen === "settings") navSettings.setAttribute("aria-current", "page");
    else navSettings.removeAttribute("aria-current");

    document.body.classList.toggle("has-workout-clock", Boolean(activeSession));
    globalClock.hidden = !activeSession;
    window.scrollTo(0, 0);
  }

  function persistActiveSession() {
    if (!activeSession) {
      localStorage.removeItem(ACTIVE_KEY);
      return;
    }

    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeSession));
    } catch (error) {
      console.warn("Session draft could not be saved", error);
    }
  }

  function normalizeStoredSession(stored) {
    if (!stored || !stored.started_at) return null;

    if (stored.schema_version === 2 && Array.isArray(stored.exercises)) {
      return {
        ...stored,
        current_exercise: stored.current_exercise || null
      };
    }

    if (stored.schema_version === 1 && stored.exercise && Array.isArray(stored.sets)) {
      return {
        schema_version: 2,
        id: stored.id || crypto.randomUUID?.() || `session-${Date.now()}`,
        started_at: stored.started_at,
        exercises: [],
        current_exercise: {
          started_at: stored.started_at,
          ended_at: null,
          exercise: stored.exercise,
          planned: stored.planned,
          sets: stored.sets,
          cardio_completed: Boolean(stored.cardio_completed),
          cardio: stored.cardio || null
        }
      };
    }

    return null;
  }

  function formatElapsed(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return [
      Math.floor(seconds / 3600),
      Math.floor(seconds / 60) % 60,
      seconds % 60
    ].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function formatExerciseDuration(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor(safeSeconds / 60) % 60;
    const remaining = safeSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

  function formatMetric(value, maximumFractionDigits = 2) {
    return Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits });
  }

  function cardioNeedsMetrics(exerciseState) {
    if (exerciseState?.exercise?.type !== "cardio") return false;
    const distance = Number(exerciseState.cardio?.distance_km);
    return !exerciseState.cardio_completed || !Number.isFinite(distance) || distance <= 0;
  }

  function cardioSupportsIncline(exerciseState) {
    return Boolean(EXERCISES.find((exercise) => exercise.id === exerciseState?.exercise?.id)?.supportsIncline);
  }

  function createExerciseDraft(exercise, planned) {
    return {
      schema_version: 1,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        resistance: exercise.resistance,
        primary_muscles: exercise.primary
      },
      planned
    };
  }

  function renderSessionClock() {
    if (!activeSession) {
      globalClock.hidden = true;
      document.body.classList.remove("has-workout-clock");
      return;
    }
    globalClock.hidden = false;
    document.body.classList.add("has-workout-clock");
    const elapsed = formatElapsed(Date.now() - new Date(activeSession.started_at).getTime());
    globalClock.querySelector("#workout-clock-time").textContent = elapsed;
    sessionElapsed.textContent = elapsed;

    const exerciseState = currentExercise();
    const cardioElapsed = sessionSets.querySelector("#cardio-exercise-elapsed");
    if (!cardioElapsed || exerciseState?.exercise?.type !== "cardio") return;

    const endTime = exerciseState.ended_at
      ? new Date(exerciseState.ended_at).getTime()
      : Date.now();
    cardioElapsed.textContent = formatElapsed(endTime - new Date(exerciseState.started_at).getTime());
  }

  function getExerciseMetrics(exerciseState) {
    const sets = Array.isArray(exerciseState.sets) ? exerciseState.sets : [];
    const completedSets = sets.filter((set) => set.completed_at);
    const totalReps = completedSets.reduce((sum, set) => sum + Number(set.reps || 0), 0);
    const volumeKg = completedSets.reduce(
      (sum, set) => sum + (Number(set.reps || 0) * Number(set.nominal_load_kg || 0)),
      0
    );
    const endTime = exerciseState.ended_at
      ? new Date(exerciseState.ended_at).getTime()
      : Date.now();
    const durationSeconds = Math.max(
      0,
      Math.floor((endTime - new Date(exerciseState.started_at).getTime()) / 1000)
    );
    const met = exerciseState.exercise.type === "cardio" ? CARDIO_MET : STRENGTH_MET;
    const durationMinutes = durationSeconds / 60;
    const estimatedCaloriesKcal = Math.round(
      met * 3.5 * CALORIE_REFERENCE_WEIGHT_KG / 200 * durationMinutes
    );
    const distanceKm = Number(exerciseState.cardio?.distance_km || 0);
    const averageSpeedKmh = durationSeconds > 0 && distanceKm > 0
      ? distanceKm / (durationSeconds / 3600)
      : 0;

    return {
      completedSets,
      totalReps,
      volumeKg,
      durationSeconds,
      estimatedCaloriesKcal,
      met,
      distanceKm,
      averageSpeedKmh
    };
  }

  function showSessionOverview() {
    if (!activeSession || currentExercise()) return;
    overview.replaceChildren();
    const heading = document.createElement("header");
    heading.className = "flow-heading";
    const kicker = document.createElement("p");
    kicker.className = "section-kicker";
    kicker.textContent = "Séance en cours";
    const title = document.createElement("h1");
    title.textContent = activeSession.name || "Séance libre";
    heading.append(kicker, title);
    overview.append(heading);

    const plannedItems = Array.isArray(activeSession.planned_exercises) ? activeSession.planned_exercises : [];
    const completed = activeSession.exercises || [];
    const count = document.createElement("p");
    count.className = "workout-overview-progress";
    count.textContent = plannedItems.length
      ? `${completed.filter((ex) => ex.plan_item_uid).length} / ${plannedItems.length} exercices prévus réalisés · Ordre libre`
      : `${completed.length} exercice(s) réalisé(s)`;
    overview.append(count);

    function exerciseCard(exercise, record) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "workout-exercise-card" + (record ? " is-complete" : "");
      const label = document.createElement("strong");
      label.textContent = exercise.name || exercise.exercise?.name || "Exercice";
      const state = document.createElement("span");
      state.className = "workout-exercise-state";
      state.textContent = record ? "Terminé · Voir / Corriger" : "À réaliser";
      const details = document.createElement("small");
      if (record) {
        details.textContent = record.type === "cardio"
          ? `${formatExerciseDuration(record.duration_seconds || 0)} · ${formatMetric(record.cardio?.distance_km)} km`
          : `${record.sets?.length || 0} séries · ${record.total_reps || 0} rép. · ${formatMetric(record.volume_kg)} kg de volume`;
        card.addEventListener("click", () => editFinishedExercise(activeSession.exercises.indexOf(record)));
      } else {
        const p = exercise.planned || {};
        details.textContent = exercise.exercise.type === "cardio" ? "Cardio" :
          `${p.sets} séries · ${p.reps} répétitions · ${p.nominal_load_kg} kg`;
        card.addEventListener("click", () => openPlannedExercise(exercise));
      }
      card.append(label, state, details);
      return card;
    }

    for (const item of plannedItems) {
      const done = completed.find((exercise) => exercise.plan_item_uid === item.uid);
      overview.append(exerciseCard(done || item, done));
    }
    for (const done of completed.filter((exercise) => !plannedItems.some((item) => item.uid === exercise.plan_item_uid))) {
      overview.append(exerciseCard(done, done));
    }
    const add = document.createElement("button");
    add.type = "button";
    add.className = "button button-secondary";
    add.textContent = "+ Ajouter un exercice";
    add.addEventListener("click", () => { selectedPlannedUid = null; showCategories(); showScreen("exercise"); });
    overview.append(add);
    if (completed.length) {
      const finish = document.createElement("button");
      finish.type = "button";
      finish.className = "button button-primary";
      finish.textContent = "Terminer la séance";
      finish.addEventListener("click", () => window.dispatchEvent(new Event("herakles:show-session-recap")));
      overview.append(finish);
    }
    showScreen("overview");
  }

  function editFinishedExercise(index) {
    const record = activeSession?.exercises?.[index];
    if (!record) return;
    overview.replaceChildren();
    const heading = document.createElement("h1");
    heading.textContent = `Résultats · ${record.name}`;
    const info = document.createElement("p");
    info.textContent = `Exercice terminé · ${formatExerciseDuration(record.duration_seconds || 0)}`;
    overview.append(heading, info);
    const form = document.createElement("form");
    form.className = "workout-edit-form";
    const fields = [];
    if (record.type === "strength") {
      (record.sets || []).forEach((set, index) => {
        const grid = document.createElement("div");
        grid.className = "workout-parameters";
        const row = [];
        for (const [label, key, step] of [["Répétitions", "reps", "1"], ["Charge (kg)", "nominal_load_kg", "0.5"]]) {
          const wrap = document.createElement("label");
          wrap.textContent = `Série ${index + 1} · ${label}`;
          const input = document.createElement("input");
          input.type = "number"; input.min = "0"; input.step = step; input.required = true;
          input.value = String(set[key] ?? 0);
          wrap.append(input); grid.append(wrap);
          row.push({ key, input });
        }
        fields.push({ set, row });
        form.append(grid);
      });
    } else {
      const wrap = document.createElement("label");
      wrap.textContent = "Distance parcourue (km)";
      const distance = document.createElement("input");
      distance.type = "number"; distance.min = "0.01"; distance.step = "0.01"; distance.required = true;
      distance.value = String(record.cardio?.distance_km ?? "");
      wrap.append(distance); form.append(wrap);
      fields.push({ distance });
    }
    const submit = document.createElement("button");
    submit.type = "submit"; submit.className = "button button-primary"; submit.textContent = "Enregistrer les corrections";
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      for (const field of fields) {
        if (field.set) {
          for (const { key, input } of field.row) {
            const val = Number(input.value);
            if (!Number.isFinite(val) || val < 0) return;
            field.set[key] = key === "reps" ? Math.floor(val) : val;
          }
        } else {
          const distance = Number(field.distance.value);
          if (!(distance > 0)) return;
          record.cardio = { ...record.cardio, distance_km: distance,
            average_speed_kmh: record.duration_seconds > 0
              ? Math.round(distance / (record.duration_seconds / 3600) * 100) / 100 : 0 };
        }
      }
      if (record.type === "strength") {
        record.total_reps = record.sets.reduce((sum, set) => sum + Number(set.reps || 0), 0);
        record.volume_kg = record.sets.reduce(
          (sum, set) => sum + Number(set.reps || 0) * Number(set.nominal_load_kg || 0), 0);
      }
      persistActiveSession();
      showSessionOverview();
    });
    overview.append(form);
    const cancel = document.createElement("button");
    cancel.type = "button"; cancel.className = "button button-secondary"; cancel.textContent = "← Retour à la liste";
    cancel.addEventListener("click", showSessionOverview);
    overview.append(cancel);
    showScreen("overview");
  }

  function openPlannedExercise(item) {
    const ex = EXERCISES.find((exercise) => exercise.id === item.exercise.id)
      || { ...item.exercise, primary: item.exercise.primary_muscles || [], secondary: [] };
    showExerciseConfig(ex, item.planned, item.uid);
    if (ex.type !== "cardio") showScreen("exercise");
  }

  function preparePlannedCardio(exercise, planned, uid) {
    cardioPreparation = { exercise, planned, uid };
    sessionTitle.textContent = exercise.name;
    sessionProgress.textContent = "Prêt à démarrer";
    sessionSets.replaceChildren();
    const label = document.createElement("p");
    label.className = "cardio-live-time";
    label.textContent = "00:00:00";
    const start = document.createElement("button");
    start.type = "button"; start.className = "button button-primary";
    start.textContent = "Commencer l’exercice";
    start.addEventListener("click", () => {
      cardioPreparation = null;
      startExercise(createExerciseDraft(exercise, planned || {}), uid);
    });
    sessionSets.append(label, start);
    showScreen("session");
  }

  function showCategories() {
    exerciseStep = "categories";
    currentCategory = null;
    selectedExercise = null;
    flowTitle.textContent = "Choisir une catégorie";
    flowIntro.textContent = activeSession?.exercises?.length
      ? "Sélectionne la zone du prochain exercice."
      : "Sélectionne une zone à travailler aujourd’hui.";
    categoryList.hidden = false;
    exerciseList.hidden = true;
    config.hidden = true;
    freeButton.hidden = true;
    flowMessage.textContent = "";
    categoryList.replaceChildren();

    CATEGORIES.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "exercise-choice category-choice";

      const symbol = document.createElement("span");
      symbol.className = "choice-visual";
      symbol.textContent = category.symbol;

      const title = document.createElement("strong");
      title.textContent = category.name;

      const arrow = document.createElement("span");
      arrow.className = "choice-arrow";
      arrow.textContent = "›";

      button.append(symbol, title, arrow);
      button.addEventListener("click", () => {
        currentCategory = category.id;
        showExerciseList();
      });
      categoryList.append(button);
    });
  }

  function showExerciseList() {
    exerciseStep = "list";
    const category = CATEGORIES.find((item) => item.id === currentCategory);
    flowTitle.textContent = category?.name || "Exercices";
    flowIntro.textContent = activeSession?.exercises?.length
      ? "Choisis le prochain exercice."
      : "Choisis ton premier exercice.";
    categoryList.hidden = true;
    exerciseList.hidden = false;
    config.hidden = true;
    freeButton.hidden = false;
    flowMessage.textContent = "";
    exerciseList.replaceChildren();

    const items = currentCategory === "libre"
      ? EXERCISES
      : EXERCISES.filter((item) => item.categories.includes(currentCategory));

    items.forEach((exercise) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "exercise-choice";

      const visual = document.createElement("span");
      visual.className = "choice-visual";
      if (exercise.image) {
        visual.classList.add("has-image");
        const image = document.createElement("img");
        image.className = "choice-visual-image";
        image.src = exercise.image;
        image.alt = "";
        image.loading = "lazy";
        visual.append(image);
      } else {
        visual.textContent = exercise.type === "cardio" ? "◷" : "Η";
      }

      const details = document.createElement("span");
      details.className = "choice-details";

      const name = document.createElement("strong");
      name.textContent = exercise.name;

      const muscles = document.createElement("small");
      muscles.textContent = exercise.primary.join(" · ");

      const type = document.createElement("small");
      type.textContent = exercise.type === "cardio"
        ? "Cardio · départ immédiat"
        : RESISTANCE_LABELS[exercise.resistance];

      details.append(name, muscles, type);

      const arrow = document.createElement("span");
      arrow.className = "choice-arrow";
      arrow.textContent = "›";

      button.append(visual, details, arrow);
      button.addEventListener("click", () => showExerciseConfig(exercise));
      exerciseList.append(button);
    });
  }

  function showExerciseConfig(exercise, planned = null, plannedUid = null) {
    selectedExercise = exercise;
    selectedPlannedUid = plannedUid;

    if (exercise.type === "cardio" && plannedUid) {
      preparePlannedCardio(exercise, planned, plannedUid);
      return;
    }

    if (exercise.type === "cardio") {
      exerciseStep = "session";
      const draft = createExerciseDraft(exercise, {});

      try {
        sessionStorage.setItem("herakles.sessionDraft.v1", JSON.stringify(draft));
      } catch (error) {
        console.warn("Draft storage unavailable", error);
      }

      startExercise(draft);
      return;
    }

    exerciseStep = "config";
    flowTitle.textContent = "Configurer l’exercice";
    flowIntro.textContent = "Ces valeurs sont des objectifs modifiables pendant l’exercice.";
    categoryList.hidden = true;
    exerciseList.hidden = true;
    config.hidden = false;
    freeButton.hidden = true;

    document.querySelector("#selected-exercise-name").textContent = exercise.name;
    document.querySelector("#selected-exercise-muscles").textContent = [...exercise.primary, ...exercise.secondary].join(" · ");
    document.querySelector("#strength-fields").hidden = false;
    document.querySelector("#cardio-fields").hidden = true;
    document.querySelectorAll("#strength-fields input").forEach((input) => {
      input.disabled = false;
    });
    document.querySelectorAll("#cardio-fields input").forEach((input) => {
      input.disabled = true;
    });

    if (planned) {
      document.querySelector("#exercise-weight").value = planned.nominal_load_kg ?? 0;
      document.querySelector("#exercise-sets").value = planned.sets ?? 4;
      document.querySelector("#exercise-reps").value = planned.reps ?? 10;
      document.querySelector("#exercise-rest").value = planned.rest_seconds ?? 120;
    } else {
      const picked = exercise.id;
      void getAllSessions().then((sessions) => {
        if (selectedExercise?.id !== picked || selectedPlannedUid) return;
        const last = sessions.filter((row) => row.started_at)
          .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))
          .flatMap((row) => (row.exercises || []).filter((ex) => ex.id === picked))[0];
        if (!last) return;
        const first = last.sets?.[0];
        document.querySelector("#exercise-weight").value = first?.nominal_load_kg ?? first?.load_kg ?? last.planned?.nominal_load_kg ?? 0;
        document.querySelector("#exercise-sets").value = last.sets?.length || last.planned?.sets || 4;
        document.querySelector("#exercise-reps").value = first?.reps || last.planned?.reps || 10;
        document.querySelector("#exercise-rest").value = last.planned?.rest_seconds ?? 120;
      }).catch((error) => console.warn("Previous exercise values unavailable", error));
    }
    configSubmit.textContent = "Commencer l’exercice →";
    flowMessage.textContent = "";
  }

  function resetExerciseFlow() {
    currentCategory = null;
    selectedExercise = null;
    selectedPlannedUid = null;
    showCategories();
  }

  function startExercise(draft, planItemUid = null) {
    const now = new Date().toISOString();

    if (!activeSession) {
      activeSession = {
        schema_version: 2,
        id: crypto.randomUUID?.() || `session-${Date.now()}`,
        started_at: now,
        name: "Séance libre",
        mode: "free",
        planned_exercises: [],
        exercises: [],
        current_exercise: null
      };
    }

    activeSession.current_exercise = {
      plan_item_uid: planItemUid,
      started_at: now,
      ended_at: null,
      exercise: draft.exercise,
      planned: draft.planned,
      sets: draft.exercise.type === "cardio"
        ? []
        : Array.from({ length: draft.planned.sets }, (_, index) => ({
            index: index + 1,
            reps: draft.planned.reps,
            nominal_load_kg: draft.planned.nominal_load_kg,
            completed_at: null,
            rest_seconds_actual: null
          })),
      cardio_completed: false,
      cardio: null
    };

    pendingSetIndex = null;
    persistActiveSession();
    renderSession();
    showScreen("session");
  }

  function createSetInput(index, field, label, value, step) {
    const exerciseState = currentExercise();

    const wrapper = document.createElement("label");
    wrapper.className = "session-set-field";

    const caption = document.createElement("span");
    caption.textContent = label;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = String(step);
    input.inputMode = "decimal";
    input.value = String(value);
    input.setAttribute("aria-label", `Série ${index + 1} : ${label}`);

    input.addEventListener("change", () => {
      const next = Number(input.value);

      if (!Number.isFinite(next) || next < 0 || !exerciseState) {
        input.value = String(exerciseState?.sets[index]?.[field] ?? value);
        return;
      }

      exerciseState.sets[index][field] = field === "reps" ? Math.floor(next) : next;
      input.value = String(exerciseState.sets[index][field]);
      persistActiveSession();
    });

    wrapper.append(caption, input);
    return wrapper;
  }

  function renderSession() {
    const exerciseState = currentExercise();
    if (!exerciseState) return;

    sessionTitle.textContent = exerciseState.exercise.name;
    sessionSets.replaceChildren();
    sessionFeedback.textContent = "";
    renderSessionClock();

    if (exerciseState.exercise.type === "cardio") {
      const metrics = getExerciseMetrics(exerciseState);

      if (!exerciseState.ended_at) {
        sessionProgress.textContent = "Cardio en cours";

        const liveCard = document.createElement("div");
        liveCard.className = "cardio-live-card";

        const liveLabel = document.createElement("span");
        liveLabel.className = "cardio-live-label";
        liveLabel.textContent = "Durée de l’exercice";

        const liveTime = document.createElement("strong");
        liveTime.id = "cardio-exercise-elapsed";
        liveTime.className = "cardio-live-time";
        liveTime.textContent = formatElapsed(Date.now() - new Date(exerciseState.started_at).getTime());

        const liveHint = document.createElement("small");
        liveHint.textContent = "Aucune donnée à saisir pendant l’effort.";

        liveCard.append(liveLabel, liveTime, liveHint);

        const finish = document.createElement("button");
        finish.type = "button";
        finish.className = "button button-primary cardio-finish-button";
        finish.textContent = "Terminer l’exercice";
        finish.addEventListener("click", () => {
          exerciseState.ended_at = new Date().toISOString();
          exerciseState.cardio_completed = false;
          persistActiveSession();
          renderSession();
        });

        sessionSets.append(liveCard, finish);
        renderSessionClock();
        return;
      }

      sessionProgress.textContent = "Exercice terminé · complète les mesures";

      const summary = document.createElement("div");
      summary.className = "cardio-result-summary";

      const summaryLabel = document.createElement("span");
      summaryLabel.textContent = "Temps enregistré";

      const summaryValue = document.createElement("strong");
      summaryValue.textContent = formatExerciseDuration(metrics.durationSeconds);

      summary.append(summaryLabel, summaryValue);

      const form = document.createElement("form");
      form.className = "cardio-results-form";

      const fields = document.createElement("div");
      fields.className = "cardio-result-fields";

      const distanceLabel = document.createElement("label");
      distanceLabel.textContent = "Distance parcourue (km)";
      const distanceInput = document.createElement("input");
      distanceInput.type = "number";
      distanceInput.min = "0.01";
      distanceInput.step = "0.01";
      distanceInput.inputMode = "decimal";
      distanceInput.required = true;
      distanceInput.value = exerciseState.cardio?.distance_km ?? "";
      distanceLabel.append(distanceInput);
      fields.append(distanceLabel);

      let inclineInput = null;
      if (cardioSupportsIncline(exerciseState)) {
        const inclineLabel = document.createElement("label");
        inclineLabel.textContent = "Inclinaison moyenne (%) · facultatif";
        inclineInput = document.createElement("input");
        inclineInput.type = "number";
        inclineInput.min = "0";
        inclineInput.step = "0.1";
        inclineInput.inputMode = "decimal";
        inclineInput.value = exerciseState.cardio?.incline_percent ?? "";
        inclineLabel.append(inclineInput);
        fields.append(inclineLabel);
      }

      const speedPreview = document.createElement("p");
      speedPreview.className = "cardio-average-preview";

      const updateAveragePreview = () => {
        const distance = Number(distanceInput.value);
        if (!Number.isFinite(distance) || distance <= 0) {
          speedPreview.textContent = "Vitesse moyenne : —";
          return;
        }

        const hours = Math.max(metrics.durationSeconds, 1) / 3600;
        speedPreview.textContent = `Vitesse moyenne : ${formatMetric(distance / hours)} km/h`;
      };

      distanceInput.addEventListener("input", updateAveragePreview);
      updateAveragePreview();

      const saveCardio = document.createElement("button");
      saveCardio.type = "submit";
      saveCardio.className = "button button-primary";
      saveCardio.textContent = "Valider les mesures →";

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const distance = Number(distanceInput.value);
        if (!Number.isFinite(distance) || distance <= 0) {
          sessionFeedback.textContent = "Renseigne une distance supérieure à 0 km.";
          return;
        }

        const incline = inclineInput?.value === "" || !inclineInput
          ? null
          : Number(inclineInput.value);
        if (incline !== null && (!Number.isFinite(incline) || incline < 0)) {
          sessionFeedback.textContent = "L’inclinaison doit être positive ou laissée vide.";
          return;
        }

        const hours = Math.max(metrics.durationSeconds, 1) / 3600;
        exerciseState.cardio = {
          distance_km: distance,
          average_speed_kmh: Math.round((distance / hours) * 100) / 100,
          incline_percent: incline
        };
        exerciseState.cardio_completed = true;
        sessionFeedback.textContent = "";
        persistActiveSession();
        showExerciseRecap();
      });

      form.append(fields, speedPreview, saveCardio);
      sessionSets.append(summary, form);
      return;
    }

    const firstPending = exerciseState.sets.findIndex((set) => !set.completed_at);
    const completedCount = exerciseState.sets.filter((set) => set.completed_at).length;
    sessionProgress.textContent = `${completedCount} / ${exerciseState.sets.length} séries effectuées`;

    exerciseState.sets.forEach((set, index) => {
      if (set.completed_at) {
        const summary = document.createElement("div");
        summary.className = "session-set-completed";

        const name = document.createElement("strong");
        name.textContent = `Série ${index + 1}`;

        const reps = document.createElement("span");
        reps.className = "session-set-metric";
        reps.textContent = `↻ ${set.reps}`;
        reps.setAttribute("aria-label", `${set.reps} répétitions`);

        const weight = document.createElement("span");
        weight.className = "session-set-metric";
        weight.textContent = `⚖ ${set.nominal_load_kg} kg`;
        weight.setAttribute("aria-label", `${set.nominal_load_kg} kilogrammes`);

        const status = document.createElement("span");
        status.className = "session-set-completed-status";
        status.textContent = "✓ Effectué";

        summary.append(name, reps, weight, status);
        sessionSets.append(summary);
        return;
      }

      const card = document.createElement("div");
      card.className = "session-set-card";

      const heading = document.createElement("strong");
      heading.textContent = `Série ${index + 1}`;

      const status = document.createElement("span");
      status.className = "session-set-status is-pending";
      status.textContent = "● À faire";

      const fields = document.createElement("div");
      fields.className = "session-set-fields";
      fields.append(
        createSetInput(index, "reps", "Répétitions", set.reps, 1),
        createSetInput(index, "nominal_load_kg", "Charge (kg)", set.nominal_load_kg, 0.5)
      );

      const top = document.createElement("div");
      top.className = "session-set-top";
      top.append(heading, status);

      card.append(top, fields);
      sessionSets.append(card);

      if (index === firstPending) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button-primary session-rest-button";

        const last = index === exerciseState.sets.length - 1;
        button.textContent = last ? "Valider la dernière série" : "Commencer la récupération";

        button.addEventListener("click", () => {
          set.completed_at = new Date().toISOString();
          persistActiveSession();

          if (last) {
            renderSession();
            return;
          }

          pendingSetIndex = index;
          restTimer.start(exerciseState.planned.rest_seconds);
          showScreen("timer");
        });

        sessionSets.append(button);
      }
    });

    if (firstPending === -1) {
      const finish = document.createElement("button");
      finish.type = "button";
      finish.className = "button button-primary";
      finish.textContent = "Terminer l’exercice";
      finish.addEventListener("click", showExerciseRecap);
      sessionSets.append(finish);
    }
  }

  function completeRest(actualSeconds) {
    const exerciseState = currentExercise();
    if (!exerciseState || pendingSetIndex === null) return;

    const set = exerciseState.sets[pendingSetIndex];
    if (set) set.rest_seconds_actual = actualSeconds;

    pendingSetIndex = null;
    persistActiveSession();
    renderSession();
    showScreen("session");
  }

  function showExerciseRecap() {
    const exerciseState = currentExercise();
    if (!exerciseState) return;

    if (exerciseState.exercise.type === "cardio" && cardioNeedsMetrics(exerciseState)) {
      renderSession();
      showScreen("session");
      return;
    }

    if (!exerciseState.ended_at) {
      exerciseState.ended_at = new Date().toISOString();
      persistActiveSession();
    }

    const metrics = getExerciseMetrics(exerciseState);

    recapExerciseName.textContent = exerciseState.exercise.name;
    recapDuration.textContent = formatExerciseDuration(metrics.durationSeconds);

    if (exerciseState.exercise.type === "cardio") {
      if (recapRepsLabel) recapRepsLabel.textContent = "Distance";
      if (recapVolumeLabel) recapVolumeLabel.textContent = "Vitesse moyenne";
      recapReps.textContent = `${formatMetric(metrics.distanceKm)} km`;
      recapVolume.textContent = `${formatMetric(metrics.averageSpeedKmh)} km/h`;
    } else {
      if (recapRepsLabel) recapRepsLabel.textContent = "Répétitions";
      if (recapVolumeLabel) recapVolumeLabel.textContent = "Volume total";
      recapReps.textContent = String(metrics.totalReps);
      recapVolume.textContent = `${Math.round(metrics.volumeKg).toLocaleString("fr-FR")} kg`;
    }

    recapCalories.textContent = `≈ ${metrics.estimatedCaloriesKcal} kcal`;

    const calorieNote = `Estimation provisoire par MET (${metrics.met}) sur une référence de ${CALORIE_REFERENCE_WEIGHT_KG} kg. Le poids du profil permettra ensuite de personnaliser ce calcul.`;
    const incline = exerciseState.exercise.type === "cardio"
      ? exerciseState.cardio?.incline_percent
      : null;
    recapCalorieNote.textContent = incline == null
      ? calorieNote
      : `Inclinaison moyenne : ${formatMetric(incline, 1)} % · ${calorieNote}`;

    showScreen("recap");
  }

  function saveExerciseInSession() {
    const exerciseState = currentExercise();
    if (!activeSession || !exerciseState) return;

    if (exerciseState.exercise.type === "cardio" && cardioNeedsMetrics(exerciseState)) {
      renderSession();
      showScreen("session");
      return;
    }

    if (!exerciseState.ended_at) {
      exerciseState.ended_at = new Date().toISOString();
    }

    const metrics = getExerciseMetrics(exerciseState);

    activeSession.exercises.push({
      ...exerciseState.exercise,
      plan_item_uid: exerciseState.plan_item_uid || null,
      started_at: exerciseState.started_at,
      ended_at: exerciseState.ended_at,
      duration_seconds: metrics.durationSeconds,
      planned: exerciseState.planned,
      sets: exerciseState.sets,
      cardio_completed: exerciseState.cardio_completed,
      ...(exerciseState.exercise.type === "cardio" ? { cardio: exerciseState.cardio } : {}),
      total_reps: metrics.totalReps,
      volume_kg: metrics.volumeKg,
      estimated_calories_kcal: metrics.estimatedCaloriesKcal,
      calories_estimate: {
        method: "MET",
        met: metrics.met,
        reference_body_weight_kg: CALORIE_REFERENCE_WEIGHT_KG
      }
    });

    activeSession.current_exercise = null;
    pendingSetIndex = null;
    persistActiveSession();

    try {
      sessionStorage.removeItem("herakles.sessionDraft.v1");
    } catch (error) {
      console.warn("Draft cleanup unavailable", error);
    }

    resetExerciseFlow();
    showSessionOverview();
  }

  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-period]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      drawChart(Number(button.dataset.period));
    });
  });

  document.querySelector("#start-workout-button").addEventListener("click", () => {
    if (currentExercise()) {
      if (currentExercise().ended_at && !cardioNeedsMetrics(currentExercise())) {
        showExerciseRecap();
      } else {
        renderSession();
        showScreen("session");
      }
      return;
    }

    if (activeSession) {
      showSessionOverview();
    } else {
      resetExerciseFlow();
      showScreen("exercise");
    }
  });

  back.addEventListener("click", () => {
    if (!exerciseRecap.hidden && currentExercise()) {
      renderSession();
      showScreen("session");
      return;
    }

    if (cardioPreparation && !sessionPanel.hidden) {
      cardioPreparation = null;
      showSessionOverview();
      return;
    }

    if (!sessionPanel.hidden && currentExercise()) {
      if (!window.confirm("Quitter l’écran de l’exercice ? La séance restera en cours.")) return;
      showScreen("home");
      return;
    }

    if (!timer.hidden && currentExercise()) {
      restTimer.finish();
      return;
    }

    if (!flow.hidden && exerciseStep === "config") {
      showExerciseList();
      return;
    }

    if (!flow.hidden && exerciseStep === "list") {
      showCategories();
      return;
    }

    if (!flow.hidden && activeSession) {
      showSessionOverview();
      return;
    }

    if (!overview.hidden && activeSession) {
      showScreen("home");
      return;
    }

    showScreen("home");
  });

  navHome.addEventListener("click", () => showScreen("home"));
  navSettings.addEventListener("click", () => showScreen("settings"));

  freeButton.addEventListener("click", () => {
    const name = window.prompt("Nom de l’exercice libre :");
    if (!name?.trim()) return;

    const cardio = window.confirm("S’agit-il d’un exercice cardio ? (OK = cardio, Annuler = musculation)");
    showExerciseConfig({
      id: `custom-${Date.now()}`,
      name: name.trim().slice(0, 80),
      primary: ["Personnalisé"],
      secondary: [],
      type: cardio ? "cardio" : "strength",
      resistance: "free_weight",
      custom: true
    });
  });

  config.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedExercise || selectedExercise.type === "cardio" || !config.reportValidity()) return;

    const number = (id) => {
      const value = document.querySelector(id).value;
      return value === "" ? null : Number(value);
    };

    const draft = createExerciseDraft(selectedExercise, {
      nominal_load_kg: number("#exercise-weight"),
      sets: number("#exercise-sets"),
      reps: number("#exercise-reps"),
      rest_seconds: number("#exercise-rest")
    });

    try {
      sessionStorage.setItem("herakles.sessionDraft.v1", JSON.stringify(draft));
    } catch (error) {
      console.warn("Draft storage unavailable", error);
    }

    startExercise(draft, selectedPlannedUid);
  });

  saveExerciseButton.addEventListener("click", saveExerciseInSession);

  document.querySelectorAll("[data-placeholder-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      window.alert(`${button.dataset.placeholderNav} : cette rubrique sera disponible prochainement.`);
    });
  });

  function updateClock() {
    const now = new Date();
    date.textContent = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(now);
    time.textContent = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(now);
  }

  const restTimer = initRestTimer({ onFinish: completeRest });
  planner = initWorkoutPlanner({
    showScreen,
    getActiveSession: () => activeSession,
    onStart: (plan) => {
      if (activeSession) return;
      activeSession = {
        schema_version: 2,
        id: crypto.randomUUID?.() || `session-${Date.now()}`,
        name: plan.name || "Séance programmée",
        mode: "scheduled",
        source_plan_id: plan.id,
        planned_at: plan.scheduled_at,
        planned_exercises: cloneWorkoutData(plan.items || []),
        started_at: new Date().toISOString(),
        exercises: [],
        current_exercise: null
      };
      persistActiveSession();
      showSessionOverview();
    }
  });

  window.addEventListener("herakles:open-scheduled", async (event) => {
    const { getWorkoutPlan } = await import("./storage.js");
    const plan = await getWorkoutPlan(event.detail?.id);
    if (plan) {
      showScreen("planner");
      await planner.showDetail(plan);
    }
  });

  try {
    const stored = JSON.parse(localStorage.getItem(ACTIVE_KEY));
    const normalized = normalizeStoredSession(stored);

    if (normalized) {
      activeSession = normalized;
      persistActiveSession();

      if (currentExercise()) {
        if (currentExercise().ended_at && !cardioNeedsMetrics(currentExercise())) {
          showExerciseRecap();
          initialScreen = "recap";
        } else {
          renderSession();
          initialScreen = "session";
        }
      } else {
        initialScreen = "overview";
      }
    }
  } catch (error) {
    console.warn("Session restore failed", error);
  }

  updateClock();
  window.setInterval(updateClock, 30000);
  window.setInterval(renderSessionClock, 1000);
  drawChart(7);

  if (initialScreen === "overview") showSessionOverview();
  else showScreen(initialScreen);
}

initHome();
initNotificationControls();
updateNetworkStatus();
void registerServiceWorker();
void initStorage();