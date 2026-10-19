import { CATEGORIES, EXERCISES } from "./exercises.js";
import { getAllSessions } from "./storage.js";
import {
  cloneWorkoutData, createScheduledWorkout, deleteWorkoutPlan,
  listFavorites, listScheduled, newWorkoutId, saveWorkoutPlan
} from "./workout-plans.js";

const element = (tag, className = "", value = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value) node.textContent = value;
  return node;
};
const button = (label, action, secondary = false) => {
  const node = element("button", secondary ? "button button-secondary" : "button button-primary", label);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
};
function localInputDate(value) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function nameFor(item) { return item.exercise?.name || "Exercice"; }

export function initWorkoutPlanner({ showScreen, onStart, getActiveSession }) {
  const screen = element("section", "workout-planner");
  screen.id = "workout-planner";
  screen.hidden = true;
  screen.innerHTML = '<header class="flow-heading"><p class="section-kicker">Planification</p><h1 id="workout-planner-title">Programmer une séance</h1></header><div id="workout-planner-content" class="workout-planner-content"></div><p id="workout-planner-feedback" class="flow-message" role="status"></p>';
  document.querySelector("#exercise-flow").insertAdjacentElement("beforebegin", screen);
  const title = screen.querySelector("#workout-planner-title");
  const content = screen.querySelector("#workout-planner-content");
  const feedback = screen.querySelector("#workout-planner-feedback");
  const homeStart = document.querySelector("#start-workout-button");
  const openButton = button("Programmer une séance", () => { void open(); }, true);
  openButton.id = "plan-workout-button";
  openButton.classList.add("hero-plan");
  homeStart.insertAdjacentElement("afterend", openButton);
  let editing = null;
  let selected = null;

  function errorMessage(message) { feedback.textContent = message || ""; }

  async function open() {
    showScreen("planner");
    await renderList();
  }

  async function renderList() {
    title.textContent = "Programmer une séance";
    content.replaceChildren();
    errorMessage("");
    content.append(button("+ Créer une nouvelle séance", () => startEdit({
      name: "", scheduled_at: localInputDate(), items: []
    })));
    const scheduled = await listScheduled();
    const upcoming = element("section", "workout-library-group");
    upcoming.append(element("h2", "", "Mes séances programmées"));
    if (!scheduled.length) upcoming.append(element("p", "workout-muted", "Aucune séance programmée."));
    for (const plan of scheduled) {
      const row = element("div", "workout-library-card");
      const label = element("div");
      label.append(element("strong", "", plan.name || "Séance"), element("small", "", plan.scheduled_at
        ? new Date(plan.scheduled_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
        : "Date non définie"));
      row.append(label, button("Ouvrir", () => showDetail(plan), true));
      upcoming.append(row);
    }
    content.append(upcoming);

    const favorites = await listFavorites();
    const group = element("section", "workout-library-group");
    group.append(element("h2", "", "Mes séances favorites"));
    if (!favorites.length) group.append(element("p", "workout-muted", "Ajoute un cœur à une séance dans le calendrier pour la retrouver ici."));
    for (const plan of favorites) {
      const row = element("div", "workout-library-card");
      const label = element("div");
      label.append(element("strong", "", plan.name || "Séance favorite"),
        element("small", "", `${plan.items?.length || 0} exercice(s)`));
      const actions = element("div", "workout-favorite-actions");
      actions.append(button("Reprogrammer", () => startEdit({
        name: plan.name, scheduled_at: localInputDate(), items: cloneWorkoutData(plan.items || [])
      }), true));
      actions.append(button("Renommer", async () => {
        const name = window.prompt("Nom de la séance favorite :", plan.name || "");
        if (name === null || !name.trim()) return;
        try {
          await saveWorkoutPlan({ ...plan, name: name.trim().slice(0, 100) });
          await renderList();
        } catch (error) {
          console.error(error);
          errorMessage("Impossible de renommer ce favori.");
        }
      }, true));
      actions.append(button("Retirer", async () => {
        if (!window.confirm("Retirer cette séance des favoris ? L'historique reste conservé.")) return;
        try { await deleteWorkoutPlan(plan.id); await renderList(); }
        catch (error) { console.error(error); errorMessage("Impossible de retirer ce favori."); }
      }, true));
      row.append(label, actions);
      group.append(row);
    }
    content.append(group);
  }

  function startEdit(plan) {
    editing = cloneWorkoutData(plan);
    selected = null;
    renderEditor();
  }

  function plannedInputs(item, holder) {
    const planned = item.planned || (item.planned = {});
    if (item.exercise.type === "cardio") {
      holder.append(element("small", "workout-muted", "La distance et la durée réelles seront enregistrées à l'entraînement."));
      return;
    }
    const metrics = [
      ["Séries", "sets", 1, 1], ["Répétitions", "reps", 1, 1],
      ["Charge (kg)", "nominal_load_kg", 0, 0.5], ["Repos (sec)", "rest_seconds", 0, 15]
    ];
    const grid = element("div", "workout-parameters");
    for (const [label, key, min, step] of metrics) {
      const field = element("label");
      field.append(element("span", "", label));
      const input = element("input");
      input.type = "number"; input.min = String(min); input.step = String(step);
      input.inputMode = "decimal";
      input.value = String(planned[key] ?? (key === "sets" ? 4 : key === "reps" ? 10 : key === "rest_seconds" ? 120 : 0));
      input.addEventListener("change", () => {
        const val = Number(input.value);
        if (input.value !== "" && Number.isFinite(val) && val >= min) {
          planned[key] = key === "sets" || key === "reps" ? Math.floor(val) : val;
        }
      });
      field.append(input); grid.append(field);
    }
    holder.append(grid);
  }

  function renderEditor() {
    title.textContent = "Composer la séance";
    content.replaceChildren();
    errorMessage("");
    content.append(button("← Mes séances", () => { void renderList(); }, true));
    const form = element("form", "workout-edit-form");
    const nameField = element("label");
    nameField.textContent = "Nom de la séance";
    const nameInput = element("input");
    nameInput.type = "text"; nameInput.maxLength = 100;
    nameInput.placeholder = "Ex. Dos / Biceps"; nameInput.value = editing.name || "";
    nameField.append(nameInput);
    const dateField = element("label");
    dateField.textContent = "Date et heure prévues";
    const dateInput = element("input");
    dateInput.type = "datetime-local"; dateInput.required = true;
    dateInput.value = localInputDate(editing.scheduled_at);
    dateField.append(dateInput);
    form.append(nameField, dateField, element("h2", "", "Exercices prévus"));
    const itemsHolder = element("div", "workout-edit-items");
    function refreshItems() {
      itemsHolder.replaceChildren();
      if (!editing.items.length) itemsHolder.append(element("p", "workout-muted", "Ajoute au moins un exercice."));
      editing.items.forEach((item, index) => {
        const card = element("article", "workout-edit-item");
        const heading = element("div", "workout-item-heading");
        heading.append(element("strong", "", nameFor(item)), button("Retirer", () => {
          editing.items.splice(index, 1); refreshItems();
        }, true));
        card.append(heading);
        plannedInputs(item, card);
        const order = element("div", "workout-order-buttons");
        if (index > 0) order.append(button("↑ Monter", () => {
          [editing.items[index - 1], editing.items[index]] = [editing.items[index], editing.items[index - 1]];
          refreshItems();
        }, true));
        if (index < editing.items.length - 1) order.append(button("↓ Descendre", () => {
          [editing.items[index + 1], editing.items[index]] = [editing.items[index], editing.items[index + 1]];
          refreshItems();
        }, true));
        card.append(order); itemsHolder.append(card);
      });
    }
    form.append(itemsHolder);
    refreshItems();

    const picker = element("section", "workout-picker");
    picker.append(element("h2", "", "Ajouter un exercice"));
    const selector = element("select");
    selector.append(new Option("Toutes les catégories", ""));
    for (const category of CATEGORIES) selector.append(new Option(category.name, category.id));
    selector.setAttribute("aria-label", "Filtrer par catégorie");
    const search = element("input");
    search.type = "search"; search.placeholder = "Rechercher un exercice"; search.setAttribute("aria-label", "Rechercher un exercice");
    const results = element("div", "workout-picker-results");
    const renderResults = () => {
      results.replaceChildren();
      const query = search.value.trim().toLocaleLowerCase("fr-FR");
      EXERCISES.filter((ex) => (!selector.value || ex.categories.includes(selector.value)) &&
        ex.name.toLocaleLowerCase("fr-FR").includes(query)).forEach((ex) => {
        const node = button("+ " + ex.name, async () => {
          const sessions = await getAllSessions();
          const previous = sessions.filter((session) => session.started_at)
            .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))
            .flatMap((session) => (session.exercises || []).filter((row) => row.id === ex.id));
          const last = previous[0];
          const first = last?.sets?.[0];
          const planned = ex.type === "cardio" ? {} : {
            sets: last?.sets?.length || last?.planned?.sets || 4,
            reps: first?.reps || last?.planned?.reps || 10,
            nominal_load_kg: first?.nominal_load_kg ?? first?.load_kg ?? last?.planned?.nominal_load_kg ?? 0,
            rest_seconds: last?.planned?.rest_seconds ?? 120
          };
          editing.items.push({ uid: newWorkoutId(), exercise: {
            id: ex.id, name: ex.name, type: ex.type, resistance: ex.resistance,
            primary_muscles: ex.primary
          }, planned });
          refreshItems();
        }, true);
        results.append(node);
      });
      if (!results.children.length) results.append(element("p", "workout-muted", "Aucun exercice trouvé."));
    };
    selector.addEventListener("change", renderResults);
    search.addEventListener("input", renderResults);
    picker.append(selector, search, results);
    renderResults();
    form.append(picker);
    const submit = element("button", "button button-primary", "Enregistrer la programmation");
    submit.type = "submit";
    form.append(submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!editing.items.length) { errorMessage("Ajoute au moins un exercice."); return; }
      if (!dateInput.value || !Number.isFinite(new Date(dateInput.value).getTime())) {
        errorMessage("Choisis une date et une heure valides."); return;
      }
      for (const item of editing.items) {
        if (item.exercise.type !== "cardio" &&
          (!Number.isInteger(Number(item.planned?.sets)) || Number(item.planned.sets) < 1 ||
           !Number.isInteger(Number(item.planned?.reps)) || Number(item.planned.reps) < 1 ||
           Number(item.planned.nominal_load_kg) < 0 || Number(item.planned.rest_seconds) < 0)) {
          errorMessage("Vérifie les paramètres de musculation."); return;
        }
      }
      submit.disabled = true;
      try {
        const input = { ...editing, name: nameInput.value.trim().slice(0, 100) || "Séance",
          scheduled_at: new Date(dateInput.value).toISOString() };
        let plan;
        if (editing.kind === "scheduled" && editing.id) {
          plan = { ...input, updated_at: new Date().toISOString() };
          await saveWorkoutPlan(plan);
        } else {
          plan = await createScheduledWorkout(input);
        }
        editing = null;
        await showDetail(plan);
      } catch (error) {
        console.error("Workout plan save failed", error);
        errorMessage("Impossible d'enregistrer la séance programmée.");
      } finally { submit.disabled = false; }
    });
    content.append(form);
  }

  async function showDetail(plan) {
    title.textContent = plan.name || "Séance programmée";
    content.replaceChildren();
    errorMessage("");
    content.append(button("← Mes séances", () => { void renderList(); }, true));
    const when = element("p", "workout-muted", new Date(plan.scheduled_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" }));
    content.append(when);
    for (const [i, item] of (plan.items || []).entries()) {
      const card = element("div", "workout-plan-item");
      card.append(element("strong", "", `${i + 1}. ${nameFor(item)}`));
      if (item.exercise.type === "strength") {
        const p = item.planned || {};
        card.append(element("small", "", `${p.sets} séries · ${p.reps} rép. · ${p.nominal_load_kg} kg · ${p.rest_seconds} sec repos`));
      } else card.append(element("small", "", "Cardio"));
      content.append(card);
    }
    content.append(button("Démarrer la séance", () => {
      if (getActiveSession()) {
        errorMessage("Une autre séance est en cours. Termine-la avant de démarrer celle-ci.");
        return;
      }
      onStart(plan);
    }));
    content.append(button("Modifier cette programmation", () => startEdit(plan), true));
    content.append(button("Supprimer cette programmation", async () => {
      if (!window.confirm("Supprimer cette séance programmée ?")) return;
      try { await deleteWorkoutPlan(plan.id); await renderList(); }
      catch (error) { console.error(error); errorMessage("Suppression impossible."); }
    }, true));
  }

  return { open, showDetail, renderList, screen };
}
