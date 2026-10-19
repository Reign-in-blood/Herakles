import { deleteSession, saveSession } from "./storage.js";
import { listFavorites, toggleFavorite } from "./workout-plans.js";

function button(label, className) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = className;
  el.textContent = label;
  return el;
}

function field(label, value, type = "number", min = "0", step = "1") {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const input = document.createElement("input");
  input.type = type;
  input.value = value ?? "";
  input.required = true;
  if (type === "number") {
    input.min = min;
    input.step = step;
  } else {
    input.step = "1";
  }
  wrapper.append(input);
  return { wrapper, input };
}

function localDateTime(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}

function shift(value, delta) {
  if (!value) return value;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time + delta).toISOString() : value;
}

function editor(session, onChanged, onClose) {
  const form = document.createElement("form");
  form.className = "agenda-session-editor";
  const title = document.createElement("strong");
  title.textContent = "Modifier la séance";
  form.append(title);
  const sessionName = field("Nom de la séance", session.name || "", "text");
  sessionName.input.required = false;
  sessionName.input.maxLength = 100;
  form.append(sessionName.wrapper);

  const originalStart = Date.parse(session.started_at);
  const originalEnd = Date.parse(session.ended_at || "") || originalStart + Number(session.duration_seconds || 0) * 1000;
  const dates = document.createElement("div");
  dates.className = "agenda-edit-fields";
  const start = field("Début", localDateTime(originalStart), "datetime-local");
  const end = field("Fin", localDateTime(originalEnd), "datetime-local");
  dates.append(start.wrapper, end.wrapper);
  form.append(dates);

  const values = [];
  for (const [exerciseIndex, ex] of (session.exercises || []).entries()) {
    const group = document.createElement("div");
    group.className = "agenda-edit-exercise";
    const heading = document.createElement("strong");
    heading.textContent = ex.name || "Exercice";
    group.append(heading);
    if (ex.type === "strength") {
      for (const [setIndex, set] of (ex.sets || []).entries()) {
        const row = document.createElement("div");
        row.className = "agenda-edit-fields";
        const loadKey = Object.prototype.hasOwnProperty.call(set, "nominal_load_kg") ? "nominal_load_kg" : "load_kg";
        const reps = field("Série " + (setIndex + 1) + " · répétitions", set.reps);
        const load = field("Charge (kg)", set[loadKey] ?? 0, "number", "0", "0.5");
        row.append(reps.wrapper, load.wrapper);
        group.append(row);
        values.push({ exerciseIndex, setIndex, loadKey, reps: reps.input, load: load.input });
      }
    } else if (ex.type === "cardio" && session.schema_version === 2) {
      const row = document.createElement("div");
      row.className = "agenda-edit-fields";
      const distance = field("Distance (km)", ex.cardio?.distance_km ?? 0, "number", "0.01", "0.01");
      row.append(distance.wrapper);
      const incline = ex.id === "tapis-course" || ex.cardio?.incline_percent != null
        ? field("Inclinaison (%)", ex.cardio?.incline_percent ?? "", "number", "0", "0.5") : null;
      if (incline) {
        incline.input.required = false;
        row.append(incline.wrapper);
      }
      values.push({ exerciseIndex, distance: distance.input, incline: incline?.input || null });
      group.append(row);
    }
    form.append(group);
  }

  const feedback = document.createElement("p");
  feedback.className = "flow-message";
  feedback.setAttribute("role", "status");
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "button button-primary";
  save.textContent = "Enregistrer les modifications";
  const cancel = button("Annuler", "button button-secondary");
  cancel.addEventListener("click", onClose);
  form.append(feedback, save, cancel);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const startDate = new Date(start.input.value);
    const endDate = new Date(end.input.value);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
      feedback.textContent = "L’heure de fin doit être après le début.";
      return;
    }
    const delta = startDate.getTime() - originalStart;
    const next = JSON.parse(JSON.stringify(session));
    next.name = sessionName.input.value.trim().slice(0, 100);
    next.started_at = startDate.toISOString();
    next.ended_at = endDate.toISOString();
    next.duration_seconds = Math.floor((endDate - startDate) / 1000);

    for (const ex of next.exercises || []) {
      if (ex.started_at) ex.started_at = shift(ex.started_at, delta);
      if (ex.ended_at) ex.ended_at = shift(ex.ended_at, delta);
      if (ex.ended_at && Date.parse(ex.ended_at) > endDate.getTime()) {
        feedback.textContent = "La fin de séance doit inclure les exercices réalisés.";
        return;
      }
      for (const set of ex.sets || []) {
        if (set.completed_at) set.completed_at = shift(set.completed_at, delta);
      }
    }
    for (const value of values) {
      const ex = next.exercises[value.exerciseIndex];
      if (value.setIndex !== undefined) {
        const set = ex.sets[value.setIndex];
        set.reps = Number(value.reps.value);
        set[value.loadKey] = Number(value.load.value);
      } else {
        const duration = Number(ex.duration_seconds) || (Date.parse(ex.ended_at) - Date.parse(ex.started_at)) / 1000;
        if (!(duration > 0)) {
          feedback.textContent = "Durée du cardio invalide.";
          return;
        }
        const distance = Number(value.distance.value);
        ex.cardio = {
          distance_km: distance,
          average_speed_kmh: Math.round(distance * 360000 / duration) / 100,
          incline_percent: value.incline && value.incline.value !== "" ? Number(value.incline.value) : null
        };
        ex.cardio_completed = true;
      }
    }

    let reps = 0;
    let volume = 0;
    let calories = 0;
    for (const ex of next.exercises || []) {
      const totalReps = (ex.sets || []).reduce((sum, set) => sum + Number(set.reps || 0), 0);
      const totalVolume = (ex.sets || []).reduce(
        (sum, set) => sum + Number(set.reps || 0) * Number(set.nominal_load_kg ?? set.load_kg ?? 0), 0);
      reps += totalReps;
      volume += totalVolume;
      calories += Number(ex.estimated_calories_kcal || 0);
      if ("total_reps" in ex) ex.total_reps = totalReps;
      if ("volume_kg" in ex) ex.volume_kg = totalVolume;
      if ("exercise_volume_kg" in ex) ex.exercise_volume_kg = totalVolume;
    }
    if (next.schema_version === 2 || next.summary) {
      next.summary = { ...next.summary, exercise_count: next.exercises.length,
        total_reps: reps, volume_kg: volume, estimated_calories_kcal: calories };
    }
    if ("session_volume_kg" in next) next.session_volume_kg = volume;

    try {
      save.disabled = true;
      cancel.disabled = true;
      feedback.textContent = "Enregistrement…";
      await saveSession(next);
      await onChanged(next.started_at);
    } catch (error) {
      console.error("Failed to edit session", error);
      feedback.textContent = "Impossible d’enregistrer la séance.";
      save.disabled = false;
      cancel.disabled = false;
    }
  });
  return form;
}

