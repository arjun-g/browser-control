// IndexedDB wrapper for command history storage
let db;

const DB_NAME = "browser-control";
const DB_VERSION = 1;
const STORE_NAME = "commands";
const SESSION_STORE = "sessions";

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create sessions store
      if (!database.objectStoreNames.contains(SESSION_STORE)) {
        database.createObjectStore(SESSION_STORE, { keyPath: "id" });
      }

      // Create commands store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("sessionId", "sessionId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

async function createSession() {
  if (!db) await initDB();
  const session = {
    id: Date.now(),
    startTime: new Date().toISOString(),
    commandCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([SESSION_STORE], "readwrite");
    const store = tx.objectStore(SESSION_STORE);
    const request = store.add(session);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(session);
  });
}

async function addCommand(sessionId, action, params, result, status = "success") {
  if (!db) await initDB();
  const command = {
    sessionId,
    action,
    params,
    result,
    status,
    timestamp: Date.now(),
    iso: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(command);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      command.id = request.result;
      resolve(command);
    };
  });
}

async function updateCommand(id, updates) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const command = getRequest.result;
      Object.assign(command, updates);
      const updateRequest = store.put(command);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => resolve(command);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function getCommandsBySession(sessionId) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("sessionId");
    const range = IDBKeyRange.only(sessionId);
    const request = index.getAll(range);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllSessions() {
  if (!db) await initDB();
  const sessions = await new Promise((resolve, reject) => {
    const tx = db.transaction([SESSION_STORE], "readonly");
    const store = tx.objectStore(SESSION_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const sessions = request.result.sort((a, b) => b.id - a.id);
      resolve(sessions);
    };
  });

  // Enrich each session with actual command count and first/last command timestamps
  // so we never rely on the stale commandCount field in the sessions store
  const countTx = db.transaction([STORE_NAME], "readonly");
  const countStore = countTx.objectStore(STORE_NAME);
  const countIndex = countStore.index("sessionId");

  await Promise.all(
    sessions.map(
      (session) =>
        new Promise((resolve) => {
          const range = IDBKeyRange.only(session.id);
          const countReq = countIndex.count(range);
          countReq.onsuccess = () => {
            session.commandCount = countReq.result;
          };
          countReq.onerror = () => {};

          // Fetch all commands for this session to get first/last timestamps
          const allReq = countIndex.getAll(range);
          allReq.onsuccess = () => {
            const cmds = allReq.result;
            if (cmds.length > 0) {
              const timestamps = cmds.map((c) => c.timestamp).filter(Boolean);
              session.firstCommandAt = Math.min(...timestamps);
              session.lastCommandAt = Math.max(...timestamps);
            } else {
              session.firstCommandAt = null;
              session.lastCommandAt = null;
            }
            resolve();
          };
          allReq.onerror = () => resolve();
        })
    )
  );

  return sessions;
}

async function deleteSession(sessionId) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME, SESSION_STORE], "readwrite");

    // Delete commands
    const commandStore = tx.objectStore(STORE_NAME);
    const index = commandStore.index("sessionId");
    const range = IDBKeyRange.only(sessionId);
    const deleteRequest = index.openCursor(range);

    deleteRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Delete session
    tx.oncomplete = () => {
      const sessionStore = tx.objectStore(SESSION_STORE);
      const sessionDeleteRequest = sessionStore.delete(sessionId);
      sessionDeleteRequest.onerror = () => reject(sessionDeleteRequest.error);
      sessionDeleteRequest.onsuccess = () => resolve();
    };

    tx.onerror = () => reject(tx.error);
  });
}

// Initialize on load
initDB().catch(console.error);
