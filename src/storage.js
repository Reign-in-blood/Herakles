const DB_NAME = "herakles";
const DB_VERSION = 2;
const PROFILE_ID = "local-user";

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("sessions")) {
        const sessions = db.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("started_at", "started_at", { unique: false });
      }

      if (!db.objectStoreNames.contains("profile")) {
        db.createObjectStore("profile", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("measurements")) {
        const measurements = db.createObjectStore("measurements", { keyPath: "id" });
        measurements.createIndex("measured_at", "measured_at", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runRequest(storeName, mode, action) {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    let request;

    try {
      request = action(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error);
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      const error = transaction.error;
      db.close();
      reject(error);
    };
    transaction.onabort = () => {
      const error = transaction.error || new Error("Transaction annulée");
      db.close();
      reject(error);
    };
  }));
}

export async function countSessions() {
  return runRequest("sessions", "readonly", (store) => store.count());
}

export async function saveSession(session) {
  await runRequest("sessions", "readwrite", (store) => store.put(session));
  return session;
}

export async function getAllSessions() {
  return runRequest("sessions", "readonly", (store) => store.getAll());
}

export async function getProfile() {
  const profile = await runRequest("profile", "readonly", (store) => store.get(PROFILE_ID));
  return profile || null;
}

export async function saveProfile(profile) {
  const record = {
    ...profile,
    id: PROFILE_ID,
    schema_version: 1,
    updated_at: new Date().toISOString()
  };
  await runRequest("profile", "readwrite", (store) => store.put(record));
  return record;
}

export async function saveMeasurement(measurement) {
  const measuredAt = measurement.measured_at || new Date().toISOString();
  const day = measuredAt.slice(0, 10);
  const record = {
    ...measurement,
    id: measurement.id || `weight-${day}`,
    schema_version: 1,
    measured_at: measuredAt,
    weight_kg: Number(measurement.weight_kg)
  };
  await runRequest("measurements", "readwrite", (store) => store.put(record));
  return record;
}

export async function getAllMeasurements() {
  const rows = await runRequest("measurements", "readonly", (store) => store.getAll());
  return rows.sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
}

export async function getAllSettings() {
  return runRequest("settings", "readonly", (store) => store.getAll());
}

export async function saveSetting(key, value) {
  const record = { key, value, updated_at: new Date().toISOString() };
  await runRequest("settings", "readwrite", (store) => store.put(record));
  return record;
}

export async function exportAllData() {
  const [profile, measurements, sessions, settings] = await Promise.all([
    getProfile(),
    getAllMeasurements(),
    getAllSessions(),
    getAllSettings()
  ]);

  return {
    schema_version: 1,
    app: "Herakles",
    exported_at: new Date().toISOString(),
    profile,
    measurements,
    sessions,
    settings
  };
}

export async function importBackup(backup) {
  if (!backup || backup.app !== "Herakles" || backup.schema_version !== 1) {
    throw new Error("Sauvegarde Herakles non reconnue");
  }

  const db = await openDatabase();
  const stores = ["profile", "measurements", "sessions", "settings"];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, "readwrite");

    if (backup.profile) {
      transaction.objectStore("profile").put({ ...backup.profile, id: PROFILE_ID });
    }

    for (const item of Array.isArray(backup.measurements) ? backup.measurements : []) {
      transaction.objectStore("measurements").put(item);
    }

    for (const item of Array.isArray(backup.sessions) ? backup.sessions : []) {
      transaction.objectStore("sessions").put(item);
    }

    for (const item of Array.isArray(backup.settings) ? backup.settings : []) {
      transaction.objectStore("settings").put(item);
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };
    transaction.onerror = () => {
      const error = transaction.error;
      db.close();
      reject(error);
    };
    transaction.onabort = () => {
      const error = transaction.error || new Error("Import annulé");
      db.close();
      reject(error);
    };
  });
}
