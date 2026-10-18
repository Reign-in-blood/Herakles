import { getAllSessions, getProfile } from "./storage.js";

const PERIODS = {
  7: { days: 7, bucketDays: 1, label: "7 jours" },
  30: { days: 30, bucketDays: 5, label: "30 jours" },
  84: { days: 84, bucketDays: 14, label: "12 semaines" }
};

const chart = document.querySelector("#activity-chart");
const periodTabs = document.querySelector(".period-tabs");
const dashboardCards = [...document.querySelectorAll(".dashboard-card")];
const dataLabel = document.querySelector(".demo-label");
const navHome = document.querySelector('[data-nav="home"]');

let activePeriod = 7;
let sessionsCache = [];
let profileCache = null;

function startOfLocalDay(value = new Date()) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function sessionTimestamp(session) {
  const timestamp = new Date(session?.started_at).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function sessionDurationSeconds(session) {
  const stored = Number(session?.duration_seconds);
  if (Number.isFinite(stored) && stored >= 0) return stored;

  const startedAt = new Date(session?.started_at).getTime();
  const endedAt = new Date(session?.ended_at).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return 0;
  return Math.max(0, Math.floor((endedAt - startedAt) / 1000));
}

function exerciseSets(exercise) {
  return Array.isArray(exercise?.sets) ? exercise.sets : [];
}

function exerciseVolumeKg(exercise) {
  const cached = Number(exercise?.volume_kg ?? exercise?.exercise_volume_kg);
  if (Number.isFinite(cached) && cached >= 0) return cached;

  return exerciseSets(exercise).reduce((sum, set) => {
    const reps = Number(set?.reps || 0);
    const load = Number(set?.nominal_load_kg ?? set?.load_kg ?? 0);
    return sum + (Number.isFinite(reps) && Number.isFinite(load) ? reps * load : 0);
  }, 0);
}

function sessionVolumeKg(session) {
  const cached = Number(
    session?.summary?.volume_kg ??
    session?.summary?.strength_volume_kg ??
    session?.session_volume_kg
  );
  if (Number.isFinite(cached) && cached >= 0) return cached;

  return (Array.isArray(session?.exercises) ? session.exercises : [])
    .reduce((sum, exercise) => sum + exerciseVolumeKg(exercise), 0);
}

function sessionCalories(session) {
  const cached = Number(session?.summary?.estimated_calories_kcal);
  if (Number.isFinite(cached) && cached >= 0) return cached;

  return (Array.isArray(session?.exercises) ? session.exercises : [])
    .reduce((sum, exercise) => {
      const calories = Number(exercise?.estimated_calories_kcal || 0);
      return sum + (Number.isFinite(calories) ? calories : 0);
    }, 0);
}

function sessionExerciseCount(session) {
  const cached = Number(session?.summary?.exercise_count);
  if (Number.isFinite(cached) && cached >= 0) return cached;
  return Array.isArray(session?.exercises) ? session.exercises.length : 0;
}

function sessionLoads(session) {
  const loads = [];

  for (const exercise of Array.isArray(session?.exercises) ? session.exercises : []) {
    if (exercise?.type === "cardio") continue;

    for (const set of exerciseSets(exercise)) {
      const load = Number(set?.nominal_load_kg ?? set?.load_kg);
      if (Number.isFinite(load) && load > 0) loads.push(load);
    }
  }

  return loads;
}

function periodBounds(days) {
  const today = startOfLocalDay();
  const end = addDays(today, 1);
  const start = addDays(end, -days);
  const previousEnd = start;
  const previousStart = addDays(previousEnd, -days);
  return { start, end, previousStart, previousEnd };
}

function sessionsBetween(start, end) {
  const startMs = start.getTime();
  const endMs = end.getTime();

  return sessionsCache.filter((session) => {
    const timestamp = sessionTimestamp(session);
    return timestamp !== null && timestamp >= startMs && timestamp < endMs;
  });
}

function aggregateSessions(sessions) {
  let durationSeconds = 0;
  let volumeKg = 0;
  let calories = 0;
  let exerciseCount = 0;
  const loads = [];

  for (const session of sessions) {
    durationSeconds += sessionDurationSeconds(session);
    volumeKg += sessionVolumeKg(session);
    calories += sessionCalories(session);
    exerciseCount += sessionExerciseCount(session);
    loads.push(...sessionLoads(session));
  }

  return {
    sessionCount: sessions.length,
    durationSeconds,
    volumeKg,
    calories,
    exerciseCount,
    averageLoadKg: loads.length ? loads.reduce((sum, load) => sum + load, 0) / loads.length : null
  };
}

function formatDuration(totalSeconds) {
  const minutes = Math.round(Math.max(0, Number(totalSeconds) || 0) / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (!hours) return `${minutes} min`;
  if (!remaining) return `${hours} h`;
  return `${hours} h ${String(remaining).padStart(2, "0")}`;
}

function formatNumber(value, compactThreshold = 100000) {
  const number = Math.max(0, Number(value) || 0);
  if (number >= compactThreshold) {
    return new Intl.NumberFormat("fr-FR", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(number);
  }

  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(number));
}

function percentageChange(current, previous) {
  const currentValue = Number(current);
  const previousValue = Number(previous);
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue <= 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} %`;
}

function formatComparison(current, previous) {
  if (previous <= 0) return current > 0 ? "nouvelle activité" : "aucune activité";
  return `${formatPercent(percentageChange(current, previous))} vs période préc.`;
}

function setMetricWithUnit(card, value, unit) {
  const strong = card?.querySelector("strong");
  if (!strong) return;

  const unitElement = document.createElement("em");
  unitElement.textContent = unit;
  strong.replaceChildren(document.createTextNode(`${value} `), unitElement);
}

function renderCards(period, current, previous) {
  if (dashboardCards.length < 6) return;

  const sessionsValue = dashboardCards[0].querySelector("strong");
  const sessionsCaption = dashboardCards[0].querySelector("small");
  const durationValue = dashboardCards[1].querySelector("strong");
  const durationCaption = dashboardCards[1].querySelector("small");
  const progressionValue = dashboardCards[2].querySelector("strong");
  const progressionCaption = dashboardCards[2].querySelector("small");
  const exercisesValue = dashboardCards[5].querySelector("strong");

  sessionsValue.textContent = String(current.sessionCount);
  sessionsCaption.textContent = period === 7 && Number(profileCache?.weekly_sessions_goal) > 0
    ? `objectif ${profileCache.weekly_sessions_goal} / 7 jours`
    : `sur ${PERIODS[period].label}`;

  durationValue.textContent = formatDuration(current.durationSeconds);
  durationCaption.textContent = formatComparison(current.durationSeconds, previous.durationSeconds);

  const loadChange = current.averageLoadKg === null || previous.averageLoadKg === null
    ? null
    : percentageChange(current.averageLoadKg, previous.averageLoadKg);
  progressionValue.textContent = formatPercent(loadChange);
  progressionCaption.textContent = loadChange === null
    ? "pas assez d’historique de charge"
    : "charge moyenne vs période préc.";

  setMetricWithUnit(dashboardCards[3], formatNumber(current.calories, 10000), "kcal");
  setMetricWithUnit(dashboardCards[4], formatNumber(current.volumeKg), "kg");
  exercisesValue.textContent = formatNumber(current.exerciseCount, Number.POSITIVE_INFINITY);
}

function shortDate(date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

function bucketLabel(start, bucketDays) {
  if (bucketDays === 1) {
    const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(start);
    return weekday.replace(".", "").slice(0, 3);
  }
  return shortDate(start);
}

function buildBuckets(period) {
  const config = PERIODS[period];
  const { start, end } = periodBounds(config.days);
  const buckets = [];

  for (let bucketStart = new Date(start); bucketStart < end; bucketStart = addDays(bucketStart, config.bucketDays)) {
    const bucketEnd = new Date(Math.min(addDays(bucketStart, config.bucketDays).getTime(), end.getTime()));
    const sessions = sessionsBetween(bucketStart, bucketEnd);
    const minutes = sessions.reduce((sum, session) => sum + sessionDurationSeconds(session) / 60, 0);
    buckets.push({
      label: bucketLabel(bucketStart, config.bucketDays),
      minutes,
      sessionCount: sessions.length
    });
  }

  return buckets;
}

function niceAxisMaximum(values) {
  const maximum = Math.max(0, ...values);
  if (maximum <= 30) return 30;
  if (maximum <= 60) return 60;
  return Math.ceil(maximum / 30) * 30;
}

function renderChart(period) {
  if (!chart) return;

  const buckets = buildBuckets(period);
  const values = buckets.map((bucket) => bucket.minutes);
  const axisMaximum = niceAxisMaximum(values);
  chart.replaceChildren();

  const axis = document.createElement("div");
  axis.className = "chart-axis";
  [1, 0.75, 0.5, 0.25, 0].forEach((ratio) => {
    const label = document.createElement("span");
    label.textContent = `${Math.round(axisMaximum * ratio)} min`;
    axis.append(label);
  });
  chart.append(axis);

  buckets.forEach((bucket) => {
    const column = document.createElement("div");
    column.className = "chart-column";

    const bar = document.createElement("div");
    bar.className = `chart-bar${bucket.minutes <= 0 ? " is-muted" : ""}`;
    bar.style.height = `${Math.max(0, Math.min(100, bucket.minutes / axisMaximum * 100))}%`;
    bar.title = `${Math.round(bucket.minutes)} min · ${bucket.sessionCount} séance${bucket.sessionCount > 1 ? "s" : ""}`;

    const label = document.createElement("span");
    label.className = "chart-day";
    label.textContent = bucket.label;

    column.append(bar, label);
    chart.append(column);
  });

  const totalMinutes = Math.round(values.reduce((sum, value) => sum + value, 0));
  chart.setAttribute(
    "aria-label",
    `Durée des entraînements enregistrés sur ${PERIODS[period].label}, ${totalMinutes} minutes au total.`
  );
}

function updateSelectedPeriod(period) {
  document.querySelectorAll("[data-period]").forEach((button) => {
    const selected = Number(button.dataset.period) === period;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function render(period = activePeriod) {
  const config = PERIODS[period] || PERIODS[7];
  activePeriod = config.days;
  const bounds = periodBounds(config.days);
  const current = aggregateSessions(sessionsBetween(bounds.start, bounds.end));
  const previous = aggregateSessions(sessionsBetween(bounds.previousStart, bounds.previousEnd));

  updateSelectedPeriod(activePeriod);
  renderChart(activePeriod);
  renderCards(activePeriod, current, previous);
  if (dataLabel) dataLabel.textContent = "Données enregistrées";
}

async function refreshDashboard() {
  try {
    [sessionsCache, profileCache] = await Promise.all([getAllSessions(), getProfile()]);
    render(activePeriod);
  } catch (error) {
    console.error("Home dashboard loading failed", error);
    if (dataLabel) dataLabel.textContent = "Données indisponibles";
  }
}

if (periodTabs) {
  periodTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-period]");
    if (!button || !periodTabs.contains(button)) return;

    const period = Number(button.dataset.period);
    if (!PERIODS[period]) return;

    // Le tableau fictif historique de app.js utilise encore les mêmes boutons.
    // On intercepte l'événement ici afin que seules les données IndexedDB soient affichées.
    event.stopPropagation();
    render(period);
  }, true);
}

navHome?.addEventListener("click", () => {
  window.setTimeout(() => void refreshDashboard(), 0);
});

window.addEventListener("pageshow", () => void refreshDashboard());
window.addEventListener("herakles:sessions-changed", () => void refreshDashboard());

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshDashboard();
});

void refreshDashboard();
