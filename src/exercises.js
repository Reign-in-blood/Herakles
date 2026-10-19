import "./cardio-start-gate.js";

export const CATEGORIES = [
  { id: "dos", name: "Dos", symbol: "Δ" },
  { id: "jambes", name: "Jambes", symbol: "Λ" },
  { id: "bras", name: "Bras", symbol: "Ω" },
  { id: "pectoraux", name: "Pectoraux", symbol: "Π" },
  { id: "haut", name: "Haut du corps", symbol: "Α" },
  { id: "bas", name: "Bas du corps", symbol: "Σ" },
  { id: "cardio", name: "Cardio", symbol: "ϟ" },
  { id: "libre", name: "Libre", symbol: "+" }
];

export const EXERCISES = [
  { id: "tapis-course", name: "Tapis de course", categories: ["cardio","jambes","bas"], primary: ["Jambes","Système cardiovasculaire"], secondary: ["Fessiers"], type: "cardio", resistance: "machine", supportsIncline: true },
  { id: "rameur", name: "Rameur", categories: ["cardio","dos","jambes","haut","bas"], primary: ["Dos","Jambes","Système cardiovasculaire"], secondary: ["Biceps","Fessiers"], type: "cardio", resistance: "machine" },
  { id: "velo", name: "Vélo", categories: ["cardio","jambes","bas"], primary: ["Jambes","Système cardiovasculaire"], secondary: ["Fessiers","Mollets"], type: "cardio", resistance: "machine" },
  { id: "velo-elliptique", name: "Vélo elliptique", categories: ["cardio","jambes","bas","haut"], primary: ["Jambes","Système cardiovasculaire"], secondary: ["Fessiers","Bras"], type: "cardio", resistance: "machine" },
  { id: "leg-curl", name: "Leg curl", categories: ["jambes","bas"], primary: ["Ischio-jambiers"], secondary: ["Mollets"], type: "strength", resistance: "machine" },
  { id: "triceps-poulie", name: "Triceps à la poulie", categories: ["bras","haut"], primary: ["Triceps"], secondary: [], type: "strength", resistance: "cable" },
  { id: "developpe-couche", name: "Développé couché", categories: ["pectoraux","haut","bras"], primary: ["Pectoraux"], secondary: ["Triceps","Deltoïdes antérieurs"], type: "strength", resistance: "free_weight" },
  { id: "dips", name: "Dips", categories: ["pectoraux","bras","haut"], primary: ["Triceps","Pectoraux"], secondary: ["Deltoïdes antérieurs"], type: "strength", resistance: "bodyweight" },
  { id: "tractions", name: "Tractions", categories: ["dos","bras","haut"], primary: ["Grand dorsal"], secondary: ["Biceps","Trapèzes"], type: "strength", resistance: "bodyweight", image: "./assets/exercises/Traction.png" },
  { id: "rowing", name: "Rowing barre", categories: ["dos","haut"], primary: ["Grand dorsal","Rhomboïdes"], secondary: ["Biceps","Trapèzes"], type: "strength", resistance: "free_weight" }
];

export const RESISTANCE_LABELS = {
  machine: "Machine",
  cable: "Poulie",
  free_weight: "Poids libres",
  bodyweight: "Poids du corps"
};
