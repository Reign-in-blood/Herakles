import { CATEGORIES, EXERCISES } from "./exercises.js";
import { countSessions, saveSession, deleteWorkoutPlan } from "./storage.js";

const ACTIVE_SESSION_KEY = "herakles.activeSession.v1";
const SESSION_CATEGORY_KEY = "herakles.sessionCategory.v1";
const REST_TIMER_KEY = "herakles.restTimer.v1";

const exerciseFlow = document.querySelector("#exercise-flow");
const categoryList = document.querySelector("#category-list");
const exerciseList = document.querySelector("#exercise-list");
const freeExerciseButton = document.querySelector("#free-exercise-button");
const backButton = document.querySelector("#back-home-button");
const startWorkoutButton = document.querySelector("#start-workout-button");
const navHome = document.querySelector('[data-nav="home"]');
const navSettings = document.querySelector('[data-nav="settings"]');
const sessionCount = document.querySelector("#session-count");
const sessionPanel = document.querySelector("#session-panel");
const exerciseRecap = document.querySelector("#exercise-recap");
const restTimerScreen = document.querySelector("#rest-timer");
const timerPresets = document.querySelector("#timer-presets");
const timerAction = document.querySelector("#timer-action");

let sessionRecap = null;
let finishWorkoutButton = null;
let completedExercisesSection = null;
let nextExerciseTitle = null;
let abandonExerciseButton = null;
let correctExerciseButton = null;
let recoveredRestSetIndex = null;
let completedExercisesSignature = "";

function loadActiveSession() {
  try {
    const session = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY));
    return session && Array.isArray(session.exercises) ? session : null;
  } catch (error) {
    console.warn("Active session could not be read", error);
    return null;
  }
}

function saveActiveSession(session) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.warn("Active session could not be saved", error);
    return false;
  }
}

function loadRestTimerState() {
  try {
    const state = JSON.parse(localStorage.getItem(REST_TIMER_KEY));
    return state?.version === 1 ? state : null;
  } catch (error) {
    console.warn("Rest timer state could not be read", error);
    return null;
  }
}

function getStoredCategoryId() {
  const stored = localStorage.getItem(SESSION_CATEGORY_KEY);
  if (CATEGORIES.some((category) => category.id === stored)) return stored;

  const session = loadActiveSession();
  const referenceExercise = session?.current_exercise?.exercise || session?.exercises?.at(-1);
  if (!referenceExercise) return null;

  const catalogExercise = EXERCISES.find((exercise) => exercise.id === referenceExercise.id);
  const inferred = catalogExercise?.categories?.[0] || (referenceExercise.custom ? "libre" : null);

  if (inferred) localStorage.setItem(SESSION_CATEGORY_KEY, inferred);
  return inferred;
}

function storeCategoryFromButton(button) {
  const label = button.querySelector("strong")?.textContent?.trim();
  const category = CATEGORIES.find((item) => item.name === label);
  if (category) localStorage.setItem(SESSION_CATEGORY_KEY, category.id);
}

function findCategoryButton(categoryId) {
  const category = CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return null;

  return [...categoryList.querySelectorAll(".category-choice")].find(
    (button) => button.querySelector("strong")?.textContent?.trim() === category.name
  ) || null;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remaining = seconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function exerciseTotals(exercise) {
  const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
  const totalReps = Number.isFinite(Number(exercise.total_reps))
    ? Number(exercise.total_reps)
    : sets.reduce((sum, set) => sum + Number(set.reps || 0), 0);
  const volumeKg = Number.isFinite(Number(exercise.volume_kg))
    ? Number(exercise.volume_kg)
    : sets.reduce((sum, set) => sum + Number(set.reps || 0) * Number(set.nominal_load_kg || 0), 0);
  const calories = Number(exercise.estimated_calories_kcal || 0);

  return { totalReps, volumeKg, calories };
}

function sessionTotals(session, endedAt = Date.now()) {
  const startedAt = new Date(session.started_at).getTime();
  const durationSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));

  return session.exercises.reduce((summary, exercise) => {
    const totals = exerciseTotals(exercise);
    summary.totalReps += totals.totalReps;
    summary.volumeKg += totals.volumeKg;
    summary.calories += totals.calories;
    return summary;
  }, {
    durationSeconds,
    exerciseCount: session.exercises.length,
    totalReps: 0,
    volumeKg: 0,
    calories: 0
  });
}

