// Modèles indépendants : une modification de l'historique ne modifie jamais un favori.
import { getWorkoutPlans, saveWorkoutPlan, deleteWorkoutPlan } from "./storage.js";

export const cloneWorkoutData = (value) => JSON.parse(JSON.stringify(value));
export const newWorkoutId = () => crypto.randomUUID?.() || `workout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function exerciseFromHistory(exercise) {
  const first = exercise.sets?.find((set) => set.completed_at) || exercise.sets?.[0];
  const planned = exercise.type === "cardio"
    ? { ...(exercise.planned || {}) }
    : {
        nominal_load_kg: Number(first?.nominal_load_kg ?? first?.load_kg ?? exercise.planned?.nominal_load_kg ?? 0),
        sets: Math.max(1, Number(exercise.sets?.length || exercise.planned?.sets || 4)),
        reps: Math.max(1, Number(first?.reps || exercise.planned?.reps || 10)),
        rest_seconds: Math.max(0, Number(exercise.planned?.rest_seconds ?? 120))
      };
  return {
    uid: newWorkoutId(),
    exercise: {
      id: exercise.id,
      name: exercise.name,
      type: exercise.type,
      resistance: exercise.resistance,
      primary_muscles: exercise.primary_muscles || exercise.primary || []
    },
    planned
  };
}

export async function toggleFavorite(session) {
  const id = `favorite-${session.id}`;
  const existing = (await getWorkoutPlans()).find((plan) => plan.id === id);
  if (existing) {
    await deleteWorkoutPlan(id);
    return false;
  }
  await saveWorkoutPlan({
    schema_version: 1,
    id,
    kind: "favorite",
    source_session_id: session.id,
    name: (session.name || (session.theme_id ? `Séance ${session.theme_id}` : "Séance favorite")).trim(),
    items: (session.exercises || []).map(exerciseFromHistory),
    created_at: new Date().toISOString()
  });
  return true;
}

export async function listFavorites() {
  return (await getWorkoutPlans()).filter((plan) => plan.kind === "favorite");
}

export async function listScheduled() {
  return (await getWorkoutPlans()).filter((plan) => plan.kind === "scheduled")
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
}

export async function createScheduledWorkout(input) {
  const record = {
    schema_version: 1,
    id: newWorkoutId(),
    kind: "scheduled",
    name: String(input.name || "Séance programmée").trim().slice(0, 100),
    scheduled_at: input.scheduled_at,
    items: cloneWorkoutData(input.items || []).map((item) => ({ ...item, uid: newWorkoutId() })),
    created_at: new Date().toISOString()
  };
  await saveWorkoutPlan(record);
  return record;
}

export { deleteWorkoutPlan, saveWorkoutPlan };
