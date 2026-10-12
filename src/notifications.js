const NOTIFICATION_TITLE = "Herakles · Repos terminé";
const NOTIFICATION_BODY = "La prochaine série peut commencer.";

function notificationsSupported() {
  return "Notification" in window && "serviceWorker" in navigator;
}

function getPermissionLabel() {
  if (!notificationsSupported()) {
    return "Notifications non prises en charge par ce navigateur.";
  }

  if (Notification.permission === "granted") {
    return "Notifications activées. Android pourra signaler la fin du repos lorsque la PWA reste active en arrière-plan.";
  }

  if (Notification.permission === "denied") {
    return "Notifications bloquées. Réactive-les dans les réglages du site ou de l’application.";
  }

  return "Active les notifications pour recevoir une alerte de fin de repos en arrière-plan.";
}

export function initNotificationControls() {
  const status = document.querySelector("#notification-status");
  const button = document.querySelector("#notification-button");

  if (!status || !button) {
    return;
  }

  function render() {
    status.textContent = getPermissionLabel();

    if (!notificationsSupported()) {
      button.disabled = true;
      button.textContent = "Non disponible";
      return;
    }

    if (Notification.permission === "granted") {
      button.disabled = true;
      button.textContent = "Notifications activées";
      return;
    }

    if (Notification.permission === "denied") {
      button.disabled = true;
      button.textContent = "Notifications bloquées";
      return;
    }

    button.disabled = false;
    button.textContent = "Activer les notifications";
  }

  button.addEventListener("click", async () => {
    if (!notificationsSupported() || Notification.permission !== "default") {
      render();
      return;
    }

    button.disabled = true;
    button.textContent = "Autorisation…";

    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error("Notification permission request failed", error);
    }

    render();
  });

  render();
}

export async function notifyRestFinished() {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(NOTIFICATION_TITLE, {
      body: NOTIFICATION_BODY,
      tag: "herakles-rest-finished",
      renotify: true,
      silent: false,
      vibrate: [250, 100, 250, 100, 400],
      data: {
        url: registration.scope
      }
    });

    return true;
  } catch (error) {
    console.error("Rest notification failed", error);
    return false;
  }
}
