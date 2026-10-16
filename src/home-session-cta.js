const ACTIVE_SESSION_KEY = "herakles.activeSession.v1";

const homeScreen = document.querySelector("#home-screen");
const startWorkoutButton = document.querySelector("#start-workout-button");

function hasActiveSession() {
  try {
    const session = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY));
    return Boolean(
      session?.started_at &&
      (Array.isArray(session.exercises) || session.exercise)
    );
  } catch (error) {
    console.warn("Active session could not be read for home CTA", error);
    return false;
  }
}

function updateHomeSessionCta() {
  if (!startWorkoutButton) return;

  const sessionActive = hasActiveSession();
  const label = sessionActive ? "Reprendre la séance" : "Commencer";
  const icon = startWorkoutButton.querySelector('[aria-hidden="true"]');

  if (icon) {
    startWorkoutButton.replaceChildren(icon, document.createTextNode(` ${label}`));
  } else {
    startWorkoutButton.textContent = label;
  }

  startWorkoutButton.setAttribute("aria-label", label);
  startWorkoutButton.classList.toggle("is-session-active", sessionActive);
}

updateHomeSessionCta();

if (homeScreen) {
  const homeObserver = new MutationObserver(() => {
    if (!homeScreen.hidden) updateHomeSessionCta();
  });

  homeObserver.observe(homeScreen, {
    attributes: true,
    attributeFilter: ["hidden"]
  });
}

window.addEventListener("pageshow", updateHomeSessionCta);
window.addEventListener("storage", (event) => {
  if (event.key === ACTIVE_SESSION_KEY) updateHomeSessionCta();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") updateHomeSessionCta();
});
