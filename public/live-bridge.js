(() => {
  "use strict";

  if (new URLSearchParams(location.search).has("demo")) return;

  const LIVE_IDENTITY_KEY = "rivo_live_identity_v156";
  const BADGE_TOKEN_KEY = "rivo_badge_session_token_v1";
  const PROFILE_KEY = "rivo_live_profile_v156";
  const DEVICE_KEY = "rivo_guest_device_v1";
  const OWNER_STORAGE_KEY = "rivo_staff_identity_owner_v1";
  const MOD_STORAGE_KEY = "rivo_staff_identity_moderator_v1";
  const CROWN_ONLY_NAME = "__rivo_crown_only__";

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
    free_medal: "medal"
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
    googlePrepared: false
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
    return { name: name.slice(0, 24), avatar: avatarId(state.entryAvatar) };
  }
  function avatarId(value) {
    const raw = String(value || "").replace(/^\.\//, "");
    if (AVATAR_ID_BY_SOURCE[raw]) return AVATAR_ID_BY_SOURCE[raw];
    if (/^(entry[1-6]|lina|girl2|girl3|girl4|man1|avatar6|avatar7|owner|guest)$/.test(raw)) return raw;
    return "entry1";
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
    try { return safeParse(localStorage.getItem(PROFILE_KEY) || "null", null); } catch { return null; }
  }
  function saveIdentity(identity) {
    live.identity = identity;
    try { sessionStorage.setItem(LIVE_IDENTITY_KEY, JSON.stringify(identity)); } catch {}
  }
  function clearIdentity() {
    live.identity = null;
    try {
      sessionStorage.removeItem(LIVE_IDENTITY_KEY);
      sessionStorage.removeItem(BADGE_TOKEN_KEY);
    } catch {}
  }
  function getDeviceId() {
    let id = "";
    try { id = localStorage.getItem(DEVICE_KEY) || ""; } catch {}
    if (id.length < 8) {
      id = `rivo-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}-${Date.now()}`;
      try { localStorage.setItem(DEVICE_KEY, id); } catch {}
    }
    return id;
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

  function closeSocket(reason = "switch") {
    live.closing = true;
    clearTimeout(live.reconnectTimer);
    try { live.socket?.close(1000, reason); } catch {}
    live.socket = null;
    live.connected = false;
    setTimeout(() => { live.closing = false; }, 50);
  }

  async function connect(roomId = live.roomId) {
    if (!live.identity) return;
    closeSocket("reconnect");
    live.roomId = roomId === "general" ? "lobby" : roomId;
    state.room = live.roomId;
    state.messages = [];
    state.stage = [];
    startFreshRoomConversation(live.roomId);
    renderAll();
    setConnection("connecting", "جاري الاتصال");

    let socket;
    try {
      socket = new WebSocket(buildSocketUrl());
    } catch (error) {
      setConnection("disconnected", "تعذر الاتصال");
      toast(error.message || "تعذر فتح الاتصال");
      return;
    }
    live.socket = socket;

    socket.addEventListener("open", () => {
      live.reconnectAttempts = 0;
      setConnection("connected", "متصل");
      send({ type: "room-radio-state-request" });
    });

    socket.addEventListener("message", (event) => {
      const data = safeParse(event.data, null);
      if (data) handleEvent(data);
    });

    socket.addEventListener("close", (event) => {
      live.connected = false;
      setConnection("disconnected", "غير متصل");
      if (live.closing || !live.identity) return;
      if ([4003, 4004].includes(event.code)) {
        toast(event.reason || "تم إنهاء الجلسة بواسطة الإدارة");
        logoutLive(false);
        return;
      }
      const delay = Math.min(12000, 900 * (2 ** live.reconnectAttempts++));
      clearTimeout(live.reconnectTimer);
      live.reconnectTimer = setTimeout(() => connect(live.roomId), delay);
    });

    socket.addEventListener("error", () => setConnection("disconnected", "خطأ في الاتصال"));
  }

  function messageUserFromPayload(message) {
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
      state.users.push(user);
    }
    return user;
  }

  function appendLiveMessage(message) {
    messageUserFromPayload(message);
    if (message.presenceEvent) {
      appendRoomMessage({ type: "system", room: state.room, text: message.body, createdAt: message.createdAt });
    } else {
      appendRoomMessage({
        room: state.room,
        user: message.clientId,
        text: message.body,
        time: nowTime(message.createdAt),
        createdAt: message.createdAt
      });
    }
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
  }

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
    byId("privateChatName").textContent = cleanName(peer.nickname) || "مستخدم";
    byId("privateChatAvatar").src = av(peer.avatar || "guest");
    byId("privateChatStatus").textContent = "محادثة خاصة متصلة";
    renderPrivateMessages();
    byId("privateChatWindow")?.classList.remove("hidden", "minimized");
    bringPrivateWindowFront();
    setTimeout(() => byId("privateMessageInput")?.focus(), 70);
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

  async function handleEvent(data) {
    switch (data.type) {
      case "init": {
        live.self = { ...data.self, isGuest: live.identity?.type === "guest", verified: live.identity?.type === "google" };
        live.roomId = data.room?.id || live.roomId;
        state.room = live.roomId;
        state.messages = [];
        live.roomControls = { ...live.roomControls, ...(data.roomControls || {}) };
        syncUsers(data.users || []);
        startFreshRoomConversation(live.roomId);
        renderMessages();
        hideEntryScreen();
        setConnection("connected", "متصل");
        updateMicButtons();
        requestAnimationFrame(() => { const box = byId("messages"); if (box) box.scrollTop = box.scrollHeight; });
        break;
      }
      case "presence":
        syncUsers(data.users || []);
        break;
      case "message":
        appendLiveMessage(data.message || {});
        break;
      case "profile-updated":
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
      case "private-request": {
        live.pendingPrivate = data;
        const accept = confirm(`${data.fromNickname || "مستخدم"} يطلب محادثة خاصة. هل توافق؟`);
        send({ type: "private-response", requestId: data.requestId, accept });
        break;
      }
      case "private-request-sent":
        toast("تم إرسال طلب المحادثة الخاصة");
        break;
      case "private-started":
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
    [byId("micBtn"), byId("composerMicBtn")].filter(Boolean).forEach((button) => {
      button.classList.toggle("liveMicActive", mine);
      button.classList.toggle("liveMicBusy", busy);
      button.textContent = mine ? "🔴 إيقاف المايك" : busy ? "🎙️ المايك مشغول" : "🎙️ المايك";
    });
  }

  function handleRadioState(data) {
    const widget = byId("radioWidget");
    const track = byId("radioTrack");
    const status = byId("radioState");
    if (!widget || !track || !status) return;
    if (!data.active) {
      track.textContent = "لا يوجد بث الآن";
      status.textContent = "متوقف";
      return;
    }
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
      await fetchRooms(true);
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
    await fetchRooms(true);
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
    await fetchRooms(false);
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
    state.activeNameGifts = {};
    live.roomId = next;
    state.room = next;
    state.messages = [];
    renderAll();
    setSideTab("users");
    await connect(next);
  }

  function sendMessageLive() {
    const input = byId("messageInput");
    const body = String(input?.value || "").trim();
    if (!body) return;
    if (!live.identity) { showEntryScreen(); return; }
    if (body.length > 800) { toast("الرسالة طويلة جداً"); return; }
    if (send({ type: "chat", body })) input.value = "";
  }

  function openPrivateLive(userId) {
    const target = state.users.find((user) => user.id === userId);
    if (!target || target.id === state.user?.id) return;
    if (state.user?.authType === "guest") { toast("الرسائل الخاصة تحتاج تسجيل الدخول بحساب Google"); return; }
    if (target.privateOpen === false) { toast("هذا المستخدم أغلق الرسائل الخاصة"); return; }
    send({ type: "private-request", to: target.id });
  }

  function sendPrivateLive() {
    const input = byId("privateMessageInput");
    const body = String(input?.value || "").trim();
    if (!body || !live.privatePeer) return;
    if (send({ type: "private-chat", to: live.privatePeer.clientId, body })) input.value = "";
  }

  function closePrivateLive() {
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

  async function logoutLive(clearGoogle = true) {
    closeSocket("logout");
    clearTimeout(live.reconnectTimer);
    clearInterval(live.roomsTimer);
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
    state.activeNameGifts = {};
    state.stage = [];
    renderAll();
    showEntryScreen();
    setConnection("disconnected", "غير متصل");
  }

  function openAdminPanel() {
    const role = userAccessRole(state.user);
    if (role === "owner") location.href = `./admin.html?room=${encodeURIComponent(state.room)}`;
    else if (role === "moderator") location.href = `./moderator.html?room=${encodeURIComponent(state.room)}`;
  }

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
    if (byId("logoutBtn")) byId("logoutBtn").onclick = (event) => { event.stopPropagation(); logoutLive(); };
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
    if (byId("radioBtn")) byId("radioBtn").onclick = async () => {
      const audio = byId("globalRadioAudio");
      if (!audio?.src) { toast("لا يوجد بث الآن"); return; }
      if (audio.paused) { try { await audio.play(); } catch { toast("اضغط مرة أخرى للسماح بالصوت"); } }
      else audio.pause();
      renderRadioUI();
    };
  }

  async function boot() {
    state.users = [];
    state.messages = [];
    state.activeNameGifts = {};
    state.rooms = [mapRoom({ id: "lobby", name: "العامة", count: 0 })];
    state.room = "lobby";
    bindLiveUI();
    const savedProfile = loadProfile();
    if (savedProfile) {
      if (byId("entryName")) byId("entryName").value = savedProfile.name || "";
      if (savedProfile.avatar) state.entryAvatar = savedProfile.avatar;
      renderEntryAvatarChoices();
    }
    await fetchRooms(false);
    try {
      renderAll();
    } catch (error) {
      console.error("Rivo initial render recovered", error);
      if (!state.rooms?.length) state.rooms = [mapRoom({ id: "lobby", name: "العامة", count: 0 })];
      state.room = state.rooms.some((room) => room.id === live.roomId) ? live.roomId : state.rooms[0].id;
      try { renderRooms(); } catch {}
      try { renderHeader(); } catch {}
    }
    try { syncLiveChrome(); } catch (error) { console.warn("Rivo chrome sync skipped", error); }
    setConnection("disconnected", "بانتظار الدخول");
    clearInterval(live.roomsTimer);
    live.roomsTimer = setInterval(() => fetchRooms(false), 15000);
  }

  window.RivoLive = { live, connect, send, logout: logoutLive };
  boot().catch((error) => {
    console.error("Rivo live boot failed", error);
    setConnection("disconnected", "بانتظار الدخول");
    if (!state.rooms?.length) state.rooms = [mapRoom({ id: "lobby", name: "العامة", count: 0 })];
    try { renderAll(); } catch {}
    showEntryError("");
  });
})();
