const bypassButtons = new WeakSet();
let activePreparation = null;

function isCardioChoice(button) {
  const typeLabel = [...button.querySelectorAll(".choice-details small")]
    .map((item) => item.textContent?.trim() || "")
    .find((text) => text.startsWith("Cardio"));

  return Boolean(typeLabel);
}

function closePreparation({ restoreList = true } = {}) {
  if (!activePreparation) return;

  const {
    panel,
    exerciseList,
    freeButton,
    flowTitle,
    flowIntro,
    previousTitle,
    previousIntro,
    previousListHidden,
    previousFreeHidden
  } = activePreparation;

  panel.remove();

  if (restoreList) {
    exerciseList.hidden = previousListHidden;
    freeButton.hidden = previousFreeHidden;
    flowTitle.textContent = previousTitle;
    flowIntro.textContent = previousIntro;
  }

  activePreparation = null;
}

function showPreparation(button) {
  closePreparation();

  const exerciseList = document.querySelector("#exercise-list");
  const freeButton = document.querySelector("#free-exercise-button");
  const flowTitle = document.querySelector("#exercise-flow-title");
  const flowIntro = document.querySelector("#exercise-flow-intro");
  const exerciseName = button.querySelector(".choice-details strong")?.textContent?.trim() || "Cardio";

  if (!exerciseList || !freeButton || !flowTitle || !flowIntro) return;

  const panel = document.createElement("section");
  panel.id = "cardio-start-ready";
  panel.className = "session-set-card";
  panel.setAttribute("aria-labelledby", "cardio-start-ready-title");

  const heading = document.createElement("strong");
  heading.id = "cardio-start-ready-title";
  heading.textContent = "Prêt à démarrer";

  const message = document.createElement("p");
  message.className = "flow-message";
  message.textContent = "Le chronomètre de l’exercice démarrera uniquement lorsque tu appuieras sur le bouton ci-dessous.";

  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.className = "button button-primary";
  startButton.textContent = "Démarrer l’exercice";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "button button-secondary";
  cancelButton.textContent = "Retour aux exercices";

  const previousTitle = flowTitle.textContent;
  const previousIntro = flowIntro.textContent;
  const previousListHidden = exerciseList.hidden;
  const previousFreeHidden = freeButton.hidden;

  activePreparation = {
    panel,
    exerciseList,
    freeButton,
    flowTitle,
    flowIntro,
    previousTitle,
    previousIntro,
    previousListHidden,
    previousFreeHidden
  };

  flowTitle.textContent = exerciseName;
  flowIntro.textContent = "Aucune donnée n’est demandée avant le départ.";
  exerciseList.hidden = true;
  freeButton.hidden = true;

  startButton.addEventListener("click", () => {
    closePreparation({ restoreList: false });
    bypassButtons.add(button);
    button.click();
  });

  cancelButton.addEventListener("click", () => closePreparation());

  panel.append(heading, message, startButton, cancelButton);
  exerciseList.insertAdjacentElement("afterend", panel);
  startButton.focus();
}

document.addEventListener("click", (event) => {
  const backButton = event.target.closest("#back-home-button");
  if (backButton && activePreparation) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closePreparation();
    return;
  }

  if (activePreparation && event.target.closest("[data-nav]")) {
    closePreparation();
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