function createCompletedExercisesSection() {
  if (completedExercisesSection) return completedExercisesSection;

  completedExercisesSection = document.createElement("section");
  completedExercisesSection.id = "current-session-exercises";
  completedExercisesSection.className = "current-session-exercises";
  completedExercisesSection.hidden = true;
  completedExercisesSection.innerHTML = `
    <div class="current-session-exercises-heading">
      <p class="section-kicker">Séance en cours</p>
      <h2>Exercices déjà réalisés</h2>
    </div>
    <div id="current-session-exercise-list" class="current-session-exercise-list"></div>
  `;

  nextExerciseTitle = document.createElement("h2");
  nextExerciseTitle.className = "session-next-exercise-title";
  nextExerciseTitle.textContent = "Choisir un nouvel exercice";
  nextExerciseTitle.hidden = true;

  exerciseList.insertAdjacentElement("beforebegin", completedExercisesSection);
  exerciseList.insertAdjacentElement("beforebegin", nextExerciseTitle);
  return completedExercisesSection;
}

function renderCompletedExercises() {
  const section = createCompletedExercisesSection();
  const session = loadActiveSession();
  const shouldShow = Boolean(
    session &&
    !session.current_exercise &&
    session.exercises.length > 0 &&
    !exerciseFlow.hidden &&
    !exerciseList.hidden
  );

  if (section.hidden !== !shouldShow) section.hidden = !shouldShow;
  if (nextExerciseTitle.hidden !== !shouldShow) nextExerciseTitle.hidden = !shouldShow;
  if (!shouldShow) return;

  const list = section.querySelector("#current-session-exercise-list");
  const signature = session.exercises
    .map((exercise) => `${exercise.id || exercise.name}:${exercise.ended_at || ""}:${exercise.duration_seconds || 0}`)
    .join("|");

  if (signature === completedExercisesSignature && list.children.length === session.exercises.length) {
    return;
  }

  completedExercisesSignature = signature;
  list.replaceChildren();

  session.exercises.forEach((exercise, index) => {
    const card = document.createElement("article");
    card.className = "current-session-exercise-card";

    const position = document.createElement("span");
    position.className = "current-session-exercise-index";
    position.textContent = String(index + 1);

    const details = document.createElement("div");
    details.className = "current-session-exercise-details";

    const name = document.createElement("strong");
    name.textContent = exercise.name;

    const duration = document.createElement("span");
    duration.textContent = `Durée · ${formatDuration(exercise.duration_seconds || 0)}`;

    details.append(name, duration);
    card.append(position, details);
    list.append(card);
  });
}

function ensureFinishWorkoutButton() {
  if (!finishWorkoutButton) {
    finishWorkoutButton = document.createElement("button");
    finishWorkoutButton.id = "finish-workout-button";
    finishWorkoutButton.type = "button";
    finishWorkoutButton.className = "button button-secondary finish-workout-button";
    finishWorkoutButton.textContent = "Terminer la séance";
    finishWorkoutButton.addEventListener("click", showSessionRecap);
    freeExerciseButton.insertAdjacentElement("afterend", finishWorkoutButton);
  }

  const session = loadActiveSession();
  const shouldShow = Boolean(
    session &&
    !session.current_exercise &&
    session.exercises.length > 0 &&
    !exerciseFlow.hidden &&
    !exerciseList.hidden
  );

  if (finishWorkoutButton.hidden !== !shouldShow) {
    finishWorkoutButton.hidden = !shouldShow;
  }
  renderCompletedExercises();
}

function openStoredCategory() {
  const session = loadActiveSession();
  if (!session || session.current_exercise || exerciseFlow.hidden) return;

  const categoryId = getStoredCategoryId();
  if (!categoryId) return;

  if (!exerciseList.hidden) {
    ensureFinishWorkoutButton();
    return;
  }

  const button = findCategoryButton(categoryId);
  if (button) button.click();
  ensureFinishWorkoutButton();
}

function resumeExerciseSelection() {
  const session = loadActiveSession();
  if (!session || session.current_exercise) return false;

  startWorkoutButton.click();
  window.setTimeout(openStoredCategory, 0);
  return true;
}

