import { countSessions, openDatabase } from "./storage.js";

const storageStatus = document.querySelector("#storage-status");
const sessionCount = document.querySelector("#session-count");
const networkStatus = document.querySelector("#network-status");
const installButton = document.querySelector("#install-button");
const checkUpdateButton = document.querySelector("#check-update-button");
const applyUpdateButton = document.querySelector("#apply-update-button");
const updateStatus = document.querySelector("#update-status");

let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;
let waitingServiceWorker = null;
let reloadingForUpdate = false;

async function initStorage() {
  try {
    const db = await openDatabase();
    db.close();

    const count = await countSessions();
    storageStatus.textContent = "IndexedDB prêt";
    sessionCount.textContent = `${count} séance${count === 1 ? "" : "s"} enregistrée${count === 1 ? "" : "s"}`;
  } catch (error) {
    console.error("IndexedDB initialization failed", error);
    storageStatus.textContent = "Stockage indisponible";
    sessionCount.textContent = "Vérifier les permissions du navigateur";
  }
}

function updateNetworkStatus() {
  networkStatus.textContent = navigator.onLine ? "En ligne" : "Hors ligne";
}

function showAvailableUpdate(worker) {
  waitingServiceWorker = worker;
  updateStatus.textContent = "Une nouvelle version de Herakles est prête à être installée.";
  applyUpdateButton.hidden = false;
}

function watchInstallingWorker(worker) {
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      showAvailableUpdate(worker);
    }
  });
}

async function checkForUpdate({ manual = false } = {}) {
  if (!serviceWorkerRegistration) {
    if (manual) {
      updateStatus.textContent = "Le service worker n’est pas encore prêt.";
    }
    return;
  }

  if (!navigator.onLine) {
    updateStatus.textContent = "Impossible de rechercher une mise à jour hors ligne.";
    return;
  }

  if (waitingServiceWorker || serviceWorkerRegistration.waiting) {
    showAvailableUpdate(waitingServiceWorker || serviceWorkerRegistration.waiting);
    return;
  }

  if (manual) {
    checkUpdateButton.disabled = true;
    checkUpdateButton.textContent = "Recherche…";
    updateStatus.textContent = "Recherche d’une nouvelle version…";
  }

  try {
    await serviceWorkerRegistration.update();

    if (serviceWorkerRegistration.waiting) {
      showAvailableUpdate(serviceWorkerRegistration.waiting);
    } else if (manual) {
      updateStatus.textContent = "Herakles est à jour.";
    }
  } catch (error) {
    console.error("Service worker update check failed", error);
    updateStatus.textContent = "La recherche de mise à jour a échoué.";
  } finally {
    if (manual) {
      checkUpdateButton.disabled = false;
      checkUpdateButton.textContent = "Rechercher une mise à jour";
    }
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    updateStatus.textContent = "Les service workers ne sont pas pris en charge par ce navigateur.";
    checkUpdateButton.disabled = true;
    return;
  }

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js");

    if (serviceWorkerRegistration.waiting) {
      showAvailableUpdate(serviceWorkerRegistration.waiting);
    }

    if (serviceWorkerRegistration.installing) {
      watchInstallingWorker(serviceWorkerRegistration.installing);
    }

    serviceWorkerRegistration.addEventListener("updatefound", () => {
      if (serviceWorkerRegistration.installing) {
        watchInstallingWorker(serviceWorkerRegistration.installing);
      }
    });

    if (!serviceWorkerRegistration.waiting) {
      updateStatus.textContent = "Herakles est à jour.";
    }

    await checkForUpdate();
  } catch (error) {
    console.error("Service worker registration failed", error);
    updateStatus.textContent = "Impossible d’activer le mode PWA.";
  }
}

checkUpdateButton.addEventListener("click", () => {
  void checkForUpdate({ manual: true });
});

applyUpdateButton.addEventListener("click", () => {
  const worker = waitingServiceWorker || serviceWorkerRegistration?.waiting;

  if (!worker) {
    updateStatus.textContent = "Aucune mise à jour n’est prête à être installée.";
    applyUpdateButton.hidden = true;
    return;
  }

  applyUpdateButton.disabled = true;
  applyUpdateButton.textContent = "Installation…";
  updateStatus.textContent = "Installation de la nouvelle version…";
  worker.postMessage({ type: "SKIP_WAITING" });
});

navigator.serviceWorker?.addEventListener("controllerchange", () => {
  if (reloadingForUpdate) {
    return;
  }

  reloadingForUpdate = true;
  window.location.reload();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("online", () => {
  updateNetworkStatus();
  void checkForUpdate();
});

window.addEventListener("offline", updateNetworkStatus);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void checkForUpdate();
  }
});

updateNetworkStatus();
void registerServiceWorker();
void initStorage();
