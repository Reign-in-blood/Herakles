import { countSessions, openDatabase } from "./storage.js";
import { initNotificationControls } from "./notifications.js";
import { initRestTimer } from "./rest-timer.js";

const storageStatus = document.querySelector("#storage-status");
const sessionCount = document.querySelector("#session-count");
const networkStatus = document.querySelector("#network-status");
const installButton = document.querySelector("#install-button");
const updateDialog = document.querySelector("#update-dialog");
const postponeUpdateButton = document.querySelector("#postpone-update-button");
const applyUpdateButton = document.querySelector("#apply-update-button");
const updateStatus = document.querySelector("#update-status");

let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;
let waitingServiceWorker = null;
let reloadingForUpdate = false;
let postponedWorker = null;
let previousFocus = null;

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

function closeUpdateDialog() {
  updateDialog.hidden = true;
  document.body.classList.remove("update-dialog-open");
  previousFocus?.focus?.();
}

function showAvailableUpdate(worker) {
  waitingServiceWorker = worker;
  if (postponedWorker === worker || !updateDialog.hidden) return;
  previousFocus = document.activeElement;
  updateStatus.textContent = "";
  applyUpdateButton.disabled = false;
  applyUpdateButton.textContent = "Installer";
  updateDialog.hidden = false;
  document.body.classList.add("update-dialog-open");
  postponeUpdateButton.focus();
}

function watchInstallingWorker(worker) {
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      showAvailableUpdate(worker);
    }
  });
}

async function checkForUpdate() {
  if (!serviceWorkerRegistration || !navigator.onLine) return;
  if (serviceWorkerRegistration.waiting) {
    showAvailableUpdate(serviceWorkerRegistration.waiting);
    return;
  }
  try {
    await serviceWorkerRegistration.update();
    if (serviceWorkerRegistration.waiting) showAvailableUpdate(serviceWorkerRegistration.waiting);
  } catch (error) {
    console.warn("Service worker update check failed", error);
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
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

    await checkForUpdate();
  } catch (error) {
    console.error("Service worker registration failed", error);

  }
}

postponeUpdateButton.addEventListener("click", () => {
  postponedWorker = waitingServiceWorker || serviceWorkerRegistration?.waiting;
  closeUpdateDialog();
});

updateDialog.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    postponeUpdateButton.click();
  }
  if (event.key === "Tab") {
    const buttons = [postponeUpdateButton, applyUpdateButton];
    const current = buttons.indexOf(document.activeElement);
    if (event.shiftKey && current === 0) {
      event.preventDefault();
      applyUpdateButton.focus();
    } else if (!event.shiftKey && current === 1) {
      event.preventDefault();
      postponeUpdateButton.focus();
    }
  }
});

applyUpdateButton.addEventListener("click", () => {
  const worker = waitingServiceWorker || serviceWorkerRegistration?.waiting;

  if (!worker) {
    closeUpdateDialog();
    return;
  }

  applyUpdateButton.disabled = true;
  applyUpdateButton.textContent = "Installation…";
  postponeUpdateButton.disabled = true;
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

initNotificationControls();
initRestTimer();
updateNetworkStatus();
void registerServiceWorker();
void initStorage();
