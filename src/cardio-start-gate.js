const bypassButtons = new WeakSet();
let activePreparation = null;

function isCardioChoice(button) {
  const typeLabel = [...button.querySelectorAll(".choice-details small")]
    .map((item) => item.textContent?.trim() || "")
    .find((text) => text.startsWith("Cardio"));

  return Boolean(typeLabel);
}

function formatElapsed(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60
  ].map((value) => String(value).padStart(2, "0")).join(":");
}

function getActiveSessionStartedAt() {
  try {
    const session = JSON.parse(localStorage.getItem("herakles.activeSession.v1"));
    return session?.started_at || null;
  } catch (error) {
    console.warn("Active session could not be read before cardio start", error);
    return null;
  }
}

function showExerciseList() {
  const flow = document.querySelector("#exercise-flow");
  const sessionPanel = document.querySelector("#session-panel");
  const backButton = document.querySelector("#back-home-button");

  if (sessionPanel) sessionPanel.hidden = true;
  if (flow) flow.hidden = false;
  if (backButton) backButton.hidden = false;
  window.scrollTo(0, 0);
}

function clearPreparation({ restoreList = false } = {}) {
  if (!activePreparation) return;

  const { button } = activePreparation;
  activePreparation = null;

  if (restoreList) {
    showExerciseList();
    button.focus();
  }
}

function showPreparation(button) {
  clearPreparation();

  const home = document.querySelector("#home-screen");
  const flow = document.querySelector("#exercise-flow");
  const sessionPanel = document.querySelector("#session-panel");
  const exerciseRecap = document.querySelector("#exercise-recap");
  const restTimer = document.querySelector("#rest-timer");
  const systemPanel = document.querySelector("#system-panel");
  const sessionRecap = document.querySelector("#session-recap");
  const backButton = document.querySelector("#back-home-button");
  const navHome = document.querySelector('[data-nav="home"]');
  const navSettings = document.querySelector('[data-nav="settings"]');
  const sessionTitle = document.querySelector("#session-exercise-title");
  const sessionElapsed = document.querySelector("#session-elapsed");
  const sessionProgress = document.querySelector("#session-progress");
  const sessionSets = document.querySelector("#session-sets");
  const sessionFeedback = document.querySelector("#session-feedback");
  const exerciseName = button.querySelector(".choice-details strong")?.textContent?.trim() || "Cardio";

  if (!flow || !sessionPanel || !sessionTitle || !sessionElapsed || !sessionProgress || !sessionSets) return;

  activePreparation = { button };

  if (home) home.hidden = true;
  flow.hidden = true;
  sessionPanel.hidden = false;
  if (exerciseRecap) exerciseRecap.hidden = true;
  if (restTimer) restTimer.hidden = true;
  if (systemPanel) systemPanel.hidden = true;
  if (sessionRecap) sessionRecap.hidden = true;
  if (backButton) backButton.hidden = false;

  navHome?.classList.remove("is-current");
  navSettings?.classList.remove("is-current");
  navHome?.removeAttribute("aria-current");
  navSettings?.removeAttribute("aria-current");

  sessionTitle.textContent = exerciseName;
  sessionProgress.textContent = "Prêt à démarrer";
  if (sessionFeedback) sessionFeedback.textContent = "";

  const sessionStartedAt = getActiveSessionStartedAt();
  sessionElapsed.textContent = sessionStartedAt
    ? formatElapsed(Date.now() - new Date(sessionStartedAt).getTime())
    : "00:00:00";

  sessionSets.replaceChildren();

  const liveCard = document.createElement("div");
  liveCard.className = "cardio-live-card";

  const liveLabel = document.createElement("span");
  liveLabel.className = "cardio-live-label";
  liveLabel.textContent = "Durée de l’exercice";

  const liveTime = document.createElement("strong");
  liveTime.id = "cardio-exercise-elapsed";
  liveTime.className = "cardio-live-time";
  liveTime.textContent = "00:00:00";

  const liveHint = document.createElement("small");
  liveHint.textContent = "Le chrono démarre uniquement lorsque tu lances l’exercice.";

  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.className = "button button-primary cardio-finish-button";
  startButton.textContent = "Démarrer l’exercice";

  startButton.addEventListener("click", () => {
    activePreparation = null;
    bypassButtons.add(button);
    button.click();
  });

  liveCard.append(liveLabel, liveTime, liveHint);
  sessionSets.append(liveCard, startButton);
  window.scrollTo(0, 0);
  startButton.focus();
}

document.addEventListener("click", (event) => {
  const backButton = event.target.closest("#back-home-button");
  if (backButton && activePreparation) {
    event.preventDefault();
    event.stopImmediatePropagation();
    clearPreparation({ restoreList: true });
    return;
  }

  if (activePreparation && event.target.closest("[data-nav]")) {
    clearPreparation();
    return;
  }

  const button = event.target.closest("#exercise-list .exercise-choice");
  if (!button || !isCardioChoice(button)) return;

  if (bypassButtons.has(button)) {
    bypassButtons.delete(button);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  showPreparation(button);
}, true);
