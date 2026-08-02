(() => {
  "use strict";

  const CHARACTERS = Array.isArray(window.RIVO_CHARACTERS) ? window.RIVO_CHARACTERS : [];
  const ROOM_KEY = "rivo_active_room_v1";
  const DEFAULT_ROOM = "lobby";
  const ROOM_CAPACITY = 20;
  const PROFILE_KEY = "rivo_group_profile_v1";
  const DEMO_MESSAGES_KEY = "rivo_group_demo_messages_v1";
  const DEMO_PRIVATE_MESSAGES_KEY = "rivo_group_private_messages_v1";
  const CLIENT_ID_KEY = "rivo_group_client_id_v1";
  const LEGACY_STAFF_IDENTITY_KEY = "rivo_staff_identity_v1";
  const OWNER_STAFF_IDENTITY_KEY = "rivo_staff_identity_owner_v1";
  const MODERATOR_STAFF_IDENTITY_KEY = "rivo_staff_identity_moderator_v1";
  const DEMO_SETTINGS_KEY = "rivo_demo_room_controls_v1";
  const DEMO_MIC_BLOCKS_KEY = "rivo_demo_mic_blocks_v1";
  const DEMO_PRIVATE_BLOCKS_KEY = "rivo_demo_private_blocks_v1";
  const PENDING_AVATAR_KEY = "rivo_pending_avatar_v2";
  const LOCAL_PUBLIC_LIMIT = 200;
  const LOCAL_PRIVATE_LIMIT = 300;

  const $ = (id) => document.getElementById(id);
  const els = {
    joinScreen: $("joinScreen"),
    chatApp: $("chatApp"),
    joinForm: $("joinForm"),
    nicknameInput: $("nicknameInput"),
    joinButton: $("joinButton"),
    avatarGrid: $("avatarGrid"),
    googleLoginCard: $("googleLoginCard"),
    googleSignedOut: $("googleSignedOut"),
    googleSignedIn: $("googleSignedIn"),
    googleSignInButton: $("googleSignInButton"),
    googleLoginStatus: $("googleLoginStatus"),
    googleUserPicture: $("googleUserPicture"),
    googleUserName: $("googleUserName"),
    googleUserEmail: $("googleUserEmail"),
    googleLogoutButton: $("googleLogoutButton"),
    moderatorLoginOpen: $("moderatorLoginOpen"),
    moderatorLoginModal: $("moderatorLoginModal"),
    moderatorLoginBackdrop: $("moderatorLoginBackdrop"),
    moderatorLoginForm: $("moderatorLoginForm"),
    moderatorLoginClose: $("moderatorLoginClose"),
    moderatorCodeInput: $("moderatorCodeInput"),
    moderatorVisibleInput: $("moderatorVisibleInput"),
    moderatorLoginSubmit: $("moderatorLoginSubmit"),
    moderatorLoginStatus: $("moderatorLoginStatus"),
    messages: $("messages"),
    composer: $("composer"),
    messageInput: $("messageInput"),
    sendButton: $("sendButton"),
    emojiButton: $("emojiButton"),
    emojiPanel: $("emojiPanel"),
    voiceButton: $("voiceButton"),
    usersList: $("usersList"),
    onlineBadge: $("onlineBadge"),
    onlineCountSide: $("onlineCountSide"),
    onlineCountHeader: $("onlineCountHeader"),
    presenceStrip: $("presenceStrip"),
    presenceAvatars: $("presenceAvatars"),
    presenceCount: $("presenceCount"),
    roomsMenuButton: $("roomsMenuButton"),
    roomsModal: $("roomsModal"),
    closeRoomsModal: $("closeRoomsModal"),
    roomsList: $("roomsList"),
    currentRoomBadge: $("currentRoomBadge"),
    currentRoomName: $("currentRoomName"),
    vipJoinOpen: $("vipJoinOpen"),
    vipHeaderButton: $("vipHeaderButton"),
    vipModal: $("vipModal"),
    vipModalClose: $("vipModalClose"),
    vipStatusBox: $("vipStatusBox"),
    vipRequestButton: $("vipRequestButton"),
    myVipBadge: $("myVipBadge"),
    vipStealthButton: $("vipStealthButton"),
    vipGiftModal: $("vipGiftModal"),
    vipGiftClose: $("vipGiftClose"),
    vipGiftGrid: $("vipGiftGrid"),
    vipGiftTargetName: $("vipGiftTargetName"),
    connectionStatus: $("connectionStatus"),
    errorBanner: $("errorBanner"),
    typingBar: $("typingBar"),
    typingText: $("typingText"),
    myAvatarSide: $("myAvatarSide"),
    myNameSide: $("myNameSide"),
    changeProfileButton: $("changeProfileButton"),
    sidebar: $("sidebar"),
    openSidebar: $("openSidebar"),
    closeSidebar: $("closeSidebar"),
    sidebarBackdrop: $("sidebarBackdrop"),
    installButton: $("installButton"),
    mobileRoomsButton: $("mobileRoomsButton"),
    mobileVipButton: $("mobileVipButton"),
    mobileInstallButton: $("mobileInstallButton"),
    avatarLivePanel: $("avatarLivePanel"),
    closeAvatarStage: $("closeAvatarStage"),
    avatarStage: $("avatarStage"),
    avatarFallback: $("avatarFallback"),
    liveCharacterPortrait: $("liveCharacterPortrait"),
    liveCharacterName: $("liveCharacterName"),
    liveMicStatus: $("liveMicStatus"),
    toggleLiveMic: $("toggleLiveMic"),
    voiceMeterFill: $("voiceMeterFill"),
    modelLoading: $("modelLoading"),
    speakerBadgeText: $("speakerBadgeText"),
    liveStageNote: $("liveStageNote"),
    roomSoundButton: $("roomSoundButton"),
    roomSoundIcon: $("roomSoundIcon"),
    roomSoundLabel: $("roomSoundLabel"),
    remoteAudioCount: $("remoteAudioCount"),
    publicNavButton: $("publicNavButton"),
    privateNavButton: $("privateNavButton"),
    privateNavStatus: $("privateNavStatus"),
    privateUnreadBadge: $("privateUnreadBadge"),
    privateToggleButton: $("privateToggleButton"),
    roomSymbol: $("roomSymbol"),
    conversationTitle: $("conversationTitle"),
    conversationSubtitle: $("conversationSubtitle"),
    backToPublicButton: $("backToPublicButton"),
    privatePopup: $("privatePopup"),
    privatePopupHeader: $("privatePopupHeader"),
    privatePopupBody: $("privatePopupBody"),
    privatePopupAvatar: $("privatePopupAvatar"),
    privatePopupName: $("privatePopupName"),
    privatePopupStatus: $("privatePopupStatus"),
    privatePopupMessages: $("privatePopupMessages"),
    privatePopupForm: $("privatePopupForm"),
    privatePopupInput: $("privatePopupInput"),
    privatePopupSend: $("privatePopupSend"),
    privatePopupMinimize: $("privatePopupMinimize"),
    privatePopupExpand: $("privatePopupExpand"),
    privatePopupClose: $("privatePopupClose"),
    privatePopupCollapsedButton: $("privatePopupCollapsedButton"),
    privatePopupCollapsedAvatar: $("privatePopupCollapsedAvatar"),
    privatePopupCollapsedName: $("privatePopupCollapsedName"),
    privatePopupCollapsedUnread: $("privatePopupCollapsedUnread"),
    myCrownBadge: $("myCrownBadge"),
    myModeratorBadge: $("myModeratorBadge"),
    myModeratorRoleLabel: $("myModeratorRoleLabel"),
    moderatorPanelButton: $("moderatorPanelButton"),
    adminPanelButton: $("adminPanelButton"),
    privateRequestModal: $("privateRequestModal"),
    privateRequestAvatar: $("privateRequestAvatar"),
    privateRequestName: $("privateRequestName"),
    privateRequestAccept: $("privateRequestAccept"),
    privateRequestReject: $("privateRequestReject")
  };

  let profile = null;
  let selectedAvatar = (CHARACTERS.find((item) => item.isDefault) || CHARACTERS[0] || { id: "lina" }).id;
  let transport = null;
  let renderedMessageIds = new Set();
  let lastRenderedDay = "";
  let typingTimer = null;
  let typingSent = false;
  let activeTypers = new Map();
  let errorTimer = null;
  let deferredInstallPrompt = null;
  let micStream = null;
  let audioContext = null;
  let micSourceNode = null;
  let micAnalyser = null;
  let micFrame = null;
  let micActive = false;
  let laughPeaks = [];
  let lastPeakHigh = false;
  let stageMode = "none";
  let remoteSpeakerId = "";
  let lastVoiceBroadcastAt = 0;
  let voiceRoom = null;
  let relayAudio = null;
  let currentUsers = [];
  const presenceFirstSeen = new Map();
  let currentMicHolderId = "";
  let currentMicHolderName = "";
  let currentMicHolderAvatar = "";
  let pendingMicClaim = null;
  let conversationMode = "public";
  let activePrivateUser = null;
  let publicMessages = [];
  let privateMessagesByUser = new Map();
  let privateUnreadByUser = new Map();
  let privatePopupExpanded = false;
  let privatePopupMinimized = false;
  let privateSessionPeerId = "";
  let pendingPrivateRequest = null;
  let outgoingPrivateRequestTo = "";
  let roomPublicMicEnabled = true;
  let roomPrivateMicEnabled = false;
  let myMicBlocked = false;
  let myPrivateBlocked = false;
  let localPcmRelay = null;
  let smoothedVoiceLevel = 0;
  let remotePcmTimer = null;
  let googleSession = null;
  let localCleanupTimer = null;
  let localPersistCounter = 0;
  let localCleanupDebounce = null;
  let activeRoomId = sessionStorage.getItem(ROOM_KEY) || "";
  let activeRoomName = "العامة";
  let roomCatalog = [];
  let roomRefreshTimer = null;
  let vipRefreshTimer = null;
  let vipGiftTarget = null;
  let remoteStreamCount = 0;
  let relayRemoteCount = 0;
  let audioUnlockInstalled = false;

  function isStaffMode() {
    return new URLSearchParams(location.search).get("staff") === "1";
  }

  function googleRequired() {
    const config = window.RivoGoogleAuth?.config || window.RIVO_GOOGLE_CONFIG || {};
    return !isLocalDemo() && !isSharedLocalServer() && !isStaffMode() && config.requiredOnCloud !== false;
  }

  function syncGoogleUi() {
    if (!els.googleLoginCard) return;

    if (isLocalDemo() || isSharedLocalServer() || isStaffMode()) {
      els.googleLoginCard.classList.add("hidden");
      els.joinButton.disabled = false;
      return;
    }

    els.googleLoginCard.classList.remove("hidden");
    const signedIn = Boolean(googleSession?.googleUid && googleSession?.sessionToken);
    els.googleSignedOut.classList.toggle("hidden", signedIn);
    els.googleSignedIn.classList.toggle("hidden", !signedIn);
    els.joinButton.disabled = googleRequired() && !signedIn;

    if (signedIn) {
      els.googleUserName.textContent = googleSession.name || "مستخدم Google";
      els.googleUserEmail.textContent = googleSession.email || "";
      els.googleUserPicture.src = googleSession.picture || "./icons/icon-192.png";
    }
  }

  function syncVipUi() {
    const active = Boolean(profile?.isVip);
    els.myVipBadge?.classList.toggle("hidden", !active);
    els.vipStealthButton?.classList.toggle("hidden", !active);
    els.vipStealthButton?.classList.toggle("active", Boolean(active && profile?.vipStealth));
    if (els.vipStealthButton) {
      els.vipStealthButton.title = profile?.vipStealth ? "إيقاف تخفي VIP" : "تشغيل تخفي VIP";
      els.vipStealthButton.textContent = profile?.vipStealth ? "◉" : "◎";
    }
    if (els.vipHeaderButton) {
      els.vipHeaderButton.classList.toggle("active", active);
      const label = els.vipHeaderButton.querySelector("b");
      if (label) label.textContent = active ? "VIP مفعلة" : "VIP";
    }
  }

  function setVipStatus(message, state = "") {
    if (!els.vipStatusBox) return;
    els.vipStatusBox.textContent = message;
    els.vipStatusBox.className = `vip-status-box ${state}`.trim();
  }

  async function refreshVipStatus() {
    const token = googleSession?.sessionToken || profile?.googleSessionToken || "";
    if (!token || isLocalDemo() || isSharedLocalServer()) {
      if (profile?.isVip) setVipStatus("عضوية VIP مفعلة على هذا الحساب.", "active");
      return { active: Boolean(profile?.isVip), status: profile?.isVip ? "active" : "none" };
    }
    try {
      const response = await fetch("/api/vip/me", {
        method: "POST", headers: { "content-type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ authToken: token })
      });
      if (!response.ok) throw new Error(`vip ${response.status}`);
      const data = await response.json();
      const wasActive = Boolean(profile?.isVip);
      if (profile) {
        profile.isVip = Boolean(data.active);
        profile.vipExpiresAt = Number(data.expiresAt || 0);
        if (!profile.isVip) profile.vipStealth = false;
        saveProfile(profile);
        syncVipUi();
      }
      if (data.active) {
        const date = data.expiresAt > 0 ? new Date(data.expiresAt).toLocaleDateString("ar-IQ") : "بدون انتهاء";
        setVipStatus(`عضوية VIP مفعلة حتى ${date}.`, "active");
        if (els.vipRequestButton) { els.vipRequestButton.disabled = true; els.vipRequestButton.textContent = "عضوية VIP مفعلة"; }
      } else if (["requested", "approved", "awaiting_payment"].includes(data.status)) {
        const text = data.status === "requested" ? "طلبك وصل إلى الإدارة وينتظر المراجعة." : "وافقت الإدارة. الدفع ينتظر ربط بوابة الدفع.";
        setVipStatus(text, "pending");
        if (els.vipRequestButton) { els.vipRequestButton.disabled = true; els.vipRequestButton.textContent = "الطلب قيد المعالجة"; }
      } else {
        setVipStatus("عضوية واحدة بسعر 15$ شهرياً. أرسل الطلب إلى الإدارة.");
        if (els.vipRequestButton) { els.vipRequestButton.disabled = false; els.vipRequestButton.textContent = "طلب عضوية VIP"; }
      }
      if (profile && wasActive !== Boolean(data.active) && transport?.isReady?.()) {
        transport.close();
        connectTransport();
      }
      return data;
    } catch (error) {
      console.warn("VIP status unavailable", error);
      setVipStatus("تعذر قراءة حالة العضوية الآن. حاول لاحقاً.");
      return { active: false, status: "unknown" };
    }
  }

  async function openVipModal() {
    if (!els.vipModal) return;
    // A previous mobile close may set an inline display value. Always clear it before opening.
    els.vipModal.style.removeProperty("display");
    els.vipModal.classList.remove("hidden");
    els.vipModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (!googleSession?.sessionToken && !profile?.googleSessionToken && googleRequired()) {
      setVipStatus("سجّل الدخول بحساب Google أولاً، ثم أرسل طلب العضوية.");
      if (els.vipRequestButton) els.vipRequestButton.disabled = true;
      return;
    }
    await refreshVipStatus();
  }

  function closeVipModal(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    if (!els.vipModal) return;
    els.vipModal.classList.add("hidden");
    els.vipModal.setAttribute("aria-hidden", "true");
    // Inline display is a final safety net for mobile browsers with stale modal CSS.
    els.vipModal.style.display = "none";
    document.body.classList.remove("modal-open");
  }

  function bindReliableModalClose(target, handler) {
    if (!target) return;
    const close = (event) => handler(event);
    target.addEventListener("pointerdown", close, { capture: true });
    target.addEventListener("click", close, { capture: true });
    target.addEventListener("pointerup", close, { capture: true });
    target.addEventListener("touchstart", close, { capture: true, passive: false });
    target.addEventListener("touchend", close, { capture: true, passive: false });
  }

  function installVipCloseSafetyNet() {
    const closeFromDelegation = (event) => {
      const target = event.target?.closest?.("#vipModalClose, [data-close-vip='1']");
      if (!target || !els.vipModal?.contains(target)) return;
      closeVipModal(event);
    };
    // Delegation keeps the X working even if the modal is re-rendered or the browser restores stale nodes.
    document.addEventListener("pointerdown", closeFromDelegation, true);
    document.addEventListener("click", closeFromDelegation, true);
    document.addEventListener("touchstart", closeFromDelegation, { capture: true, passive: false });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.vipModal?.classList.contains("hidden")) closeVipModal(event);
    });
  }

  async function requestVipMembership() {
    const token = googleSession?.sessionToken || profile?.googleSessionToken || "";
    if (!token && googleRequired()) { setVipStatus("سجّل الدخول بحساب Google أولاً."); return; }
    if (isLocalDemo() || isSharedLocalServer()) {
      setVipStatus("الطلب يعمل بعد رفع الموقع على Cloudflare وتفعيل تسجيل Google.", "pending");
      return;
    }
    els.vipRequestButton.disabled = true;
    els.vipRequestButton.textContent = "جاري إرسال الطلب…";
    try {
      const response = await fetch("/api/vip/request", {
        method: "POST", headers: { "content-type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ authToken: token, nickname: profile?.nickname || els.nicknameInput.value || "مستخدم Rivo" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر إرسال الطلب");
      if (data.status === "active") setVipStatus("عضوية VIP مفعلة بالفعل.", "active");
      else setVipStatus("تم إرسال طلب VIP إلى لوحة الإدارة.", "pending");
      els.vipRequestButton.textContent = "تم إرسال الطلب";
    } catch (error) {
      setVipStatus(error.message || "تعذر إرسال الطلب.");
      els.vipRequestButton.disabled = false;
      els.vipRequestButton.textContent = "إعادة المحاولة";
    }
  }

  function openVipGift(user) {
    if (!profile?.isVip || !user) return;
    vipGiftTarget = user;
    if (els.vipGiftTargetName) els.vipGiftTargetName.textContent = user.nickname || "المستخدم";
    els.vipGiftModal?.classList.remove("hidden");
    els.vipGiftModal?.setAttribute("aria-hidden", "false");
  }

  function closeVipGift() {
    vipGiftTarget = null;
    els.vipGiftModal?.classList.add("hidden");
    els.vipGiftModal?.setAttribute("aria-hidden", "true");
  }

  function sendVipGift(gift) {
    if (!profile?.isVip || !vipGiftTarget || !transport?.isReady?.()) return;
    transport.send({ type: "vip-gift", to: vipGiftTarget.clientId, gift });
    closeVipGift();
  }

  async function initializeGoogleLogin() {
    googleSession = window.RivoGoogleAuth?.loadSession?.() || null;
    syncGoogleUi();

    if (!googleRequired() || googleSession) return;

    let attempts = 0;
    const tryRender = () => {
      attempts += 1;
      const ready = window.RivoGoogleAuth?.renderButton?.(
        els.googleSignInButton,
        (session) => {
          googleSession = session;
          els.googleLoginStatus.textContent = "تم تسجيل الدخول بنجاح.";
          syncGoogleUi();
        },
        (message) => {
          els.googleLoginStatus.textContent = message;
        }
      );

      if (!ready && attempts < 25 && window.RivoGoogleAuth?.configured?.()) {
        setTimeout(tryRender, 400);
      }
    };

    tryRender();
  }

  function mergeMessages(...groups) {
    const map = new Map();
    for (const group of groups) {
      for (const message of group || []) {
        if (!message?.id) continue;
        map.set(String(message.id), message);
      }
    }
    return [...map.values()]
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
  }

  async function hydratePublicLocal() {
    if (!profile || !window.RivoLocalData) return;
    const scopeId = profile.googleUid || profile.clientId;
    try {
      const local = await window.RivoLocalData.loadPublic(profile);
      if (!profile || (profile.googleUid || profile.clientId) !== scopeId) return;
      publicMessages = mergeMessages(local, publicMessages).slice(-LOCAL_PUBLIC_LIMIT);
      renderCurrentConversation();
    } catch (error) {
      console.warn("Local public history unavailable", error);
    }
  }

  async function hydratePrivateLocal(userId) {
    if (!profile || !window.RivoLocalData || !userId) return;
    const scopeId = profile.googleUid || profile.clientId;
    try {
      const local = await window.RivoLocalData.loadPrivate(profile, userId);
      if (!profile || (profile.googleUid || profile.clientId) !== scopeId) return;
      const current = getPrivateMessages(userId);
      setPrivateMessages(userId, mergeMessages(local, current).slice(-LOCAL_PRIVATE_LIMIT));
      if (activePrivateUser?.clientId === userId) renderPrivatePopup();
    } catch (error) {
      console.warn("Local private history unavailable", error);
    }
  }

  function scheduleBoundedLocalCleanup() {
    localPersistCounter += 1;
    if (localPersistCounter % 25 !== 0) return;
    clearTimeout(localCleanupDebounce);
    localCleanupDebounce = setTimeout(() => {
      if (profile) window.RivoLocalData?.cleanup?.(profile).catch(() => {});
    }, 1200);
  }

  function persistPublicMessage(message) {
    window.RivoLocalData?.savePublic?.(profile, message)
      .then(scheduleBoundedLocalCleanup)
      .catch(() => {});
  }

  function persistPrivateMessage(message) {
    window.RivoLocalData?.savePrivate?.(profile, message)
      .then(scheduleBoundedLocalCleanup)
      .catch(() => {});
  }

  function startLocalCleanup() {
    clearInterval(localCleanupTimer);
    window.RivoLocalData?.requestPersistentStorage?.().catch(() => {});
    window.RivoLocalData?.cleanup?.(profile).catch(() => {});
    localCleanupTimer = setInterval(() => {
      if (profile) window.RivoLocalData?.cleanup?.(profile).catch(() => {});
    }, 6 * 60 * 60 * 1000);
  }

  function loadStaffIdentity() {
    const params = new URLSearchParams(location.search);
    if (params.get("staff") !== "1") return null;

    try {
      const requestedRole = params.get("staffRole") === "owner" ? "owner" : (params.get("staffRole") === "moderator" ? "moderator" : "");
      const key = requestedRole === "owner" ? OWNER_STAFF_IDENTITY_KEY : requestedRole === "moderator" ? MODERATOR_STAFF_IDENTITY_KEY : LEGACY_STAFF_IDENTITY_KEY;
      const saved = JSON.parse(localStorage.getItem(key) || localStorage.getItem(LEGACY_STAFF_IDENTITY_KEY) || "null");
      const hasCode = Boolean(saved?.token);
      const hasSession = Boolean(
        saved?.staffSessionToken &&
        Number(saved?.staffExpiresAt || 0) > Date.now()
      );
      if ((!hasCode && !hasSession) || !["owner", "moderator"].includes(saved.role)) return null;
      return {
        token: String(saved.token || ""),
        staffSessionToken: String(saved.staffSessionToken || ""),
        role: saved.role,
        visible: saved.visible !== false,
        clientId: String(saved.clientId || ""),
        name: String(saved.name || "")
      };
    } catch {
      return null;
    }
  }


  function setModeratorLoginStatus(message = "", isError = true) {
    if (!els.moderatorLoginStatus) return;
    els.moderatorLoginStatus.textContent = message;
    els.moderatorLoginStatus.classList.toggle("hidden", !message);
    els.moderatorLoginStatus.classList.toggle("success", Boolean(message) && !isError);
  }

  function openModeratorLogin() {
    if (!els.moderatorLoginModal) return;
    setModeratorLoginStatus("");
    els.moderatorLoginModal.classList.remove("hidden");
    els.moderatorLoginModal.setAttribute("aria-hidden", "false");
    setTimeout(() => els.moderatorCodeInput?.focus(), 50);
  }

  function closeModeratorLogin() {
    if (!els.moderatorLoginModal) return;
    els.moderatorLoginModal.classList.add("hidden");
    els.moderatorLoginModal.setAttribute("aria-hidden", "true");
    if (els.moderatorCodeInput) els.moderatorCodeInput.value = "";
    setModeratorLoginStatus("");
  }

  function setModeratorLoginBusy(busy) {
    if (!els.moderatorLoginSubmit) return;
    els.moderatorLoginSubmit.disabled = busy;
    els.moderatorLoginSubmit.textContent = busy ? "جاري التحقق…" : "التحقق والدخول";
  }

  async function authenticateModeratorFromMain(code) {
    if (isLocalDemo()) {
      throw new Error("شغّل START_RIVO_CHAT.bat أولاً، ثم ادخل من الصفحة التي يفتحها الخادم.");
    }

    const local = isSharedLocalServer();
    const endpoint = local ? "/api/local/staff-login" : "/api/auth/staff";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      cache: "no-store",
      body: JSON.stringify(local ? { code } : { code, role: "moderator" })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.role !== "moderator") {
      throw new Error(data.error || data.message || "رمز المراقب غير صحيح أو متوقف أو منتهي.");
    }

    return data;
  }

  async function handleModeratorMainLogin(event) {
    event.preventDefault();
    const code = String(els.moderatorCodeInput?.value || "").trim();
    if (!code) return;

    setModeratorLoginBusy(true);
    setModeratorLoginStatus("");

    try {
      const data = await authenticateModeratorFromMain(code);
      const identity = {
        token: isSharedLocalServer() ? code : "",
        staffSessionToken: String(data.staffSessionToken || ""),
        staffExpiresAt: Number(data.expiresAt || data.sessionExpiresAt || 0),
        accountExpiresAt: Number(data.accountExpiresAt || 0),
        role: "moderator",
        visible: els.moderatorVisibleInput?.checked !== false,
        clientId: String(data.staffId || ""),
        name: String(data.name || "مراقب")
      };

      localStorage.setItem(MODERATOR_STAFF_IDENTITY_KEY, JSON.stringify(identity));
      setModeratorLoginStatus("تم التحقق. جاري فتح الدردشة…", false);

      const target = new URL("./moderator.html", location.href);
      target.searchParams.set("fromMain", "1");
      target.searchParams.set("v", "25.0");
      target.searchParams.set("t", String(Date.now()));
      location.assign(target.href);
    } catch (error) {
      setModeratorLoginBusy(false);
      setModeratorLoginStatus(error.message || "تعذر تسجيل دخول المراقب.");
    }
  }

  function roleRank(user) {
    if (user?.role === "owner") return 0;
    if (user?.role === "moderator") return 1;
    if (user?.isVip) return 2;
    return 3;
  }

  function stableJoinedAt(user) {
    const explicit = Number(user?.joinedAt || user?.connectedAt || 0);
    if (Number.isFinite(explicit) && explicit > 0) {
      presenceFirstSeen.set(user.clientId, explicit);
      return explicit;
    }

    if (!presenceFirstSeen.has(user.clientId)) {
      presenceFirstSeen.set(user.clientId, Date.now() + presenceFirstSeen.size);
    }
    return Number(presenceFirstSeen.get(user.clientId));
  }

  function orderedUniqueUsers(users) {
    const uniqueByClient = new Map();

    for (const user of Array.isArray(users) ? users : []) {
      if (!user?.clientId) continue;
      const normalized = { ...user, joinedAt: stableJoinedAt(user) };
      const existing = uniqueByClient.get(user.clientId);
      if (!existing || normalized.joinedAt < existing.joinedAt) {
        uniqueByClient.set(user.clientId, normalized);
      }
    }

    const activeIds = new Set(uniqueByClient.keys());
    for (const clientId of presenceFirstSeen.keys()) {
      if (!activeIds.has(clientId)) presenceFirstSeen.delete(clientId);
    }

    return [...uniqueByClient.values()].sort((a, b) =>
      roleRank(a) - roleRank(b) ||
      Number(a.joinedAt || 0) - Number(b.joinedAt || 0) ||
      String(a.nickname || "").localeCompare(String(b.nickname || ""), "ar")
    );
  }

  function canBypassRoomCapacity() {
    return Boolean(profile?.isVip || ["owner", "moderator"].includes(profile?.role));
  }

  function roomFallbackCatalog() {
    return [
      ["lobby", "العامة"], ["iraq", "العراق"], ["syria", "سوريا"], ["jordan", "الأردن"],
      ["saudi", "السعودية"], ["kuwait", "الكويت"], ["oman", "عُمان"], ["dubai", "دبي"],
      ["expats", "المغتربون"], ["artists-poets", "الفنانون والشعراء"]
    ].map(([id, name], order) => ({ id, name, order, count: 0, ordinaryCount: 0, vipCount: 0, staffCount: 0, capacity: ROOM_CAPACITY, full: false, enabled: true }));
  }

  function updateRoomUi() {
    const room = roomCatalog.find((item) => item.id === activeRoomId);
    activeRoomName = room?.name || activeRoomName || "العامة";
    if (els.currentRoomName) els.currentRoomName.textContent = activeRoomName;
    if (conversationMode === "public") {
      els.conversationTitle.textContent = activeRoomName;
      els.messageInput.placeholder = `اكتب رسالة إلى ${activeRoomName}…`;
    }
    if (els.publicNavButton) {
      const title = els.publicNavButton.querySelector("strong");
      if (title) title.textContent = activeRoomName;
    }
    if (els.presenceStrip) els.presenceStrip.setAttribute("aria-label", `المتصلون في ${activeRoomName}`);
    const heading = els.presenceStrip?.querySelector(".presence-strip-heading strong");
    if (heading) heading.textContent = `المتصلون في ${activeRoomName}`;
  }

  function renderRoomsMenu() {
    if (!els.roomsList) return;
    els.roomsList.textContent = "";
    const rooms = [...(roomCatalog.length ? roomCatalog : roomFallbackCatalog())]
      .filter((room) => room.enabled !== false)
      .sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || Number(a.order || 0) - Number(b.order || 0));
    for (const room of rooms) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "room-choice-live";
      if (room.id === activeRoomId) button.classList.add("active");
      if (room.full) button.classList.add("full");
      if (canBypassRoomCapacity()) button.classList.add("can-bypass");
      button.innerHTML = `<span class="room-choice-icon">#</span><span><strong></strong><small></small></span><i></i>`;
      button.querySelector("strong").textContent = room.name;
      button.querySelector("small").textContent = `${Number(room.count || 0)} متصل — ${Number(room.ordinaryCount || 0)}/${room.capacity || ROOM_CAPACITY} مستخدم عادي`;
      button.querySelector("i").textContent = room.full ? (canBypassRoomCapacity() ? "دخول VIP" : "ممتلئة") : `${Math.max(0, (room.capacity || ROOM_CAPACITY) - Number(room.ordinaryCount || 0))} متاح`;
      button.disabled = Boolean(room.full && !canBypassRoomCapacity());
      button.addEventListener("click", () => switchRoom(room));
      els.roomsList.appendChild(button);
    }
  }

  async function loadRooms({ assign = false } = {}) {
    try {
      if (isLocalDemo()) {
        roomCatalog = roomFallbackCatalog();
      } else {
        const response = await fetch(`/api/rooms?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`rooms ${response.status}`);
        const data = await response.json();
        roomCatalog = Array.isArray(data.rooms) && data.rooms.length ? data.rooms : roomFallbackCatalog();
        if (assign && !activeRoomId) activeRoomId = (typeof data.assignedRoom === "string" ? data.assignedRoom : data.assignedRoom?.id) || roomCatalog.find((room) => !room.full)?.id || DEFAULT_ROOM;
      }
    } catch (error) {
      console.warn("Room list unavailable", error);
      roomCatalog = roomFallbackCatalog();
    }
    if (!activeRoomId) activeRoomId = roomCatalog.find((room) => !room.full)?.id || DEFAULT_ROOM;
    const current = roomCatalog.find((room) => room.id === activeRoomId);
    if (!current || (current.full && !canBypassRoomCapacity())) {
      activeRoomId = roomCatalog.find((room) => !room.full)?.id || DEFAULT_ROOM;
    }
    sessionStorage.setItem(ROOM_KEY, activeRoomId);
    updateRoomUi();
    renderRoomsMenu();
    return activeRoomId;
  }

  async function switchRoom(room) {
    if (!room || room.id === activeRoomId) { closeRoomsMenu(); return; }
    if (room.full && !canBypassRoomCapacity()) { showError("هذه الغرفة ممتلئة. اختر غرفة أخرى."); return; }
    if (privateSessionPeerId) finishPrivateSession("انتهت المحادثة الخاصة بسبب تغيير الغرفة.", true);
    stopLiveMic();
    hideCharacterStage();
    transport?.close();
    activeRoomId = room.id;
    activeRoomName = room.name;
    sessionStorage.setItem(ROOM_KEY, activeRoomId);
    resetConversationView();
    updateRoomUi();
    closeRoomsMenu();
    connectTransport();
    await loadRooms();
  }

  async function openRoomsMenu() {
    els.roomsModal?.classList.remove("hidden");
    els.roomsModal?.setAttribute("aria-hidden", "false");
    renderRoomsMenu();
    await loadRooms();
  }

  function closeRoomsMenu() {
    els.roomsModal?.classList.add("hidden");
    els.roomsModal?.setAttribute("aria-hidden", "true");
  }

  function crownMarkup() {
    return `<span class="user-role-crown" title="الإدارة">
      <svg viewBox="0 0 64 48" aria-hidden="true">
        <path d="M8 36 4 11l15 10L32 4l13 17 15-10-4 25H8Z"/>
        <path class="crown-base" d="M10 36h44l-3 8H13l-3-8Z"/>
        <circle class="ruby" cx="18" cy="31" r="3"/>
        <circle class="sapphire" cx="32" cy="27" r="3.5"/>
        <circle class="emerald" cx="46" cy="31" r="3"/>
      </svg>
    </span>`;
  }

  function moderatorStarMarkup(extraClass = "") {
    const className = ["moderator-role-star", extraClass].filter(Boolean).join(" ");
    return `<span class="${className}" title="مراقب Rivo" aria-label="مراقب Rivo"><i>★</i><b>مراقب</b></span>`;
  }

  function vipGemMarkup(extraClass = "") {
    const className = ["vip-role-gem", extraClass].filter(Boolean).join(" ");
    return `<span class="${className}" title="عضو VIP" aria-label="عضو VIP"><i>💎</i><b>VIP</b></span>`;
  }

  function ownerRoleMarkup(extraClass = "") {
    const className = ["owner-role-label", extraClass].filter(Boolean).join(" ");
    return `<span class="${className}" title="إدارة Rivo" aria-label="إدارة Rivo">الإدارة</span>`;
  }

  const RIVO_BADGES = {
    star: { icon: "⭐", label: "نجمة ذهبية" },
    diamond: { icon: "💎", label: "ماسة زرقاء" },
    ruby: { icon: "♦️", label: "جوهرة حمراء" },
    heart: { icon: "❤️", label: "قلب ملكي" },
        emerald: { icon: "💚", label: "زمردة خضراء" }
  };

  function badgeMarkup(badgeId, extraClass = "") {
    const badge = RIVO_BADGES[String(badgeId || "")];
    if (!badge) return "";

    return `<span class="rivo-award-badge badge-${badgeId} ${extraClass}"
                  title="${badge.label}" aria-label="${badge.label}">${badge.icon}</span>`;
  }

  function badgeForClient(clientId, fallback = "") {
    return currentUsers.find((user) => user.clientId === clientId)?.badge || fallback || "";
  }

  function firstName(value) {
    const clean = String(value || "").trim().replace(/\s+/g, " ");
    return clean ? clean.split(" ")[0] : "مستخدم";
  }

  function userRoleById(clientId, fallback = "user") {
    if (profile?.clientId === clientId) return profile.role || fallback;
    return currentUsers.find((user) => user.clientId === clientId)?.role || fallback;
  }

  function randomId() {
    return crypto.randomUUID ? crypto.randomUUID() :
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createVoiceRoom() {
    if (!window.RivoVoiceRoom) {
      console.error("RivoVoiceRoom was not loaded");
      return null;
    }

    return new window.RivoVoiceRoom({
      getProfile: () => profile,
      getTransport: () => transport,
      onRemoteCount: (count) => {
        remoteStreamCount = Math.max(0, Number(count || 0));
        syncRoomAudioCount();
      },
      onConnectionState: (_peerId, state) => {
        if (state === "failed") {
          showError("تعذر ربط صوت أحد المستخدمين. سيحاول التطبيق الاتصال مجدداً.");
        }
      },
      onError: (message) => showError(message, 6500)
    });
  }

  function createRelayAudio() {
    if (!window.RivoRelayAudio) {
      console.error("RivoRelayAudio was not loaded");
      return null;
    }

    return new window.RivoRelayAudio({
      getProfile: () => profile,
      getTransport: () => transport,
      onRemoteCount: (count) => {
        relayRemoteCount = Math.max(0, Number(count || 0));
        syncRoomAudioCount();
      },
      onError: (message) => showError(message, 7000)
    });
  }

  async function unlockRoomAudio() {
    const results = await Promise.all([
      relayAudio?.unlock?.().catch(() => false),
      voiceRoom?.unlockPlayback?.().catch(() => false),
      localPcmRelay?.unlock?.().catch(() => false)
    ]);

    return results.some(Boolean);
  }

  function syncRoomAudioCount() {
    const remoteMicActive = Boolean(
      currentMicHolderId &&
      currentMicHolderId !== profile?.clientId
    );
    const visibleCount = Math.max(remoteStreamCount, relayRemoteCount, remoteMicActive ? 1 : 0);

    if (els.remoteAudioCount) els.remoteAudioCount.textContent = String(visibleCount);
    if (els.roomSoundButton) {
      els.roomSoundButton.classList.toggle("receiving", visibleCount > 0);
      els.roomSoundButton.title = visibleCount > 0
        ? `يوجد ${visibleCount} صوت نشط — اضغط للاستماع أو الكتم`
        : "اضغط مرة واحدة لتفعيل سماع صوت الغرفة";
    }
  }

  function syncRoomSoundButton() {
    const muted = Boolean(
      relayAudio?.isMuted?.() ||
      voiceRoom?.isPlaybackMuted?.() ||
      localPcmRelay?.isMuted?.()
    );
    const unlocked = Boolean(
      relayAudio?.isUnlocked?.() ||
      voiceRoom?.isPlaybackUnlocked?.() ||
      localPcmRelay?.isUnlocked?.()
    );
    els.roomSoundButton.classList.toggle("active", unlocked && !muted);
    els.roomSoundButton.classList.toggle("needs-unlock", !unlocked);
    els.roomSoundIcon.textContent = !unlocked ? "🔈" : (muted ? "🔇" : "🔊");
    els.roomSoundLabel.textContent = !unlocked ? "شغّل الصوت" : (muted ? "الصوت مكتوم" : "صوت الغرفة");
    syncRoomAudioCount();
  }

  function installFirstGestureAudioUnlock() {
    if (audioUnlockInstalled) return;
    audioUnlockInstalled = true;

    const unlockOnce = async () => {
      const unlocked = await unlockRoomAudio();
      if (!unlocked) return;
      relayAudio?.setMuted?.(false);
      voiceRoom?.setPlaybackMuted?.(false);
      localPcmRelay?.setMuted?.(false);
      syncRoomSoundButton();
      document.removeEventListener("pointerdown", unlockOnce, true);
      document.removeEventListener("touchstart", unlockOnce, true);
      document.removeEventListener("keydown", unlockOnce, true);
    };

    document.addEventListener("pointerdown", unlockOnce, true);
    document.addEventListener("touchstart", unlockOnce, { capture: true, passive: true });
    document.addEventListener("keydown", unlockOnce, true);
  }


  function updateMicAvailability() {
    const myId = profile?.clientId || "";
    const mine = currentMicHolderId && currentMicHolderId === myId;
    const busy = currentMicHolderId && !mine;
    const closed = roomPublicMicEnabled === false;
    const blocked = myMicBlocked === true;

    if (els.voiceButton) {
      els.voiceButton.disabled = Boolean(busy || closed || blocked);
      els.voiceButton.title = busy
        ? `${currentMicHolderName || "مستخدم آخر"} على المايك`
        : closed
          ? "الإدارة أغلقت مايك العامة"
          : blocked
            ? "الإدارة منعت المايك عن حسابك"
            : "تشغيل المايك وإرسال صوتك للغرفة";
    }

    if (els.toggleLiveMic) {
      els.toggleLiveMic.disabled = Boolean((busy && stageMode !== "local") || closed || blocked);
    }
  }

  function clearPendingMicClaim(result = false) {
    if (!pendingMicClaim) return;
    clearTimeout(pendingMicClaim.timer);
    pendingMicClaim.resolve(result);
    pendingMicClaim = null;
  }

  function requestMicClaim() {
    if (!profile || !transport?.isReady?.()) return Promise.resolve(false);

    if (roomPublicMicEnabled === false) {
      showError("الإدارة أغلقت مايك العامة.");
      return Promise.resolve(false);
    }

    if (myMicBlocked) {
      showError("الإدارة منعت المايك عن حسابك.");
      return Promise.resolve(false);
    }

    if (currentMicHolderId && currentMicHolderId !== profile.clientId) {
      showError(`${currentMicHolderName || "مستخدم آخر"} على المايك الآن.`);
      return Promise.resolve(false);
    }

    // Local mode returns the result directly. This avoids the lost-event timeout
    // that occurred inside the embedded admin chat iframe.
    if (typeof transport.claimMicDirect === "function") {
      const result = transport.claimMicDirect();

      if (!result.ok) {
        showError(result.message || "تعذر حجز المايك.");
        return Promise.resolve(false);
      }

      return Promise.resolve(true);
    }

    if (pendingMicClaim) return Promise.resolve(false);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!pendingMicClaim) return;
        pendingMicClaim = null;
        showError("تعذر حجز المايك الآن. حاول مرة أخرى.");
        resolve(false);
      }, 5000);

      pendingMicClaim = { resolve, timer };
      transport.send({ type: "mic-claim" });
    });
  }

  function releaseMicClaim() {
    if (!profile || !transport?.isReady?.()) return;
    if (!currentMicHolderId || currentMicHolderId !== profile.clientId) return;
    transport.send({ type: "mic-release" });
  }

  function handleMicDenied(event) {
    if (!profile || event?.to !== profile.clientId) return;
    clearPendingMicClaim(false);
    if (event.message) {
      showError(event.message);
      return;
    }
    const holder = event.nickname || "مستخدم آخر";
    showError(`${holder} على المايك الآن. انتظر حتى ينزل.`);
  }

  function handleMicState(event) {
    const wasMine = currentMicHolderId && currentMicHolderId === profile?.clientId;

    if (event?.active) {
      currentMicHolderId = event.clientId || "";
      currentMicHolderName = event.nickname || "";
      currentMicHolderAvatar = event.avatar || "";
    } else {
      currentMicHolderId = "";
      currentMicHolderName = "";
      currentMicHolderAvatar = "";
    }

    const isMine = currentMicHolderId && currentMicHolderId === profile?.clientId;

    if (isMine && pendingMicClaim) {
      clearPendingMicClaim(true);
    }

    if (!event?.active && pendingMicClaim && wasMine) {
      clearPendingMicClaim(false);
    }

    updateMicAvailability();
    syncRoomAudioCount();
    if (profile?.isVip) renderUsers(currentUsers);

    if (event?.active && currentMicHolderId && currentMicHolderId !== profile?.clientId && !micActive) {
      const speaker = currentUsers.find((user) => user.clientId === currentMicHolderId);
      const character = getCharacter(event.avatar || speaker?.avatar);
      showCharacterStage(
        character,
        `${event.nickname || "مستخدم"} على المايك`,
        "بانتظار الكلام",
        "remote"
      );
    }

    if (!event?.active && stageMode === "remote") {
      hideCharacterStage();
    }
  }


  function handleRoomControls(event) {
    roomPublicMicEnabled = event.publicMicEnabled !== false;
    roomPrivateMicEnabled = Boolean(event.privateMicEnabled);

    if (!roomPublicMicEnabled && micActive) {
      stopLiveMic();
      hideCharacterStage();
      showError("الإدارة أغلقت مايك العامة.");
    }

    updateMicAvailability();
  }

  function handleMyRestrictions(event) {
    if (!profile || event.clientId !== profile.clientId) return;
    myMicBlocked = Boolean(event.micBlocked);
    myPrivateBlocked = Boolean(event.privateBlocked);

    if (myMicBlocked && micActive) {
      stopLiveMic();
      hideCharacterStage();
      showError("الإدارة أوقفت المايك عن حسابك.");
    }

    if (myPrivateBlocked) {
      profile.privateOpen = false;
      syncPrivateToggleUI();
    }

    updateMicAvailability();
  }

  function totalPrivateUnread() {
    let total = 0;
    for (const value of privateUnreadByUser.values()) total += Number(value || 0);
    return total;
  }

  function syncPrivateUnreadUI() {
    const total = totalPrivateUnread();
    if (els.privateUnreadBadge) {
      els.privateUnreadBadge.textContent = String(total);
      els.privateUnreadBadge.classList.toggle("hidden", total < 1);
    }
    if (els.privateNavStatus) {
      els.privateNavStatus.textContent = total > 0
        ? `${total} رسالة جديدة`
        : (activePrivateUser ? `مع ${activePrivateUser.nickname}` : "اختر مستخدماً");
    }

    const activeUnread = activePrivateUser
      ? Number(privateUnreadByUser.get(activePrivateUser.clientId) || 0)
      : total;

    els.privatePopupCollapsedUnread.textContent = String(activeUnread);
    els.privatePopupCollapsedUnread.classList.toggle("hidden", activeUnread < 1);
  }

  function syncPrivateToggleUI() {
    const open = profile?.privateOpen !== false;
    els.privateToggleButton.classList.toggle("open", open);
    els.privateToggleButton.classList.toggle("closed", !open);
    els.privateToggleButton.title = open ? "الخاص مفتوح" : "الخاص مغلق";
    els.privateToggleButton.setAttribute("aria-label", open ? "إغلاق الخاص" : "فتح الخاص");
  }

  function setPrivateOpen(open) {
    if (!profile) return;
    profile.privateOpen = Boolean(open);
    saveProfile(profile);
    syncPrivateToggleUI();

    const own = currentUsers.find((user) => user.clientId === profile.clientId);
    if (own) own.privateOpen = profile.privateOpen;
    renderUsers(currentUsers);

    if (transport?.isReady?.()) {
      transport.send({
        type: "privacy-setting",
        privateOpen: profile.privateOpen
      });
    }

    showError(profile.privateOpen ? "الخاص أصبح مفتوحاً." : "الخاص أصبح مغلقاً.", 2500);
  }

  function privateThreadKey(userId) {
    return String(userId || "");
  }

  function getPrivateMessages(userId) {
    return privateMessagesByUser.get(privateThreadKey(userId)) || [];
  }

  function setPrivateMessages(userId, messages) {
    const clean = Array.isArray(messages) ? messages : [];
    privateMessagesByUser.set(privateThreadKey(userId), clean);
  }

  function otherPrivateUserId(message) {
    if (!profile || !message) return "";
    return message.senderId === profile.clientId
      ? message.recipientId
      : message.senderId;
  }

  function privateMessageToRender(message) {
    return {
      id: message.id,
      clientId: message.senderId,
      nickname: message.senderNickname,
      avatar: message.senderAvatar,
      body: message.body,
      createdAt: message.createdAt,
      private: true
    };
  }

  function updateConversationHeader() {
    // The main conversation always remains the public room.
    els.publicNavButton.classList.add("active");
    els.privateNavButton?.classList.remove("active");
    els.backToPublicButton.classList.add("hidden");
    els.roomSoundButton.classList.remove("hidden");
    els.voiceButton.classList.remove("hidden");
    els.chatApp.classList.remove("private-mode");
    els.roomSymbol.textContent = "#";
    els.conversationTitle.textContent = activeRoomName || "العامة";
    els.conversationSubtitle.innerHTML = `<span id="onlineCountHeader">${currentUsers.length}</span> متصل الآن`;
    els.onlineCountHeader = $("onlineCountHeader");
    els.messageInput.placeholder = `اكتب رسالة إلى ${activeRoomName || "العامة"}…`;
    syncPrivateUnreadUI();
  }

  function renderWelcomeCard(kind = "public") {
    const welcome = document.createElement("div");
    welcome.className = "welcome-card";
    welcome.innerHTML = `
      <div class="welcome-icon">#</div>
      <h2>أهلاً بك في ${activeRoomName || "العامة"}</h2>
      <p>تكلم باحترام، ولا تنشر رقم هاتفك أو عنوانك أو معلوماتك الشخصية.</p>
    `;
    els.messages.appendChild(welcome);
  }

  function renderCurrentConversation() {
    renderedMessageIds = new Set();
    lastRenderedDay = "";
    els.messages.textContent = "";
    renderWelcomeCard("public");
    publicMessages.forEach(renderMessage);
    updateConversationHeader();
    scrollToBottom();
  }

  function privateTime(value) {
    try {
      return new Intl.DateTimeFormat("ar-IQ", {
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(value));
    } catch {
      return "";
    }
  }

  function renderPrivatePopupEmpty() {
    els.privatePopupMessages.innerHTML = `
      <div class="private-popup-empty">
        <span>✉</span>
        <strong>الرسائل الخاصة</strong>
        <p>اضغط زر الخاص بجانب اسم أي مستخدم متصل.</p>
      </div>
    `;
  }

  function renderPrivatePopup() {
    els.privatePopupMessages.textContent = "";

    if (!activePrivateUser) {
      renderPrivatePopupEmpty();
      els.privatePopupAvatar.src = avatarUrl("lina");
      els.privatePopupAvatar.alt = "";
      els.privatePopupName.textContent = "الرسائل الخاصة";
      els.privatePopupStatus.textContent = "اختر مستخدماً من قائمة المتصلين";
      els.privatePopupInput.value = "";
      els.privatePopupInput.disabled = true;
      els.privatePopupSend.disabled = true;
      els.privatePopupInput.placeholder = "اختر مستخدماً أولاً";
      els.privatePopupCollapsedName.textContent = "الخاص";
      els.privatePopupCollapsedAvatar.src = avatarUrl("lina");
      syncPrivateUnreadUI();
      return;
    }

    els.privatePopupAvatar.src = avatarUrl(activePrivateUser.avatar);
    els.privatePopupAvatar.alt = "";
    els.privatePopupName.textContent = activePrivateUser.nickname;
    els.privatePopupCollapsedName.textContent = activePrivateUser.nickname;
    els.privatePopupCollapsedAvatar.src = avatarUrl(activePrivateUser.avatar);

    const sessionActive = privateSessionPeerId === activePrivateUser.clientId;
    const blocked = activePrivateUser.privateOpen === false || !sessionActive;
    els.privatePopupStatus.textContent = sessionActive
      ? "مشغولان في محادثة خاصة"
      : "انتهت المحادثة الخاصة";
    els.privatePopupInput.disabled = blocked;
    els.privatePopupSend.disabled = blocked;
    els.privatePopupInput.placeholder = sessionActive
      ? `اكتب إلى ${activePrivateUser.nickname}…`
      : "انتهت المحادثة";

    const thread = getPrivateMessages(activePrivateUser.clientId);

    if (!thread.length) {
      const empty = document.createElement("div");
      empty.className = "private-popup-empty compact";
      empty.innerHTML = `
        <span>✉</span>
        <strong>ابدأ المحادثة</strong>
        <p>الرسائل هنا تظهر لكما فقط.</p>
      `;
      els.privatePopupMessages.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();

      thread.forEach((message) => {
        const own = message.senderId === profile?.clientId;
        const row = document.createElement("div");
        row.className = `private-message-row ${own ? "own" : "other"}`;

        if (!own) {
          const avatar = document.createElement("img");
          avatar.src = avatarUrl(message.senderAvatar);
          avatar.alt = "";
          row.appendChild(avatar);
        }

        const content = document.createElement("div");
        content.className = "private-message-content";

        const bubble = document.createElement("div");
        bubble.className = "private-message-bubble";
        bubble.textContent = message.body;

        const time = document.createElement("small");
        time.textContent = privateTime(message.createdAt);

        content.append(bubble, time);
        row.appendChild(content);
        fragment.appendChild(row);
      });

      els.privatePopupMessages.appendChild(fragment);
    }

    requestAnimationFrame(() => {
      els.privatePopupMessages.scrollTop = els.privatePopupMessages.scrollHeight;
    });

    syncPrivateUnreadUI();
  }

  function showPrivatePopup() {
    els.privatePopup.classList.remove("hidden");
    els.privatePopup.classList.toggle("expanded", privatePopupExpanded);
    els.privatePopup.classList.toggle("minimized", privatePopupMinimized);
    els.privatePopupBody.classList.toggle("hidden", privatePopupMinimized);
    els.privatePopupCollapsedButton.classList.toggle("hidden", !privatePopupMinimized);
    renderPrivatePopup();
  }

  function openPrivateHome() {
    // There is no generic private inbox button. Private chat starts beside a user.
    closeSidebar();
  }

  function showPrivateRequestModal(request) {
    pendingPrivateRequest = request || null;
    if (!pendingPrivateRequest || !els.privateRequestModal) return;
    const requestId = pendingPrivateRequest.requestId;
    const delay = Math.max(1000, Number(pendingPrivateRequest.expiresAt || (Date.now() + 45000)) - Date.now());
    setTimeout(() => {
      if (pendingPrivateRequest?.requestId !== requestId) return;
      pendingPrivateRequest = null;
      hidePrivateRequestModal();
      renderUsers(currentUsers);
      showError("انتهت مهلة طلب المحادثة الخاصة.", 3000);
    }, delay);
    els.privateRequestAvatar.src = avatarUrl(pendingPrivateRequest.fromAvatar);
    els.privateRequestName.textContent = pendingPrivateRequest.fromNickname || "مستخدم";
    els.privateRequestModal.classList.remove("hidden");
    els.privateRequestModal.setAttribute("aria-hidden", "false");
  }

  function hidePrivateRequestModal() {
    els.privateRequestModal?.classList.add("hidden");
    els.privateRequestModal?.setAttribute("aria-hidden", "true");
  }

  function requestPrivateChat(user) {
    if (!user || user.clientId === profile?.clientId || !transport?.isReady?.()) return;
    if (privateSessionPeerId) {
      showError("أنت مشغول في محادثة خاصة حالياً. أنهِها أولاً.");
      return;
    }
    if (pendingPrivateRequest) {
      showError("لديك طلب محادثة خاصة بانتظار موافقتك أو رفضك.");
      return;
    }
    if (outgoingPrivateRequestTo) {
      showError("لديك طلب خاص بانتظار الرد.");
      return;
    }
    if (user.privateOpen === false || user.privateBlocked === true) {
      showError(`${user.nickname} أغلق الرسائل الخاصة.`);
      return;
    }
    if (user.privateBusy) {
      showError(`${user.nickname} مشغول في محادثة خاصة الآن.`);
      return;
    }

    outgoingPrivateRequestTo = user.clientId;
    const requestedUserId = user.clientId;
    transport.send({ type: "private-request", to: user.clientId });
    setTimeout(() => {
      if (outgoingPrivateRequestTo !== requestedUserId || privateSessionPeerId) return;
      outgoingPrivateRequestTo = "";
      renderUsers(currentUsers);
      showError("انتهت مهلة طلب المحادثة الخاصة. يمكنك المحاولة من جديد.", 3500);
    }, 46000);
    renderUsers(currentUsers);
    showError(`تم إرسال طلب خاص إلى ${user.nickname}. بانتظار الموافقة…`, 4000);
  }

  function openPrivateChat(user) {
    requestPrivateChat(user);
  }

  function startPrivateSession(peer) {
    if (!peer?.clientId) return;
    privateSessionPeerId = peer.clientId;
    outgoingPrivateRequestTo = "";
    pendingPrivateRequest = null;
    hidePrivateRequestModal();
    activePrivateUser = { ...peer, privateBusy: true };
    privatePopupMinimized = false;
    privateUnreadByUser.delete(peer.clientId);
    syncPrivateUnreadUI();
    hydratePrivateLocal(peer.clientId);
    showPrivatePopup();
    els.privatePopup.classList.add("active-session");

    if (transport?.isReady?.()) {
      transport.send({ type: "private-history-request", with: peer.clientId });
    }
    renderUsers(currentUsers);
    setTimeout(() => els.privatePopupInput.focus(), 100);
  }

  function finishPrivateSession(message = "انتهت المحادثة الخاصة.", notifyServer = false) {
    const peerId = privateSessionPeerId;
    if (notifyServer && peerId && transport?.isReady?.()) {
      transport.send({ type: "private-end", with: peerId });
    }
    privateSessionPeerId = "";
    outgoingPrivateRequestTo = "";
    activePrivateUser = null;
    els.privatePopup.classList.remove("active-session", "expanded", "minimized");
    els.privatePopup.classList.add("hidden");
    privatePopupExpanded = false;
    privatePopupMinimized = false;
    renderUsers(currentUsers);
    if (message) showError(message, 3500);
  }

  function closePrivatePopup() {
    if (privateSessionPeerId) {
      finishPrivateSession("تم إنهاء المحادثة الخاصة.", true);
      return;
    }
    els.privatePopup.classList.add("hidden");
    privatePopupMinimized = false;
    els.privatePopupBody.classList.remove("hidden");
    els.privatePopupCollapsedButton.classList.add("hidden");
  }

  function minimizePrivatePopup() {
    if (els.privatePopup.classList.contains("hidden")) return;
    privatePopupMinimized = true;
    privatePopupExpanded = false;
    els.privatePopup.classList.remove("expanded");
    els.privatePopup.classList.add("minimized");
    els.privatePopupBody.classList.add("hidden");
    els.privatePopupCollapsedButton.classList.remove("hidden");
  }

  function restorePrivatePopup() {
    privatePopupMinimized = false;
    els.privatePopup.classList.remove("minimized");
    els.privatePopupBody.classList.remove("hidden");
    els.privatePopupCollapsedButton.classList.add("hidden");
    renderPrivatePopup();
    setTimeout(() => els.privatePopupInput.focus(), 80);
  }

  function togglePrivatePopupExpanded() {
    if (privatePopupMinimized) restorePrivatePopup();
    privatePopupExpanded = !privatePopupExpanded;
    els.privatePopup.classList.toggle("expanded", privatePopupExpanded);
    els.privatePopupExpand.title = privatePopupExpanded
      ? "العودة إلى المربع الصغير"
      : "ملء الشاشة";
    els.privatePopupExpand.setAttribute(
      "aria-label",
      privatePopupExpanded ? "العودة إلى المربع الصغير" : "ملء الشاشة"
    );
    renderPrivatePopup();
  }

  function switchToPublic() {
    // Kept for compatibility: the main room is always public.
    closeSidebar();
  }

  function handlePrivateHistory(event) {
    const userId = String(event.with || "");
    if (!userId) return;

    const merged = mergeMessages(
      getPrivateMessages(userId),
      event.messages || []
    ).slice(-LOCAL_PRIVATE_LIMIT);
    setPrivateMessages(userId, merged);
    (event.messages || []).forEach(persistPrivateMessage);
    if (activePrivateUser?.clientId === userId) {
      renderPrivatePopup();
    }
  }

  function handlePrivateMessage(message) {
    if (!message?.id || !profile) return;

    const userId = otherPrivateUserId(message);
    if (!userId) return;

    const thread = getPrivateMessages(userId);
    if (!thread.some((item) => item.id === message.id)) {
      thread.push(message);
      thread.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
      setPrivateMessages(userId, thread.slice(-LOCAL_PRIVATE_LIMIT));
      persistPrivateMessage(message);
    }

    const popupVisible = !els.privatePopup.classList.contains("hidden");
    const viewing = activePrivateUser?.clientId === userId &&
      popupVisible &&
      !privatePopupMinimized;

    if (viewing) {
      privateUnreadByUser.delete(userId);
      renderPrivatePopup();
    } else if (message.senderId !== profile.clientId) {
      privateUnreadByUser.set(
        userId,
        Number(privateUnreadByUser.get(userId) || 0) + 1
      );
      syncPrivateUnreadUI();
      renderUsers(currentUsers);
      showError(`رسالة خاصة جديدة من ${message.senderNickname}`, 3500);
    }
  }

  function handlePrivateDenied(event) {
    showError(event.message || "تعذر فتح المحادثة الخاصة.");
    if (activePrivateUser && event.to === activePrivateUser.clientId) {
      activePrivateUser.privateOpen = false;
      renderPrivatePopup();
      renderUsers(currentUsers);
    }
  }

  function handlePrivateRequest(event) {
    if (!event?.requestId || privateSessionPeerId) {
      if (event?.requestId && transport?.isReady?.()) {
        transport.send({ type: "private-response", requestId: event.requestId, accept: false });
      }
      return;
    }
    showPrivateRequestModal(event);
    renderUsers(currentUsers);
  }

  function handlePrivateRequestSent(event) {
    outgoingPrivateRequestTo = event.to || outgoingPrivateRequestTo;
    renderUsers(currentUsers);
  }

  function handlePrivateRejected(event) {
    outgoingPrivateRequestTo = "";
    renderUsers(currentUsers);
    showError(event.message || "رفض المستخدم طلب المحادثة الخاصة.", 4000);
  }

  function handlePrivateStarted(event) {
    const peer = event.peer || currentUsers.find((user) => user.clientId === event.with);
    if (!peer) return;
    startPrivateSession(peer);
    showError(`بدأت محادثة خاصة مع ${peer.nickname}.`, 2500);
  }

  function handlePrivateEnded(event) {
    if (!privateSessionPeerId && !activePrivateUser) return;
    finishPrivateSession(event.message || "انتهت المحادثة الخاصة.", false);
  }

  function getClientId() {
    const storage = isLocalDemo() ? sessionStorage : localStorage;
    let id = storage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = randomId();
      storage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  }

  function getCharacter(id) {
    return CHARACTERS.find((item) => item.id === id && item.available !== false) ||
      CHARACTERS.find((item) => item.isDefault) ||
      CHARACTERS[0] ||
      {
        id: "lina",
        name: "لينا",
        portrait: "./characters/lina/portrait.webp",
        portraitSmall: "./characters/lina/portrait-small.webp",
        model: ""
      };
  }

  function avatarUrl(name) {
    const character = getCharacter(name);
    return character.portraitSmall || character.portrait;
  }

  function profileStorageKey(value = null) {
    const googleUid = value?.googleUid || googleSession?.googleUid || "";
    return googleUid ? `${PROFILE_KEY}:${googleUid}` : PROFILE_KEY;
  }

  function pendingAvatarStorageKey() {
    const googleUid = googleSession?.googleUid || "guest";
    return `${PENDING_AVATAR_KEY}:${googleUid}`;
  }

  function loadPendingAvatar() {
    try {
      return localStorage.getItem(pendingAvatarStorageKey()) || "";
    } catch {
      return "";
    }
  }

  function savePendingAvatar(avatarId) {
    try {
      localStorage.setItem(pendingAvatarStorageKey(), getCharacter(avatarId).id);
    } catch {}
  }

  function loadSavedProfile() {
    try {
      const source = isLocalDemo() ? sessionStorage : localStorage;
      return JSON.parse(source.getItem(profileStorageKey()) || "null");
    } catch {
      return null;
    }
  }

  function saveProfile(value) {
    const source = isLocalDemo() ? sessionStorage : localStorage;
    const safe = { ...(value || {}) };
    delete safe.adminToken;
    delete safe.staffSessionToken;
    delete safe.googleSessionToken;
    source.setItem(profileStorageKey(safe), JSON.stringify(safe));
  }

  function isLocalDemo() {
    return location.protocol === "file:";
  }

  function isSharedLocalServer() {
    return location.protocol !== "file:" && (
      location.hostname === "127.0.0.1" ||
      location.hostname === "localhost"
    );
  }

  async function loadDynamicCharacters() {
    if (isLocalDemo() || isSharedLocalServer()) return;
    try {
      const response = await fetch(`/api/characters?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      for (const item of (data.characters || [])) {
        if (!item?.id || CHARACTERS.some((character) => character.id === item.id)) continue;
        CHARACTERS.push({
          id: item.id,
          name: item.name || item.id,
          portrait: item.thumbnailUrl || "./assets/lina-instant-poster.webp",
          portraitSmall: item.thumbnailUrl || "./assets/lina-instant-poster.webp",
          model: item.vrmUrl,
          available: item.visible !== false,
          vipOnly: Boolean(item.vipOnly),
          dialect: item.dialect || "العربية"
        });
      }
    } catch (error) {
      console.warn("Dynamic characters unavailable", error);
    }
  }

  function buildAvatarGrid() {
    els.avatarGrid.textContent = "";
    const fragment = document.createDocumentFragment();

    CHARACTERS.forEach((character) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "avatar-option character-option";
      button.dataset.avatar = character.id;
      button.disabled = character.available === false;
      button.setAttribute("aria-label", "اختيار هذه الشخصية");

      const portraitWrap = document.createElement("span");
      portraitWrap.className = "character-portrait";

      const img = document.createElement("img");
      img.src = character.portraitSmall || character.portrait;
      img.alt = "صورة الشخصية";
      portraitWrap.appendChild(img);

      const check = document.createElement("i");
      check.className = "character-check";
      check.textContent = "✓";
      if (character.vipOnly) {
        const vip = document.createElement("b");
        vip.className = "character-vip-mark";
        vip.textContent = "💎 VIP";
        portraitWrap.appendChild(vip);
      }

      button.append(portraitWrap, check);
      button.addEventListener("click", () => selectAvatar(character.id));
      fragment.appendChild(button);
    });

    els.avatarGrid.appendChild(fragment);
    selectAvatar(selectedAvatar);
  }
  function selectAvatar(name) {
    const character = getCharacter(name);
    const savedVip = Boolean(profile?.isVip || loadSavedProfile()?.isVip);
    if (character.vipOnly && !savedVip) {
      showError("هذه الشخصية خاصة بأعضاء VIP.");
      return;
    }

    selectedAvatar = character.id;
    savePendingAvatar(selectedAvatar);

    if (els.avatarGrid) {
      els.avatarGrid.querySelectorAll(".avatar-option").forEach((button) => {
        button.classList.toggle("selected", button.dataset.avatar === selectedAvatar);
      });
    }

    // Keep every preview synchronized with the user's latest choice.
    if (els.liveCharacterPortrait) {
      els.liveCharacterPortrait.src = character.portrait || character.portraitSmall;
      els.liveCharacterPortrait.alt = character.name || "الشخصية المختارة";
    }

    window.RIVO_ACTIVE_CHARACTER = character;
    window.dispatchEvent(new CustomEvent("rivo:character-selected", {
      detail: { character }
    }));
  }
  function cleanNickname(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
  }

  function enterChat(nextProfile) {
    const staff = loadStaffIdentity();

    profile = {
      clientId: nextProfile.clientId || (googleSession?.googleUid ? `google:${googleSession.googleUid}` : getClientId()),
      nickname: cleanNickname(nextProfile.nickname),
      avatar: getCharacter(nextProfile.avatar).id,
      privateOpen: nextProfile.privateOpen !== false,
      role: staff?.role || "user",
      adminVisible: staff?.visible !== false,
      adminToken: staff?.token || "",
      staffSessionToken: staff?.staffSessionToken || "",
      staffClientId: staff?.clientId || "",
      googleUid: googleSession?.googleUid || nextProfile.googleUid || "",
      googleEmail: googleSession?.email || nextProfile.googleEmail || "",
      googleSessionToken: googleSession?.sessionToken || "",
      badge: nextProfile.badge || "",
      isVip: Boolean(nextProfile.isVip),
      vipExpiresAt: Number(nextProfile.vipExpiresAt || 0),
      vipStealth: Boolean(nextProfile.vipStealth),
      roomId: activeRoomId || DEFAULT_ROOM
    };

    saveProfile(profile);
    savePendingAvatar(profile.avatar);
    els.joinScreen.classList.add("hidden");
    els.chatApp.classList.remove("hidden");
    els.myAvatarSide.src = avatarUrl(profile.avatar);
    els.myNameSide.textContent = firstName(profile.nickname);

    els.myCrownBadge.classList.toggle("hidden", profile.role !== "owner");
    els.myModeratorBadge?.classList.toggle("hidden", profile.role !== "moderator");
    els.myModeratorRoleLabel?.classList.toggle("hidden", profile.role !== "moderator");
    els.moderatorPanelButton?.classList.toggle("hidden", profile.role !== "moderator");
    els.adminPanelButton.classList.toggle(
      "hidden",
      !["owner", "moderator"].includes(profile.role)
    );
    if (profile.role === "owner") {
      els.adminPanelButton.href = `./admin.html?room=${encodeURIComponent(activeRoomId || DEFAULT_ROOM)}`;
      els.adminPanelButton.title = "لوحة الإدارة";
      els.adminPanelButton.textContent = "♛";
    } else if (profile.role === "moderator") {
      els.adminPanelButton.href = `./moderator.html?room=${encodeURIComponent(activeRoomId || DEFAULT_ROOM)}`;
      els.adminPanelButton.title = "فتح لوحة المراقب";
      els.adminPanelButton.textContent = "★";
    }
    syncVipUi();
    updateRoomUi();
    syncPrivateToggleUI();
    const selectedCharacter = getCharacter(profile.avatar);
    window.RIVO_ACTIVE_CHARACTER = selectedCharacter;
    window.dispatchEvent(new CustomEvent("rivo:character-selected", {
      detail: { character: selectedCharacter }
    }));
    resetConversationView();
    startLocalCleanup();
    hydratePublicLocal();
    connectTransport();
    clearInterval(roomRefreshTimer);
    roomRefreshTimer = setInterval(() => loadRooms().catch(() => {}), 10000);
    clearInterval(vipRefreshTimer);
    vipRefreshTimer = setInterval(() => refreshVipStatus().catch(() => {}), 30000);
    setTimeout(() => els.messageInput.focus(), 100);
  }

  function leaveChat() {
    const leavingRole = profile?.role || "user";
    const wasStaff = ["owner", "moderator"].includes(leavingRole);
    const leavingProfileKey = profileStorageKey(profile);
    clearInterval(localCleanupTimer);
    clearInterval(roomRefreshTimer);
    clearInterval(vipRefreshTimer);
    clearTimeout(localCleanupDebounce);
    stopLiveMic();
    hideCharacterStage();

    const oldVoiceRoom = voiceRoom;
    const oldRelayAudio = relayAudio;
    oldVoiceRoom?.destroy().catch(() => {});
    oldRelayAudio?.destroy().catch(() => {});

    transport?.close();
    transport = null;
    activeTypers.clear();
    currentUsers = [];
    presenceFirstSeen.clear();
    currentMicHolderId = "";
    currentMicHolderName = "";
    currentMicHolderAvatar = "";
    clearPendingMicClaim(false);
    conversationMode = "public";
    activePrivateUser = null;
    privatePopupExpanded = false;
    privatePopupMinimized = false;
    closePrivatePopup();
    publicMessages = [];
    privateMessagesByUser.clear();
    privateUnreadByUser.clear();
    profile = null;

    voiceRoom = createVoiceRoom();
    relayAudio = createRelayAudio();
    localPcmRelay = new LocalPcmRelay();
    installProfessionalBridge();
    syncRoomSoundButton();
    updateMicAvailability();

    const source = isLocalDemo() ? sessionStorage : localStorage;
    source.removeItem(leavingProfileKey);
    if (wasStaff) {
      localStorage.removeItem(leavingRole === "owner" ? OWNER_STAFF_IDENTITY_KEY : MODERATOR_STAFF_IDENTITY_KEY);
      const cleanUrl = new URL("./index.html", location.href);
      history.replaceState({}, "", cleanUrl.href);
    }
    els.chatApp.classList.add("hidden");
    els.joinScreen.classList.remove("hidden");
    els.sidebar.classList.remove("open");
    els.sidebarBackdrop.classList.add("hidden");
    els.nicknameInput.focus();
  }

  function resetConversationView() {
    conversationMode = "public";
    activePrivateUser = null;
    publicMessages = [];
    privateMessagesByUser.clear();
    privateUnreadByUser.clear();
    closePrivatePopup();
    renderCurrentConversation();
  }

  function connectTransport() {
    transport?.close();

    const roomId = activeRoomId || DEFAULT_ROOM;
    profile.roomId = roomId;
    if (isLocalDemo()) {
      transport = new DemoTransport(profile, roomId);
      showError("لا تفتح index.html مباشرة. شغّل ملف Rivo حتى تعمل الدردشة بين المتصفحات.", 8000);
    } else if (isSharedLocalServer()) {
      transport = new LocalHttpTransport(profile, roomId);
    } else {
      transport = new SocketTransport(profile, roomId);
    }

    transport.onEvent(handleEvent);
    transport.onStatus(setConnectionStatus);
    transport.connect();
  }

  function handleEvent(event) {
    if (!event || typeof event !== "object") return;

    window.dispatchEvent(new CustomEvent("rivo:server-event", {
      detail: event
    }));

    if (event.type === "init") {
      const serverMessages = Array.isArray(event.messages) ? event.messages : [];
      publicMessages = mergeMessages(publicMessages, serverMessages).slice(-LOCAL_PUBLIC_LIMIT);
      serverMessages.forEach(persistPublicMessage);
      currentUsers = event.users || [];

      if (event.self) {
        if (event.self.clientId) profile.clientId = event.self.clientId;
        profile.privateOpen = event.self.privateOpen !== false;
        profile.role = event.self.role || profile.role || "user";
        profile.staffClientId = event.self.staffClientId || profile.staffClientId || "";
        profile.adminVisible = event.self.adminVisible !== false;
        myMicBlocked = Boolean(event.self.micBlocked);
        myPrivateBlocked = Boolean(event.self.privateBlocked);
        profile.badge = event.self.badge || "";
        profile.isVip = Boolean(event.self.isVip);
        profile.vipExpiresAt = Number(event.self.vipExpiresAt || 0);
        profile.vipStealth = Boolean(event.self.vipStealth);
        profile.roomId = event.self.roomId || event.room?.id || activeRoomId || DEFAULT_ROOM;
        activeRoomId = profile.roomId;
        if (event.room?.name) activeRoomName = event.room.name;
        sessionStorage.setItem(ROOM_KEY, activeRoomId);
        saveProfile(profile);
        syncPrivateToggleUI();
        syncVipUi();
        updateRoomUi();
      }

      if (event.roomControls) handleRoomControls(event.roomControls);
      if (event.room?.id && !roomCatalog.some((room) => room.id === event.room.id)) {
        roomCatalog.push({ id: event.room.id, name: event.room.name || event.room.id, capacity: event.room.capacity || ROOM_CAPACITY, count: currentUsers.length, ordinaryCount: currentUsers.filter((user) => !user.isVip && user.role === "user").length });
      }

      els.myCrownBadge.classList.toggle("hidden", profile.role !== "owner");
      els.adminPanelButton.classList.toggle(
        "hidden",
        !["owner", "moderator"].includes(profile.role)
      );
      if (profile.role === "owner") {
        els.adminPanelButton.href = `./admin.html?room=${encodeURIComponent(activeRoomId || DEFAULT_ROOM)}`;
        els.adminPanelButton.title = "لوحة الإدارة";
        els.adminPanelButton.textContent = "♛";
      } else if (profile.role === "moderator") {
        els.adminPanelButton.href = `./moderator.html?room=${encodeURIComponent(activeRoomId || DEFAULT_ROOM)}`;
        els.adminPanelButton.title = "لوحة المراقب";
        els.adminPanelButton.textContent = "🛡️";
      }

      renderUsers(currentUsers);
      installProfessionalBridge();
      voiceRoom?.updateUsers(currentUsers);
      updateMicAvailability();
      renderCurrentConversation();
      return;
    }

    if (event.type === "message") {
      if (event.message && !publicMessages.some((item) => item.id === event.message.id)) {
        publicMessages.push(event.message);
        publicMessages = publicMessages.slice(-LOCAL_PUBLIC_LIMIT);
        persistPublicMessage(event.message);
      }

      if (conversationMode === "public") {
        renderMessage(event.message);
        scrollToBottom();
      }
      return;
    }

    if (event.type === "presence") {
      currentUsers = event.users || [];
      renderUsers(currentUsers);
      installProfessionalBridge();
      voiceRoom?.updateUsers(currentUsers);

      if (activePrivateUser) {
        const fresh = currentUsers.find((user) => user.clientId === activePrivateUser.clientId);
        if (fresh) {
          activePrivateUser = { ...fresh };
        } else {
          if (privateSessionPeerId) {
            finishPrivateSession("انتهت المحادثة الخاصة لأن المستخدم غادر.", false);
          } else {
            activePrivateUser = { ...activePrivateUser, privateOpen: false };
          }
        }
        if (activePrivateUser) renderPrivatePopup();
      }
      updateConversationHeader();
      return;
    }

    if (event.type === "private-history") {
      handlePrivateHistory(event);
      return;
    }

    if (event.type === "private-message") {
      handlePrivateMessage(event.message);
      return;
    }

    if (event.type === "private-denied") {
      outgoingPrivateRequestTo = "";
      handlePrivateDenied(event);
      renderUsers(currentUsers);
      return;
    }

    if (event.type === "private-request") {
      handlePrivateRequest(event);
      return;
    }

    if (event.type === "private-request-sent") {
      handlePrivateRequestSent(event);
      return;
    }

    if (event.type === "private-rejected") {
      handlePrivateRejected(event);
      return;
    }

    if (event.type === "private-started") {
      handlePrivateStarted(event);
      return;
    }

    if (event.type === "private-ended") {
      handlePrivateEnded(event);
      return;
    }

    if (event.type === "typing") {
      if (conversationMode === "public") handleTypingEvent(event);
      return;
    }

    if (event.type === "audio-pcm") {
      localPcmRelay?.handleChunk(event);
      return;
    }

    if (event.type === "voice-state") {
      handleVoiceState(event);
      return;
    }

    if (event.type === "room-controls") {
      handleRoomControls(event);
      return;
    }

    if (event.type === "user-restrictions") {
      handleMyRestrictions(event);
      renderUsers(currentUsers);
      return;
    }

    if (event.type === "profile-updated") {
      if (event.clientId === profile?.clientId) {
        if (event.avatar) {
          profile.avatar = getCharacter(event.avatar).id;
          selectedAvatar = profile.avatar;
          savePendingAvatar(profile.avatar);
          els.myAvatarSide.src = avatarUrl(profile.avatar);
          const character = getCharacter(profile.avatar);
          window.RIVO_ACTIVE_CHARACTER = character;
          window.dispatchEvent(new CustomEvent("rivo:character-selected", {
            detail: { character }
          }));
        }

        if (typeof event.adminVisible === "boolean") {
          profile.adminVisible = event.adminVisible;
        }

        if (event.badge !== undefined) {
          profile.badge = event.badge || "";
        }

        saveProfile(profile);
      }

      currentUsers = currentUsers.map((user) =>
        user.clientId === event.clientId
          ? {
              ...user,
              avatar: event.avatar || user.avatar,
              adminVisible: typeof event.adminVisible === "boolean"
                ? event.adminVisible
                : user.adminVisible,
              badge: event.badge !== undefined ? (event.badge || "") : user.badge
            }
          : user
      );

      renderUsers(currentUsers);
      renderCurrentConversation();
      return;
    }

    if (event.type === "badge-updated") {
      currentUsers = currentUsers.map((user) =>
        user.clientId === event.clientId
          ? { ...user, badge: event.badge || "" }
          : user
      );

      if (profile?.clientId === event.clientId) {
        profile.badge = event.badge || "";
        saveProfile(profile);
      }

      renderUsers(currentUsers);
      renderCurrentConversation();
      return;
    }

    if (event.type === "vip-state") {
      profile.isVip = Boolean(event.active);
      profile.vipStealth = Boolean(event.stealth);
      profile.vipExpiresAt = Number(event.expiresAt || 0);
      saveProfile(profile);
      syncVipUi();
      renderUsers(currentUsers);
      loadRooms().catch(() => {});
      return;
    }

    if (event.type === "mic-forced-release") {
      if (micActive) {
        stopLiveMic();
        hideCharacterStage();
      }
      showError(event.message || "تم إنزالك من المايك.");
      return;
    }

    if (event.type === "staff-revoked") {
      showError(event.message || "تم إيقاف حساب المراقب أو انتهت مدة اشتراكه.", 8000);
      localStorage.removeItem(profile?.role === "owner" ? OWNER_STAFF_IDENTITY_KEY : MODERATOR_STAFF_IDENTITY_KEY);
      transport?.close();
      transport = null;
      setTimeout(() => {
        const cleanUrl = new URL("./index.html", location.href);
        location.href = cleanUrl.href;
      }, 1400);
      return;
    }

    if (event.type === "admin-ban") {
      showError(event.message || "تم حظر حسابك مؤقتاً بواسطة الإدارة.", 10000);
      transport?.close();
      transport = null;
      els.messageInput.disabled = true;
      els.sendButton.disabled = true;
      els.voiceButton.disabled = true;
      return;
    }

    if (event.type === "admin-force-mic-off") {
      if (micActive) {
        stopLiveMic();
        hideCharacterStage();
      }
      showError("الإدارة أنزلتك من المايك.");
      return;
    }

    if (event.type === "admin-kick") {
      showError(event.message || "تم إخراجك من الدردشة بواسطة الإدارة.", 5000);
      setTimeout(leaveChat, 600);
      return;
    }

    if (event.type === "mic-state") {
      handleMicState(event);
      return;
    }

    if (event.type === "mic-denied") {
      handleMicDenied(event);
      return;
    }

    if (relayAudio?.handleEvent(event)) {
      return;
    }

    if (voiceRoom?.handleEvent(event)) {
      return;
    }

    if (event.type === "error") {
      showError(event.message || "حدث خطأ غير معروف.");
    }
  }

  function renderMessage(message) {
    if (!message?.id || renderedMessageIds.has(message.id)) return;
    renderedMessageIds.add(message.id);

    const date = new Date(Number(message.createdAt || Date.now()));
    const dayKey = date.toLocaleDateString("ar-IQ");

    if (dayKey !== lastRenderedDay) {
      const divider = document.createElement("div");
      divider.className = "day-divider";
      divider.textContent = isToday(date) ? "اليوم" : dayKey;
      els.messages.appendChild(divider);
      lastRenderedDay = dayKey;
    }

    const row = document.createElement("article");
    row.className = "message-row";
    row.dataset.messageId = message.id || "";
    row.dataset.clientId = message.clientId || "";
    row.dataset.nickname = message.nickname || "";
    row.dataset.avatar = message.avatar || "";
    if (message.clientId === profile.clientId) row.classList.add("own");

    const avatarWrap = document.createElement("span");
    avatarWrap.className = "message-avatar-wrap";

    const avatar = document.createElement("img");
    avatar.className = "message-avatar";
    avatar.src = avatarUrl(message.avatar);
    avatar.alt = "";
    avatarWrap.appendChild(avatar);

    const messageBadge = message.badge || badgeForClient(message.clientId);
    if (messageBadge) {
      const badge = document.createElement("span");
      badge.innerHTML = badgeMarkup(messageBadge, "message-avatar-badge");
      avatarWrap.appendChild(badge.firstElementChild);
    }
    if (message.isVip) {
      const gem = document.createElement("span");
      gem.className = "presence-vip-gem";
      gem.textContent = "💎";
      gem.title = "عضو VIP";
      avatarWrap.appendChild(gem);
    }

    const content = document.createElement("div");
    content.className = "message-content";

    const head = document.createElement("div");
    head.className = "message-head";

    const nameLine = document.createElement("span");
    nameLine.className = "message-name-line";

    const name = document.createElement("strong");
    name.textContent = message.clientId === profile.clientId
      ? firstName(profile.nickname)
      : firstName(message.nickname);

    const messageRole = message.role || userRoleById(message.clientId);

    if (messageRole === "owner") {
      const crown = document.createElement("span");
      crown.className = "message-crown";
      crown.innerHTML = crownMarkup();
      crown.title = "الإدارة";
      const roleLabel = document.createElement("span");
      roleLabel.innerHTML = ownerRoleMarkup("message-owner-label");
      nameLine.append(name, crown, roleLabel.firstElementChild);
    } else if (messageRole === "moderator") {
      const star = document.createElement("span");
      star.innerHTML = moderatorStarMarkup("message-moderator-star");
      nameLine.append(name, star.firstElementChild);
    } else {
      nameLine.appendChild(name);
      if (message.isVip) {
        const gem = document.createElement("span");
        gem.innerHTML = vipGemMarkup("message-vip-gem");
        nameLine.appendChild(gem.firstElementChild);
      }
    }

    if (messageBadge) {
      const award = document.createElement("span");
      award.innerHTML = badgeMarkup(messageBadge, "message-name-badge");
      nameLine.appendChild(award.firstElementChild);
    }

    const time = document.createElement("time");
    time.dateTime = date.toISOString();
    time.textContent = new Intl.DateTimeFormat("ar-IQ", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = message.body;

    head.append(nameLine, time);
    content.append(head, body);
    row.append(avatarWrap, content);
    els.messages.appendChild(row);
  }

  function isToday(date) {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
  }

  function renderPresenceStrip(users) {
    if (!els.presenceAvatars) return;

    els.presenceAvatars.textContent = "";
    const fragment = document.createDocumentFragment();

    users.forEach((user, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `presence-avatar role-${user.role || "user"}${user.isVip ? " is-vip" : ""}`;
      button.dataset.clientId = user.clientId;
      button.setAttribute("role", "listitem");
      button.title = `${user.nickname || "مستخدم"} — ${user.role === "owner" ? "الإدارة" : user.role === "moderator" ? "مراقب" : user.isVip ? "عضو VIP" : `ترتيبه ${index + 1}`}`;

      const avatarWrap = document.createElement("span");
      avatarWrap.className = "presence-avatar-image";

      const img = document.createElement("img");
      img.src = avatarUrl(user.avatar);
      img.alt = user.nickname || "مستخدم";
      avatarWrap.appendChild(img);

      const onlineDot = document.createElement("i");
      onlineDot.className = "presence-online-dot";
      avatarWrap.appendChild(onlineDot);

      if (user.role === "owner") {
        const crown = document.createElement("span");
        crown.innerHTML = crownMarkup();
        crown.className = "presence-owner-crown";
        avatarWrap.appendChild(crown);
      } else if (user.role === "moderator") {
        const star = document.createElement("span");
        star.className = "presence-moderator-star";
        star.textContent = "★";
        star.title = "مراقب";
        avatarWrap.appendChild(star);
      } else if (user.isVip) {
        const gem = document.createElement("span");
        gem.className = "presence-vip-gem";
        gem.textContent = "💎";
        gem.title = "عضو VIP";
        avatarWrap.appendChild(gem);
      }

      const label = document.createElement("small");
      label.textContent = firstName(user.nickname);
      button.append(avatarWrap, label);
      fragment.appendChild(button);
    });

    els.presenceAvatars.appendChild(fragment);
    if (els.presenceCount) els.presenceCount.textContent = String(users.length);
    els.presenceStrip?.classList.toggle("empty", users.length === 0);
  }

  function appendVipUserActions(row, user) {
    if (!profile?.isVip || user.clientId === profile.clientId) return;
    const actions = document.createElement("div");
    actions.className = "vip-user-actions";

    const gift = document.createElement("button");
    gift.type = "button"; gift.className = "vip-user-action gift"; gift.textContent = "🎁";
    gift.title = `إرسال هدية إلى ${user.nickname}`;
    gift.addEventListener("click", (event) => { event.stopPropagation(); openVipGift(user); });
    actions.appendChild(gift);

    if (user.role === "user" && !user.isVip) {
      const kick = document.createElement("button");
      kick.type = "button"; kick.className = "vip-user-action danger"; kick.textContent = "↪";
      kick.title = `إخراج ${user.nickname} من الغرفة من دون حظر`;
      kick.addEventListener("click", (event) => {
        event.stopPropagation();
        if (confirm(`إخراج ${user.nickname} من هذه الغرفة؟ لن يتم حظره من الموقع.`)) {
          transport?.send({ type: "vip-kick", to: user.clientId });
        }
      });
      actions.appendChild(kick);

      if (currentMicHolderId === user.clientId) {
        const mic = document.createElement("button");
        mic.type = "button"; mic.className = "vip-user-action mic"; mic.textContent = "🎙";
        mic.title = `إنزال ${user.nickname} من المايك`;
        mic.addEventListener("click", (event) => { event.stopPropagation(); transport?.send({ type: "vip-release-mic", to: user.clientId }); });
        actions.appendChild(mic);
      }
    }
    row.appendChild(actions);
  }

  function renderUsers(users) {
    const unique = orderedUniqueUsers(users);

    renderPresenceStrip(unique);
    els.usersList.textContent = "";
    const fragment = document.createDocumentFragment();

    unique.forEach((user) => {
      const row = document.createElement("div");
      row.className = `user-row role-${user.role || "user"}`;
      if (user.isVip) row.classList.add("is-vip");
      if (user.privateBusy) row.classList.add("private-busy");
      row.dataset.clientId = user.clientId;

      const avatarWrap = document.createElement("div");
      avatarWrap.className = "user-avatar-wrap";

      const img = document.createElement("img");
      img.src = avatarUrl(user.avatar);
      img.alt = "";

      const dot = document.createElement("i");
      avatarWrap.append(img, dot);

      if (user.badge) {
        const award = document.createElement("span");
        award.innerHTML = badgeMarkup(user.badge, "user-avatar-award");
        avatarWrap.appendChild(award.firstElementChild);
      }

      if (user.role === "owner") {
        const crown = document.createElement("span");
        crown.innerHTML = crownMarkup();
        crown.className = "user-crown-wrap";
        avatarWrap.appendChild(crown);
      } else if (user.role === "moderator") {
        const star = document.createElement("span");
        star.className = "moderator-avatar-star";
        star.textContent = "★";
        star.title = "مراقب Rivo";
        avatarWrap.appendChild(star);
      } else if (user.isVip) {
        const gem = document.createElement("span");
        gem.className = "presence-vip-gem";
        gem.textContent = "💎";
        gem.title = "عضو VIP";
        avatarWrap.appendChild(gem);
      }

      const nameWrap = document.createElement("div");
      nameWrap.className = "user-name-wrap";

      const name = document.createElement("strong");
      name.textContent = firstName(user.nickname);
      nameWrap.appendChild(name);

      if (user.role === "owner") {
        const ownerLabel = document.createElement("span");
        ownerLabel.innerHTML = ownerRoleMarkup("user-owner-label");
        nameWrap.appendChild(ownerLabel.firstElementChild);
      } else if (user.role === "moderator") {
        const roleStar = document.createElement("span");
        roleStar.innerHTML = moderatorStarMarkup("user-moderator-star");
        nameWrap.appendChild(roleStar.firstElementChild);
      } else if (user.isVip) {
        const gem = document.createElement("span");
        gem.innerHTML = vipGemMarkup("user-vip-gem");
        nameWrap.appendChild(gem.firstElementChild);
      }

      if (user.badge) {
        const award = document.createElement("span");
        award.innerHTML = badgeMarkup(user.badge, "user-name-award");
        nameWrap.appendChild(award.firstElementChild);
      }

      if (user.privateBusy) {
        const busyLabel = document.createElement("span");
        busyLabel.className = "user-private-state";
        busyLabel.textContent = user.clientId === profile?.clientId ? "أنت مشغول" : "مشغول";
        nameWrap.appendChild(busyLabel);
      }

      row.append(avatarWrap, nameWrap);
      appendVipUserActions(row, user);

      if (user.clientId === profile.clientId) {
        const me = document.createElement("small");
        me.textContent = "حسابك";
        row.appendChild(me);
      } else {
        const privateButton = document.createElement("button");
        privateButton.type = "button";
        privateButton.className = "user-private-button";
        const busy = Boolean(user.privateBusy);
        const requesting = outgoingPrivateRequestTo === user.clientId;
        privateButton.disabled = user.privateOpen === false || user.privateBlocked === true || busy || Boolean(privateSessionPeerId) || Boolean(pendingPrivateRequest) || requesting;
        privateButton.classList.toggle("busy", busy);
        privateButton.classList.toggle("requesting", requesting);
        privateButton.title = busy
          ? `${user.nickname} مشغول في الخاص`
          : requesting
            ? "بانتظار موافقته"
            : privateButton.disabled
              ? "الخاص غير متاح"
              : `طلب محادثة خاصة مع ${user.nickname}`;
        privateButton.setAttribute("aria-label", privateButton.title);

        privateButton.innerHTML = busy
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8a5 5 0 0 1 5 5v2.1h.5a2.2 2.2 0 0 1 2.2 2.2v7a2.2 2.2 0 0 1-2.2 2.2h-11a2.2 2.2 0 0 1-2.2-2.2v-7a2.2 2.2 0 0 1 2.2-2.2H7V7.8a5 5 0 0 1 5-5Zm0 1.8a3.2 3.2 0 0 0-3.2 3.2v2.1h6.4V7.8A3.2 3.2 0 0 0 12 4.6Z"/></svg>'
          : requesting
            ? '<span aria-hidden="true">…</span>'
            : privateButton.disabled
              ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10V7.5a4 4 0 1 1 8 0V10h.7a2 2 0 0 1 2 2v6.2a2 2 0 0 1-2 2H7.3a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2H8Zm1.8 0h4.4V7.5a2.2 2.2 0 1 0-4.4 0V10Z"/></svg>'
              : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 16h-5.2l-4.9 4.1A1 1 0 0 1 5.3 19v-3.2a2.5 2.5 0 0 1-.8-1.8V5.5Zm2.5-.7a.7.7 0 0 0-.7.7v8c0 .4.3.7.7.7h.1v2.7l4-3.3H17a.7.7 0 0 0 .7-.7V5.5a.7.7 0 0 0-.7-.7H7Z"/></svg>';

        const unread = Number(privateUnreadByUser.get(user.clientId) || 0);
        if (unread > 0) {
          const badge = document.createElement("span");
          badge.className = "user-private-unread";
          badge.textContent = String(unread);
          privateButton.appendChild(badge);
        }

        privateButton.addEventListener("click", (event) => {
          event.stopPropagation();
          openPrivateChat(user);
        });

        row.appendChild(privateButton);
      }

      fragment.appendChild(row);
    });

    els.usersList.appendChild(fragment);
    const count = unique.length;
    els.onlineBadge.textContent = String(count);
    els.onlineCountSide.textContent = String(count);
    if (els.onlineCountHeader) els.onlineCountHeader.textContent = String(count);
  }
  function handleTypingEvent(event) {
    if (!event.clientId || event.clientId === profile.clientId) return;

    if (event.active) {
      activeTypers.set(event.clientId, {
        nickname: event.nickname,
        expiresAt: Date.now() + 3500
      });
    } else {
      activeTypers.delete(event.clientId);
    }

    updateTypingBar();
  }

  function updateTypingBar() {
    const now = Date.now();
    for (const [id, item] of activeTypers) {
      if (item.expiresAt < now) activeTypers.delete(id);
    }

    const names = [...activeTypers.values()].map((item) => item.nickname);
    if (!names.length) {
      els.typingBar.classList.add("hidden");
      return;
    }

    els.typingText.textContent = names.length === 1
      ? `${names[0]} يكتب`
      : `${names.slice(0, 2).join(" و ")} يكتبان`;

    els.typingBar.classList.remove("hidden");
    setTimeout(updateTypingBar, 3600);
  }

  function sendTyping(active) {
    if (typingSent === active) return;
    typingSent = active;
    transport?.send({ type: "typing", active });
  }

  function sendCurrentMessage() {
    const body = els.messageInput.value.trim();
    if (!body || !transport?.isReady()) return;

    transport.send({ type: "chat", body });
    sendTyping(false);
    els.messageInput.value = "";
    resizeComposer();
  }

  function sendPrivatePopupMessage() {
    const body = els.privatePopupInput.value.trim();
    if (!body || !transport?.isReady()) return;

    if (!activePrivateUser) {
      showError("اختر مستخدماً من قائمة المتصلين أولاً.");
      return;
    }

    if (privateSessionPeerId !== activePrivateUser.clientId) {
      showError("لا توجد محادثة خاصة نشطة مع هذا المستخدم.");
      return;
    }

    transport.send({
      type: "private-chat",
      to: activePrivateUser.clientId,
      body
    });

    els.privatePopupInput.value = "";
    els.privatePopupInput.style.height = "auto";
  }

  function resizeComposer() {
    els.messageInput.style.height = "auto";
    els.messageInput.style.height = `${Math.min(els.messageInput.scrollHeight, 130)}px`;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      els.messages.scrollTop = els.messages.scrollHeight;
    });
  }

  function setConnectionStatus(status) {
    els.connectionStatus.className = `connection-status ${status}`;
    const text = {
      connected: isLocalDemo() ? "وضع التجربة" : "متصل",
      connecting: "جاري الاتصال",
      disconnected: "غير متصل"
    }[status] || status;

    els.connectionStatus.querySelector("span").textContent = text;
    els.sendButton.disabled = status !== "connected";
    voiceRoom?.setTransportStatus(status);

    if (status === "connected") {
      voiceRoom?.updateUsers(currentUsers);
    }
  }

  function showError(message, duration = 4500) {
    clearTimeout(errorTimer);
    els.errorBanner.textContent = message;
    els.errorBanner.classList.remove("hidden");
    errorTimer = setTimeout(() => els.errorBanner.classList.add("hidden"), duration);
  }

  function showCharacterStage(character, title, status, mode) {
    character = getCharacter(character?.id || character || profile?.avatar || selectedAvatar);
    window.RIVO_ACTIVE_CHARACTER = character;
    stageMode = mode;
    els.liveCharacterPortrait.src = character.portrait || character.portraitSmall;
    els.liveCharacterPortrait.alt = character.name || "صورة الشخصية";
    const loadingText = els.modelLoading?.querySelector("b");
    if (loadingText) loadingText.textContent = "تحميل الشخصية المختارة ثلاثية الأبعاد…";
    els.liveCharacterName.textContent = title;
    els.liveMicStatus.textContent = status;
    els.avatarLivePanel.classList.remove("hidden");
    els.chatApp.classList.add("stage-visible");

    const local = mode === "local";
    els.toggleLiveMic.classList.toggle("hidden", !local);
    els.speakerBadgeText.textContent = local ? "شخصيتك على المايك" : "المتحدث الآن";
    els.liveStageNote.textContent = local
      ? "صوتك يصل إلى الموجودين، وتستطيع قراءة الرسائل والكتابة والرد."
      : "تستمع إلى المتحدث وترى شخصيته، بينما تبقى الدردشة أمامك.";

    window.dispatchEvent(new CustomEvent("rivo:stage-open", {
      detail: { character }
    }));

    setTimeout(() => {
      if (!els.avatarLivePanel.classList.contains("hidden") &&
          !els.modelLoading.classList.contains("hidden")) {
        els.modelLoading.classList.add("hidden");
      }
    }, 12000);
  }

  function openAvatarStage() {
    const character = getCharacter(profile?.avatar || selectedAvatar);
    showCharacterStage(
      character,
      `${profile?.nickname || "أنت"} على المايك`,
      micActive ? "المايك يعمل — تكلم الآن" : "اضغط تشغيل المايك",
      "local"
    );
  }

  function hideCharacterStage() {
    els.avatarLivePanel.classList.add("hidden");
    els.chatApp.classList.remove("stage-visible");
    stageMode = "none";
    remoteSpeakerId = "";
    window.dispatchEvent(new CustomEvent("rivo:stage-close"));
  }

  function closeAvatarStage() {
    if (stageMode === "local") stopLiveMic();
    hideCharacterStage();
  }

  function sendVoiceState(active, level = 0, laugh = false) {
    if (!profile || !transport?.isReady()) return;
    transport.send({
      type: "voice-state",
      active,
      level,
      laugh
    });
  }

  function handleVoiceState(event) {
    if (!event?.clientId || event.clientId === profile?.clientId) return;

    if (!event.active) {
      if (remoteSpeakerId === event.clientId && stageMode === "remote") {
        window.dispatchEvent(new CustomEvent("rivo:avatar-level", {
          detail: { level: 0, laugh: false, active: false }
        }));
        hideCharacterStage();
      }
      return;
    }

    if (micActive) return;

    const speaker = currentUsers.find((user) => user.clientId === event.clientId);
    const character = getCharacter(event.avatar || speaker?.avatar);
    const speakerChanged =
      remoteSpeakerId !== event.clientId ||
      stageMode !== "remote" ||
      els.avatarLivePanel.classList.contains("hidden");

    remoteSpeakerId = event.clientId;

    if (speakerChanged) {
      showCharacterStage(
        character,
        `${event.nickname} على المايك`,
        "يتكلم الآن",
        "remote"
      );
    } else {
      els.liveCharacterName.textContent = `${event.nickname} على المايك`;
      els.liveMicStatus.textContent = "يتكلم الآن";
    }

    window.dispatchEvent(new CustomEvent("rivo:avatar-level", {
      detail: {
        level: Number(event.level || 0),
        laugh: Boolean(event.laugh),
        active: true
      }
    }));
  }

  async function requestMicrophoneStream() {
    if (!window.isSecureContext && location.hostname !== "localhost") {
      const error = new Error("Microphone requires a secure context");
      error.name = "SecurityError";
      throw error;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        },
        video: false
      });
    } catch (error) {
      if (error?.name === "OverconstrainedError" || error?.name === "TypeError") {
        return navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
      }
      throw error;
    }
  }

  function microphoneErrorMessage(error) {
    const name = String(error?.name || "");

    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "المتصفح حظر المايك. اضغط علامة القفل بجانب عنوان الصفحة، ثم اجعل المايك: سماح.";
    }

    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "لم يعثر المتصفح على مايك متصل بالحاسوب.";
    }

    if (name === "NotReadableError" || name === "TrackStartError") {
      return "المايك مشغول في برنامج آخر. أغلق البرنامج الذي يستعمله ثم حاول مرة ثانية.";
    }

    if (name === "SecurityError") {
      return "افتح Rivo من الرابط المحلي الذي يشغله الملف، ولا تفتح index.html مباشرة.";
    }

    return "تعذر تشغيل المايك. اضغط علامة القفل بجانب عنوان الصفحة وتأكد أن إذن المايك مضبوط على سماح.";
  }

  async function startLiveMic() {
    if (micActive) return;

    if (roomPublicMicEnabled === false) {
      showError("الإدارة أغلقت مايك العامة.");
      return;
    }

    if (myMicBlocked) {
      showError("الإدارة منعت المايك عن حسابك.");
      return;
    }

    if (currentMicHolderId && currentMicHolderId !== profile?.clientId) {
      showError(`${currentMicHolderName || "مستخدم آخر"} على المايك الآن.`);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      showError("المتصفح لا يدعم تشغيل المايك.");
      return;
    }

    let claimed = false;

    try {
      els.liveMicStatus.textContent = "جاري طلب إذن المايك…";
      micStream = await requestMicrophoneStream();

      const track = micStream.getAudioTracks()[0];
      if (!track || track.readyState !== "live") {
        throw new DOMException("Microphone track is not live", "NotReadableError");
      }

      els.liveMicStatus.textContent = "جاري حجز المايك…";
      claimed = await requestMicClaim();

      if (!claimed) {
        micStream.getTracks().forEach((item) => item.stop());
        micStream = null;
        els.liveMicStatus.textContent = "المايك غير محجوز";
        return;
      }

      micActive = true;
      stageMode = "local";
      smoothedVoiceLevel = 0;

      if (isSharedLocalServer()) {
        await localPcmRelay.startCapture(micStream);
      } else if (relayAudio?.isCaptureSupported?.()) {
        await relayAudio.startCapture(micStream);
      } else {
        await voiceRoom?.startLocalAudio(micStream);
      }
      laughPeaks = [];
      lastPeakHigh = false;
      lastVoiceBroadcastAt = 0;

      els.toggleLiveMic.classList.add("active");
      els.voiceButton.classList.add("voice-live");
      els.toggleLiveMic.querySelector("b").textContent = "إيقاف المايك";
      els.liveCharacterName.textContent = `${profile?.nickname || "أنت"} على المايك`;
      els.liveMicStatus.textContent = "المايك يعمل — صوتك يصل للغرفة";

      sendVoiceState(true, 0, false);

      // The local shared server analyses and relays PCM in one audio graph.
      // Production/WebRTC mode keeps the separate analyser below.
      if (!isSharedLocalServer()) {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;

          if (AudioContextClass) {
            audioContext = new AudioContextClass({ latencyHint: "interactive" });

            try {
              if (audioContext.state === "suspended") {
                await audioContext.resume();
              }
            } catch {}

            micSourceNode = audioContext.createMediaStreamSource(micStream);
            micAnalyser = audioContext.createAnalyser();
            micAnalyser.fftSize = 512;
            micAnalyser.smoothingTimeConstant = 0.55;
            micSourceNode.connect(micAnalyser);
            analyseMicrophone();
          }
        } catch (analyserError) {
          console.warn("Microphone analyser unavailable; audio remains active", analyserError);
          audioContext = null;
          micSourceNode = null;
          micAnalyser = null;
        }
      }
    } catch (error) {
      console.error("Microphone start failed", error);

      relayAudio?.stopCapture?.().catch(() => {});
      voiceRoom?.stopLocalAudio().catch(() => {});
      localPcmRelay?.stopCapture().catch(() => {});

      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
      }

      if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
      }

      micAnalyser = null;
      micActive = false;
      els.voiceButton.classList.remove("voice-live");

      if (claimed) releaseMicClaim();

      const message = microphoneErrorMessage(error);
      showError(message, 9000);
      els.liveMicStatus.textContent = message;
    }
  }

  function stopLiveMic() {
    const wasActive = micActive;
    cancelAnimationFrame(micFrame);
    micFrame = null;

    if (isSharedLocalServer()) {
      localPcmRelay?.stopCapture().catch((error) => {
        console.warn("Could not stop local PCM capture", error);
      });
    } else {
      relayAudio?.stopCapture?.().catch((error) => {
        console.warn("Could not stop relayed room audio cleanly", error);
      });
      voiceRoom?.stopLocalAudio().catch((error) => {
        console.warn("Could not stop room audio cleanly", error);
      });
    }

    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }

    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }

    try { micSourceNode?.disconnect(); } catch {}
    micSourceNode = null;
    micAnalyser = null;
    micActive = false;
    smoothedVoiceLevel = 0;
    laughPeaks = [];
    lastPeakHigh = false;

    els.avatarStage?.classList.remove("talking", "laughing");
    if (els.voiceMeterFill) els.voiceMeterFill.style.transform = "scaleX(0)";
    if (els.toggleLiveMic) {
      els.toggleLiveMic.classList.remove("active");
      els.voiceButton.classList.remove("voice-live");
      els.toggleLiveMic.querySelector("b").textContent = "تشغيل المايك";
    }
    if (els.liveMicStatus && !els.avatarLivePanel?.classList.contains("hidden")) {
      els.liveMicStatus.textContent = "اضغط تشغيل المايك";
    }

    window.dispatchEvent(new CustomEvent("rivo:avatar-level", {
      detail: { level: 0, laugh: false, active: false }
    }));

    if (wasActive) {
      sendVoiceState(false, 0, false);
      releaseMicClaim();
    }
  }

  function applyLocalVoiceLevel(inputLevel) {
    const target = Math.min(1, Math.max(0, Number(inputLevel || 0)));
    smoothedVoiceLevel = smoothedVoiceLevel * 0.68 + target * 0.32;

    const level = smoothedVoiceLevel < 0.012 ? 0 : smoothedVoiceLevel;
    const now = performance.now();
    const peakHigh = level > 0.34;

    if (peakHigh && !lastPeakHigh) {
      laughPeaks.push(now);
      laughPeaks = laughPeaks.filter((time) => now - time < 1200);
    }

    lastPeakHigh = peakHigh;

    const laugh = laughPeaks.length >= 3 && level > 0.18;

    els.avatarStage.classList.toggle("talking", level > 0.025);
    els.avatarStage.classList.toggle("laughing", laugh);
    els.avatarStage.style.setProperty("--voice-level", level.toFixed(3));
    els.voiceMeterFill.style.transform = `scaleX(${Math.max(0.03, level).toFixed(3)})`;

    if (level > 0.025) {
      els.liveMicStatus.textContent = "يلتقط صوتك — تكلم";
    }

    window.dispatchEvent(new CustomEvent("rivo:avatar-level", {
      detail: { level, laugh, active: true }
    }));

    if (now - lastVoiceBroadcastAt >= 100) {
      lastVoiceBroadcastAt = now;
      sendVoiceState(true, level, laugh);
    }
  }

  function analyseMicrophone() {
    if (!micActive || !micAnalyser) return;

    const data = new Float32Array(micAnalyser.fftSize);
    micAnalyser.getFloatTimeDomainData(data);

    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }

    const rms = Math.sqrt(sum / Math.max(1, data.length));
    const level = Math.min(1, Math.max(0, (rms - 0.0015) * 24));
    applyLocalVoiceLevel(level);

    micFrame = requestAnimationFrame(analyseMicrophone);
  }

  function toggleLiveMic() {
    if (micActive) stopLiveMic();
    else startLiveMic();
  }

  function openSidebar() {
    els.sidebar.classList.add("open");
    els.sidebarBackdrop.classList.remove("hidden");
  }

  function closeSidebar() {
    els.sidebar.classList.remove("open");
    els.sidebarBackdrop.classList.add("hidden");
  }

  class LocalPcmRelay {
    constructor() {
      this.captureContext = null;
      this.captureSource = null;
      this.processor = null;
      this.silentGain = null;
      this.playbackContext = null;
      this.playbackGain = null;
      this.nextPlayTime = 0;
      this.pendingChunks = [];
      this.muted = false;
      this.sequence = 0;
      this.active = false;
    }

    async unlock() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      if (!this.playbackContext || this.playbackContext.state === "closed") {
        this.playbackContext = new AudioContextClass({ latencyHint: "interactive" });
        this.playbackGain = this.playbackContext.createGain();
        this.playbackGain.gain.value = this.muted ? 0 : 1;
        this.playbackGain.connect(this.playbackContext.destination);
        this.nextPlayTime = this.playbackContext.currentTime + 0.06;
      }

      if (this.playbackContext.state !== "running") {
        try {
          await this.playbackContext.resume();
        } catch {}
      }

      if (this.playbackContext.state === "running" && this.pendingChunks.length) {
        const queued = this.pendingChunks.splice(0);
        queued.forEach((event) => this.playChunk(event));
      }

      return this.playbackContext.state === "running";
    }

    setMuted(muted) {
      this.muted = Boolean(muted);

      if (this.playbackGain && this.playbackContext) {
        this.playbackGain.gain.setTargetAtTime(
          this.muted ? 0 : 1,
          this.playbackContext.currentTime,
          0.02
        );
      }
    }

    isUnlocked() {
      return this.playbackContext?.state === "running";
    }

    async startCapture(stream) {
      if (!stream?.getAudioTracks?.().length) {
        throw new Error("No microphone audio track");
      }

      await this.stopCapture();

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio is not supported");
      }

      this.captureContext = new AudioContextClass({
        latencyHint: "interactive",
        sampleRate: 48000
      });

      if (this.captureContext.state === "suspended") {
        try {
          await this.captureContext.resume();
        } catch {}
      }

      this.captureSource = this.captureContext.createMediaStreamSource(stream);
      this.processor = this.captureContext.createScriptProcessor(4096, 1, 1);
      this.silentGain = this.captureContext.createGain();
      this.silentGain.gain.value = 0;

      this.captureSource.connect(this.processor);
      this.processor.connect(this.silentGain);
      this.silentGain.connect(this.captureContext.destination);

      this.active = true;

      this.processor.onaudioprocess = (event) => {
        if (!this.active || !micActive || !transport?.isReady?.()) return;

        const input = event.inputBuffer.getChannelData(0);
        let sum = 0;

        for (let i = 0; i < input.length; i++) {
          sum += input[i] * input[i];
        }

        const rms = Math.sqrt(sum / Math.max(1, input.length));
        const targetLevel = Math.min(1, Math.max(0, (rms - 0.0015) * 24));
        applyLocalVoiceLevel(targetLevel);

        const pcm = this.downsampleToInt16(
          input,
          this.captureContext.sampleRate,
          16000
        );

        transport.send({
          type: "audio-pcm",
          sampleRate: 16000,
          sequence: ++this.sequence,
          level: targetLevel,
          data: this.int16ToBase64(pcm)
        });
      };
    }

    async stopCapture() {
      this.active = false;

      if (this.processor) {
        this.processor.onaudioprocess = null;
      }

      try { this.captureSource?.disconnect(); } catch {}
      try { this.processor?.disconnect(); } catch {}
      try { this.silentGain?.disconnect(); } catch {}

      this.captureSource = null;
      this.processor = null;
      this.silentGain = null;

      if (this.captureContext) {
        try { await this.captureContext.close(); } catch {}
      }

      this.captureContext = null;
      this.sequence = 0;
    }

    handleChunk(event) {
      if (!event?.data || event.clientId === profile?.clientId) return;

      clearTimeout(remotePcmTimer);
      els.remoteAudioCount.textContent = "1";
      els.roomSoundButton.classList.add("receiving");
      els.roomSoundButton.title = `تستمع الآن إلى ${firstName(event.nickname)}`;

      remotePcmTimer = setTimeout(() => {
        els.remoteAudioCount.textContent = "0";
        els.roomSoundButton.classList.remove("receiving");
        els.roomSoundButton.title = "تشغيل أو كتم أصوات المستخدمين";
      }, 1100);

      if (!this.playbackContext || this.playbackContext.state !== "running") {
        this.pendingChunks.push(event);
        if (this.pendingChunks.length > 12) this.pendingChunks.shift();
        return;
      }

      this.playChunk(event);
    }

    playChunk(event) {
      if (!this.playbackContext || !this.playbackGain || this.muted) return;

      try {
        const samples = this.base64ToInt16(event.data);

        if (!samples.length) return;

        const sampleRate = Number(event.sampleRate || 16000);
        const buffer = this.playbackContext.createBuffer(1, samples.length, sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < samples.length; i++) {
          output[i] = samples[i] / 32768;
        }

        const source = this.playbackContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.playbackGain);

        const now = this.playbackContext.currentTime;
        if (
          !Number.isFinite(this.nextPlayTime) ||
          this.nextPlayTime < now - 0.15 ||
          this.nextPlayTime > now + 1.2
        ) {
          this.nextPlayTime = now + 0.055;
        }

        const startAt = Math.max(now + 0.025, this.nextPlayTime);
        source.start(startAt);
        this.nextPlayTime = startAt + buffer.duration;
      } catch (error) {
        console.warn("PCM playback failed", error);
      }
    }

    downsampleToInt16(input, inputRate, outputRate) {
      if (outputRate >= inputRate) {
        const direct = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          direct[i] = Math.max(-32768, Math.min(32767, input[i] * 32767));
        }
        return direct;
      }

      const ratio = inputRate / outputRate;
      const outputLength = Math.max(1, Math.floor(input.length / ratio));
      const output = new Int16Array(outputLength);

      for (let i = 0; i < outputLength; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.min(input.length, Math.floor((i + 1) * ratio));
        let sum = 0;
        let count = 0;

        for (let j = start; j < end; j++) {
          sum += input[j];
          count++;
        }

        const value = count ? sum / count : input[start] || 0;
        output[i] = Math.max(-32768, Math.min(32767, value * 32767));
      }

      return output;
    }

    int16ToBase64(samples) {
      const bytes = new Uint8Array(samples.buffer);
      let binary = "";
      const step = 8192;

      for (let i = 0; i < bytes.length; i += step) {
        binary += String.fromCharCode(...bytes.subarray(i, i + step));
      }

      return btoa(binary);
    }

    base64ToInt16(value) {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      return new Int16Array(bytes.buffer);
    }

    async destroy() {
      await this.stopCapture();

      if (this.playbackContext) {
        try { await this.playbackContext.close(); } catch {}
      }

      this.playbackContext = null;
      this.playbackGain = null;
      this.pendingChunks = [];
      this.nextPlayTime = 0;
    }
  }

  class LocalHttpTransport {
    constructor(user, room) {
      this.user = user;
      this.room = room;
      this.sessionId = "";
      this.eventHandler = () => {};
      this.statusHandler = () => {};
      this.closedByUser = false;
      this.ready = false;
      this.polling = false;
    }

    onEvent(handler) { this.eventHandler = handler; }
    onStatus(handler) { this.statusHandler = handler; }

    async connect() {
      this.closedByUser = false;
      this.statusHandler("connecting");

      try {
        const response = await fetch("/api/local/connect", {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          cache: "no-store",
          body: JSON.stringify({
            kind: "chat",
            nickname: this.user.nickname,
            avatar: this.user.avatar,
            clientId: this.user.clientId,
            privateOpen: this.user.privateOpen !== false,
            role: this.user.role || "user",
            adminVisible: this.user.adminVisible !== false,
            adminToken: this.user.adminToken || "",
            staffClientId: this.user.staffClientId || "",
            roomId: this.room || DEFAULT_ROOM
          })
        });

        if (!response.ok) {
          let failure = {};
          try { failure = await response.json(); } catch {}

          if (response.status === 403) {
            this.closedByUser = true;
            this.eventHandler({
              type: "admin-ban",
              message: failure.message || "حسابك محظور بواسطة الإدارة.",
              banUntil: failure.banUntil || 0
            });
            this.statusHandler("disconnected");
            return;
          }

          if (response.status === 401 && this.user.role === "moderator") {
            this.closedByUser = true;
            this.eventHandler({
              type: "staff-revoked",
              message: failure.error || "رمز المراقب متوقف أو منتهي أو تم تغييره."
            });
            this.statusHandler("disconnected");
            return;
          }

          throw new Error(failure.error || `Local connect failed: ${response.status}`);
        }

        const data = await response.json();
        this.sessionId = String(data.sessionId || "");
        this.ready = Boolean(this.sessionId);

        if (!this.ready) {
          throw new Error("The local server did not return a session.");
        }

        this.statusHandler("connected");
        this.eventHandler(data);
        this.pollLoop();
      } catch (error) {
        console.error("Shared local chat connection failed", error);
        this.ready = false;
        this.statusHandler("disconnected");

        if (!this.closedByUser) {
          setTimeout(() => this.connect(), 1200);
        }
      }
    }

    async pollLoop() {
      if (this.polling || this.closedByUser) return;
      this.polling = true;

      while (!this.closedByUser && this.sessionId) {
        try {
          const response = await fetch(
            `/api/local/poll?sessionId=${encodeURIComponent(this.sessionId)}&t=${Date.now()}`,
            { cache: "no-store" }
          );

          if (!response.ok) throw new Error(`Poll failed: ${response.status}`);

          const data = await response.json();

          if (data.closed) {
            throw new Error("Local session closed");
          }

          for (const event of (data.events || [])) {
            this.eventHandler(event);
          }

          await new Promise((resolve) => setTimeout(resolve, 65));
        } catch (error) {
          console.warn("Local poll paused", error);
          this.ready = false;
          this.statusHandler("disconnected");

          if (!this.closedByUser) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            this.polling = false;
            this.sessionId = "";
            this.connect();
            return;
          }
        }
      }

      this.polling = false;
    }

    send(payload) {
      if (!this.isReady()) return;

      fetch("/api/local/send", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        cache: "no-store",
        body: JSON.stringify({
          sessionId: this.sessionId,
          payload
        })
      }).catch((error) => {
        console.warn("Local send failed", error);
      });
    }

    isReady() {
      return this.ready && Boolean(this.sessionId);
    }

    close() {
      this.closedByUser = true;
      this.ready = false;
      this.statusHandler("disconnected");

      if (this.sessionId) {
        const body = JSON.stringify({ sessionId: this.sessionId });

        try {
          navigator.sendBeacon(
            "/api/local/disconnect",
            new Blob([body], { type: "application/json" })
          );
        } catch {
          fetch("/api/local/disconnect", {
            method: "POST",
            headers: { "content-type": "application/json; charset=utf-8" },
            body,
            keepalive: true
          }).catch(() => {});
        }
      }

      this.sessionId = "";
    }
  }

  class SocketTransport {
    constructor(user, room) {
      this.user = user;
      this.room = room;
      this.socket = null;
      this.eventHandler = () => {};
      this.statusHandler = () => {};
      this.closedByUser = false;
      this.retryCount = 0;
      this.heartbeat = null;
    }

    onEvent(handler) { this.eventHandler = handler; }
    onStatus(handler) { this.statusHandler = handler; }

    connect() {
      this.closedByUser = false;
      this.statusHandler("connecting");

      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const params = new URLSearchParams({
        nickname: this.user.nickname,
        avatar: this.user.avatar,
        clientId: this.user.clientId,
        privateOpen: this.user.privateOpen === false ? "0" : "1",
        role: this.user.role || "user",
        adminVisible: this.user.adminVisible === false ? "0" : "1",
        adminToken: this.user.adminToken || "",
        staffSessionToken: this.user.staffSessionToken || "",
        staffClientId: this.user.staffClientId || "",
        authToken: this.user.googleSessionToken || ""
      });
      const url = `${protocol}//${location.host}/api/rooms/${this.room}/ws?${params}`;

      this.socket = new WebSocket(url);

      this.socket.addEventListener("open", () => {
        this.retryCount = 0;
        this.statusHandler("connected");
        this.heartbeat = setInterval(() => this.send({ type: "ping" }), 25000);
      });

      this.socket.addEventListener("message", (event) => {
        try { this.eventHandler(JSON.parse(event.data)); } catch {}
      });

      this.socket.addEventListener("close", (event) => {
        clearInterval(this.heartbeat);
        this.statusHandler("disconnected");

        if (event.code === 4003) {
          this.closedByUser = true;
          this.eventHandler({
            type: "admin-ban",
            message: event.reason || "حسابك محظور بواسطة الإدارة."
          });
          return;
        }

        if (event.code === 4004) {
          this.closedByUser = true;
          this.eventHandler({
            type: "staff-revoked",
            message: event.reason || "تم إيقاف حساب المراقب أو انتهت مدته."
          });
          return;
        }

        if (!this.closedByUser) this.reconnect();
      });

      this.socket.addEventListener("error", () => {
        this.statusHandler("disconnected");
      });
    }

    reconnect() {
      const wait = Math.min(12000, 900 * (2 ** this.retryCount));
      this.retryCount += 1;
      setTimeout(() => {
        if (!this.closedByUser) this.connect();
      }, wait);
    }

    send(payload) {
      if (this.isReady()) this.socket.send(JSON.stringify(payload));
    }

    isReady() {
      return this.socket?.readyState === WebSocket.OPEN;
    }

    close() {
      this.closedByUser = true;
      clearInterval(this.heartbeat);
      this.socket?.close(1000, "User left");
    }
  }

  class DemoTransport {
    constructor(user, room) {
      this.user = user;
      this.room = room;
      this.sessionId = randomId();
      this.eventHandler = () => {};
      this.statusHandler = () => {};
      this.channel = null;
      this.users = new Map();
      this.heartbeat = null;
      this.cleanupTimer = null;
      this.ready = false;
      this.joinedAt = Date.now();
      this.privateWith = "";
      this.pendingPrivateRequest = null;
    }

    onEvent(handler) { this.eventHandler = handler; }
    onStatus(handler) { this.statusHandler = handler; }

    connect() {
      this.statusHandler("connecting");
      this.channel = new BroadcastChannel(`rivo_demo_${this.room}`);
      this.channel.onmessage = (event) => this.receive(event.data);

      this.users.set(this.sessionId, {
        sessionId: this.sessionId,
        clientId: this.user.clientId,
        nickname: this.user.nickname,
        avatar: this.user.avatar,
        privateOpen: this.user.privateOpen !== false,
        role: this.user.role || "user",
        adminVisible: this.user.adminVisible !== false,
        micBlocked: false,
        privateBlocked: false,
        privateBusy: Boolean(this.privateWith),
        joinedAt: this.joinedAt,
        lastSeen: Date.now()
      });

      this.ready = true;
      this.statusHandler("connected");
      this.emitInit();
      this.broadcast({ type: "demo-join", user: this.currentUser() });

      this.heartbeat = setInterval(() => {
        this.broadcast({ type: "demo-heartbeat", user: this.currentUser() });

        const micState = JSON.parse(localStorage.getItem(DEMO_MIC_STATE_KEY) || "null");
        if (
          micState?.active &&
          micState.clientId === this.user.clientId &&
          micState.sessionId === this.sessionId
        ) {
          micState.claimedAt = Date.now();
          localStorage.setItem(DEMO_MIC_STATE_KEY, JSON.stringify(micState));
        }
      }, 2500);

      this.cleanupTimer = setInterval(() => this.cleanupUsers(), 3000);
    }

    currentUser() {
      return {
        sessionId: this.sessionId,
        clientId: this.user.clientId,
        nickname: this.user.nickname,
        avatar: this.user.avatar,
        privateOpen: this.user.privateOpen !== false,
        role: this.user.role || "user",
        adminVisible: this.user.adminVisible !== false,
        micBlocked: false,
        privateBlocked: false,
        privateBusy: Boolean(this.privateWith),
        joinedAt: this.joinedAt,
        lastSeen: Date.now()
      };
    }

    emitInit() {
      const settings = JSON.parse(localStorage.getItem(DEMO_SETTINGS_KEY) || "null") || {
        publicMicEnabled: true,
        privateMicEnabled: false
      };
      const micBlocks = JSON.parse(localStorage.getItem(DEMO_MIC_BLOCKS_KEY) || "{}");
      const privateBlocks = JSON.parse(localStorage.getItem(DEMO_PRIVATE_BLOCKS_KEY) || "{}");

      this.eventHandler({
        type: "init",
        self: {
          ...this.currentUser(),
          micBlocked: Boolean(micBlocks[this.user.clientId]),
          privateBlocked: Boolean(privateBlocks[this.user.clientId])
        },
        messages: this.loadMessages(),
        users: this.publicUsers(),
        roomControls: settings
      });
    }

    receive(data) {
      if (!data || data.sessionId === this.sessionId) return;
      if (data.to && data.to !== this.user.clientId) return;

      if (data.type === "demo-join" || data.type === "demo-heartbeat") {
        const user = data.user;
        if (user?.sessionId) {
          this.users.set(user.sessionId, { ...user, lastSeen: Date.now() });
          this.emitPresence();
          if (data.type === "demo-join") {
            this.broadcast({ type: "demo-heartbeat", user: this.currentUser() });
          }
        }
        return;
      }

      if (data.type === "demo-leave") {
        this.users.delete(data.sessionId);
        this.emitPresence();
        return;
      }


      if (data.type === "private-request") {
        if (this.privateWith || this.pendingPrivateRequest) {
          this.broadcast({
            type: "private-rejected",
            to: data.from,
            message: `${this.user.nickname} مشغول الآن.`
          });
          return;
        }
        this.pendingPrivateRequest = data;
        this.eventHandler(data);
        return;
      }

      if (data.type === "private-response") {
        if (data.accept) {
          this.privateWith = data.from;
          const peer = [...this.users.values()].find((user) => user.clientId === data.from);
          this.eventHandler({ type: "private-started", with: data.from, peer });
          this.broadcast({ type: "demo-heartbeat", user: this.currentUser() });
        } else {
          this.eventHandler({ type: "private-rejected", message: data.message || "تم رفض طلب الخاص." });
        }
        return;
      }

      if (data.type === "private-end") {
        if (this.privateWith === data.from) {
          this.privateWith = "";
          this.eventHandler({ type: "private-ended", message: "أنهى المستخدم المحادثة الخاصة." });
          this.broadcast({ type: "demo-heartbeat", user: this.currentUser() });
        }
        return;
      }
      if (data.type === "admin-request-state") {
        const settings = JSON.parse(localStorage.getItem(DEMO_SETTINGS_KEY) || "null") || {
          publicMicEnabled: true,
          privateMicEnabled: false
        };
        const activeMic = JSON.parse(localStorage.getItem(DEMO_MIC_STATE_KEY) || "null");
        this.broadcast({
          type: "admin-state",
          users: this.allAdminUsers(),
          publicMicEnabled: settings.publicMicEnabled !== false,
          privateMicEnabled: Boolean(settings.privateMicEnabled),
          activeMic
        });
        return;
      }

      if (data.type === "admin-command") {
        this.handleDemoAdminCommand(data);
        return;
      }

      if (
        data.type === "message" ||
        data.type === "typing" ||
        data.type === "voice-state" ||
        data.type === "mic-state" ||
        data.type === "mic-denied" ||
        data.type === "private-message" ||
        data.type === "private-denied" ||
        data.type === "private-request" ||
        data.type === "private-request-sent" ||
        data.type === "private-rejected" ||
        data.type === "private-started" ||
        data.type === "private-ended" ||
        data.type === "rtc-ready" ||
        data.type === "rtc-signal"
      ) {
        this.eventHandler(data);
      }
    }

    claimMicDirect() {
      if (!this.ready) {
        return { ok: false, message: "الدردشة غير متصلة بعد." };
      }

      const settings = JSON.parse(localStorage.getItem(DEMO_SETTINGS_KEY) || "null") || {
        publicMicEnabled: true,
        privateMicEnabled: false
      };
      const micBlocks = JSON.parse(localStorage.getItem(DEMO_MIC_BLOCKS_KEY) || "{}");

      if (settings.publicMicEnabled === false) {
        return { ok: false, message: "الإدارة أغلقت مايك العامة." };
      }

      if (micBlocks[this.user.clientId]) {
        return { ok: false, message: "الإدارة منعت المايك عن حسابك." };
      }

      let current = JSON.parse(localStorage.getItem(DEMO_MIC_STATE_KEY) || "null");

      const currentSessionOnline = current?.sessionId
        ? this.users.has(current.sessionId)
        : false;

      const stale = current?.active && (
        !Number(current.claimedAt) ||
        Date.now() - Number(current.claimedAt) > 15000 ||
        (!currentSessionOnline && current.clientId !== this.user.clientId)
      );

      if (stale) {
        localStorage.removeItem(DEMO_MIC_STATE_KEY);
        current = null;
      }

      if (
        current?.active &&
        current.clientId &&
        current.clientId !== this.user.clientId
      ) {
        return {
          ok: false,
          message: `${current.nickname || "مستخدم آخر"} على المايك الآن.`
        };
      }

      const nextState = {
        type: "mic-state",
        active: true,
        clientId: this.user.clientId,
        sessionId: this.sessionId,
        nickname: this.user.nickname,
        avatar: this.user.avatar,
        claimedAt: Date.now()
      };

      localStorage.setItem(DEMO_MIC_STATE_KEY, JSON.stringify(nextState));
      handleMicState(nextState);
      this.broadcast(nextState);

      return { ok: true };
    }

    send(payload) {
      if (!this.ready) return;

      if (payload.type === "chat") {
        const message = {
          id: randomId(),
          clientId: this.user.clientId,
          nickname: this.user.nickname,
          avatar: this.user.avatar,
          role: this.user.role || "user",
          body: String(payload.body || "").trim().slice(0, 800),
          createdAt: Date.now()
        };
        if (!message.body) return;

        const messages = this.loadMessages();
        messages.push(message);
        localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(messages.slice(-LOCAL_PUBLIC_LIMIT)));

        const event = { type: "message", message };
        this.eventHandler(event);
        this.broadcast(event);
        return;
      }

      if (payload.type === "typing") {
        this.broadcast({
          type: "typing",
          clientId: this.user.clientId,
          nickname: this.user.nickname,
          active: Boolean(payload.active)
        });
        return;
      }

      if (payload.type === "voice-state") {
        this.broadcast({
          type: "voice-state",
          clientId: this.user.clientId,
          nickname: this.user.nickname,
          avatar: this.user.avatar,
          active: Boolean(payload.active),
          level: Math.max(0, Math.min(1, Number(payload.level || 0))),
          laugh: Boolean(payload.laugh)
        });
        return;
      }

      if (payload.type === "mic-claim") {
        const result = this.claimMicDirect();

        if (!result.ok) {
          this.eventHandler({
            type: "mic-denied",
            to: this.user.clientId,
            message: result.message
          });
        }
        return;
      }

      if (payload.type === "mic-release") {
        const current = JSON.parse(localStorage.getItem(DEMO_MIC_STATE_KEY) || "null");
        if (current?.clientId === this.user.clientId) {
          localStorage.removeItem(DEMO_MIC_STATE_KEY);
          const nextState = {
            type: "mic-state",
            active: false,
            clientId: this.user.clientId,
            nickname: this.user.nickname,
            avatar: this.user.avatar
          };
          this.eventHandler(nextState);
          this.broadcast(nextState);
        }
        return;
      }

      if (payload.type === "privacy-setting") {
        this.user.privateOpen = Boolean(payload.privateOpen);
        const own = this.users.get(this.sessionId);
        if (own) own.privateOpen = this.user.privateOpen;
        this.broadcast({ type: "demo-heartbeat", user: this.currentUser() });
        this.emitPresence();
        return;
      }


      if (payload.type === "private-request") {
        const targetId = String(payload.to || "");
        const target = [...this.users.values()].find((user) => user.clientId === targetId);
        if (!target || target.privateOpen === false || target.privateBusy || this.privateWith) {
          this.eventHandler({
            type: "private-denied",
            to: targetId,
            message: !target ? "المستخدم غير متصل الآن." : target.privateBusy ? `${target.nickname} مشغول في الخاص الآن.` : "الخاص غير متاح."
          });
          return;
        }
        const requestId = randomId();
        this.eventHandler({ type: "private-request-sent", to: targetId, requestId });
        this.broadcast({
          type: "private-request",
          to: targetId,
          from: this.user.clientId,
          fromNickname: this.user.nickname,
          fromAvatar: this.user.avatar,
          requestId
        });
        return;
      }

      if (payload.type === "private-response") {
        const request = this.pendingPrivateRequest;
        if (!request || request.requestId !== payload.requestId) return;
        this.pendingPrivateRequest = null;
        if (payload.accept) {
          this.privateWith = request.from;
          const peer = [...this.users.values()].find((user) => user.clientId === request.from);
          this.eventHandler({ type: "private-started", with: request.from, peer });
          this.broadcast({ type: "private-response", to: request.from, from: this.user.clientId, accept: true });
          this.broadcast({ type: "demo-heartbeat", user: this.currentUser() });
        } else {
          this.broadcast({ type: "private-response", to: request.from, from: this.user.clientId, accept: false, message: `${this.user.nickname} رفض طلب الخاص.` });
        }
        return;
      }

      if (payload.type === "private-end") {
        const targetId = this.privateWith || String(payload.with || "");
        if (targetId) this.broadcast({ type: "private-end", to: targetId, from: this.user.clientId });
        this.privateWith = "";
        this.broadcast({ type: "demo-heartbeat", user: this.currentUser() });
        return;
      }
      if (payload.type === "private-history-request") {
        const targetId = String(payload.with || "");
        const history = this.loadPrivateMessages().filter((message) =>
          (message.senderId === this.user.clientId && message.recipientId === targetId) ||
          (message.senderId === targetId && message.recipientId === this.user.clientId)
        );

        this.eventHandler({
          type: "private-history",
          with: targetId,
          messages: history
        });
        return;
      }

      if (payload.type === "private-chat") {
        const targetId = String(payload.to || "");
        const target = [...this.users.values()].find((user) => user.clientId === targetId);
        const privateBlocks = JSON.parse(localStorage.getItem(DEMO_PRIVATE_BLOCKS_KEY) || "{}");

        if (!target || this.privateWith !== targetId || target.privateOpen === false || privateBlocks[targetId] || privateBlocks[this.user.clientId]) {
          this.eventHandler({
            type: "private-denied",
            to: targetId,
            message: target
              ? (this.privateWith !== targetId ? "يجب أن يوافق المستخدم على طلب الخاص أولاً." : `${target.nickname} أغلق الرسائل الخاصة.`)
              : "المستخدم غير متصل الآن."
          });
          return;
        }

        const message = {
          id: randomId(),
          senderId: this.user.clientId,
          senderNickname: this.user.nickname,
          senderAvatar: this.user.avatar,
          recipientId: target.clientId,
          recipientNickname: target.nickname,
          recipientAvatar: target.avatar,
          body: String(payload.body || "").trim().slice(0, 800),
          createdAt: Date.now()
        };

        if (!message.body) return;

        const messages = this.loadPrivateMessages();
        messages.push(message);
        localStorage.setItem(
          DEMO_PRIVATE_MESSAGES_KEY,
          JSON.stringify(messages.slice(-500))
        );

        const event = { type: "private-message", message };
        this.eventHandler(event);
        this.broadcast({ ...event, to: target.clientId });
        return;
      }

      if (payload.type === "rtc-ready") {
        this.broadcast({
          type: "rtc-ready",
          from: this.user.clientId,
          to: payload.to || undefined,
          nickname: this.user.nickname,
          avatar: this.user.avatar,
          active: Boolean(payload.active)
        });
        return;
      }

      if (payload.type === "rtc-signal") {
        this.broadcast({
          type: "rtc-signal",
          from: this.user.clientId,
          to: payload.to,
          signal: payload.signal
        });
      }
    }

    broadcast(payload) {
      this.channel?.postMessage({ ...payload, sessionId: this.sessionId });
    }

    loadMessages() {
      try {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const data = JSON.parse(localStorage.getItem(DEMO_MESSAGES_KEY) || "[]");
        const clean = (Array.isArray(data) ? data : [])
          .filter((message) => Number(message?.createdAt || 0) >= cutoff)
          .slice(-LOCAL_PUBLIC_LIMIT);
        localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(clean));
        return clean;
      } catch {
        return [];
      }
    }

    loadPrivateMessages() {
      try {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const data = JSON.parse(localStorage.getItem(DEMO_PRIVATE_MESSAGES_KEY) || "[]");
        const clean = (Array.isArray(data) ? data : [])
          .filter((message) => Number(message?.createdAt || 0) >= cutoff)
          .slice(-500);
        localStorage.setItem(DEMO_PRIVATE_MESSAGES_KEY, JSON.stringify(clean));
        return clean;
      } catch {
        return [];
      }
    }

    cleanupUsers() {
      const cutoff = Date.now() - 8000;
      let changed = false;
      for (const [id, user] of this.users) {
        if (user.lastSeen < cutoff) {
          this.users.delete(id);
          changed = true;
        }
      }
      if (changed) this.emitPresence();
    }

    allAdminUsers() {
      const micBlocks = JSON.parse(localStorage.getItem(DEMO_MIC_BLOCKS_KEY) || "{}");
      const privateBlocks = JSON.parse(localStorage.getItem(DEMO_PRIVATE_BLOCKS_KEY) || "{}");
      const seen = new Set();
      const result = [];

      for (const user of this.users.values()) {
        if (seen.has(user.clientId)) continue;
        seen.add(user.clientId);
        result.push({
          clientId: user.clientId,
          nickname: user.nickname,
          avatar: user.avatar,
          privateOpen: user.privateOpen !== false,
          role: user.role || "user",
          adminVisible: user.adminVisible !== false,
          micBlocked: Boolean(micBlocks[user.clientId]),
          privateBlocked: Boolean(privateBlocks[user.clientId]),
          privateBusy: Boolean(user.privateBusy),
          joinedAt: Number(user.joinedAt || user.lastSeen || Date.now())
        });
      }

      return result.sort((a, b) =>
        roleRank(a) - roleRank(b) ||
        Number(a.joinedAt || 0) - Number(b.joinedAt || 0) ||
        String(a.nickname).localeCompare(String(b.nickname), "ar")
      );
    }

    handleDemoAdminCommand(data) {
      const settings = JSON.parse(localStorage.getItem(DEMO_SETTINGS_KEY) || "null") || {
        publicMicEnabled: true,
        privateMicEnabled: false
      };
      const micBlocks = JSON.parse(localStorage.getItem(DEMO_MIC_BLOCKS_KEY) || "{}");
      const privateBlocks = JSON.parse(localStorage.getItem(DEMO_PRIVATE_BLOCKS_KEY) || "{}");

      if (data.action === "set-public-mic") {
        settings.publicMicEnabled = Boolean(data.enabled);
        localStorage.setItem(DEMO_SETTINGS_KEY, JSON.stringify(settings));
        this.eventHandler({ type: "room-controls", ...settings });
        if (!settings.publicMicEnabled && micActive) {
          this.eventHandler({ type: "admin-force-mic-off" });
        }
      }

      if (data.action === "set-private-mic") {
        settings.privateMicEnabled = Boolean(data.enabled);
        localStorage.setItem(DEMO_SETTINGS_KEY, JSON.stringify(settings));
        this.eventHandler({ type: "room-controls", ...settings });
      }

      if (data.action === "force-release-mic") {
        const active = JSON.parse(localStorage.getItem(DEMO_MIC_STATE_KEY) || "null");
        if (active?.clientId === this.user.clientId) {
          this.eventHandler({ type: "admin-force-mic-off" });
        }
        localStorage.removeItem(DEMO_MIC_STATE_KEY);
        this.broadcast({
          type: "mic-state",
          active: false,
          clientId: active?.clientId || "",
          nickname: active?.nickname || "",
          avatar: active?.avatar || ""
        });
      }

      if (data.action === "block-user-mic") {
        micBlocks[data.clientId] = Boolean(data.blocked);
        localStorage.setItem(DEMO_MIC_BLOCKS_KEY, JSON.stringify(micBlocks));
        if (data.clientId === this.user.clientId) {
          this.eventHandler({
            type: "user-restrictions",
            clientId: this.user.clientId,
            micBlocked: Boolean(data.blocked),
            privateBlocked: Boolean(privateBlocks[this.user.clientId])
          });
        }
      }

      if (data.action === "block-user-private") {
        privateBlocks[data.clientId] = Boolean(data.blocked);
        localStorage.setItem(DEMO_PRIVATE_BLOCKS_KEY, JSON.stringify(privateBlocks));
        if (data.clientId === this.user.clientId) {
          this.eventHandler({
            type: "user-restrictions",
            clientId: this.user.clientId,
            micBlocked: Boolean(micBlocks[this.user.clientId]),
            privateBlocked: Boolean(data.blocked)
          });
        }
      }

      if (data.action === "kick-user" && data.clientId === this.user.clientId) {
        this.eventHandler({
          type: "admin-kick",
          message: "تم إخراجك من الدردشة بواسطة الإدارة."
        });
      }

      this.emitPresence();
      this.broadcast({
        type: "admin-state",
        users: this.allAdminUsers(),
        publicMicEnabled: settings.publicMicEnabled !== false,
        privateMicEnabled: Boolean(settings.privateMicEnabled),
        activeMic: JSON.parse(localStorage.getItem(DEMO_MIC_STATE_KEY) || "null")
      });
    }

    publicUsers() {
      const seen = new Set();
      const result = [];
      const micBlocks = JSON.parse(localStorage.getItem(DEMO_MIC_BLOCKS_KEY) || "{}");
      const privateBlocks = JSON.parse(localStorage.getItem(DEMO_PRIVATE_BLOCKS_KEY) || "{}");

      for (const user of this.users.values()) {
        if (seen.has(user.clientId)) continue;
        if (["owner", "moderator"].includes(user.role) && user.adminVisible === false) continue;

        seen.add(user.clientId);
        result.push({
          clientId: user.clientId,
          nickname: user.nickname,
          avatar: user.avatar,
          privateOpen: user.privateOpen !== false && !privateBlocks[user.clientId],
          role: user.role || "user",
          adminVisible: user.adminVisible !== false,
          micBlocked: Boolean(micBlocks[user.clientId]),
          privateBlocked: Boolean(privateBlocks[user.clientId]),
          privateBusy: Boolean(user.privateBusy),
          joinedAt: Number(user.joinedAt || user.lastSeen || Date.now())
        });
      }
      return result.sort((a, b) =>
        roleRank(a) - roleRank(b) ||
        Number(a.joinedAt || 0) - Number(b.joinedAt || 0) ||
        String(a.nickname).localeCompare(String(b.nickname), "ar")
      );
    }

    emitPresence() {
      this.eventHandler({ type: "presence", users: this.publicUsers() });
    }

    isReady() { return this.ready; }

    close() {
      if (!this.ready) return;
      const current = JSON.parse(localStorage.getItem(DEMO_MIC_STATE_KEY) || "null");
      if (current?.clientId === this.user.clientId) {
        localStorage.removeItem(DEMO_MIC_STATE_KEY);
        this.broadcast({
          type: "mic-state",
          active: false,
          clientId: this.user.clientId,
          nickname: this.user.nickname,
          avatar: this.user.avatar
        });
      }
      if (this.privateWith) {
        this.broadcast({ type: "private-end", to: this.privateWith, from: this.user.clientId });
        this.privateWith = "";
      }
      this.broadcast({ type: "demo-leave" });
      clearInterval(this.heartbeat);
      clearInterval(this.cleanupTimer);
      this.channel?.close();
      this.ready = false;
      this.statusHandler("disconnected");
    }
  }


  function installProfessionalBridge() {
    window.RIVO_APP = {
      send(payload) {
        if (transport?.isReady?.()) transport.send(payload);
      },
      isReady() {
        return Boolean(transport?.isReady?.());
      },
      getProfile() {
        return profile ? { ...profile } : null;
      },
      getUsers() {
        return currentUsers.map((user) => ({ ...user }));
      },
      getMessages() {
        return publicMessages.map((message) => ({ ...message }));
      },
      openPrivate(clientId) {
        const user = currentUsers.find((item) => item.clientId === clientId);
        if (user) openPrivateChat(user);
      },
      showMessage(message, duration = 4000) {
        showError(message, duration);
      },
      avatarUrl,
      firstName
    };

    window.dispatchEvent(new CustomEvent("rivo:bridge-ready"));
  }

  function bindEvents() {
    document.addEventListener("pointerdown", () => {
      unlockRoomAudio().catch(() => {});
    }, { once: true, capture: true });

    document.addEventListener("keydown", () => {
      unlockRoomAudio().catch(() => {});
    }, { once: true, capture: true });

    document.addEventListener("pointerdown", () => {
      localPcmRelay?.unlock?.().catch(() => {});
    }, { passive: true });

    document.addEventListener("keydown", () => {
      localPcmRelay?.unlock?.().catch(() => {});
    });

    els.moderatorLoginOpen?.addEventListener("click", openModeratorLogin);
    els.moderatorLoginClose?.addEventListener("click", closeModeratorLogin);
    els.moderatorLoginBackdrop?.addEventListener("click", closeModeratorLogin);
    els.moderatorLoginForm?.addEventListener("submit", handleModeratorMainLogin);

    els.vipJoinOpen?.addEventListener("click", openVipModal);
    els.vipHeaderButton?.addEventListener("click", openVipModal);
    bindReliableModalClose(els.vipModalClose, closeVipModal);
    bindReliableModalClose(els.vipModal?.querySelector("[data-close-vip]"), closeVipModal);
    installVipCloseSafetyNet();
    els.vipRequestButton?.addEventListener("click", requestVipMembership);

    els.mobileRoomsButton?.addEventListener("click", () => {
      closeSidebar();
      openRoomsMenu();
    });
    els.mobileVipButton?.addEventListener("click", () => {
      closeSidebar();
      openVipModal();
    });
    els.vipStealthButton?.addEventListener("click", () => {
      if (!profile?.isVip || !transport?.isReady?.()) return;
      const enabled = !profile.vipStealth;
      profile.vipStealth = enabled;
      syncVipUi();
      transport.send({ type: "vip-stealth", enabled });
    });
    els.vipGiftClose?.addEventListener("click", closeVipGift);
    els.vipGiftModal?.querySelector("[data-close-vip-gift]")?.addEventListener("click", closeVipGift);
    els.vipGiftGrid?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-gift]");
      if (button) sendVipGift(button.dataset.gift);
    });

    els.joinForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      unlockRoomAudio().catch(() => {});
      const nickname = cleanNickname(els.nicknameInput.value);

      if (googleRequired() && !googleSession?.sessionToken) {
        showError("سجّل الدخول بحساب Google أولاً.", 5000);
        return;
      }

      if (nickname.length < 2) {
        els.nicknameInput.focus();
        return;
      }

      els.joinButton.disabled = true;
      const originalText = els.joinButton.querySelector("span")?.textContent || "دخول الدردشة";
      if (els.joinButton.querySelector("span")) els.joinButton.querySelector("span").textContent = "جاري اختيار غرفة متاحة…";
      await loadRooms({ assign: true });
      enterChat({
        clientId: googleSession?.googleUid ? `google:${googleSession.googleUid}` : getClientId(),
        nickname,
        avatar: selectedAvatar,
        googleUid: googleSession?.googleUid || "",
        googleEmail: googleSession?.email || ""
      });
      els.joinButton.disabled = false;
      if (els.joinButton.querySelector("span")) els.joinButton.querySelector("span").textContent = originalText;
    });

    els.composer.addEventListener("submit", (event) => {
      event.preventDefault();
      sendCurrentMessage();
    });

    els.messageInput.addEventListener("input", () => {
      resizeComposer();
      sendTyping(true);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => sendTyping(false), 1100);
    });

    els.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendCurrentMessage();
      }
    });

    els.emojiButton.addEventListener("click", () => {
      els.emojiPanel.classList.toggle("hidden");
    });

    els.emojiPanel.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const start = els.messageInput.selectionStart;
      const end = els.messageInput.selectionEnd;
      const value = els.messageInput.value;
      els.messageInput.value = value.slice(0, start) + button.textContent + value.slice(end);
      els.messageInput.focus();
      els.messageInput.selectionStart = els.messageInput.selectionEnd = start + button.textContent.length;
      resizeComposer();
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("#emojiPanel") && !event.target.closest("#emojiButton")) {
        els.emojiPanel.classList.add("hidden");
      }
    });

    els.voiceButton.addEventListener("click", () => {
      unlockRoomAudio().catch(() => {});

      if (micActive && stageMode === "local") {
        stopLiveMic();
        hideCharacterStage();
        return;
      }

      openAvatarStage();
      if (!micActive) startLiveMic();
    });

    els.roomsMenuButton?.addEventListener("click", openRoomsMenu);
    els.closeRoomsModal?.addEventListener("click", closeRoomsMenu);
    els.roomsModal?.querySelector("[data-close-rooms]")?.addEventListener("click", closeRoomsMenu);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.roomsModal?.classList.contains("hidden")) closeRoomsMenu();
      if (event.key === "Escape" && !els.vipModal?.classList.contains("hidden")) closeVipModal();
      if (event.key === "Escape" && !els.vipGiftModal?.classList.contains("hidden")) closeVipGift();
    });

    els.roomSoundButton.addEventListener("click", async () => {
      const wasUnlocked = Boolean(
        relayAudio?.isUnlocked?.() ||
        voiceRoom?.isPlaybackUnlocked?.() ||
        (isSharedLocalServer() && localPcmRelay?.isUnlocked?.())
      );

      const unlocked = await unlockRoomAudio();
      if (!unlocked) {
        syncRoomSoundButton();
        return;
      }

      // The first tap must enable playback, not immediately mute it.
      if (!wasUnlocked) {
        relayAudio?.setMuted?.(false);
        voiceRoom?.setPlaybackMuted?.(false);
        localPcmRelay?.setMuted?.(false);
        syncRoomSoundButton();
        showError("صوت الغرفة يعمل الآن.", 2200);
        return;
      }

      const currentlyMuted = Boolean(
        relayAudio?.isMuted?.() ||
        voiceRoom?.isPlaybackMuted?.() ||
        localPcmRelay?.isMuted?.()
      );
      const nextMuted = !currentlyMuted;
      relayAudio?.setMuted?.(nextMuted);
      voiceRoom?.setPlaybackMuted?.(nextMuted);
      localPcmRelay?.setMuted?.(nextMuted);
      syncRoomSoundButton();
    });

    els.toggleLiveMic.addEventListener("click", async () => {
      await unlockRoomAudio();
      toggleLiveMic();
    });
    els.closeAvatarStage.addEventListener("click", closeAvatarStage);
    window.addEventListener("rivo:vrm-ready", () => {
      els.avatarFallback.classList.add("hidden");
      els.modelLoading.classList.add("hidden");
    });

    window.addEventListener("rivo:vrm-loading", () => {
      els.avatarFallback.classList.remove("hidden");
      els.modelLoading.classList.remove("hidden");
    });

    window.addEventListener("rivo:vrm-error", () => {
      els.avatarFallback.classList.remove("hidden");
      els.modelLoading.classList.add("hidden");
      els.liveMicStatus.textContent = "تعذر تحميل النموذج الثلاثي الأبعاد";
    });

    els.publicNavButton.addEventListener("click", switchToPublic);
    els.privateNavButton?.addEventListener("click", openPrivateHome);
    els.backToPublicButton.addEventListener("click", switchToPublic);

    els.privatePopupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      sendPrivatePopupMessage();
    });

    els.privatePopupInput.addEventListener("input", () => {
      els.privatePopupInput.style.height = "auto";
      els.privatePopupInput.style.height =
        `${Math.min(els.privatePopupInput.scrollHeight, 110)}px`;
    });

    els.privatePopupInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendPrivatePopupMessage();
      }
    });

    els.privatePopupMinimize.addEventListener("click", minimizePrivatePopup);
    els.privatePopupExpand.addEventListener("click", togglePrivatePopupExpanded);
    els.privatePopupClose.addEventListener("click", closePrivatePopup);
    els.privatePopupCollapsedButton.addEventListener("click", restorePrivatePopup);
    els.privateRequestAccept?.addEventListener("click", () => {
      if (!pendingPrivateRequest || !transport?.isReady?.()) return;
      transport.send({ type: "private-response", requestId: pendingPrivateRequest.requestId, accept: true });
      hidePrivateRequestModal();
    });
    els.privateRequestReject?.addEventListener("click", () => {
      if (pendingPrivateRequest && transport?.isReady?.()) {
        transport.send({ type: "private-response", requestId: pendingPrivateRequest.requestId, accept: false });
      }
      pendingPrivateRequest = null;
      hidePrivateRequestModal();
      renderUsers(currentUsers);
    });
    els.privateToggleButton.addEventListener("click", () => {
      setPrivateOpen(profile?.privateOpen === false);
    });

    els.changeProfileButton.addEventListener("click", leaveChat);
    els.googleLogoutButton?.addEventListener("click", () => {
      window.RivoGoogleAuth?.clearSession?.();
      googleSession = null;
      syncGoogleUi();
    });
    els.openSidebar.addEventListener("click", openSidebar);
    els.closeSidebar.addEventListener("click", closeSidebar);
    els.sidebarBackdrop.addEventListener("click", closeSidebar);

    window.addEventListener("beforeunload", () => {
      clearInterval(localCleanupTimer);
      clearInterval(roomRefreshTimer);
      clearInterval(vipRefreshTimer);
      clearTimeout(localCleanupDebounce);
      if (privateSessionPeerId && transport?.isReady?.()) {
        transport.send({ type: "private-end", with: privateSessionPeerId });
      }
      if (micActive) sendVoiceState(false, 0, false);
      releaseMicClaim();
      voiceRoom?.destroy();
      relayAudio?.destroy();
      localPcmRelay?.destroy();
      transport?.close();
    });

    const promptInstallApp = async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      els.installButton?.classList.add("hidden");
      els.mobileInstallButton?.classList.add("hidden");
    };

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      els.installButton?.classList.remove("hidden");
      els.mobileInstallButton?.classList.remove("hidden");
    });

    els.installButton?.addEventListener("click", promptInstallApp);
    els.mobileInstallButton?.addEventListener("click", async () => {
      closeSidebar();
      await promptInstallApp();
    });
  }

  function registerServiceWorker() {
    const local = location.protocol === "file:" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "localhost";

    if (local) {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then((items) => Promise.all(items.map((item) => item.unregister())))
          .catch(() => {});
      }

      if ("caches" in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  async function init() {
    const params = new URLSearchParams(location.search);
    const requestedRoom = String(params.get("room") || "").trim();
    if (requestedRoom) {
      activeRoomId = requestedRoom;
      sessionStorage.setItem(ROOM_KEY, activeRoomId);
    }
    const adminAutoName = String(params.get("adminAutoName") || "").trim();

    if (adminAutoName && !els.nicknameInput.value) {
      els.nicknameInput.value = adminAutoName;
    }

    voiceRoom = createVoiceRoom();
    relayAudio = createRelayAudio();
    localPcmRelay?.destroy().catch(() => {});
    localPcmRelay = new LocalPcmRelay();
    syncRoomSoundButton();
    await loadDynamicCharacters();
    bindEvents();
    registerServiceWorker();
    setConnectionStatus("disconnected");
    await initializeGoogleLogin();

    const saved = loadSavedProfile();
    const pendingAvatar = loadPendingAvatar();
    selectedAvatar = getCharacter(pendingAvatar || saved?.avatar || selectedAvatar).id;
    buildAvatarGrid();
    installFirstGestureAudioUnlock();
    await loadRooms({ assign: true });

    if (adminAutoName) {
      const adminProfile = {
        ...(saved || {}),
        nickname: adminAutoName,
        avatar: saved?.avatar || selectedAvatar
      };

      selectedAvatar = getCharacter(adminProfile.avatar).id;
      els.nicknameInput.value = adminAutoName;
      enterChat(adminProfile);
    } else if (
      saved?.nickname &&
      saved?.avatar &&
      (!googleRequired() || (googleSession?.googleUid && saved.googleUid === googleSession.googleUid))
    ) {
      selectedAvatar = getCharacter(saved.avatar).id;
      els.nicknameInput.value = saved.nickname;
      enterChat(saved);
    } else {
      els.nicknameInput.focus();
    }
  }

  init();
})();
