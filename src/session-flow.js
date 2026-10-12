import { CATEGORIES, EXERCISES } from "./exercises.js";
import { countSessions, saveSession } from "./storage.js";

const ACTIVE_SESSION_KEY = "herakles.activeSession.v1";
const SESSION_CATEGORY_KEY = "herakles.sessionCategory.v1";

const exerciseFlow = document.querySelector("#exercise-flow");
const categoryList = document.querySelector("#category-list");
const exerciseList = document.querySelector("#exercise-list");
const freeExerciseButton = document.querySelector("#free-exercise-button");
const backButton = document.querySelector("#back-home-button");
const startWorkoutButton = document.querySelector("#start-workout-button");
const navHome = document.querySelector('[data-nav="home"]');
const navSettings = document.querySelector('[data-nav="settings"]');
const sessionCount = document.querySelector("#session-count");

let sessionRecap = null;
let finishWorkoutButton = null;

function loadActiveSession() {
  try {
    const session = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY));
    return session && Array.isArray(session.exercises) ? session : null;
  } catch (error) {
    console.warn("Active session could not be read", error);
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

function openStoredCategory() {
  const session = loadActiveSession();
  if (!session || session.current_exercise) return;
  if (exerciseFlow.hidden) return;

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

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
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

  document.querySelector("#rest-timer").insertAdjacentElement("beforebegin", sessionRecap);
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

  ["home-screen", "exercise-flow", "session-panel", "exercise-recap", "rest-timer", "system-panel"].forEach((id) => {
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
    theme_id: categoryId,
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

  if (finishWorkoutButton.hidden === shouldShow) {
    finishWorkoutButton.hidden = !shouldShow;
  }
}

document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest(".category-choice");
  if (categoryButton) storeCategoryFromButton(categoryButton);
}, true);

const saveExerciseButton = document.querySelector("#save-exercise-button");
if (saveExerciseButton) {
  saveExerciseButton.addEventListener("click", () => {
    window.setTimeout(openStoredCategory, 0);
  });
}

startWorkoutButton.addEventListener("click", () => {
  window.setTimeout(openStoredCategory, 0);
});

backButton.addEventListener("click", (event) => {
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

const observer = new MutationObserver(() => {
  ensureFinishWorkoutButton();
});

observer.observe(exerciseFlow, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["hidden"]
});

ensureFinishWorkoutButton();
window.setTimeout(openStoredCategory, 0);