function createSessionRecap() {
  if (sessionRecap) return sessionRecap;

  sessionRecap = document.createElement("section");
  sessionRecap.id = "session-recap";
  sessionRecap.className = "session-recap";
  sessionRecap.hidden = true;
  sessionRecap.setAttribute("aria-labelledby", "session-recap-title");
  sessionRecap.innerHTML = `
    <header class="session-recap-heading">
      <p class="section-kicker">Récapitulatif de la séance</p>
      <h1 id="session-recap-title">Séance terminée</h1>
      <p>Vérifie le résumé avant l’enregistrement final.</p>
    </header>
    <div class="session-recap-grid">
      <article class="session-recap-stat"><span aria-hidden="true">◷</span><div><small>Durée totale</small><strong id="session-recap-duration">00:00</strong></div></article>
      <article class="session-recap-stat"><span aria-hidden="true">Η</span><div><small>Exercices</small><strong id="session-recap-exercises">0</strong></div></article>
      <article class="session-recap-stat"><span aria-hidden="true">↻</span><div><small>Répétitions</small><strong id="session-recap-reps">0</strong></div></article>
      <article class="session-recap-stat"><span aria-hidden="true">▥</span><div><small>Volume total</small><strong id="session-recap-volume">0 kg</strong></div></article>
      <article class="session-recap-stat session-recap-stat-wide"><span aria-hidden="true">♨</span><div><small>Calories estimées</small><strong id="session-recap-calories">≈ 0 kcal</strong></div></article>
    </div>
    <section class="session-recap-exercises" aria-labelledby="session-recap-exercises-title">
      <h2 id="session-recap-exercises-title">Exercices réalisés</h2>
      <div id="session-recap-exercise-list"></div>
    </section>
    <p id="session-recap-message" class="flow-message" role="status" aria-live="polite"></p>
    <button id="save-session-button" class="button button-primary session-recap-save" type="button">✓ Enregistrer et terminer la séance</button>
  `;

  restTimerScreen.insertAdjacentElement("beforebegin", sessionRecap);
  sessionRecap.querySelector("#save-session-button").addEventListener("click", saveAndFinishSession);
  return sessionRecap;
}

function hideRecap() {
  if (sessionRecap) sessionRecap.hidden = true;
}