export function appendAgendaSessionActions(entry, session, onChanged) {
  const actions = document.createElement("div");
  actions.className = "agenda-session-actions";
  const favorite = button("♡ Favoris", "button button-secondary agenda-favorite-button");
  favorite.setAttribute("aria-label", "Ajouter cette séance aux favoris");
  favorite.setAttribute("aria-pressed", "false");
  const favoriteId = `favorite-${session.id}`;
  void listFavorites().then((favorites) => {
    if (!favorite.isConnected) return;
    const isFavorite = favorites.some((item) => item.id === favoriteId);
    favorite.textContent = isFavorite ? "♥ Favori" : "♡ Favoris";
    favorite.setAttribute("aria-label", isFavorite ? "Retirer cette séance des favoris" : "Ajouter cette séance aux favoris");
    favorite.setAttribute("aria-pressed", String(isFavorite));
    favorite.classList.toggle("is-favorite", isFavorite);
  }).catch((error) => console.warn("Favorites unavailable", error));
  favorite.addEventListener("click", async () => {
    favorite.disabled = true;
    try {
      const isFavorite = await toggleFavorite(session);
      favorite.textContent = isFavorite ? "♥ Favori" : "♡ Favoris";
      favorite.classList.toggle("is-favorite", isFavorite);
      favorite.setAttribute("aria-pressed", String(isFavorite));
      favorite.setAttribute("aria-label", isFavorite ? "Retirer cette séance des favoris" : "Ajouter cette séance aux favoris");
    } catch (error) {
      console.error("Favorite action failed", error);
      window.alert("Impossible de modifier les favoris.");
    } finally {
      favorite.disabled = false;
    }
  });
  const modify = button("Modifier la séance", "button button-secondary");
  const remove = button("Supprimer la séance", "button agenda-button-danger");
  modify.addEventListener("click", () => {
    const existing = entry.querySelector(".agenda-session-editor");
    if (existing) {
      existing.remove();
      modify.textContent = "Modifier la séance";
      return;
    }
    const form = editor(session, onChanged, () => {
      form.remove();
      modify.textContent = "Modifier la séance";
    });
    entry.append(form);
    modify.textContent = "Fermer la modification";
  });
  remove.addEventListener("click", async () => {
    const date = new Date(session.started_at).toLocaleDateString("fr-FR");
    if (!window.confirm("Supprimer définitivement la séance du " + date + " ? Cette action est irréversible.")) return;
    try {
      remove.disabled = true;
      modify.disabled = true;
      await deleteSession(session.id);
      await onChanged(session.started_at);
    } catch (error) {
      console.error("Failed to delete session", error);
      remove.disabled = false;
      modify.disabled = false;
      window.alert("Impossible de supprimer la séance.");
    }
  });
  actions.append(favorite, modify, remove);
  entry.append(actions);
}
