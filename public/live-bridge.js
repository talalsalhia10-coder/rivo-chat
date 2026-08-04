(() => {
  "use strict";

  if (new URLSearchParams(location.search).has("demo")) return;

  const LIVE_IDENTITY_KEY = "rivo_live_identity_v158";
  const LEGACY_IDENTITY_KEY = "rivo_live_identity_v156";
  const PERSIST_IDENTITY_KEY = "rivo_live_identity_persistent_v1";
  const ACTIVE_ROOM_KEY = "rivo_live_active_room_v1";
  const MESSAGE_SNAPSHOT_KEY = "rivo_live_message_snapshots_v1";
  const ROOM_CUTOFFS_KEY = "rivo_live_room_cutoffs_v1";
  const BADGE_TOKEN_KEY = "rivo_badge_session_token_v1";
  const PROFILE_KEY = "rivo_live_profile_v158";
  const LEGACY_PROFILE_KEY = "rivo_live_profile_v156";
  const DEVICE_KEY = "rivo_guest_device_v1";
  const OWNER_STORAGE_KEY = "rivo_staff_identity_owner_v1";
  const MOD_STORAGE_KEY = "rivo_staff_identity_moderator_v1";
  const CROWN_ONLY_NAME = "__rivo_crown_only__";
  const ADMIN_MESSAGE_STORE_PREFIX = "rivo_admin_direct_messages_v2";
  const ADMIN_MESSAGE_TTL = 7 * 24 * 60 * 60 * 1000;

  const ROOM_ICONS = {
    lobby: "🌐", general: "🌐", iraq: "🇮🇶", syria: "🇸🇾", jordan: "🇯🇴",
    saudi: "🇸🇦", kuwait: "🇰🇼", oman: "🇴🇲", dubai: "🇦🇪", lebanon: "🇱🇧",
    turkey: "🇹🇷", expats: "🌍", "artists-poets": "✒️", poets: "✒️"
  };

  const AVATAR_ID_BY_SOURCE = {
    "assets/entry-avatars/rivo-avatar-young-man-purple.jpg": "entry1",
    "assets/entry-avatars/rivo-avatar-young-woman-purple.jpg": "entry2",
    "assets/entry-avatars/rivo-avatar-man-blue-hoodie.jpg": "entry3",
    "assets/entry-avatars/rivo-avatar-young-man-light.jpg": "entry4",
    "assets/entry-avatars/rivo-avatar-woman-denim.jpg": "entry5",
    "assets/entry-avatars/rivo-avatar-woman-purple-hoodie.jpg": "entry6"
  };

  const BADGES = {
    star: { id: "star", name: "نجمة ذهبية", icon: "⭐" },
    galaxy: { id: "galaxy", name: "نجمة مضيئة", icon: "🌟" },
    crystal: { id: "crystal", name: "بريق جميل", icon: "✨" },
    blossom: { id: "blossom", name: "زهرة جميلة", icon: "🌸" },
    butterfly: { id: "butterfly", name: "فراشة ملونة", icon: "🦋" },
    heart: { id: "heart", name: "قلب مميز", icon: "💖" },
    flame: { id: "flame", name: "شعلة حماس", icon: "🔥" },
    medal: { id: "medal", name: "وسام تقدير", icon: "🏅" },
    diamond: { id: "diamond", name: "جوهرة زرقاء", icon: "💎" },
    ruby: { id: "ruby", name: "ياقوتة", icon: "♦️" },
    emerald: { id: "emerald", name: "زمردة", icon: "💚" },
    rose: { id: "rose", name: "وردة", icon: "🌹" },
    moon: { id: "moon", name: "قمر", icon: "🌙" },
    pinkHeart: { id: "pinkHeart", name: "قلب وردي", icon: "💗" },
    wings: { id: "wings", name: "أجنحة", icon: "🪽" }
  };

  const FREE_BADGE_MAP = {
    free_star: "star",
    free_shining_star: "galaxy",
    free_sparkles: "crystal",
    free_flower: "blossom",
    free_butterfly: "butterfly",
    free_heart: "heart",
    free_fire: "flame",
    free_medal: "medal",
    free_diamond: "diamond",
    free_ruby: "ruby",
    free_emerald: "emerald",
    free_rose: "rose",
    free_moon: "moon",
    free_pink_heart: "pinkHeart",
    free_wings: "wings"
  };

  const live = {
    socket: null,
    identity: null,
    self: null,
    roomId: "lobby",
    reconnectTimer: null,
    reconnectAttempts: 0,
    closing: false,
    connected: false,
    micHolder: "",
    micStream: null,
    relay: null,
    privatePeer: null,
    pendingPrivate: null,
    roomControls: { publicMicEnabled: true, privateMicEnabled: false },
    roomsTimer: null,
    adminSettingsTimer: null,
    heartbeatTimer: null,
    connectTimeout: null,
    lastPongAt: 0,
    connectSerial: 0,
    ignoreHistoryOnce: false,
    googlePrepared: false,
    pendingProfilePatch: null,
    avatarSettingsSync: null,
    pageLeaving: false
  };

  function byId(id) { return document.getElementById(id); }
  function nowTime(ms = Date.now()) {
    try { return new Date(ms).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  }
  function cleanName(value) {
    const name = String(value ?? "").trim();
    return name === CROWN_ONLY_NAME ? "" : name;
  }
  function profileFromEntry() {
    const name = String(byId("entryName")?.value || "").trim();
    if (name.length < 2) {
      showEntryError("اكتب اسماً من حرفين على الأقل.");
      byId("entryName")?.focus();
      return null;
    }
    const roomId = String(state.room || live.roomId || "lobby");
    return { name: name.slice(0, 24), avatar: avatarId(state.entryAvatar), roomId };
  }
  function avatarId(value) {
    const raw = String(value || "").replace(/^\.\//, "").trim();
    if (AVATAR_ID_BY_SOURCE[raw]) return AVATAR_ID_BY_SOURCE[raw];
    const managed = (Array.isArray(state.entryAvatarOptions) ? state.entryAvatarOptions : [])
      .find((item) => item && (String(item.id) === raw || String(item.src) === raw));
    if (managed?.id) return String(managed.id).toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 40);
    if (/^[a-z0-9][a-z0-9_-]{0,39}$/i.test(raw)) return raw.toLowerCase();
    return "entry_avatar_1";
  }

  function avatarSourceKnown(value) {
    const raw = String(value || "").trim();
    if (!raw) return true;
    if (/^(data:image\/|blob:|https?:\/\/|\/|assets\/|characters\/)/i.test(raw)) return true;
    if (["owner","guest","lina","girl2","girl3","girl4","man1","avatar6","avatar7","entry1","entry2","entry3","entry4","entry5","entry6"].includes(raw)) return true;
    return (Array.isArray(state.entryAvatarOptions) ? state.entryAvatarOptions : [])
      .some((item) => item && (String(item.id) === raw || String(item.src) === raw));
  }

  async function ensureAvatarSettings(values = []) {
    const list = Array.isArray(values) ? values : [values];
    if (!list.some((value) => !avatarSourceKnown(value))) return false;
    if (!live.avatarSettingsSync) {
      live.avatarSettingsSync = Promise.resolve(syncRemoteAdminSettings(false))
        .catch(() => false)
        .finally(() => { live.avatarSettingsSync = null; });
    }
    await live.avatarSettingsSync;
    try { renderAll(); syncLiveChrome(); } catch {}
    return true;
  }
  function isGuestUser(user) {
    return Boolean(user?.isGuest) || /(?:^|\s)•?\s*ضيف$/.test(String(user?.nickname || user?.name || ""));
  }
  function badgeMeta(id) {
    return BADGES[String(id || "")] || (id ? { id, name: "شارة", icon: "🎁" } : null);
  }
  function safeParse(text, fallback = null) {
    try { return JSON.parse(text); } catch { return fallback; }
  }
  function socketReady() { return live.socket?.readyState === WebSocket.OPEN; }
  function send(payload) {
    if (!socketReady()) {
      toast("الدردشة غير متصلة الآن");
      return false;
    }
    live.socket.send(JSON.stringify(payload));
    return true;
  }
  function setConnection(status, text) {
    live.connected = status === "connected";
    const el = byId("liveConnection");
    if (el) {
      el.className = `liveConnection ${status}`;
      const span = el.querySelector("span");
      if (span) span.textContent = text || ({ connected: "متصل", connecting: "جاري الاتصال", disconnected: "غير متصل" }[status] || status);
    }
  }
  function saveProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
  }
  function loadProfile() {
    try {
      const current = safeParse(localStorage.getItem(PROFILE_KEY) || "null", null);
      if (current) return current;
      const legacy = safeParse(localStorage.getItem(LEGACY_PROFILE_KEY) || "null", null);
      if (legacy) saveProfile(legacy);
      return legacy;
    } catch { return null; }
  }
  function identityIsUsable(identity) {
    if (!identity?.type || !identity?.clientId) return false;
    const expiresAt = Number(identity.expiresAt || 0);
    return expiresAt <= 0 || expiresAt > Date.now() + 30_000;
  }
  function saveIdentity(identity) {
    live.identity = identity;
    const text = JSON.stringify(identity);
    try { sessionStorage.setItem(LIVE_IDENTITY_KEY, text); } catch {}
    try { localStorage.setItem(PERSIST_IDENTITY_KEY, text); } catch {}
  }
  function loadIdentity() {
    const candidates = [];
    try { candidates.push(safeParse(sessionStorage.getItem(LIVE_IDENTITY_KEY) || "null", null)); } catch {}
    try { candidates.push(safeParse(localStorage.getItem(PERSIST_IDENTITY_KEY) || "null", null)); } catch {}
    try { candidates.push(safeParse(sessionStorage.getItem(LEGACY_IDENTITY_KEY) || "null", null)); } catch {}
    const identity = candidates.find(identityIsUsable) || null;
    if (identity) saveIdentity(identity);
    return identity;
  }
  function clearIdentity() {
    live.identity = null;
    try {
      sessionStorage.removeItem(LIVE_IDENTITY_KEY);
      sessionStorage.removeItem(LEGACY_IDENTITY_KEY);
      sessionStorage.removeItem(BADGE_TOKEN_KEY);
      localStorage.removeItem(PERSIST_IDENTITY_KEY);
    } catch {}
  }
  function saveActiveRoom(roomId = live.roomId) {
    try { localStorage.setItem(ACTIVE_ROOM_KEY, roomId || "lobby"); } catch {}
  }
  function selectEntryRoomLive(roomId, persist = true) {
    const requested = roomId === "general" ? "lobby" : String(roomId || "");
    const selected = state.rooms.find((room) => room.id === requested) || state.rooms[0];
    if (!selected) return false;
    live.roomId = selected.id;
    state.room = selected.id;
    if (persist) saveActiveRoom(selected.id);
    try { if (typeof renderEntryRoomChoices === "function") renderEntryRoomChoices(); } catch {}
    return true;
  }
  function loadActiveRoom() {
    try { return String(localStorage.getItem(ACTIVE_ROOM_KEY) || "lobby"); } catch { return "lobby"; }
  }
  function readSnapshots() {
    try { return safeParse(localStorage.getItem(MESSAGE_SNAPSHOT_KEY) || "{}", {}) || {}; } catch { return {}; }
  }
  function saveRoomSnapshot(roomId = state.room) {
    if (!roomId) return;
    const snapshots = readSnapshots();
    snapshots[roomId] = state.messages
      .filter((message) => message.room === roomId)
      .slice(-13)
      .map((message) => ({ ...message }));
    try { localStorage.setItem(MESSAGE_SNAPSHOT_KEY, JSON.stringify(snapshots)); } catch {}
  }
  function restoreRoomSnapshot(roomId = state.room) {
    const messages = readSnapshots()[roomId];
    if (!Array.isArray(messages) || !messages.length) return false;
    state.messages = messages.map((message) => ({ ...message, room: roomId }));
    return true;
  }
  function clearRoomSnapshot(roomId) {
    if (!roomId) return;
    const snapshots = readSnapshots();
    delete snapshots[roomId];
    try { localStorage.setItem(MESSAGE_SNAPSHOT_KEY, JSON.stringify(snapshots)); } catch {}
  }
  function readRoomCutoffs() {
    try { return safeParse(localStorage.getItem(ROOM_CUTOFFS_KEY) || "{}", {}) || {}; } catch { return {}; }
  }
  function getRoomCutoff(roomId = state.room) {
    return Number(readRoomCutoffs()[roomId] || 0);
  }
  function setRoomCutoff(roomId = state.room, timestamp = Date.now()) {
    if (!roomId) return;
    const cutoffs = readRoomCutoffs();
    cutoffs[roomId] = Number(timestamp || Date.now());
    try { localStorage.setItem(ROOM_CUTOFFS_KEY, JSON.stringify(cutoffs)); } catch {}
  }
  window.RivoPersistRoomMessages = saveRoomSnapshot;
  function getDeviceId() {
    let id = "";
    try { id = localStorage.getItem(DEVICE_KEY) || ""; } catch {}
    if (id.length < 8) {
      id = `rivo-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}-${Date.now()}`;
      try { localStorage.setItem(DEVICE_KEY, id); } catch {}
    }
    return id;
  }
  function updateGoogleSessionUI() {
    const session = window.RivoGoogleAuth?.loadSession?.() || null;
    const box = byId("entryGoogleSession");
    const email = byId("entryGoogleEmail");
    const title = byId("entryGoogleButtonTitle");
    const hint = byId("entryGoogleButtonHint");
    if (box) box.classList.toggle("hidden", !session);
    if (email) email.textContent = session?.email || "حساب Google";
    if (title) title.textContent = session ? "الدخول بالحساب المسجل" : "تسجيل الدخول بحساب Google";
    if (hint) hint.textContent = session ? "لن تحتاج إلى اختيار الحساب مرة أخرى" : "حساب ثابت ومزايا إضافية";
  }
  function changeGoogleAccount() {
    window.RivoGoogleAuth?.clearSession?.();
    if (live.identity?.type === "google") clearIdentity();
    updateGoogleSessionUI();
    toast("تم فصل حساب Google. اختر حساباً آخر عند تسجيل الدخول");
  }

  function mapRoom(item) {
    return {
      id: item.id === "general" ? "lobby" : item.id,
      name: item.name || item.id,
      icon: ROOM_ICONS[item.id] || "💬",
      count: Number(item.count || 0),
      cams: 4,
      mics: 6,
      camOn: true,
      micOn: true,
      music: true,
      avatars: false,
      lina: false,
      announcement: `أهلاً بكم في غرفة ${item.name || item.id}.`,
      announcementOn: true,
      full: Boolean(item.full)
    };
  }

  function mapUser(user) {
    const guest = isGuestUser(user);
    const roleName = user.role === "owner" ? "owner" : user.role === "moderator" ? "moderator" : guest ? "guest" : "user";
    const name = cleanName(user.nickname ?? user.name);
    const mapped = {
      id: user.clientId || user.id,
      name,
      avatar: user.avatar || (roleName === "owner" ? "owner" : "entry1"),
      room: live.roomId,
      bio: roleName === "owner" ? "مالك ريفو" : roleName === "moderator" ? "مراقب ريفو" : guest ? "ضيف" : user.isVip ? "عضو VIP" : "مسجل بحساب Google",
      authType: roleName === "owner" ? "owner" : roleName === "moderator" ? "moderator" : guest ? "guest" : user.isAi ? "ai" : "google",
      coins: 0,
      role: roleName,
      plan: user.isVip ? "vip" : roleName,
      vip: Boolean(user.isVip),
      verified: Boolean(user.verified && roleName === "user" && !guest),
      isHidden: user.adminVisible === false || Boolean(user.vipStealth),
      giftValue: 0,
      friends: 0,
      level: 1,
      privateOpen: user.privateOpen !== false,
      privateBusy: Boolean(user.privateBusy),
      badge: user.badge || "",
      priority: roleName === "owner" ? 100 : roleName === "moderator" ? 90 : user.isVip ? 70 : guest ? 0 : 20,
      joinedAt: Number(user.joinedAt || Date.now()),
      isAi: Boolean(user.isAi)
    };
    return mapped;
  }

  function syncBadges(users) {
    const liveIds = new Set(users.map((u) => u.id));
    for (const id of Object.keys(state.activeNameGifts)) {
      if (!liveIds.has(id)) delete state.activeNameGifts[id];
    }
    for (const user of users) {
      if (user.badge) {
        const meta = badgeMeta(user.badge);
        state.activeNameGifts[user.id] = { ...meta, source: "adminBadge", grantedAt: Date.now() };
      } else {
        delete state.activeNameGifts[user.id];
      }
    }
  }

  function syncUsers(rawUsers = []) {
    const users = rawUsers.map(mapUser);
    syncBadges(users);
    state.users = users;
    if (live.self) {
      const selfMapped = mapUser({ ...live.self, isGuest: live.identity?.type === "guest", verified: live.identity?.type === "google" });
      const existing = state.users.find((u) => u.id === selfMapped.id);
      if (existing) Object.assign(existing, selfMapped);
      else state.users.unshift(selfMapped);
      state.user = existing || selfMapped;
    }
    const room = state.rooms.find((r) => r.id === state.room);
    if (room) room.count = state.users.filter((u) => u.room === state.room && !u.isHidden).length;
    renderAll();
    syncLiveChrome();
  }

  function syncLiveChrome() {
    const user = state.user;
    const staff = user && ["owner", "moderator"].includes(userAccessRole(user));
    const adminButton = byId("adminBtn");
    if (adminButton) {
      adminButton.classList.toggle("hidden", !staff);
      adminButton.title = userAccessRole(user) === "moderator" ? "لوحة المراقب" : "لوحة الإدارة";
    }
    const ownerEntry = byId("entryOwnerBtn");
    if (ownerEntry) ownerEntry.textContent = "دخول الإدارة 👑";
    const cameraButtons = [byId("cameraBtn"), byId("composerCameraBtn")].filter(Boolean);
    cameraButtons.forEach((button) => {
      button.classList.add("liveDisabled");
      button.title = "سيتم ربط كاميرا الغرفة في التحديث التالي";
    });
    updateMicButtons();
  }

  async function fetchRooms(preferAssigned = false) {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.rooms) || data.rooms.length === 0) {
        throw new Error(data.error || "لم تُرجع الخدمة أي غرفة متاحة");
      }
      const mappedRooms = data.rooms.map(mapRoom).filter((room) => room?.id);
      if (!mappedRooms.length) throw new Error("قائمة الغرف فارغة");
      state.rooms = mappedRooms;
      if (preferAssigned && data.assignedRoom?.id) live.roomId = data.assignedRoom.id;
      if (!state.rooms.some((r) => r.id === live.roomId)) live.roomId = state.rooms[0]?.id || "lobby";
      state.room = live.roomId;
      renderRooms();
      try { if (typeof renderEntryRoomChoices === "function") renderEntryRoomChoices(); } catch {}
      renderHeader();
      return true;
    } catch (error) {
      console.warn("Rooms load failed", error);
      if (!state.rooms.length) state.rooms = [mapRoom({ id: "lobby", name: "العامة", count: 0 })];
      return false;
    }
  }

  function buildSocketUrl() {
    const identity = live.identity;
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const badgeToken = sessionStorage.getItem(BADGE_TOKEN_KEY) || "";
    const params = new URLSearchParams({
      nickname: identity.name || (identity.role === "owner" ? "الإدارة" : "مستخدم Rivo"),
      avatar: identity.avatar || "entry1",
      clientId: identity.clientId || crypto.randomUUID(),
      privateOpen: identity.type === "guest" ? "0" : "1",
      role: identity.role || "user",
      adminVisible: identity.visible === false ? "0" : "1",
      staffSessionToken: identity.staffSessionToken || "",
      staffClientId: identity.staffClientId || "",
      authToken: identity.authToken || "",
      badgeToken
    });
    return `${protocol}//${location.host}/api/rooms/${encodeURIComponent(live.roomId)}/ws?${params}`;
  }

  function stopHeartbeat() {
    clearInterval(live.heartbeatTimer);
    live.heartbeatTimer = null;
  }
  function startHeartbeat(socket) {
    stopHeartbeat();
    live.lastPongAt = Date.now();
    live.heartbeatTimer = setInterval(() => {
      if (live.socket !== socket || socket.readyState !== WebSocket.OPEN) return;
      if (Date.now() - live.lastPongAt > 55_000) {
        try { socket.close(4000, "Connection heartbeat timeout"); } catch {}
        return;
      }
      try { socket.send(JSON.stringify({ type: "ping", at: Date.now() })); } catch {}
    }, 20_000);
  }
  function closeSocket(reason = "switch") {
    clearTimeout(live.reconnectTimer);
    clearTimeout(live.connectTimeout);
    stopHeartbeat();
    const socket = live.socket;
    live.socket = null;
    live.connected = false;
    if (socket) {
      try { socket.close(1000, reason); } catch {}
    }
  }

  async function connect(roomId = live.roomId) {
    if (!live.identity || !identityIsUsable(live.identity)) return;
    live.pageLeaving = false;
    const serial = ++live.connectSerial;
    closeSocket("reconnect");
    live.roomId = roomId === "general" ? "lobby" : roomId;
    state.room = live.roomId;
    saveActiveRoom(live.roomId);
    state.stage = [];
    if (!state.messages.some((message) => message.room === live.roomId)) {
      if (live.ignoreHistoryOnce) {
        clearRoomSnapshot(live.roomId);
        setRoomCutoff(live.roomId, Date.now());
        startFreshRoomConversation(live.roomId);
      } else if (!restoreRoomSnapshot(live.roomId)) {
        startFreshRoomConversation(live.roomId);
      }
    }
    renderAll();
    setConnection("connecting", live.reconnectAttempts ? "إعادة الاتصال…" : "جاري الاتصال");

    let socket;
    try {
      socket = new WebSocket(buildSocketUrl());
    } catch (error) {
      setConnection("disconnected", "تعذر الاتصال");
      scheduleReconnect();
      return;
    }
    live.socket = socket;
    clearTimeout(live.connectTimeout);
    live.connectTimeout = setTimeout(() => {
      if (live.socket === socket && socket.readyState !== WebSocket.OPEN) {
        try { socket.close(4000, "Connection timeout"); } catch {}
      }
    }, 15_000);

    socket.addEventListener("open", () => {
      clearTimeout(live.connectTimeout);
      if (live.socket !== socket || serial !== live.connectSerial) return;
      live.reconnectAttempts = 0;
      live.lastPongAt = Date.now();
      setConnection("connected", "متصل");
      startHeartbeat(socket);
      try { socket.send(JSON.stringify({ type: "room-radio-state-request" })); } catch {}
      if (live.pendingProfilePatch) {
        try { socket.send(JSON.stringify({ type: "profile", ...live.pendingProfilePatch })); } catch {}
      }
    });

    socket.addEventListener("message", (event) => {
      if (live.socket !== socket) return;
      const data = safeParse(event.data, null);
      if (!data) return;
      if (data.type === "pong") live.lastPongAt = Date.now();
      handleEvent(data);
    });

    socket.addEventListener("close", (event) => {
      if (live.socket !== socket) return;
      live.socket = null;
      clearTimeout(live.connectTimeout);
      stopHeartbeat();
      live.connected = false;
      setConnection("disconnected", navigator.onLine === false ? "بانتظار الإنترنت" : "انقطع الاتصال — نعيده الآن");
      if (!live.identity || live.pageLeaving) return;
      if (event.code === 4002) {
        setConnection("disconnected", "تم فتح الحساب في نافذة أخرى");
        toast(event.reason || "تم فتح هذا الحساب في نافذة أخرى");
        return;
      }
      if ([4003, 4004].includes(event.code)) {
        toast(event.reason || "تم إنهاء الجلسة بواسطة الإدارة");
        logoutLive(false);
        return;
      }
      scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      if (live.socket === socket) setConnection("disconnected", "تعذر الاتصال — نعيد المحاولة");
    });
  }
  function scheduleReconnect(immediate = false) {
    if (!live.identity || !identityIsUsable(live.identity)) return;
    clearTimeout(live.reconnectTimer);
    const delay = immediate ? 80 : Math.min(12_000, 700 * (2 ** live.reconnectAttempts++));
    live.reconnectTimer = setTimeout(() => {
      if (!live.socket || live.socket.readyState === WebSocket.CLOSED) connect(live.roomId);
    }, delay);
  }

  function messageUserFromPayload(message, historyOnly = false) {
    let user = state.users.find((u) => u.id === message.clientId);
    if (!user && message.clientId) {
      user = mapUser({
        clientId: message.clientId,
        nickname: message.nickname,
        avatar: message.avatar,
        role: message.role,
        isVip: message.isVip,
        verified: message.verified,
        isGuest: message.isGuest,
        badge: message.badge
      });
      user.isHistoryOnly = historyOnly;
      state.users.push(user);
    }
    return user;
  }
  function authorFromMessage(message, historyOnly = false) {
    const user = messageUserFromPayload(message, historyOnly);
    return user ? { ...user } : {
      id: message.clientId || "history-user",
      name: cleanName(message.nickname) || "مستخدم",
      avatar: message.avatar || "guest",
      role: message.role || "user",
      plan: message.isVip ? "vip" : "user",
      authType: message.isGuest ? "guest" : "google",
      verified: Boolean(message.verified),
      vip: Boolean(message.isVip)
    };
  }
  function mapHistoryMessage(message) {
    return {
      id: message.id || `${message.clientId || "user"}-${message.createdAt || Date.now()}-${message.body || ""}`,
      room: state.room,
      user: message.clientId,
      author: authorFromMessage(message, true),
      text: message.body || "",
      color: normalizeColor(message.color),
      time: nowTime(message.createdAt),
      createdAt: Number(message.createdAt || Date.now())
    };
  }
  function hydrateHistory(messages = []) {
    const cutoff = getRoomCutoff(state.room);
    const local = state.messages.filter((message) => message.room === state.room && !message.isRoomWelcome && Number(message.createdAt || 0) >= cutoff);
    const serverMessages = messages.filter((message) => Number(message.createdAt || 0) >= cutoff).map(mapHistoryMessage);
    const merged = new Map();
    for (const message of [...serverMessages, ...local]) {
      const key = message.id || `${message.user || "user"}-${message.createdAt || 0}-${message.text || ""}`;
      merged.set(key, { ...message, room: state.room });
    }
    const values = [...merged.values()].sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)).slice(-12);
    state.messages = [roomWelcomeMessage(state.room), ...values];
    saveRoomSnapshot(state.room);
  }

  function appendLiveMessage(message) {
    const author = authorFromMessage(message, false);
    if (message.presenceEvent) {
      appendRoomMessage({ id: message.id, type: "system", room: state.room, text: message.body, createdAt: message.createdAt });
    } else {
      appendRoomMessage({
        id: message.id,
        room: state.room,
        user: message.clientId,
        author,
        text: message.body,
        color: normalizeColor(message.color),
        time: nowTime(message.createdAt),
        createdAt: message.createdAt
      });
    }
    saveRoomSnapshot(state.room);
    renderMessages();
    requestAnimationFrame(() => { const box = byId("messages"); if (box) box.scrollTop = box.scrollHeight; });
  }

  function updateUserPatch(clientId, patch) {
    const user = state.users.find((u) => u.id === clientId);
    if (user) {
      if (patch.nickname !== undefined) user.name = cleanName(patch.nickname);
      if (patch.avatar !== undefined) user.avatar = patch.avatar;
      if (patch.adminVisible !== undefined) user.isHidden = patch.adminVisible === false;
    }
    if (state.user?.id === clientId) {
      if (patch.nickname !== undefined) state.user.name = cleanName(patch.nickname);
      if (patch.avatar !== undefined) state.user.avatar = patch.avatar;
      if (patch.adminVisible !== undefined) state.user.isHidden = patch.adminVisible === false;
      if (live.identity) {
        if (patch.nickname !== undefined) live.identity.name = patch.nickname;
        if (patch.avatar !== undefined) live.identity.avatar = patch.avatar;
        if (patch.adminVisible !== undefined) live.identity.visible = patch.adminVisible;
        saveIdentity(live.identity);
      }
    }
    renderAll();
    syncLiveChrome();
    if (patch.avatar !== undefined) {
      try { window.dispatchEvent(new CustomEvent('rivo-avatar-changed', { detail: { userId: clientId, avatar: patch.avatar } })); } catch {}
    }
  }

  function updateProfileLive(patch = {}) {
    const nickname = cleanName(patch.nickname ?? state.user?.name ?? live.identity?.name ?? "مستخدم Rivo");
    const avatar = avatarId(patch.avatar ?? state.user?.avatar ?? live.identity?.avatar ?? "entry_avatar_1");
    if (state.user) {
      state.user.name = nickname;
      state.user.avatar = avatar;
      const listed = state.users.find((user) => user.id === state.user.id);
      if (listed) { listed.name = nickname; listed.avatar = avatar; }
    }
    if (live.identity) {
      live.identity.name = nickname;
      live.identity.avatar = avatar;
      saveIdentity(live.identity);
    }
    saveProfile({ name: nickname, avatar });
    if (state.user?.id) updateUserPatch(state.user.id, { nickname, avatar });
    live.pendingProfilePatch = { nickname, avatar };
    if (socketReady()) {
      try { live.socket.send(JSON.stringify({ type: "profile", nickname, avatar })); } catch {}
    }
    renderAll();
    syncLiveChrome();
    return true;
  }

  window.addEventListener('rivo-avatar-changed', (event) => {
    const detail = event?.detail || {};
    if (!detail.userId || detail.avatar === undefined) return;
    const user = state.users.find((item) => String(item.id) === String(detail.userId));
    if (user) user.avatar = detail.avatar;
    if (state.user && String(state.user.id) === String(detail.userId)) state.user.avatar = detail.avatar;
    renderAll();
    syncLiveChrome();
  });

  function applyBadge(clientId, badge) {
    const user = state.users.find((u) => u.id === clientId);
    if (user) user.badge = badge || "";
    if (badge) {
      const meta = badgeMeta(badge);
      state.activeNameGifts[clientId] = { ...meta, source: "adminBadge", grantedAt: Date.now() };
    } else {
      delete state.activeNameGifts[clientId];
    }
    renderAll();
  }

  function showGiftEvent(data) {
    const badge = badgeMeta(data.badge);
    if (!badge) return;
    const targetId = data.targetClientId || data.clientId;
    applyBadge(targetId, data.badge);
    if (targetId && targetId === state.user?.id) {
      state.inbox.alerts = (Number(state.inbox.alerts) || 0) + 1;
      renderHeader();
    }
    const sender = data.fromNickname || "الإدارة";
    const target = data.targetNickname || state.users.find((u) => u.id === targetId)?.name || "المستخدم";
    byId("giftVisual").textContent = badge.icon;
    byId("giftSender").textContent = sender;
    byId("giftReceiver").textContent = target;
    byId("giftName").textContent = badge.name;
    byId("giftOverlay")?.classList.remove("hidden");
    createGiftParticles(4, badge.icon);
    giftSound(4);
    setTimeout(() => {
      byId("giftOverlay")?.classList.add("hidden");
      byId("giftOverlay")?.querySelector(".giftParticles")?.remove();
    }, 4500);
  }

  function openPrivateSession(peer) {
    live.privatePeer = peer;
    state.privateTarget = peer.clientId;
    state.privateChats[peer.clientId] ||= [];
    state.privateUnread[peer.clientId] = 0;
    updatePrivateBadge();
    byId("privateChatName").textContent = cleanName(peer.nickname) || "مستخدم";
    byId("privateChatAvatar").src = av(peer.avatar || "guest");
    byId("privateChatStatus").textContent = "محادثة خاصة متصلة";
    renderPrivateMessages();
    byId("privateChatWindow")?.classList.remove("hidden", "minimized");
    bringPrivateWindowFront();
    setTimeout(() => byId("privateMessageInput")?.focus(), 70);
  }

  function adminMessageStorageKey() {
    const identity = live.identity || {};
    const id = identity.clientId || state.user?.id || identity.email || identity.googleSub || "device";
    return `${ADMIN_MESSAGE_STORE_PREFIX}:${String(id).replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  }

  function normalizeAdminStoredMessage(message = {}) {
    return {
      id: String(message.id || `${message.createdAt || Date.now()}-${message.body || ""}`),
      senderId: message.senderId || "owner-main",
      senderNickname: message.senderNickname || "الإدارة",
      senderAvatar: message.senderAvatar || "owner",
      recipientId: message.recipientId || state.user?.id || "all",
      body: String(message.body || "").trim(),
      createdAt: Number(message.createdAt || Date.now()),
      read: Boolean(message.read),
      mine: Boolean(message.mine)
    };
  }

  function persistAdminMessages() {
    const messages = (Array.isArray(state.adminMessages) ? state.adminMessages : [])
      .filter((message) => message.body && Number(message.createdAt || 0) >= Date.now() - ADMIN_MESSAGE_TTL)
      .slice(-80);
    state.adminMessages = messages;
    try { localStorage.setItem(adminMessageStorageKey(), JSON.stringify(messages)); } catch {}
  }

  function restoreAdminMessages() {
    let messages = [];
    try { messages = safeParse(localStorage.getItem(adminMessageStorageKey()) || "[]", []); } catch {}
    const unique = new Map();
    for (const raw of Array.isArray(messages) ? messages : []) {
      const message = normalizeAdminStoredMessage(raw);
      if (!message.body || message.createdAt < Date.now() - ADMIN_MESSAGE_TTL) continue;
      unique.set(message.id, message);
    }
    state.adminMessages = [...unique.values()].sort((a, b) => a.createdAt - b.createdAt).slice(-80);
    state.privateUnread ||= {};
    state.privateUnread["rivo-admin"] = state.adminMessages.filter((message) => !message.read).length;
    persistAdminMessages();
    syncAdminPrivateConversation();
    if (typeof updatePrivateBadge === "function") updatePrivateBadge();
    if (typeof renderPrivateInbox === "function") renderPrivateInbox();
  }

  function addAdminStoredMessage(rawMessage) {
    const message = normalizeAdminStoredMessage({ ...rawMessage, read: false });
    if (!message.body) return null;
    if (!Array.isArray(state.adminMessages)) restoreAdminMessages();
    const existing = new Map((state.adminMessages || []).map((item) => [item.id, item]));
    existing.set(message.id, message);
    state.adminMessages = [...existing.values()].sort((a, b) => a.createdAt - b.createdAt).slice(-80);
    state.privateUnread ||= {};
    state.privateUnread["rivo-admin"] = state.adminMessages.filter((item) => !item.read).length;
    persistAdminMessages();
    syncAdminPrivateConversation();
    if (typeof updatePrivateBadge === "function") updatePrivateBadge();
    if (typeof renderPrivateInbox === "function") renderPrivateInbox();
    if (typeof renderHeader === "function") renderHeader();
    return message;
  }

  function markAdminMessagesRead() {
    if (!Array.isArray(state.adminMessages)) restoreAdminMessages();
    state.adminMessages = (state.adminMessages || []).map((message) => ({ ...message, read: true }));
    state.privateUnread ||= {};
    state.privateUnread["rivo-admin"] = 0;
    persistAdminMessages();
    syncAdminPrivateConversation();
    if (typeof updatePrivateBadge === "function") updatePrivateBadge();
    if (typeof renderPrivateInbox === "function") renderPrivateInbox();
    if (typeof renderHeader === "function") renderHeader();
  }


  function syncAdminPrivateConversation() {
    state.privateChats ||= {};
    state.privateChats["rivo-admin"] = (Array.isArray(state.adminMessages) ? state.adminMessages : []).map((message) => ({
      from: message.mine ? "me" : "rivo-admin",
      text: message.body,
      time: nowTime(message.createdAt),
      id: message.id
    }));
  }

  function openAdminPrivateChatWindow(markRead = true) {
    if (!Array.isArray(state.adminMessages)) restoreAdminMessages();
    syncAdminPrivateConversation();
    state.privateTarget = "rivo-admin";
    if (markRead) markAdminMessagesRead();
    const name = byId("privateChatName");
    const avatar = byId("privateChatAvatar");
    const status = byId("privateChatStatus");
    if (name) name.textContent = "الإدارة";
    if (avatar) avatar.src = av("owner");
    if (status) status.textContent = "محادثة خاصة مع الإدارة";
    if (typeof renderPrivateMessages === "function") renderPrivateMessages();
    if (typeof updatePrivateMediaControls === "function") updatePrivateMediaControls();
    const win = byId("privateChatWindow");
    win?.classList.remove("hidden", "minimized");
    if (typeof bringPrivateWindowFront === "function") bringPrivateWindowFront();
    if (typeof closePrivateInbox === "function") closePrivateInbox();
    setTimeout(() => byId("privateMessageInput")?.focus(), 70);
  }
  window.openAdminPrivateChat = () => openAdminPrivateChatWindow(true);

  function ensureAdminDirectMessageModal() {
    if (!document.getElementById("rivoAdminDirectMessageStyle")) {
      const style = document.createElement("style");
      style.id = "rivoAdminDirectMessageStyle";
      style.textContent = `
      .rivoAdminDirectOverlay{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.58);display:grid;place-items:center;padding:18px;backdrop-filter:blur(5px)}
      .rivoAdminDirectCard{width:min(560px,94vw);max-height:88vh;display:flex;flex-direction:column;background:#fff;border-radius:23px;padding:24px;box-shadow:0 35px 100px rgba(0,0,0,.34);position:relative;direction:rtl;text-align:right;border-top:7px solid #7257ff}
      .rivoAdminDirectCard h2{margin:0 0 8px;font-size:25px}.rivoAdminDirectMeta{display:flex;align-items:center;gap:9px;color:#6b7280;margin-bottom:14px;font-size:13px}.rivoAdminDirectIcon{width:46px;height:46px;border-radius:15px;background:linear-gradient(135deg,#6547f4,#2f94ff);display:grid;place-items:center;color:#fff;font-size:23px}
      .rivoAdminDirectClose{position:absolute;left:13px;top:12px;width:36px;height:36px;border:0;border-radius:50%;background:#eef2f7;font-size:21px}.rivoAdminDirectOk{width:100%;margin-top:14px;border:0;border-radius:13px;padding:12px;background:linear-gradient(135deg,#6547f4,#2f94ff);color:#fff;font-weight:900}
      .rivoAdminDirectHistory{display:flex;flex-direction:column;gap:10px;overflow:auto;min-height:130px;max-height:52vh;padding:4px 2px 8px}.rivoAdminDirectEntry{background:#f6f7fb;border:1px solid #e2e7f0;border-radius:16px;padding:13px 14px}.rivoAdminDirectEntry.latest{background:#eef3ff;border-color:#bfd0ff;box-shadow:0 7px 18px rgba(55,93,200,.12)}.rivoAdminDirectEntry p{margin:5px 0 0;color:#1f2937;font-size:17px;line-height:1.7;white-space:pre-wrap;word-break:break-word}.rivoAdminDirectEntry small{color:#7b8494}.rivoAdminDirectEmpty{text-align:center;color:#7b8494;padding:35px 10px}
      `;
      document.head.appendChild(style);
    }
    let overlay = document.getElementById("rivoAdminDirectOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "rivoAdminDirectOverlay";
      overlay.className = "rivoAdminDirectOverlay hidden";
      overlay.innerHTML = `<div class="rivoAdminDirectCard"><button id="rivoAdminDirectClose" class="rivoAdminDirectClose">×</button><div class="rivoAdminDirectMeta"><span class="rivoAdminDirectIcon">👑</span><div><b>رسائل الإدارة</b><small style="display:block">تبقى محفوظة على جهازك لمدة 7 أيام</small></div></div><h2>رسالة خاصة من الإدارة</h2><div id="rivoAdminDirectHistory" class="rivoAdminDirectHistory"></div><button id="rivoAdminDirectOk" class="rivoAdminDirectOk">حسناً</button></div>`;
      document.body.appendChild(overlay);
      const close = () => overlay.classList.add("hidden");
      document.getElementById("rivoAdminDirectClose").onclick = close;
      document.getElementById("rivoAdminDirectOk").onclick = close;
      overlay.onclick = (event) => { if (event.target === overlay) close(); };
    }
    return overlay;
  }

  function adminMessageEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function renderAdminMessageHistory(highlightId = "") {
    const box = document.getElementById("rivoAdminDirectHistory");
    if (!box) return;
    const messages = Array.isArray(state.adminMessages) ? state.adminMessages : [];
    box.innerHTML = messages.length ? messages.map((message) => `<article class="rivoAdminDirectEntry ${message.id === highlightId ? "latest" : ""}"><small>${adminMessageEscape(message.senderNickname || "الإدارة")} · ${adminMessageEscape(nowTime(message.createdAt || Date.now()))}</small><p>${adminMessageEscape(message.body || "")}</p></article>`).join("") : '<div class="rivoAdminDirectEmpty">لا توجد رسائل من الإدارة</div>';
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  window.openAdminMessageInbox = function openAdminMessageInbox() {
    openAdminPrivateChatWindow(true);
  };

  function showAdminDirectMessage(rawMessage) {
    const message = addAdminStoredMessage({ ...rawMessage, mine: false });
    if (!message) return;
    syncAdminPrivateConversation();
    state.privateUnread ||= {};
    state.privateUnread["rivo-admin"] = (state.adminMessages || []).filter((item) => !item.read).length;
    if (typeof updatePrivateBadge === "function") updatePrivateBadge();
    toast("وصلتك رسالة خاصة جديدة من الإدارة");
    openAdminPrivateChatWindow(false);
  }

  function handlePrivateMessage(message) {
    const peerId = message.senderId === state.user?.id ? message.recipientId : message.senderId;
    state.privateChats[peerId] ||= [];
    state.privateChats[peerId].push({
      from: message.senderId === state.user?.id ? "me" : peerId,
      text: message.body,
      time: nowTime(message.createdAt)
    });
    if (state.privateTarget === peerId) renderPrivateMessages();
    else {
      state.privateUnread[peerId] = (state.privateUnread[peerId] || 0) + 1;
      updatePrivateBadge();
      toast(`رسالة خاصة جديدة من ${message.senderNickname || "مستخدم"}`);
    }
  }

  const privateRequestQueue = [];
  const privateRequestIds = new Set();
  let activePrivateRequest = null;
  let privateRequestDecisionPending = false;

  function privateRequestEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function playPrivateRequestSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
      gain.connect(ctx.destination);
      [660, 880].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start(ctx.currentTime + index * 0.12);
        oscillator.stop(ctx.currentTime + 0.24 + index * 0.12);
      });
      setTimeout(() => ctx.close?.(), 700);
    } catch {}
  }

  function ensurePrivateRequestModal() {
    if (!document.getElementById("rivoPrivateRequestStyle")) {
      const style = document.createElement("style");
      style.id = "rivoPrivateRequestStyle";
      style.textContent = `
        .rivoPrivateRequestOverlay{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.6);display:grid;place-items:center;padding:18px;backdrop-filter:blur(6px)}
        .rivoPrivateRequestOverlay.hidden{display:none!important}
        .rivoPrivateRequestCard{width:min(470px,94vw);background:#fff;border-radius:25px;padding:25px;box-shadow:0 34px 95px rgba(0,0,0,.34);direction:rtl;text-align:right;position:relative;border-top:6px solid #6d5dfc;animation:rivoPrivateRequestIn .22s ease-out}
        @keyframes rivoPrivateRequestIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
        .rivoPrivateRequestClose{position:absolute;left:14px;top:13px;width:38px;height:38px;border:0;border-radius:50%;background:#eef2f7;color:#334155;font-size:24px;display:grid;place-items:center;cursor:pointer}
        .rivoPrivateRequestTitle{margin:0 0 7px;font-size:25px;color:#18233b}
        .rivoPrivateRequestSubtitle{margin:0 0 19px;color:#6f7b90;line-height:1.7}
        .rivoPrivateRequestUser{display:flex;align-items:center;gap:13px;padding:14px;border:1px solid #dce5f3;border-radius:18px;background:linear-gradient(135deg,#f8faff,#f2f4ff)}
        .rivoPrivateRequestAvatar{width:62px;height:62px;border-radius:19px;object-fit:cover;border:3px solid #fff;box-shadow:0 9px 22px rgba(36,51,88,.17)}
        .rivoPrivateRequestUser b{display:block;font-size:20px;color:#172033}.rivoPrivateRequestUser small{display:block;margin-top:4px;color:#778196}
        .rivoPrivateRequestQueue{margin:12px 2px 0;color:#755de8;font-weight:800;font-size:12px;min-height:18px}
        .rivoPrivateRequestStatus{margin:15px 0 0;padding:11px 13px;border-radius:13px;background:#f4f7fb;color:#657087;font-weight:700;min-height:22px}
        .rivoPrivateRequestStatus.waiting{background:#fff7df;color:#9a6500}.rivoPrivateRequestStatus.success{background:#e9fff4;color:#087a4c}.rivoPrivateRequestStatus.error{background:#fff0f2;color:#b4233f}
        .rivoPrivateRequestActions{display:grid;grid-template-columns:1.2fr 1fr;gap:10px;margin-top:16px}
        .rivoPrivateRequestAccept,.rivoPrivateRequestReject{border:0;border-radius:14px;padding:13px 12px;font-weight:900;font-size:16px;cursor:pointer}
        .rivoPrivateRequestAccept{background:linear-gradient(135deg,#6653f7,#268cf3);color:#fff;box-shadow:0 10px 22px rgba(82,84,224,.25)}
        .rivoPrivateRequestReject{background:#edf1f6;color:#334155}
        .rivoPrivateRequestAccept:disabled,.rivoPrivateRequestReject:disabled{opacity:.58;cursor:not-allowed}
        @media(max-width:520px){.rivoPrivateRequestCard{padding:22px 18px}.rivoPrivateRequestActions{grid-template-columns:1fr}.rivoPrivateRequestAvatar{width:56px;height:56px}}
      `;
      document.head.appendChild(style);
    }
    let overlay = document.getElementById("rivoPrivateRequestOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "rivoPrivateRequestOverlay";
      overlay.className = "rivoPrivateRequestOverlay hidden";
      overlay.innerHTML = `<section class="rivoPrivateRequestCard" role="dialog" aria-modal="true" aria-labelledby="rivoPrivateRequestTitle">
        <button id="rivoPrivateRequestClose" class="rivoPrivateRequestClose" aria-label="رفض وإغلاق">×</button>
        <h2 id="rivoPrivateRequestTitle" class="rivoPrivateRequestTitle">طلب محادثة خاصة</h2>
        <p class="rivoPrivateRequestSubtitle">يريد هذا المستخدم فتح محادثة خاصة معك.</p>
        <div class="rivoPrivateRequestUser"><img id="rivoPrivateRequestAvatar" class="rivoPrivateRequestAvatar" alt=""><div><b id="rivoPrivateRequestName">مستخدم</b><small>محادثة خاصة داخل ريفو</small></div></div>
        <div id="rivoPrivateRequestQueue" class="rivoPrivateRequestQueue"></div>
        <div id="rivoPrivateRequestStatus" class="rivoPrivateRequestStatus">اختر قبول أو رفض.</div>
        <div class="rivoPrivateRequestActions"><button id="rivoPrivateRequestAccept" class="rivoPrivateRequestAccept">قبول وفتح الخاص</button><button id="rivoPrivateRequestReject" class="rivoPrivateRequestReject">رفض</button></div>
      </section>`;
      document.body.appendChild(overlay);
      const reject = () => decidePrivateRequest(false);
      document.getElementById("rivoPrivateRequestAccept").onclick = () => decidePrivateRequest(true);
      document.getElementById("rivoPrivateRequestReject").onclick = reject;
      document.getElementById("rivoPrivateRequestClose").onclick = reject;
      overlay.addEventListener("click", (event) => { if (event.target === overlay) reject(); });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !overlay.classList.contains("hidden")) reject();
      });
    }
    return overlay;
  }

  function updatePrivateRequestQueueLabel() {
    const label = document.getElementById("rivoPrivateRequestQueue");
    if (!label) return;
    const count = privateRequestQueue.length;
    label.textContent = count ? `يوجد ${count} طلب آخر بانتظارك` : "";
  }

  function setPrivateRequestStatus(message, stateName = "") {
    const status = document.getElementById("rivoPrivateRequestStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `rivoPrivateRequestStatus ${stateName}`.trim();
  }

  function setPrivateRequestButtonsDisabled(disabled) {
    const accept = document.getElementById("rivoPrivateRequestAccept");
    const reject = document.getElementById("rivoPrivateRequestReject");
    const close = document.getElementById("rivoPrivateRequestClose");
    if (accept) accept.disabled = disabled;
    if (reject) reject.disabled = disabled;
    if (close) close.disabled = disabled;
  }

  function showNextPrivateRequest() {
    if (activePrivateRequest || !privateRequestQueue.length) {
      updatePrivateRequestQueueLabel();
      return;
    }
    activePrivateRequest = privateRequestQueue.shift();
    privateRequestDecisionPending = false;
    const overlay = ensurePrivateRequestModal();
    const name = cleanName(activePrivateRequest.fromNickname || activePrivateRequest.nickname) || "مستخدم";
    const avatar = activePrivateRequest.fromAvatar || activePrivateRequest.avatar || "guest";
    document.getElementById("rivoPrivateRequestName").textContent = name;
    document.getElementById("rivoPrivateRequestAvatar").src = av(avatar);
    document.getElementById("rivoPrivateRequestAvatar").alt = `صورة ${name}`;
    setPrivateRequestStatus("اختر قبول أو رفض.");
    setPrivateRequestButtonsDisabled(false);
    updatePrivateRequestQueueLabel();
    overlay.classList.remove("hidden");
    playPrivateRequestSound();
    toast(`طلب محادثة خاصة من ${name}`);
    setTimeout(() => document.getElementById("rivoPrivateRequestAccept")?.focus(), 80);
  }

  function enqueuePrivateRequest(data) {
    const requestId = String(data?.requestId || "");
    if (!requestId || privateRequestIds.has(requestId)) return;
    privateRequestIds.add(requestId);
    privateRequestQueue.push(data);
    updatePrivateRequestQueueLabel();
    showNextPrivateRequest();
  }

  function finishPrivateRequest(showNext = true) {
    const requestId = String(activePrivateRequest?.requestId || "");
    if (requestId) privateRequestIds.delete(requestId);
    activePrivateRequest = null;
    privateRequestDecisionPending = false;
    document.getElementById("rivoPrivateRequestOverlay")?.classList.add("hidden");
    setPrivateRequestButtonsDisabled(false);
    if (showNext) setTimeout(showNextPrivateRequest, 120);
  }

  function decidePrivateRequest(accept) {
    if (!activePrivateRequest || privateRequestDecisionPending) return;
    privateRequestDecisionPending = true;
    setPrivateRequestButtonsDisabled(true);
    if (accept) {
      setPrivateRequestStatus("جاري فتح المحادثة الخاصة...", "waiting");
      const sent = send({ type: "private-response", requestId: activePrivateRequest.requestId, accept: true });
      if (!sent) {
        privateRequestDecisionPending = false;
        setPrivateRequestButtonsDisabled(false);
        setPrivateRequestStatus("تعذر إرسال الموافقة. تحقق من الاتصال وحاول مجدداً.", "error");
        return;
      }
      setTimeout(() => {
        if (!privateRequestDecisionPending || !activePrivateRequest) return;
        privateRequestDecisionPending = false;
        setPrivateRequestButtonsDisabled(false);
        setPrivateRequestStatus("لم يصل تأكيد فتح المحادثة بعد. يمكنك المحاولة مرة أخرى.", "error");
      }, 8000);
    } else {
      setPrivateRequestStatus("تم رفض طلب المحادثة.", "success");
      send({ type: "private-response", requestId: activePrivateRequest.requestId, accept: false });
      setTimeout(() => finishPrivateRequest(true), 360);
    }
  }

  function completeAcceptedPrivateRequest() {
    if (!activePrivateRequest) return;
    privateRequestDecisionPending = false;
    setPrivateRequestStatus("تم قبول الطلب وفتح المحادثة.", "success");
    setTimeout(() => finishPrivateRequest(true), 280);
  }

  function enforceRemoteRadioCommand(settings) {
    const status = String(settings?.radio?.status || "stopped");
    try {
      if (status === "stopped") {
        window.hardStopRadioMedia?.(true);
        window.hideRadioVideoWindow?.(true);
        window.renderRadioUI?.();
      } else if (status === "paused") {
        window.forcePauseRadioMedia?.();
        window.renderRadioUI?.();
      }
    } catch (error) {
      console.warn("Remote radio stop enforcement failed", error);
    }
  }

  async function syncRemoteAdminSettings(showNotice = false) {
    try {
      const response = await fetch("/api/admin/settings/public", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.settings || typeof data.settings !== "object") return false;
      try { localStorage.setItem("rivoAdminConfigV1", JSON.stringify(data.settings)); } catch {}
      if (typeof window.refreshChatFromAdmin === "function") {
        window.refreshChatFromAdmin(data.settings, showNotice);
      } else if (typeof window.applyExternalAdminConfig === "function") {
        window.applyExternalAdminConfig(showNotice, data.settings);
      }
      enforceRemoteRadioCommand(data.settings);
      return true;
    } catch (error) {
      console.warn("Admin settings sync failed", error);
      return false;
    }
  }

  async function handleEvent(data) {
    switch (data.type) {
      case "admin-settings": {
        const settings = data.settings && typeof data.settings === "object" ? data.settings : null;
        if (settings) {
          try { localStorage.setItem("rivoAdminConfigV1", JSON.stringify(settings)); } catch {}
          if (typeof window.refreshChatFromAdmin === "function") window.refreshChatFromAdmin(settings, false);
          else if (typeof window.applyExternalAdminConfig === "function") window.applyExternalAdminConfig(false, settings);
          enforceRemoteRadioCommand(settings);
        }
        break;
      }
      case "init": {
        await ensureAvatarSettings([data.self?.avatar, ...(Array.isArray(data.users) ? data.users.map((u) => u?.avatar) : [])]);
        live.self = { ...data.self, isGuest: live.identity?.type === "guest", verified: live.identity?.type === "google" };
        live.roomId = data.room?.id || live.roomId;
        state.room = live.roomId;
        saveActiveRoom(live.roomId);
        live.roomControls = { ...live.roomControls, ...(data.roomControls || {}) };
        syncUsers(data.users || []);
        if (live.ignoreHistoryOnce) {
          state.messages = [];
          startFreshRoomConversation(live.roomId);
          clearRoomSnapshot(live.roomId);
          live.ignoreHistoryOnce = false;
        } else {
          hydrateHistory(Array.isArray(data.messages) ? data.messages : []);
        }
        renderMessages();
        hideEntryScreen();
        setConnection("connected", "متصل");
        updateMicButtons();
        updateGoogleSessionUI();
        restoreAdminMessages();
        requestAnimationFrame(() => { const box = byId("messages"); if (box) box.scrollTop = box.scrollHeight; });
        break;
      }
      case "presence":
        await ensureAvatarSettings((data.users || []).map((user) => user?.avatar));
        syncUsers(data.users || []);
        break;
      case "message":
        appendLiveMessage(data.message || {});
        break;
      case "profile-updated":
        await ensureAvatarSettings(data.avatar);
        updateUserPatch(data.clientId, data);
        break;
      case "profile-saved":
        live.pendingProfilePatch = null;
        await ensureAvatarSettings(data.avatar);
        updateUserPatch(data.clientId, data);
        break;
      case "badge-updated":
        applyBadge(data.clientId, data.badge);
        break;
      case "badge-session":
        if (data.clientId === state.user?.id) {
          if (data.token) sessionStorage.setItem(BADGE_TOKEN_KEY, data.token);
          else sessionStorage.removeItem(BADGE_TOKEN_KEY);
          applyBadge(data.clientId, data.badge);
        }
        break;
      case "gift-animation":
        showGiftEvent(data);
        break;
      case "admin-direct-message":
        showAdminDirectMessage(data.message || {});
        break;
      case "admin-private-reply-sent":
        toast(data.message || (data.delivered ? "تم إرسال ردك إلى الإدارة" : "لوحة الإدارة غير متصلة الآن"));
        break;
      case "private-request": {
        live.pendingPrivate = data;
        enqueuePrivateRequest(data);
        break;
      }
      case "private-request-sent":
        toast("تم إرسال طلب المحادثة الخاصة");
        break;
      case "private-started":
        completeAcceptedPrivateRequest();
        openPrivateSession(data.peer || { clientId: data.with, nickname: "مستخدم", avatar: "guest" });
        break;
      case "private-message":
        handlePrivateMessage(data.message || {});
        break;
      case "private-ended":
      case "private-rejected":
      case "private-denied":
        live.privatePeer = null;
        byId("privateChatWindow")?.classList.add("hidden");
        toast(data.message || "انتهت المحادثة الخاصة");
        break;
      case "room-controls":
        live.roomControls = { ...live.roomControls, ...data };
        updateMicButtons();
        break;
      case "mic-state":
        await handleMicState(data);
        break;
      case "mic-denied":
      case "mic-forced-release":
        await stopLocalMic();
        toast(data.message || "المايك غير متاح الآن");
        break;
      case "audio-opus":
      case "audio-opus-end":
        live.relay?.handleEvent(data);
        break;
      case "spam-warning":
      case "error":
      case "admin-error":
        toast(data.message || "تعذر تنفيذ العملية");
        break;
      case "admin-kick":
      case "staff-revoked":
        toast(data.message || "تم إنهاء الجلسة");
        logoutLive(false);
        break;
      case "vip-state":
        if (state.user) {
          state.user.vip = Boolean(data.active);
          state.user.plan = data.active ? "vip" : "user";
          renderAll();
        }
        break;
      case "room-radio-state":
        handleRadioState(data);
        break;
      case "pong":
        live.lastPongAt = Date.now();
        break;
      default:
        break;
    }
  }

  function ensureRelay() {
    if (live.relay || !window.RivoRelayAudio) return live.relay;
    const adapter = { isReady: socketReady, send };
    live.relay = new window.RivoRelayAudio({
      getProfile: () => ({ clientId: state.user?.id || "" }),
      getTransport: () => adapter,
      onRemoteCount: (count) => {
        const button = byId("soundBtn");
        if (button && count) button.textContent = "🔊 صوت مباشر";
      },
      onError: (message) => toast(message || "تعذر تشغيل الصوت")
    });
    return live.relay;
  }

  async function requestMic() {
    if (!state.user) return;
    if (state.user.authType === "guest") {
      toast("المايك يحتاج تسجيل الدخول بحساب Google");
      return;
    }
    if (live.roomControls.publicMicEnabled === false) {
      toast("الإدارة أغلقت مايك الغرفة");
      return;
    }
    ensureRelay();
    await live.relay?.unlock().catch(() => {});
    if (live.micHolder === state.user.id) send({ type: "mic-release" });
    else send({ type: "mic-claim" });
  }

  async function handleMicState(data) {
    live.micHolder = data.active ? data.clientId : "";
    if (data.active) {
      const user = state.users.find((u) => u.id === data.clientId);
      if (user) state.stage = [{ user: user.id, mode: "audio" }];
      if (data.clientId === state.user?.id) {
        try {
          live.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          ensureRelay();
          await live.relay.startCapture(live.micStream);
          toast("تم تشغيل المايك");
        } catch (error) {
          send({ type: "mic-release" });
          toast("لم يسمح المتصفح باستخدام المايك");
        }
      }
    } else {
      state.stage = state.stage.filter((item) => item.user !== data.clientId);
      if (data.clientId === state.user?.id || !data.clientId) await stopLocalMic();
    }
    renderStage();
    updateMicButtons();
  }

  async function stopLocalMic() {
    try { await live.relay?.stopCapture(); } catch {}
    live.micStream?.getTracks?.().forEach((track) => track.stop());
    live.micStream = null;
    if (live.micHolder === state.user?.id) live.micHolder = "";
    updateMicButtons();
  }

  function updateMicButtons() {
    const mine = Boolean(state.user && live.micHolder === state.user.id);
    const busy = Boolean(live.micHolder && !mine);
    const topButton = byId("micBtn");
    const composerButton = byId("composerMicBtn");
    [topButton, composerButton].filter(Boolean).forEach((button) => {
      button.classList.toggle("liveMicActive", mine);
      button.classList.toggle("liveMicBusy", busy);
    });
    if (topButton) topButton.textContent = mine ? "🔴 إيقاف المايك" : busy ? "🎙️ المايك مشغول" : "🎙️ المايك";
    if (composerButton) {
      const label = composerButton.querySelector("[data-mic-label]");
      if (label) label.textContent = mine ? "إيقاف" : busy ? "مشغول" : "المايك";
      composerButton.title = mine ? "إيقاف المايك" : busy ? "المايك مشغول" : "المايك";
      composerButton.setAttribute("aria-label", composerButton.title);
    }
  }

  function handleRadioState(data) {
    // إعدادات لوحة المالك هي المصدر الرئيسي. نتجاهل أي حالة قديمة محفوظة في إذاعة الغرفة.
    if (state.radioBroadcast && state.radioBroadcast.status !== "stopped" && state.radioBroadcast.source) {
      try { renderRadioUI(); } catch {}
      return;
    }
    const widget = byId("radioWidget"), track = byId("radioTrack"), status = byId("radioState");
    if (!widget || !track || !status) return;
    if (!data.active) { track.textContent = "لا يوجد بث الآن"; status.textContent = "متوقف"; return; }
    track.textContent = data.title || "راديو ريفو";
    status.textContent = data.paused ? "متوقف مؤقتاً" : "يبث الآن";
    if (data.sourceType === "audio" && data.audioUrl) {
      const audio = byId("globalRadioAudio");
      if (audio && audio.src !== data.audioUrl) audio.src = data.audioUrl;
    }
  }

  async function enterGuest() {
    const profile = profileFromEntry();
    if (!profile) return;
    showEntryError("جاري إنشاء جلسة الضيف…");
    try {
      const response = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        cache: "no-store",
        body: JSON.stringify({ deviceId: getDeviceId() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.sessionToken) throw new Error(data.error || "تعذر دخول الضيف");
      const identity = {
        type: "guest", role: "user", name: profile.name, avatar: profile.avatar,
        authToken: data.sessionToken, clientId: data.googleUid || getDeviceId(), visible: true,
        expiresAt: Number(data.expiresAt || 0)
      };
      saveProfile(profile);
      saveIdentity(identity);
      live.ignoreHistoryOnce = true;
      const requestedRoom = profile.roomId || state.room || live.roomId;
      await fetchRooms(false);
      selectEntryRoomLive(requestedRoom, true);
      hideEntryScreen();
      connect(live.roomId);
    } catch (error) {
      showEntryError(error.message || "تعذر دخول الضيف");
    }
  }

  function prepareGoogleButton() {
    const mount = byId("googleSignInButton");
    const status = byId("googleLoginStatus");
    if (!mount || !window.RivoGoogleAuth) return false;
    const profile = profileFromEntry();
    if (!profile) return false;
    const current = window.RivoGoogleAuth.loadSession();
    if (current) {
      finishGoogleLogin(current, profile);
      return true;
    }
    open("googleAuthModal");
    status.textContent = "جاري تجهيز تسجيل Google…";
    const render = async () => {
      const ok = await window.RivoGoogleAuth.renderButton(
        mount,
        (session) => finishGoogleLogin(session, profile),
        (message) => {
          status.textContent = message || "فشل تسجيل Google";
          status.classList.add("googleLoginError");
        },
        (message) => {
          status.textContent = message || "جاري تسجيل الدخول…";
          status.classList.remove("googleLoginError");
        }
      );
      live.googlePrepared = Boolean(ok);
    };
    render();
    return true;
  }

  async function finishGoogleLogin(session, profile) {
    const status = byId("googleLoginStatus");
    if (status) status.textContent = "تم تسجيل الدخول، جاري فتح الدردشة…";
    const identity = {
      type: "google", role: "user", name: profile.name, avatar: profile.avatar,
      authToken: session.sessionToken, clientId: session.googleUid, visible: true,
      expiresAt: Number(session.expiresAt || 0), email: session.email || ""
    };
    saveProfile(profile);
    saveIdentity(identity);
    live.ignoreHistoryOnce = true;
    const requestedRoom = profile.roomId || state.room || live.roomId;
    await fetchRooms(false);
    selectEntryRoomLive(requestedRoom, true);
    close("googleAuthModal");
    hideEntryScreen();
    connect(live.roomId);
  }

  async function staffLogin(role, code) {
    const profile = loadProfile() || { name: role === "owner" ? "الإدارة" : "مراقب", avatar: role === "owner" ? "owner" : "entry1" };
    const response = await fetch("/api/auth/staff", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      cache: "no-store",
      body: JSON.stringify({ code, role })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.staffSessionToken) throw new Error(data.error || "رمز الدخول غير صحيح");
    const identity = {
      type: role, role, name: data.name || (role === "owner" ? "الإدارة" : "مراقب"),
      avatar: role === "owner" ? "owner" : avatarId(profile.avatar),
      staffSessionToken: data.staffSessionToken, staffClientId: data.staffId,
      clientId: data.staffId, visible: true, expiresAt: Number(data.expiresAt || 0)
    };
    const panelIdentity = {
      staffSessionToken: identity.staffSessionToken,
      staffExpiresAt: identity.expiresAt,
      role,
      clientId: identity.staffClientId,
      visible: true,
      token: ""
    };
    try { localStorage.setItem(role === "owner" ? OWNER_STORAGE_KEY : MOD_STORAGE_KEY, JSON.stringify(panelIdentity)); } catch {}
    saveIdentity(identity);
    live.ignoreHistoryOnce = true;
    const requestedRoom = state.room || live.roomId;
    await fetchRooms(false);
    selectEntryRoomLive(requestedRoom, true);
    hideEntryScreen();
    connect(live.roomId);
  }

  async function enterOwner() {
    const code = prompt("اكتب رمز دخول الإدارة");
    if (!code) return;
    showEntryError("جاري التحقق من رمز الإدارة…");
    try {
      await staffLogin("owner", code.trim());
      showEntryError("");
    } catch (error) {
      showEntryError(error.message || "رمز الإدارة غير صحيح");
    }
  }

  async function enterModerator() {
    const code = String(byId("moderatorCodeInput")?.value || "").trim();
    if (!code) { toast("اكتب رمز المراقب"); return; }
    const button = byId("moderatorEnterBtn");
    if (button) button.disabled = true;
    try {
      await staffLogin("moderator", code);
      close("moderatorLoginModal");
      byId("moderatorCodeInput").value = "";
    } catch (error) {
      toast(error.message || "رمز المراقب غير صحيح");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function switchRoomLive(id) {
    if (!live.identity) return;
    const next = id === "general" ? "lobby" : id;
    const roomMeta = state.rooms.find((room) => room.id === next);
    if (roomMeta?.full && !state.user?.vip && !["owner", "moderator"].includes(userAccessRole(state.user))) {
      toast("الغرفة ممتلئة الآن. اختر غرفة أخرى.");
      return;
    }
    clearRoomSnapshot(state.room);
    clearRoomSnapshot(next);
    state.activeNameGifts = {};
    live.roomId = next;
    state.room = next;
    saveActiveRoom(next);
    setRoomCutoff(next, Date.now());
    state.messages = [];
    startFreshRoomConversation(next);
    live.ignoreHistoryOnce = true;
    renderAll();
    setSideTab("users");
    await connect(next);
  }

  function expandLiveMessageShortcuts(value) {
    const raw = String(value ?? "");
    try {
      if (typeof replaceMessageShortcuts === "function") {
        return replaceMessageShortcuts(raw);
      }
    } catch (_) {}
    return raw;
  }

  function sendMessageLive() {
    const input = byId("messageInput");
    const body = expandLiveMessageShortcuts(input?.value || "").trim();
    if (!body) return;
    if (!live.identity) { showEntryScreen(); return; }
    if (body.length > 800) { toast("الرسالة طويلة جداً"); return; }
    if (send({ type: "chat", body, color: normalizeColor(state.color) })) input.value = "";
  }

  function openPrivateLive(userId) {
    const target = state.users.find((user) => user.id === userId);
    if (!target || target.id === state.user?.id) return;
    if (state.user?.authType === "guest") { toast("الرسائل الخاصة تحتاج تسجيل الدخول بحساب Google"); return; }
    const ownerOverride = ["owner"].includes(userAccessRole(state.user || {}));
    if (target.privateOpen === false && !ownerOverride) { toast("هذا المستخدم أغلق الرسائل الخاصة"); return; }
    send({ type: "private-request", to: target.id });
  }

  function sendPrivateLive() {
    const input = byId("privateMessageInput");
    const body = expandLiveMessageShortcuts(input?.value || "").trim();
    if (!body) return;
    if (state.privateTarget === "rivo-admin") {
      if (!send({ type: "admin-private-reply", body })) return;
      addAdminStoredMessage({
        id: `reply-${Date.now()}-${Math.random()}`,
        senderId: state.user?.id || live.identity?.clientId || "me",
        senderNickname: state.user?.name || live.identity?.nickname || "أنا",
        senderAvatar: state.user?.avatar || live.identity?.avatar || "guest",
        recipientId: "owner-main",
        body,
        createdAt: Date.now(),
        read: true,
        mine: true
      });
      syncAdminPrivateConversation();
      if (typeof renderPrivateMessages === "function") renderPrivateMessages();
      if (typeof renderPrivateInbox === "function") renderPrivateInbox();
      input.value = "";
      return;
    }
    if (!live.privatePeer) return;
    if (send({ type: "private-chat", to: live.privatePeer.clientId, body })) input.value = "";
  }

  function closePrivateLive() {
    if (state.privateTarget === "rivo-admin") {
      byId("privateChatWindow")?.classList.add("hidden");
      return;
    }
    if (live.privatePeer) send({ type: "private-end", with: live.privatePeer.clientId });
    live.privatePeer = null;
    byId("privateChatWindow")?.classList.add("hidden");
  }

  function grantBadgeLive(badgeId) {
    if (!state.target) return;
    const backendBadge = FREE_BADGE_MAP[badgeId] || badgeId;
    const target = state.users.find((u) => u.id === state.target);
    if (!["owner", "moderator"].includes(userAccessRole(state.user))) {
      toast("الشارات المجانية للإدارة والمراقب فقط");
      return;
    }
    send({ type: "admin-command", action: "set-user-badge", clientId: state.target, nickname: target?.name || "", badge: backendBadge });
    close("freeBadgeModal");
  }

  function removeBadgeLive() {
    const target = state.users.find((u) => u.id === state.target);
    send({ type: "admin-command", action: "set-user-badge", clientId: state.target, nickname: target?.name || "", badge: "" });
    close("freeBadgeModal");
  }

  function openGiftsLive(userId) {
    const target = state.users.find((u) => u.id === userId);
    if (!target) return;
    state.target = userId;
    byId("giftTarget").textContent = target.name || "المستخدم";
    const allowed = ["star", "diamond", "rose", "butterfly", "heart", "emerald", "moon", "pinkHeart", "crystal", "medal", "wings", "flame", "galaxy"];
    byId("giftCatalog").innerHTML = allowed.map((id) => {
      const gift = BADGES[id];
      return `<div class="giftItem"><span class="giftIcon">${gift.icon}</span><b>${gift.name}</b><small>${state.user?.vip ? "هدية VIP" : "منح إداري"}</small><button data-live-gift="${id}">إرسال</button></div>`;
    }).join("");
    byId("giftCatalog").querySelectorAll("[data-live-gift]").forEach((button) => {
      button.onclick = () => sendGiftLive(button.dataset.liveGift);
    });
    open("giftModal");
  }

  function sendGiftLive(gift) {
    const target = state.users.find((u) => u.id === state.target);
    if (!target) return;
    const role = userAccessRole(state.user);
    if (["owner", "moderator"].includes(role)) {
      send({ type: "admin-command", action: "set-user-badge", clientId: target.id, nickname: target.name || "", badge: gift });
    } else if (state.user?.vip) {
      send({ type: "vip-gift", to: target.id, gift });
    } else {
      toast("إرسال الهدايا متاح حالياً للإدارة والمراقبين وأعضاء VIP");
      return;
    }
    close("giftModal");
  }

  function saveOwnerIdentityLive() {
    if (userAccessRole(state.user) !== "owner") return;
    const crownOnly = Boolean(byId("ownerCrownOnly")?.checked);
    const typed = String(byId("ownerDisplayName")?.value || "").trim().slice(0, 24);
    const name = crownOnly ? CROWN_ONLY_NAME : (typed || "الإدارة");
    send({ type: "admin-command", action: "update-staff-name", name });
    close("ownerIdentityModal");
  }

  function toggleVisibilityLive() {
    if (!["owner", "moderator"].includes(userAccessRole(state.user))) return;
    send({ type: "admin-command", action: "set-staff-visible", visible: Boolean(state.user?.isHidden) });
  }

  async function logoutLive(clearGoogle = false) {
    closeSocket("logout");
    clearTimeout(live.reconnectTimer);
    await stopLocalMic();
    try { await live.relay?.destroy(); } catch {}
    live.relay = null;
    const oldType = live.identity?.type;
    clearIdentity();
    if (clearGoogle && oldType === "google") window.RivoGoogleAuth?.clearSession?.();
    live.self = null;
    state.user = null;
    state.users = [];
    state.messages = [];
    state.privateUnread = {};
    state.privateChats = {};
    state.inbox = { messages: 0, alerts: 0 };
    state.activeNameGifts = {};
    state.stage = [];
    renderAll();
    updatePrivateBadge();
    updateGoogleSessionUI();
    showEntryScreen();
    setConnection("disconnected", "بانتظار الدخول");
  }

  function openAdminPanel() {
    const role = userAccessRole(state.user);
    if (role === "owner") location.href = `./admin-design.html?room=${encodeURIComponent(state.room)}`;
    else if (role === "moderator") location.href = `./moderator.html?room=${encodeURIComponent(state.room)}`;
  }

  window.addEventListener("rivo-entry-room-selected", (event) => {
    const roomId = event?.detail?.roomId;
    if (!roomId || live.identity) return;
    selectEntryRoomLive(roomId, true);
  });

  function bindLiveUI() {
    enterFromEntry = (type) => type === "guest" ? enterGuest() : prepareGoogleButton();
    googleLogin = prepareGoogleButton;
    ownerLogin = enterOwner;
    moderatorLogin = enterModerator;
    guestLogin = enterGuest;
    switchRoom = switchRoomLive;
    sendMessage = sendMessageLive;
    openPrivateChat = openPrivateLive;
    sendPrivateMessage = sendPrivateLive;
    closePrivateChat = closePrivateLive;
    grantFreeBadge = grantBadgeLive;
    removeFreeBadge = removeBadgeLive;
    openGifts = openGiftsLive;
    sendGift = sendGiftLive;
    saveOwnerIdentity = saveOwnerIdentityLive;
    toggleMyVisibility = toggleVisibilityLive;
    logoutChat = logoutLive;

    if (byId("sendBtn")) byId("sendBtn").onclick = sendMessageLive;
    if (byId("logoutBtn")) byId("logoutBtn").onclick = (event) => { event.stopPropagation(); logoutLive(false); };
    if (byId("changeGoogleAccountBtn")) byId("changeGoogleAccountBtn").onclick = changeGoogleAccount;
    if (byId("moderatorEnterBtn")) byId("moderatorEnterBtn").onclick = enterModerator;
    if (byId("ownerIdentitySave")) byId("ownerIdentitySave").onclick = saveOwnerIdentityLive;
    if (byId("visibilityBtn")) byId("visibilityBtn").onclick = (event) => { event.stopPropagation(); toggleVisibilityLive(); };
    if (byId("privateSendBtn")) byId("privateSendBtn").onclick = sendPrivateLive;
    if (byId("privateCloseBtn")) byId("privateCloseBtn").onclick = closePrivateLive;
    if (byId("removeFreeBadgeBtn")) byId("removeFreeBadgeBtn").onclick = removeBadgeLive;
    if (byId("adminBtn")) byId("adminBtn").onclick = (event) => { event.stopPropagation(); openAdminPanel(); };
    [byId("micBtn"), byId("composerMicBtn")].filter(Boolean).forEach((button) => button.onclick = requestMic);
    [byId("cameraBtn"), byId("composerCameraBtn")].filter(Boolean).forEach((button) => button.onclick = () => toast("كاميرا الغرفة ستُربط في التحديث التالي"));
    if (byId("soundBtn")) byId("soundBtn").onclick = async () => {
      const relay = ensureRelay();
      await relay?.unlock().catch(() => {});
      const muted = relay?.setMuted(!relay.isMuted());
      byId("soundBtn").textContent = muted ? "🔇 الصوت مكتوم" : "🔊 صوت الغرفة";
    };
    if (byId("radioBtn")) byId("radioBtn").onclick = () => {
      try { toggleRadioListener(); } catch { toast("تعذر تشغيل البث الآن"); }
    };
  }

  async function boot() {
    state.users = [];
    state.messages = [];
    state.privateUnread = {};
    state.privateChats = {};
    state.inbox = { messages: 0, alerts: 0 };
    state.activeNameGifts = {};
    state.rooms = [mapRoom({ id: "lobby", name: "العامة", count: 0 })];
    live.roomId = loadActiveRoom() || "lobby";
    state.room = live.roomId;
    bindLiveUI();
    const savedProfile = loadProfile();
    if (savedProfile) {
      if (byId("entryName")) byId("entryName").value = savedProfile.name || "";
      if (savedProfile.avatar) state.entryAvatar = savedProfile.avatar;
    }
    const restoredIdentity = loadIdentity();
    updateGoogleSessionUI();
    await fetchRooms(false);
    await syncRemoteAdminSettings(false);
    // إعادة تحقق قصيرة بعد اكتمال تحميل الواجهة، ثم يبقى WebSocket هو التحديث الفوري.
    setTimeout(() => syncRemoteAdminSettings(false), 1800);
    if (savedProfile?.avatar) state.entryAvatar = avatarId(savedProfile.avatar);
    renderEntryAvatarChoices();
    if (restoredIdentity && savedProfile && !["owner", "moderator"].includes(restoredIdentity.role || restoredIdentity.type)) {
      restoredIdentity.name = savedProfile.name || restoredIdentity.name;
      restoredIdentity.avatar = avatarId(savedProfile.avatar || restoredIdentity.avatar);
      saveIdentity(restoredIdentity);
    }
    live.roomId = state.rooms.some((room) => room.id === live.roomId) ? live.roomId : (state.rooms[0]?.id || "lobby");
    state.room = live.roomId;
    if (restoredIdentity && getRoomCutoff(live.roomId) <= 0) setRoomCutoff(live.roomId, Date.now());
    restoreRoomSnapshot(live.roomId);
    try {
      renderAll();
      updatePrivateBadge();
    } catch (error) {
      console.error("Rivo initial render recovered", error);
      if (!state.rooms?.length) state.rooms = [mapRoom({ id: "lobby", name: "العامة", count: 0 })];
      state.room = state.rooms.some((room) => room.id === live.roomId) ? live.roomId : state.rooms[0].id;
      try { renderRooms(); } catch {}
      try { renderHeader(); } catch {}
    }
    try { syncLiveChrome(); } catch (error) { console.warn("Rivo chrome sync skipped", error); }
    clearInterval(live.roomsTimer);
    live.roomsTimer = setInterval(() => fetchRooms(false), 15000);
    clearInterval(live.adminSettingsTimer);
    live.adminSettingsTimer = setInterval(() => syncRemoteAdminSettings(false), 30000);
    if (restoredIdentity) {
      live.identity = restoredIdentity;
      hideEntryScreen();
      setConnection("connecting", "استعادة الجلسة…");
      await connect(live.roomId);
    } else {
      setConnection("disconnected", "بانتظار الدخول");
      showEntryScreen();
    }

    const sendExplicitLeave = (reason = "pagehide") => {
      if (live.pageLeaving) return;
      live.pageLeaving = true;
      const socket = live.socket;
      if (socket && socket.readyState === WebSocket.OPEN) {
        try { socket.send(JSON.stringify({ type: "leave", reason, at: Date.now() })); } catch {}
      }
    };

    window.addEventListener("online", () => scheduleReconnect(true));
    window.addEventListener("offline", () => setConnection("disconnected", "بانتظار الإنترنت"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        syncRemoteAdminSettings(false);
        if (live.identity && !socketReady()) scheduleReconnect(true);
      }
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && live.identity && !socketReady()) scheduleReconnect(true);
    });
    window.addEventListener("pagehide", () => {
      saveRoomSnapshot(state.room);
      if (live.identity) saveIdentity(live.identity);
      sendExplicitLeave("pagehide");
    });
    window.addEventListener("beforeunload", () => sendExplicitLeave("beforeunload"));
  }

  window.RivoLive = { live, connect, send, logout: logoutLive, updateProfile: updateProfileLive, selectEntryRoom: selectEntryRoomLive };
  boot().catch((error) => {
    console.error("Rivo live boot failed", error);
    setConnection("disconnected", "بانتظار الدخول");
    if (!state.rooms?.length) state.rooms = [mapRoom({ id: "lobby", name: "العامة", count: 0 })];
    try { renderAll(); } catch {}
    showEntryError("");
  });
})();