function showSessionRecap() {
  const session = loadActiveSession();
  if (!session || session.current_exercise || !session.exercises.length) return;

  const recap = createSessionRecap();
  const totals = sessionTotals(session);

  recap.querySelector("#session-recap-duration").textContent = formatDuration(totals.durationSeconds);
  recap.querySelector("#session-recap-exercises").textContent = String(totals.exerciseCount);
  recap.querySelector("#session-recap-reps").textContent = String(totals.totalReps);
  recap.querySelector("#session-recap-volume").textContent = `${Math.round(totals.volumeKg).toLocaleString("fr-FR")} kg`;
  recap.querySelector("#session-recap-calories").textContent = `≈ ${Math.round(totals.calories)} kcal`;
  recap.querySelector("#session-recap-message").textContent = "";

  const list = recap.querySelector("#session-recap-exercise-list");
  list.replaceChildren();

  session.exercises.forEach((exercise, index) => {
    const totalsForExercise = exerciseTotals(exercise);
    const row = document.createElement("article");
    row.className = "session-recap-exercise";

    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${exercise.name}`;

    const detail = document.createElement("span");
    detail.textContent = exercise.type === "cardio"
      ? `${formatDuration(exercise.duration_seconds || 0)} · ≈ ${Math.round(totalsForExercise.calories)} kcal`
      : `${totalsForExercise.totalReps} rép. · ${Math.round(totalsForExercise.volumeKg).toLocaleString("fr-FR")} kg`;

    row.append(title, detail);
    list.append(row);
  });

  ["home-screen", "exercise-flow", "workout-planner", "workout-overview", "session-panel", "exercise-recap", "rest-timer", "system-panel"].forEach((id) => {
    const screen = document.getElementById(id);
    if (screen) screen.hidden = true;
  });

  recap.hidden = false;
  backButton.hidden = false;
  navHome.classList.remove("is-current");
  navSettings.classList.remove("is-current");
  window.scrollTo(0, 0);
}

async function saveAndFinishSession() {
  const session = loadActiveSession();
  if (!session || session.current_exercise || !session.exercises.length || !sessionRecap) return;

  const saveButton = sessionRecap.querySelector("#save-session-button");
  const message = sessionRecap.querySelector("#session-recap-message");
  saveButton.disabled = true;
  message.textContent = "Enregistrement de la séance…";

  const endedAt = new Date();
  const totals = sessionTotals(session, endedAt.getTime());
  const categoryId = getStoredCategoryId();

  const record = {
    schema_version: 2,
    id: session.id,
    started_at: session.started_at,
    ended_at: endedAt.toISOString(),
    duration_seconds: totals.durationSeconds,
    theme_id: session.mode === "scheduled" ? null : categoryId,
    name: session.name || "Séance",
    mode: session.mode || "free",
    source_plan_id: session.source_plan_id || null,
    planned_at: session.planned_at || null,
    planned_exercises: session.planned_exercises || [],
    exercises: session.exercises,
    summary: {
      exercise_count: totals.exerciseCount,
      total_reps: totals.totalReps,
      volume_kg: totals.volumeKg,
      estimated_calories_kcal: Math.round(totals.calories)
    }
  };

  try {
    await saveSession(record);
    if (session.source_plan_id) {
      try {
        await deleteWorkoutPlan(session.source_plan_id);
      } catch (planError) {
        console.warn("Completed scheduled workout could not be removed from planned list", planError);
      }
    }
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    localStorage.removeItem(SESSION_CATEGORY_KEY);
    sessionStorage.removeItem("herakles.sessionDraft.v1");

    const count = await countSessions();
    if (sessionCount) {
      sessionCount.textContent = `${count} séance${count === 1 ? "" : "s"} enregistrée${count === 1 ? "" : "s"}`;
    }

    window.location.reload();
  } catch (error) {
    console.error("Session save failed", error);
    message.textContent = "Enregistrement impossible. La séance reste conservée sur cet appareil.";
    saveButton.disabled = false;
  }
}

function ensureExerciseActions() {
  const session = loadActiveSession();
  const hasCurrentExercise = Boolean(session?.current_exercise);

  if (!abandonExerciseButton) {
    abandonExerciseButton = document.createElement("button");
    abandonExerciseButton.id = "abandon-exercise-button";
    abandonExerciseButton.type = "button";
    abandonExerciseButton.className = "button exercise-abandon-button";
    abandonExerciseButton.textContent = "Abandonner l’exercice";
    abandonExerciseButton.addEventListener("click", abandonCurrentExercise);
    sessionPanel.append(abandonExerciseButton);
  }

  const shouldHideAbandon = !hasCurrentExercise || sessionPanel.hidden;
  if (abandonExerciseButton.hidden !== shouldHideAbandon) {
    abandonExerciseButton.hidden = shouldHideAbandon;
  }

  if (exerciseRecap && !correctExerciseButton) {
    const actions = document.createElement("div");
    actions.className = "exercise-recap-actions";

    correctExerciseButton = document.createElement("button");
    correctExerciseButton.id = "correct-exercise-button";
    correctExerciseButton.type = "button";
    correctExerciseButton.className = "button button-secondary";
    correctExerciseButton.textContent = "Corriger l’exercice";
    correctExerciseButton.addEventListener("click", reopenExerciseForCorrection);

    const abandonFromRecapButton = document.createElement("button");
    abandonFromRecapButton.type = "button";
    abandonFromRecapButton.className = "button exercise-abandon-button";
    abandonFromRecapButton.textContent = "Abandonner";
    abandonFromRecapButton.addEventListener("click", abandonCurrentExercise);

    const saveButton = exerciseRecap.querySelector("#save-exercise-button");
    saveButton.insertAdjacentElement("beforebegin", actions);
    actions.append(correctExerciseButton, abandonFromRecapButton);
  }

  addCompletedSetCorrectionButtons();
}

function abandonCurrentExercise() {
  const session = loadActiveSession();
  if (!session?.current_exercise) return;

  const confirmed = window.confirm(
    "Abandonner cet exercice ? Ses données ne seront pas enregistrées. La séance en cours sera conservée."
  );
  if (!confirmed) return;

  session.current_exercise = null;
  if (!saveActiveSession(session)) return;

  try {
    sessionStorage.removeItem("herakles.sessionDraft.v1");
  } catch (error) {
    console.warn("Draft cleanup unavailable", error);
  }

  window.location.reload();
}

function reopenExerciseForCorrection() {
  const session = loadActiveSession();
  if (!session?.current_exercise) return;

  session.current_exercise.ended_at = null;
  if (saveActiveSession(session)) window.location.reload();
}

function addCompletedSetCorrectionButtons() {
  const session = loadActiveSession();
  if (!session?.current_exercise || sessionPanel.hidden) return;

  [...sessionPanel.querySelectorAll(".session-set-completed")].forEach((row) => {
    if (row.querySelector(".correct-set-button")) return;

    const label = row.querySelector("strong")?.textContent || "";
    const match = label.match(/(\d+)/);
    const setIndex = match ? Number(match[1]) - 1 : -1;
    if (setIndex < 0 || !session.current_exercise.sets?.[setIndex]) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "correct-set-button";
    button.textContent = "Corriger";
    button.setAttribute("aria-label", `Corriger la série ${setIndex + 1}`);
    button.addEventListener("click", () => correctCompletedSet(setIndex));
    row.append(button);
  });
}

function correctCompletedSet(setIndex) {
  const session = loadActiveSession();
  const set = session?.current_exercise?.sets?.[setIndex];
  if (!set) return;

  const repsAnswer = window.prompt(
    `Répétitions de la série ${setIndex + 1} :`,
    String(set.reps)
  );
  if (repsAnswer === null) return;

  const reps = Number(repsAnswer.replace(",", "."));
  if (!Number.isFinite(reps) || reps < 0) {
    window.alert("Nombre de répétitions invalide.");
    return;
  }

  const weightAnswer = window.prompt(
    `Charge de la série ${setIndex + 1} (kg) :`,
    String(set.nominal_load_kg)
  );
  if (weightAnswer === null) return;

  const weight = Number(weightAnswer.replace(",", "."));
  if (!Number.isFinite(weight) || weight < 0) {
    window.alert("Charge invalide.");
    return;
  }

  set.reps = Math.floor(reps);
  set.nominal_load_kg = weight;

  if (saveActiveSession(session)) window.location.reload();
}

function inferPendingRestSetIndex(session) {
  const sets = session?.current_exercise?.sets;
  if (!Array.isArray(sets) || sets.length < 2) return null;

  for (let index = sets.length - 2; index >= 0; index -= 1) {
    const set = sets[index];
    const laterSetPending = sets.slice(index + 1).some((item) => !item.completed_at);
    if (set.completed_at && set.rest_seconds_actual == null && laterSetPending) {
      return index;
    }
  }

  return null;
}

function showRecoveredRestTimer() {
  const session = loadActiveSession();
  const timerState = loadRestTimerState();
  if (!session?.current_exercise || timerState?.status !== "running") return false;

  const setIndex = inferPendingRestSetIndex(session);
  if (setIndex === null) return false;

  recoveredRestSetIndex = setIndex;

  ["home-screen", "exercise-flow", "workout-planner", "workout-overview", "session-panel", "exercise-recap", "system-panel"].forEach((id) => {
    const screen = document.getElementById(id);
    if (screen) screen.hidden = true;
  });

  restTimerScreen.hidden = false;
  timerPresets.hidden = true;
  backButton.hidden = false;
  navHome.classList.remove("is-current");
  navSettings.classList.remove("is-current");
  window.scrollTo(0, 0);
  return true;
}

function finishRecoveredRestIfNeeded() {
  if (recoveredRestSetIndex === null) return;

  window.setTimeout(() => {
    const session = loadActiveSession();
    const timerState = loadRestTimerState();
    const set = session?.current_exercise?.sets?.[recoveredRestSetIndex];

    if (!session?.current_exercise || !set || timerState?.status === "running") return;

    set.rest_seconds_actual = Number.isFinite(Number(timerState?.lastActualSeconds))
      ? Number(timerState.lastActualSeconds)
      : null;

    recoveredRestSetIndex = null;
    if (saveActiveSession(session)) window.location.reload();
  }, 0);
}

window.addEventListener("herakles:show-session-recap", showSessionRecap);

document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest(".category-choice");
  if (categoryButton) storeCategoryFromButton(categoryButton);
}, true);

const saveExerciseButton = document.querySelector("#save-exercise-button");
if (saveExerciseButton) {
  saveExerciseButton.addEventListener("click", () => {
    window.setTimeout(() => {
      openStoredCategory();
      renderCompletedExercises();
    }, 0);
  });
}

startWorkoutButton.addEventListener("click", () => {
  window.setTimeout(() => {
    openStoredCategory();
    renderCompletedExercises();
  }, 0);
});

backButton.addEventListener("click", (event) => {
  if (recoveredRestSetIndex !== null && !restTimerScreen.hidden) {
    finishRecoveredRestIfNeeded();
    return;
  }

  if (!sessionRecap || sessionRecap.hidden) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  hideRecap();
  exerciseFlow.hidden = false;
  backButton.hidden = false;
  openStoredCategory();
  window.scrollTo(0, 0);
}, true);

[navHome, navSettings].forEach((button) => {
  button.addEventListener("click", hideRecap, true);
});

timerAction?.addEventListener("click", finishRecoveredRestIfNeeded);

const observer = new MutationObserver(() => {
  ensureFinishWorkoutButton();
  ensureExerciseActions();
});

observer.observe(document.querySelector(".app-shell"), {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["hidden"]
});

createCompletedExercisesSection();
ensureFinishWorkoutButton();
ensureExerciseActions();

const resumedRest = showRecoveredRestTimer();
if (!resumedRest) {
  resumeExerciseSelection();
  window.setTimeout(openStoredCategory, 0);
}
