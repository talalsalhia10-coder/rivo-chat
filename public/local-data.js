(() => {
  "use strict";

  const DB_NAME = "rivo_group_local_v25";
  const DB_VERSION = 1;
  const STORE = "messages";
  const PUBLIC_TTL = 24 * 60 * 60 * 1000;
  const PRIVATE_TTL = 7 * 24 * 60 * 60 * 1000;
  const MAX_PUBLIC = 200;
  const MAX_PRIVATE_PER_THREAD = 300;
  const HARD_LIMIT_BYTES = 25 * 1024 * 1024;
  const TARGET_BYTES = 15 * 1024 * 1024;

  function scopeFor(profile) {
    const stable = profile?.googleUid || profile?.googleSub || profile?.clientId || "guest";
    const room = String(profile?.roomId || "lobby").slice(0, 40);
    return `${String(stable).slice(0, 140)}|room:${room}`;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.createObjectStore(STORE, { keyPath: "pk" });
        store.createIndex("scopeKindCreated", ["scope", "kind", "createdAt"], { unique: false });
        store.createIndex("scopeThreadCreated", ["scope", "threadId", "createdAt"], { unique: false });
        store.createIndex("scopeCreated", ["scope", "createdAt"], { unique: false });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local database"));
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
    });
  }

  function estimatedBytes(value) {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return 1024;
    }
  }

  function publicRecord(profile, message) {
    const scope = scopeFor(profile);
    const id = String(message?.id || crypto.randomUUID());
    return {
      pk: `${scope}|public|${id}`,
      scope,
      kind: "public",
      threadId: "public",
      id,
      createdAt: Number(message?.createdAt || Date.now()),
      approxBytes: estimatedBytes(message),
      data: message
    };
  }

  function privateRecord(profile, message) {
    const scope = scopeFor(profile);
    const ownId = String(profile?.clientId || "");
    const threadId = String(message?.senderId === ownId ? message?.recipientId : message?.senderId || "");
    const id = String(message?.id || crypto.randomUUID());
    return {
      pk: `${scope}|private|${threadId}|${id}`,
      scope,
      kind: "private",
      threadId,
      id,
      createdAt: Number(message?.createdAt || Date.now()),
      approxBytes: estimatedBytes(message),
      data: message
    };
  }

  async function put(record) {
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    await transactionDone(tx);
    db.close();
  }

  async function getByIndex(indexName, range) {
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const result = await requestToPromise(tx.objectStore(STORE).index(indexName).getAll(range));
    await transactionDone(tx);
    db.close();
    return result || [];
  }

  async function deleteKeys(keys) {
    if (!keys.length) return;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    keys.forEach((key) => store.delete(key));
    await transactionDone(tx);
    db.close();
  }

  function mergeUnique(messages) {
    const map = new Map();
    for (const item of messages || []) {
      if (!item?.id) continue;
      map.set(String(item.id), item);
    }
    return [...map.values()].sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
  }

  async function cleanup(profile) {
    const scope = scopeFor(profile);
    const records = await getByIndex(
      "scopeCreated",
      IDBKeyRange.bound([scope, 0], [scope, Number.MAX_SAFE_INTEGER])
    );

    const now = Date.now();
    const remove = new Set();
    const publicRecords = [];
    const privateByThread = new Map();

    for (const record of records) {
      const ttl = record.kind === "private" ? PRIVATE_TTL : PUBLIC_TTL;
      if (!Number.isFinite(record.createdAt) || record.createdAt < now - ttl) {
        remove.add(record.pk);
        continue;
      }

      if (record.kind === "public") {
        publicRecords.push(record);
      } else if (record.kind === "private") {
        const thread = privateByThread.get(record.threadId) || [];
        thread.push(record);
        privateByThread.set(record.threadId, thread);
      }
    }

    publicRecords.sort((a, b) => b.createdAt - a.createdAt);
    publicRecords.slice(MAX_PUBLIC).forEach((record) => remove.add(record.pk));

    for (const thread of privateByThread.values()) {
      thread.sort((a, b) => b.createdAt - a.createdAt);
      thread.slice(MAX_PRIVATE_PER_THREAD).forEach((record) => remove.add(record.pk));
    }

    const kept = records
      .filter((record) => !remove.has(record.pk))
      .sort((a, b) => a.createdAt - b.createdAt);
    let total = kept.reduce((sum, record) => sum + Number(record.approxBytes || 0), 0);

    if (total > HARD_LIMIT_BYTES) {
      for (const record of kept) {
        if (total <= TARGET_BYTES) break;
        remove.add(record.pk);
        total -= Number(record.approxBytes || 0);
      }
    }

    await deleteKeys([...remove]);
    return { removed: remove.size, bytes: Math.max(0, total) };
  }

  async function loadPublic(profile) {
    await cleanup(profile);
    const scope = scopeFor(profile);
    const rows = await getByIndex(
      "scopeKindCreated",
      IDBKeyRange.bound([scope, "public", 0], [scope, "public", Number.MAX_SAFE_INTEGER])
    );
    return mergeUnique(rows.map((row) => row.data)).slice(-MAX_PUBLIC);
  }

  async function loadPrivate(profile, userId) {
    await cleanup(profile);
    const scope = scopeFor(profile);
    const threadId = String(userId || "");
    const rows = await getByIndex(
      "scopeThreadCreated",
      IDBKeyRange.bound([scope, threadId, 0], [scope, threadId, Number.MAX_SAFE_INTEGER])
    );
    return mergeUnique(rows.map((row) => row.data)).slice(-MAX_PRIVATE_PER_THREAD);
  }

  async function savePublic(profile, message) {
    if (!profile || !message?.id) return;
    await put(publicRecord(profile, message));
  }

  async function savePrivate(profile, message) {
    if (!profile || !message?.id) return;
    const record = privateRecord(profile, message);
    if (!record.threadId) return;
    await put(record);
  }

  async function requestPersistentStorage() {
    try {
      if (!navigator.storage?.persist) return false;
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }

  async function clearConversationData(profile) {
    const scope = scopeFor(profile);
    const rows = await getByIndex(
      "scopeCreated",
      IDBKeyRange.bound([scope, 0], [scope, Number.MAX_SAFE_INTEGER])
    );
    await deleteKeys(rows.map((row) => row.pk));
  }

  window.RivoLocalData = {
    PUBLIC_TTL,
    PRIVATE_TTL,
    MAX_PUBLIC,
    MAX_PRIVATE_PER_THREAD,
    HARD_LIMIT_BYTES,
    TARGET_BYTES,
    cleanup,
    loadPublic,
    loadPrivate,
    savePublic,
    savePrivate,
    requestPersistentStorage,
    clearConversationData
  };
})();
