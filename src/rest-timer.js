import { notifyRestFinished } from "./notifications.js";

const STORAGE_KEY = "herakles.restTimer.v1";
const DEFAULT_SECONDS = 120;
const MIN_SECONDS = 30;
const MAX_SECONDS = 15 * 60;
const TICK_RATE_MS = 250;

let audioContext = null;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createDefaultState() {
  return {
    version: 1,
    status: "idle",
    targetSeconds: DEFAULT_SECONDS,
    startedAt: null,
    endAt: null,
    alarmTriggered: false,
    lastActualSeconds: null
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!stored || stored.version !== 1) {
      return createDefaultState();
    }

    const state = {
      ...createDefaultState(),
      ...stored,
      targetSeconds: clamp(Number(stored.targetSeconds) || DEFAULT_SECONDS, MIN_SECONDS, MAX_SECONDS)
    };

    if (state.status === "running" && (!state.startedAt || !state.endAt)) {
      return createDefaultState();
    }

    return state;
  } catch (error) {
    console.warn("Rest timer state could not be restored", error);
    return createDefaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function prepareAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

function playAlarm() {
  if (!audioContext) {
    return;
  }

  const startAt = audioContext.currentTime;

  [0, 0.28].forEach((offset) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, startAt + offset);
    gain.gain.setValueAtTime(0.0001, startAt + offset);
    gain.gain.exponentialRampToValueAtTime(0.18, startAt + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.18);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt + offset);
    oscillator.stop(startAt + offset + 0.2);
  });
}

function triggerAlarm() {
  if ("vibrate" in navigator) {
    navigator.vibrate([220, 100, 220]);
  }

  if (audioContext?.state === "suspended") {
    audioContext.resume().then(playAlarm).catch(() => {});
  } else {
    playAlarm();
  }

  void notifyRestFinished();
}

