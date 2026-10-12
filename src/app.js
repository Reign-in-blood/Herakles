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


function initHome() {
  const home = document.querySelector("#home-screen");
  const timer = document.querySelector("#rest-timer");
  const system = document.querySelector("#system-panel");
  const back = document.querySelector("#back-home-button");
  const navHome = document.querySelector('[data-nav="home"]');
  const navSettings = document.querySelector('[data-nav="settings"]');
  const date = document.querySelector("#today-date");
  const time = document.querySelector("#today-time");
  const chart = document.querySelector("#activity-chart");
  const chartData = {
    7: { labels: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"], values: [58,102,36,53,69,18,47] },
    30: { labels: ["S1","S2","S3","S4"], values: [78,98,67,105] },
    84: { labels: ["S1","S2","S3","S4","S5","S6"], values: [45,76,88,60,101,94] }
  };
  function drawChart(period) {
    const data = chartData[period];
    chart.replaceChildren();
    const axis = document.createElement("div");
    axis.className = "chart-axis";
    ["120 min","90 min","60 min","30 min","0"].forEach(label => {
      const el = document.createElement("span"); el.textContent = label; axis.append(el);
    });
    chart.append(axis);
    data.values.forEach((value,i) => {
      const column = document.createElement("div"); column.className = "chart-column";
      const bar = document.createElement("div"); bar.className = "chart-bar" + (i === 2 || i === data.values.length-1 ? " is-muted" : "");
      bar.style.height = `${value / 120 * 100}%`;
      const label = document.createElement("span"); label.className = "chart-day"; label.textContent = data.labels[i];
      column.append(bar,label); chart.append(column);
    });
  }
  document.querySelectorAll("[data-period]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-period]").forEach(item => {
      const active = item === button; item.classList.toggle("is-active",active); item.setAttribute("aria-pressed",String(active));
    });
    drawChart(Number(button.dataset.period));
  }));
  function showScreen(screen) {
    home.hidden = screen !== "home";
    timer.hidden = screen !== "timer";
    system.hidden = screen !== "settings";
    back.hidden = screen === "home";
    navHome.classList.toggle("is-current",screen === "home");
    navSettings.classList.toggle("is-current",screen === "settings");
    if (screen === "home") navHome.setAttribute("aria-current","page"); else navHome.removeAttribute("aria-current");
    if (screen === "settings") navSettings.setAttribute("aria-current","page"); else navSettings.removeAttribute("aria-current");
    window.scrollTo(0,0);
  }
  document.querySelector("#start-workout-button").addEventListener("click", () => showScreen("timer"));
  back.addEventListener("click", () => showScreen("home"));
  navHome.addEventListener("click", () => showScreen("home"));
  navSettings.addEventListener("click", () => showScreen("settings"));
  document.querySelectorAll("[data-placeholder-nav]").forEach(button => button.addEventListener("click", () => {
    window.alert(`${button.dataset.placeholderNav} : cette rubrique sera disponible prochainement.`);
  }));
  function updateClock() {
    const now = new Date();
    date.textContent = new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"long",year:"numeric"}).format(now);
    time.textContent = new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(now);
  }
  updateClock();
  window.setInterval(updateClock,30000);
  drawChart(7);
  showScreen("home");
}

initHome();
initNotificationControls();
initRestTimer();
updateNetworkStatus();
void registerServiceWorker();
void initStorage();