export function initRestTimer({ onFinish } = {}) {
  const timerRoot = document.querySelector("#rest-timer");

  if (!timerRoot) {
    return;
  }

  const timerDisplay = timerRoot.querySelector("#timer-display");
  const timerState = timerRoot.querySelector("#timer-state");
  const timerAction = timerRoot.querySelector("#timer-action");
  const timerMinus = timerRoot.querySelector("#timer-minus");
  const timerPlus = timerRoot.querySelector("#timer-plus");
  const timerReset = timerRoot.querySelector("#timer-reset");
  const targetDisplay = timerRoot.querySelector("#rest-target");
  const actualDisplay = timerRoot.querySelector("#rest-actual");
  const ringProgress = timerRoot.querySelector("#timer-ring-progress");
  const presetButtons = [...timerRoot.querySelectorAll("[data-rest-seconds]")];

  const ringRadius = Number(ringProgress.getAttribute("r"));
  const ringCircumference = 2 * Math.PI * ringRadius;
  ringProgress.style.strokeDasharray = `${ringCircumference}`;

  let wakeLock = null;
  let state = loadState();

  async function acquireWakeLock() {
    if (state.status !== "running" || state.alarmTriggered || document.visibilityState !== "visible" || wakeLock || !("wakeLock" in navigator)) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (state.status !== "running" || state.alarmTriggered || document.visibilityState !== "visible") {
        await lock.release();
        return;
      }
      wakeLock = lock;
      lock.addEventListener("release", () => {
        if (wakeLock === lock) wakeLock = null;
      });
    } catch (error) {
      console.warn("Screen wake lock unavailable", error);
    }
  }

  function releaseWakeLock() {
    const lock = wakeLock;
    wakeLock = null;
    if (lock) void lock.release().catch(() => {});
  }
  let lastRenderedSecond = null;
  let lastRenderedMode = null;

  function getTiming(now = Date.now()) {
    if (state.status !== "running") {
      return {
        remainingSeconds: state.targetSeconds,
        elapsedSeconds: state.lastActualSeconds,
        overtimeSeconds: 0,
        isOvertime: false
      };
    }

    const remainingMs = state.endAt - now;
    const elapsedSeconds = Math.max(0, Math.floor((now - state.startedAt) / 1000));

    return {
      remainingSeconds: Math.max(0, Math.ceil(remainingMs / 1000)),
      elapsedSeconds,
      overtimeSeconds: Math.max(0, Math.floor(Math.abs(remainingMs) / 1000)),
      isOvertime: remainingMs <= 0
    };
  }

  function updatePresetButtons() {
    presetButtons.forEach((button) => {
      const presetSeconds = Number(button.dataset.restSeconds);
      const selected = state.targetSeconds === presetSeconds;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = state.status === "running";
    });
  }

  function render(force = false) {
    const timing = getTiming();
    const mode = state.status === "running"
      ? (timing.isOvertime ? "overtime" : "running")
      : "idle";
    const displaySecond = mode === "overtime" ? timing.overtimeSeconds : timing.remainingSeconds;

    if (force || displaySecond !== lastRenderedSecond || mode !== lastRenderedMode) {
      timerDisplay.textContent = mode === "overtime"
        ? `+${formatDuration(timing.overtimeSeconds)}`
        : formatDuration(timing.remainingSeconds);

      timerRoot.dataset.timerState = mode;
      timerState.textContent = mode === "running"
        ? "Récupération en cours"
        : mode === "overtime"
          ? "Temps cible dépassé"
          : "Prêt pour la prochaine série";

      targetDisplay.textContent = formatDuration(state.targetSeconds);
      actualDisplay.textContent = timing.elapsedSeconds == null
        ? "—"
        : formatDuration(timing.elapsedSeconds);

      timerAction.textContent = state.status === "running"
        ? "Terminer le repos"
        : "Démarrer";

      const progress = state.status === "running" && !timing.isOvertime
        ? clamp(timing.remainingSeconds / state.targetSeconds, 0, 1)
        : state.status === "running"
          ? 0
          : 1;
      ringProgress.style.strokeDashoffset = `${ringCircumference * (1 - progress)}`;

      document.title = state.status === "running"
        ? `${timerDisplay.textContent} · Herakles`
        : "Herakles";

      updatePresetButtons();
      lastRenderedSecond = displaySecond;
      lastRenderedMode = mode;
    }

    if (state.status === "running" && timing.isOvertime && !state.alarmTriggered) {
      state.alarmTriggered = true;
      saveState(state);
      releaseWakeLock();
      triggerAlarm();
    }
  }

  function startTimer() {
    prepareAudio();

    const now = Date.now();
    state.status = "running";
    state.startedAt = now;
    state.endAt = now + (state.targetSeconds * 1000);
    state.alarmTriggered = false;
    state.lastActualSeconds = null;
    saveState(state);
    void acquireWakeLock();
    render(true);
  }

  function stopTimer() {
    if (state.status !== "running") {
      startTimer();
      return;
    }

    releaseWakeLock();
    state.lastActualSeconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    state.status = "idle";
    state.startedAt = null;
    state.endAt = null;
    state.alarmTriggered = false;
    saveState(state);
    render(true);
    if (typeof onFinish === "function") onFinish(state.lastActualSeconds);
  }

  function changeTarget(deltaSeconds) {
    const nextTarget = clamp(state.targetSeconds + deltaSeconds, MIN_SECONDS, MAX_SECONDS);
    const appliedDelta = nextTarget - state.targetSeconds;

    if (!appliedDelta) {
      return;
    }

    state.targetSeconds = nextTarget;

    if (state.status === "running") {
      state.endAt += appliedDelta * 1000;
      state.alarmTriggered = false;
    }

    saveState(state);
    render(true);
  }

  function resetTimer() {
    releaseWakeLock();
    state = createDefaultState();
    saveState(state);
    render(true);
  }

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.status === "running") {
        return;
      }

      state.targetSeconds = Number(button.dataset.restSeconds);
      state.lastActualSeconds = null;
      saveState(state);
      render(true);
    });
  });

  timerAction.addEventListener("click", stopTimer);
  timerMinus.addEventListener("click", () => changeTarget(-30));
  timerPlus.addEventListener("click", () => changeTarget(30));
  timerReset.addEventListener("click", resetTimer);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      render(true);
      void acquireWakeLock();
    } else {
      releaseWakeLock();
    }
  });

  window.addEventListener("pageshow", () => {
    render(true);
    void acquireWakeLock();
  });

  render(true);
  void acquireWakeLock();
  window.setInterval(render, TICK_RATE_MS);
  return {
    start(seconds) {
      releaseWakeLock();
      state = createDefaultState();
      state.targetSeconds = clamp(Number(seconds) || DEFAULT_SECONDS, MIN_SECONDS, MAX_SECONDS);
      startTimer();
    },
    finish() {
      if (state.status === "running") stopTimer();
      else if (typeof onFinish === "function") onFinish(state.lastActualSeconds);
    }
  };
}
