(() => {
  "use strict";

  const CONFIG = window.RIVO_ADMIN_CONFIG || {};
  const PANEL_MODE = document.body?.dataset?.panelMode || "owner";
  let ROOM = new URLSearchParams(location.search).get("room") || CONFIG.room || "lobby";
  const SESSION_KEY = PANEL_MODE === "owner" ? "rivo_staff_identity_owner_v1" : "rivo_staff_identity_moderator_v1";
  const CLIENT_ID_KEY = "rivo_group_client_id_v1";
  const DEMO_SETTINGS_KEY = "rivo_demo_room_controls_v1";
  const DEMO_MIC_STATE_KEY = "rivo_demo_active_mic_v1";

  const ADMIN_BADGES = {
    star: { icon: "⭐", label: "نجمة ذهبية" },
    diamond: { icon: "💎", label: "ماسة زرقاء" },
    ruby: { icon: "♦️", label: "جوهرة حمراء" },
    heart: { icon: "❤️", label: "قلب ملكي" },
        emerald: { icon: "💚", label: "زمردة خضراء" }
  };

  const ADMIN_CHARACTERS = [
    "lina", "girl2", "girl3", "girl4", "man1", "avatar6", "avatar7"
  ];


  const $ = (id) => document.getElementById(id);
  const els = {
    login: $("adminLogin"),
    dashboard: $("adminDashboard"),
    form: $("adminLoginForm"),
    loginButton: $("adminLoginButton"),
    loginStatus: $("loginStatus"),
    code: $("adminCode"),
    role: $("adminRole"),
    visible: $("adminVisible"),
    roleLabel: $("adminRoleLabel"),
    connection: $("adminConnection"),
    reloadChat: $("reloadChatButton"),
    expandChat: $("expandChatButton"),
    openSeparateChat: $("openSeparateChatButton"),
    logout: $("adminLogoutButton"),
    publicMic: $("publicMicToggle"),
    privateMic: $("privateMicToggle"),
    forceRelease: $("forceReleaseMic"),
    currentSpeaker: $("currentSpeakerName"),
    adminCurrentRoomName: $("adminCurrentRoomName"),
    backToMainAdmin: $("backToMainAdmin"),
    usersCount: $("adminUsersCount"),
    usersList: $("adminUsersList"),
    log: $("adminLog"),
    toast: $("adminToast"),
    workspace: $("adminWorkspace"),
    controlRail: $("adminControlRail"),
    hideControls: $("hideControlsButton"),
    showControls: $("showControlsButton"),
    chatFrame: $("adminChatFrame"),
    chatFrameState: $("chatFrameState"),
    stealth: $("staffStealthToggle"),
    staffName: $("staffNameInput"),
    saveStaffName: $("saveStaffNameButton"),
    avatarGrid: $("staffAvatarGrid"),
    awardUser: $("awardUserSelect"),
    awardBadge: $("awardBadgeSelect"),
    awardBadgeGrid: $("awardBadgeGrid"),
    selectedAwardPreview: $("selectedAwardPreview"),
    selectedAwardIcon: $("selectedAwardIcon"),
    selectedAwardLabel: $("selectedAwardLabel"),
    giveAward: $("giveAwardButton"),
    removeAward: $("removeAwardButton"),
    moderationUser: $("moderationUserSelect"),
    banDuration: $("banDurationSelect"),
    kickSelected: $("kickSelectedButton"),
    banSelected: $("banSelectedButton"),
    bannedUsersList: $("bannedUsersList"),
    bannedUsersTitle: $("bannedUsersTitle"),
    moderationHint: $("moderationHint"),
    noticeKind: $("noticeKindSelect"),
    noticeText: $("noticeTextInput"),
    publishNotice: $("publishNoticeButton"),
    clearNotice: $("clearNoticeButton"),
    currentNotice: $("currentNoticePreview"),
    reportsCount: $("reportsCount"),
    reportsList: $("reportsList"),
    permissionsCard: $("moderatorPermissionsCard"),
    moderatorSelect: $("moderatorSelect"),
    permMic: $("permMic"),
    permPrivate: $("permPrivate"),
    permKick: $("permKick"),
    permTempBan: $("permTempBan"),
    permPermanentBan: $("permPermanentBan"),
    permGifts: $("permGifts"),
    permReports: $("permReports"),
    permPin: $("permPin"),
    saveModeratorPermissions: $("saveModeratorPermissions"),
    staffAccountsCard: $("staffAccountsCard"),
    staffAccountsCount: $("staffAccountsCount"),
    newModeratorName: $("newModeratorName"),
    newModeratorDuration: $("newModeratorDuration"),
    createModeratorAccount: $("createModeratorAccount"),
    staffAccountsList: $("staffAccountsList"),
    vipSubscriptionsCard: $("vipSubscriptionsCard"),
    vipRequestsCount: $("vipRequestsCount"),
    vipRequestsList: $("vipRequestsList"),
    vipMembersList: $("vipMembersList"),
    roomsManagerCard: $("roomsManagerCard"),
    roomsCount: $("roomsCount"),
    newRoomId: $("newRoomId"),
    newRoomName: $("newRoomName"),
    createRoom: $("createRoomButton"),
    roomsManagerList: $("roomsManagerList"),
    charactersManagerCard: $("charactersManagerCard"),
    charactersCount: $("charactersCount"),
    characterId: $("characterId"),
    characterName: $("characterName"),
    characterThumbnailUrl: $("characterThumbnailUrl"),
    characterVrmUrl: $("characterVrmUrl"),
    characterVoiceId: $("characterVoiceId"),
    characterDialect: $("characterDialect"),
    characterOrder: $("characterOrder"),
    characterDescription: $("characterDescription"),
    characterVipOnly: $("characterVipOnly"),
    characterVisible: $("characterVisible"),
    characterThumbnailFile: $("characterThumbnailFile"),
    characterVrmFile: $("characterVrmFile"),
    uploadCharacterThumbnail: $("uploadCharacterThumbnail"),
    uploadCharacterVrm: $("uploadCharacterVrm"),
    saveCharacter: $("saveCharacterButton"),
    clearCharacterForm: $("clearCharacterFormButton"),
    charactersManagerList: $("charactersManagerList"),
    roomControlCard: $("roomControlCard"),
    staffProfileCard: $("staffProfileCard"),
    awardCard: $("awardCard"),
    moderationCard: $("moderationCard"),
    announcementCard: $("announcementCard"),
    reportsCard: $("reportsCard"),
    usersManagementCard: $("usersManagementCard"),
    adminLogCard: $("adminLogCard")
  };

  let identity = null;
  let socket = null;
  let channel = null;
  let demoUsers = new Map();
  let demoCleanup = null;
  let authenticated = false;
  let chatExpanded = false;
  let localSessionId = "";
  let localClosed = false;
  let currentAdminUsers = [];
  let currentBans = [];
  let currentReports = [];
  let currentLogs = [];
  let currentPermissions = [];
  let currentPinnedNotice = null;
  let currentStaffAccounts = [];
  let currentVipRequests = [];
  let currentVipMembers = [];
  let currentRoomCatalog = [];
  let currentRoomStatuses = [];
  let currentCharacters = [];
  let roomStatusTimer = null;

  function firstName(value) {
    const clean = String(value || "").trim().replace(/\s+/g, " ");
    return clean ? clean.split(" ")[0] : "مستخدم";
  }

  function selectAwardBadge(badgeId) {
    const badge = ADMIN_BADGES[badgeId] || ADMIN_BADGES.star;
    if (els.awardBadge) els.awardBadge.value = badgeId in ADMIN_BADGES ? badgeId : "star";

    els.awardBadgeGrid?.querySelectorAll(".award-badge-option").forEach((button) => {
      const selected = button.dataset.badge === (els.awardBadge?.value || "star");
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", selected ? "true" : "false");
    });

    if (els.selectedAwardIcon) {
      els.selectedAwardIcon.className = `gift-preview-icon badge-${els.awardBadge?.value || "star"}`;
      els.selectedAwardIcon.textContent = badge.icon;
    }
    if (els.selectedAwardLabel) els.selectedAwardLabel.textContent = badge.label;
  }

  function buildAwardBadgeGrid() {
    if (!els.awardBadgeGrid) return;
    els.awardBadgeGrid.textContent = "";

    Object.entries(ADMIN_BADGES).forEach(([id, badge]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `award-badge-option badge-card-${id}`;
      button.dataset.badge = id;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", "false");
      button.title = `اختيار ${badge.label}`;

      const icon = document.createElement("span");
      icon.className = `award-card-icon badge-${id}`;
      icon.textContent = badge.icon;

      const text = document.createElement("span");
      const label = document.createElement("strong");
      label.textContent = badge.label;
      const hint = document.createElement("small");
      hint.textContent = "اضغط للاختيار";
      text.append(label, hint);

      button.append(icon, text);
      button.addEventListener("click", () => selectAwardBadge(id));
      els.awardBadgeGrid.appendChild(button);
    });

    selectAwardBadge(els.awardBadge?.value || "star");
  }

  function buildStaffAvatarGrid() {
    els.avatarGrid.textContent = "";

    ADMIN_CHARACTERS.forEach((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "staff-avatar-option";
      button.dataset.avatar = id;
      button.title = "استخدام هذه الصورة";

      const img = document.createElement("img");
      img.src = avatarUrl(id);
      img.alt = "";

      button.appendChild(img);
      button.addEventListener("click", () => {
        els.avatarGrid.querySelectorAll(".staff-avatar-option")
          .forEach((item) => item.classList.toggle("selected", item === button));

        command("update-staff-avatar", { avatar: id });
      });

      els.avatarGrid.appendChild(button);
    });
  }

  function selectedUser(selectElement) {
    const id = selectElement.value;
    return currentAdminUsers.find((user) => user.clientId === id) || null;
  }

  function canOperateOnUser(user) {
    if (!user || user.role === "owner") return false;
    if (identity?.role === "moderator") return (user.role || "user") === "user";
    return true;
  }

  function fillUserSelects() {
    const selects = [els.awardUser, els.moderationUser];

    selects.forEach((select) => {
      const selected = select.value;
      select.innerHTML = '<option value="">اختر المستخدم</option>';

      currentAdminUsers
        .filter((user) => canOperateOnUser(user))
        .forEach((user) => {
          const option = document.createElement("option");
          option.value = user.clientId;
          option.textContent = `${firstName(user.nickname)}${user.badge ? " · " + (ADMIN_BADGES[user.badge]?.icon || "") : ""}`;
          select.appendChild(option);
        });

      if ([...select.options].some((option) => option.value === selected)) {
        select.value = selected;
      }
    });
  }

  function renderBans() {
    els.bannedUsersList.textContent = "";

    if (!currentBans.length) {
      const empty = document.createElement("small");
      empty.textContent = "لا يوجد مستخدمون محظورون.";
      els.bannedUsersList.appendChild(empty);
      return;
    }

    const permissions = currentModeratorPermissions();
    const visibleBans = identity?.role === "moderator"
      ? currentBans.filter((ban) => Number(ban.until || 0) <= 0 ? permissions.permanentBan : permissions.tempBan)
      : currentBans;

    if (!visibleBans.length) {
      const empty = document.createElement("small");
      empty.textContent = "لا توجد حالات حظر ضمن صلاحياتك.";
      els.bannedUsersList.appendChild(empty);
      return;
    }

    visibleBans.forEach((ban) => {
      const row = document.createElement("div");
      row.className = "banned-user-row";

      const info = document.createElement("span");
      const duration = Number(ban.until || 0) <= 0
        ? "دائم"
        : new Date(Number(ban.until)).toLocaleString("ar-IQ");
      info.textContent = `${firstName(ban.nickname || "مستخدم")} — ${duration}`;

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "إلغاء الحظر";
      button.addEventListener("click", () => command("unban-user", {
        clientId: ban.clientId,
        nickname: ban.nickname,
        permanent: Number(ban.until || 0) <= 0
      }));

      row.append(info, button);
      els.bannedUsersList.appendChild(row);
    });
  }

  function ensureClientId() {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  }

  function permissionDefaults() {
    return {
      mic: true,
      private: true,
      kick: true,
      tempBan: true,
      permanentBan: false,
      gifts: true,
      reports: true,
      pin: false
    };
  }

  function permissionRecord(clientId) {
    return currentPermissions.find((item) => item.clientId === clientId) || {
      clientId,
      permissions: permissionDefaults()
    };
  }

  function fillModeratorSelect() {
    if (!els.moderatorSelect) return;
    const selected = els.moderatorSelect.value;
    els.moderatorSelect.textContent = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "اختر المراقب";
    els.moderatorSelect.appendChild(placeholder);

    const records = currentStaffAccounts.length
      ? currentStaffAccounts
      : currentAdminUsers
          .filter((user) => user.role === "moderator")
          .map((user) => ({ id: user.staffClientId || user.clientId, name: user.nickname }));

    const seen = new Set();
    records.forEach((record) => {
      const id = String(record.id || record.staffClientId || record.clientId || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      const option = document.createElement("option");
      option.value = id;
      option.textContent = firstName(record.name || record.nickname || "مراقب");
      els.moderatorSelect.appendChild(option);
    });

    if ([...els.moderatorSelect.options].some((option) => option.value === selected)) {
      els.moderatorSelect.value = selected;
    }

    syncPermissionCheckboxes();
  }

  function syncPermissionCheckboxes() {
    const clientId = els.moderatorSelect.value;
    const record = permissionRecord(clientId);
    const p = record.permissions || permissionDefaults();

    els.permMic.checked = Boolean(p.mic);
    els.permPrivate.checked = Boolean(p.private);
    els.permKick.checked = Boolean(p.kick);
    els.permTempBan.checked = Boolean(p.tempBan);
    els.permPermanentBan.checked = Boolean(p.permanentBan);
    els.permGifts.checked = Boolean(p.gifts);
    els.permReports.checked = Boolean(p.reports);
    els.permPin.checked = Boolean(p.pin);
  }

  function formatAccountExpiry(expiresAt) {
    const value = Number(expiresAt || 0);
    if (value <= 0) return "بدون تاريخ انتهاء";
    return new Date(value).toLocaleString("ar-IQ");
  }

  function accountStatus(account) {
    const expired = Number(account.expiresAt || 0) > 0 && Number(account.expiresAt) <= Date.now();
    if (expired) return { label: "منتهي", className: "expired" };
    if (account.enabled === false) return { label: "متوقف", className: "off" };
    return { label: "فعال", className: "" };
  }

  function renderStaffAccounts() {
    if (!els.staffAccountsList || !els.staffAccountsCount) return;
    els.staffAccountsList.textContent = "";
    els.staffAccountsCount.textContent = String(currentStaffAccounts.length);

    if (!currentStaffAccounts.length) {
      const empty = document.createElement("div");
      empty.className = "empty-admin-state";
      empty.textContent = "لا توجد حسابات مراقبين. أنشئ أول رمز من الأعلى.";
      els.staffAccountsList.appendChild(empty);
      return;
    }

    currentStaffAccounts.forEach((account) => {
      const status = accountStatus(account);
      const row = document.createElement("article");
      row.className = `staff-account-row ${status.className === "off" ? "disabled" : status.className}`;

      const head = document.createElement("div");
      head.className = "staff-account-head";
      const name = document.createElement("strong");
      name.textContent = account.name || "مراقب";
      const badge = document.createElement("span");
      badge.className = `staff-account-status ${status.className}`;
      badge.textContent = status.label;
      head.append(name, badge);

      const meta = document.createElement("div");
      meta.className = "staff-account-meta";
      const expiry = document.createElement("span");
      expiry.textContent = `انتهاء الاشتراك: ${formatAccountExpiry(account.expiresAt)}`;
      const created = document.createElement("span");
      created.textContent = `تاريخ الإنشاء: ${new Date(Number(account.createdAt || Date.now())).toLocaleDateString("ar-IQ")}`;
      meta.append(expiry, created);

      const codeBox = document.createElement("div");
      codeBox.className = "staff-code-box";
      const code = document.createElement("code");
      code.dataset.rawCode = account.code || "";
      code.dataset.revealed = "0";
      code.textContent = "•••• •••• •••• ••••";
      const reveal = document.createElement("button");
      reveal.type = "button";
      reveal.textContent = "إظهار الرمز";
      reveal.addEventListener("click", () => {
        const show = code.dataset.revealed !== "1";
        code.dataset.revealed = show ? "1" : "0";
        code.textContent = show ? code.dataset.rawCode : "•••• •••• •••• ••••";
        reveal.textContent = show ? "إخفاء الرمز" : "إظهار الرمز";
      });
      codeBox.append(code, reveal);

      const actions = document.createElement("div");
      actions.className = "staff-account-actions";

      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "نسخ الرمز";
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(account.code || "");
          toast("تم نسخ رمز المراقب.");
        } catch {
          code.dataset.revealed = "1";
          code.textContent = account.code || "";
          toast("ظهر الرمز؛ حدده وانسخه يدوياً.");
        }
      });

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = account.enabled === false ? "success" : "danger";
      toggle.textContent = account.enabled === false ? "تشغيل الحساب" : "إيقاف الحساب";
      toggle.addEventListener("click", () => command("toggle-moderator-account", {
        clientId: account.id,
        nickname: account.name,
        enabled: account.enabled === false
      }));

      const renew = document.createElement("button");
      renew.type = "button";
      renew.className = "success";
      renew.textContent = "تجديد 30 يوماً";
      renew.addEventListener("click", () => command("renew-moderator-account", {
        clientId: account.id,
        nickname: account.name,
        durationDays: 30
      }));

      const rotate = document.createElement("button");
      rotate.type = "button";
      rotate.textContent = "تغيير الرمز";
      rotate.addEventListener("click", () => {
        if (!confirm(`تغيير رمز ${account.name || "المراقب"}؟ سيتوقف الرمز القديم فوراً.`)) return;
        command("rotate-moderator-code", { clientId: account.id, nickname: account.name });
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger";
      remove.textContent = "حذف الحساب";
      remove.addEventListener("click", () => {
        if (!confirm(`حذف حساب ${account.name || "المراقب"} نهائياً؟`)) return;
        command("delete-moderator-account", { clientId: account.id, nickname: account.name });
      });

      actions.append(copy, toggle, renew, rotate, remove);
      row.append(head, meta, codeBox, actions);
      els.staffAccountsList.appendChild(row);
    });
  }


  function formatAdminDate(value) {
    const number = Number(value || 0);
    if (!number) return "—";
    return new Date(number).toLocaleString("ar-IQ");
  }

  function vipStatusLabel(status) {
    const labels = {
      requested: "طلب جديد",
      approved: "تمت الموافقة — بانتظار الدفع",
      awaiting_payment: "بانتظار الدفع",
      active: "فعال",
      rejected: "مرفوض"
    };
    return labels[status] || status || "غير معروف";
  }

  function renderVipAdmin() {
    if (!els.vipRequestsList || !els.vipMembersList) return;
    els.vipRequestsList.textContent = "";
    els.vipMembersList.textContent = "";
    const pending = currentVipRequests.filter((item) => !["active", "rejected"].includes(item.status));
    if (els.vipRequestsCount) els.vipRequestsCount.textContent = String(pending.length);

    if (!currentVipRequests.length) {
      const empty = document.createElement("div");
      empty.className = "empty-admin-state";
      empty.textContent = "لا توجد طلبات VIP حالياً.";
      els.vipRequestsList.appendChild(empty);
    } else {
      currentVipRequests.forEach((request) => {
        const row = document.createElement("article");
        row.className = `vip-request-row status-${request.status || "requested"}`;
        const info = document.createElement("div");
        info.className = "vip-row-info";
        const title = document.createElement("strong");
        title.textContent = `💎 ${request.nickname || "مستخدم Rivo"}`;
        const meta = document.createElement("span");
        meta.textContent = `${vipStatusLabel(request.status)} · $${Number(request.priceUsd || 15)} شهرياً · ${formatAdminDate(request.requestedAt)}`;
        info.append(title, meta);
        const actions = document.createElement("div");
        actions.className = "vip-row-actions";
        if (request.status === "requested") {
          const approve = document.createElement("button");
          approve.type = "button"; approve.className = "success"; approve.textContent = "موافقة";
          approve.addEventListener("click", () => command("approve-vip-request", { requestId: request.id, nickname: request.nickname }));
          const reject = document.createElement("button");
          reject.type = "button"; reject.className = "danger"; reject.textContent = "رفض";
          reject.addEventListener("click", () => command("reject-vip-request", { requestId: request.id, nickname: request.nickname }));
          actions.append(approve, reject);
        }
        if (["approved", "awaiting_payment", "requested"].includes(request.status)) {
          const activate = document.createElement("button");
          activate.type = "button"; activate.className = "primary"; activate.textContent = "تفعيل 30 يوماً";
          activate.title = "تفعيل يدوي إلى حين ربط بوابة الدفع";
          activate.addEventListener("click", () => {
            if (!confirm(`تفعيل VIP للمستخدم ${request.nickname || "المستخدم"} لمدة 30 يوماً؟`)) return;
            command("activate-vip-request", { requestId: request.id, nickname: request.nickname });
          });
          actions.append(activate);
        }
        row.append(info, actions);
        els.vipRequestsList.appendChild(row);
      });
    }

    if (!currentVipMembers.length) {
      const empty = document.createElement("div");
      empty.className = "empty-admin-state";
      empty.textContent = "لا توجد عضويات VIP مفعلة بعد.";
      els.vipMembersList.appendChild(empty);
    } else {
      currentVipMembers.forEach((member) => {
        const row = document.createElement("article");
        row.className = `vip-member-row ${member.active ? "active" : "inactive"}`;
        const info = document.createElement("div");
        info.className = "vip-row-info";
        const title = document.createElement("strong");
        title.textContent = `💎 ${member.nickname || "عضو VIP"}`;
        const meta = document.createElement("span");
        meta.textContent = `${member.active ? "فعال" : member.enabled === false ? "متوقف" : "منتهي"} · ينتهي: ${formatAdminDate(member.expiresAt)}`;
        info.append(title, meta);
        const actions = document.createElement("div");
        actions.className = "vip-row-actions";
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = member.enabled === false ? "success" : "danger";
        toggle.textContent = member.enabled === false ? "تشغيل" : "إيقاف";
        toggle.addEventListener("click", () => command("toggle-vip-member", { clientId: member.clientId, nickname: member.nickname, enabled: member.enabled === false }));
        const renew = document.createElement("button");
        renew.type = "button"; renew.className = "success"; renew.textContent = "تجديد 30 يوماً";
        renew.addEventListener("click", () => command("renew-vip-member", { clientId: member.clientId, nickname: member.nickname, days: 30 }));
        actions.append(toggle, renew);
        row.append(info, actions);
        els.vipMembersList.appendChild(row);
      });
    }
  }

  async function refreshRoomStatuses() {
    if (!els.roomsManagerList || identity?.role !== "owner") return;
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && Array.isArray(data.rooms)) {
        currentRoomStatuses = data.rooms;
        renderRoomsManager();
      }
    } catch {}
  }

  function renderRoomsManager() {
    if (!els.roomsManagerList) return;
    const statusMap = new Map(currentRoomStatuses.map((room) => [room.id, room]));
    els.roomsManagerList.textContent = "";
    if (els.roomsCount) els.roomsCount.textContent = String(currentRoomCatalog.length);
    currentRoomCatalog.forEach((room) => {
      const live = statusMap.get(room.id) || {};
      const row = document.createElement("article");
      row.className = `room-admin-row ${room.enabled === false ? "disabled" : ""}`;
      const fields = document.createElement("div");
      fields.className = "room-admin-fields";
      const name = document.createElement("input");
      name.className = "admin-input"; name.value = room.name || room.id; name.maxLength = 40;
      const order = document.createElement("input");
      order.className = "admin-input room-order-input"; order.type = "number"; order.min = "0"; order.max = "999"; order.value = String(room.order || 0);
      const count = document.createElement("span");
      count.className = "room-live-count";
      count.textContent = `${Number(live.count || 0)} متصل · ${Number(live.ordinaryCount || 0)}/20 عادي`;
      fields.append(name, order, count);
      const actions = document.createElement("div");
      actions.className = "room-admin-actions";
      const save = document.createElement("button");
      save.type = "button"; save.className = "primary"; save.textContent = "حفظ";
      save.addEventListener("click", () => command("update-room", { roomId: room.id, name: name.value.trim(), enabled: room.enabled !== false, order: Number(order.value || 0) }));
      const toggle = document.createElement("button");
      toggle.type = "button"; toggle.textContent = room.enabled === false ? "تشغيل" : "إيقاف";
      toggle.className = room.enabled === false ? "success" : "danger";
      toggle.addEventListener("click", () => command("update-room", { roomId: room.id, name: name.value.trim(), enabled: room.enabled === false, order: Number(order.value || 0) }));
      actions.append(save, toggle);
      const manage = document.createElement("button");
      manage.type = "button"; manage.textContent = "إدارة الغرفة";
      manage.addEventListener("click", () => window.open(`./admin.html?room=${encodeURIComponent(room.id)}`, "_blank"));
      actions.append(manage);
      if (room.id !== "lobby") {
        const remove = document.createElement("button");
        remove.type = "button"; remove.className = "danger"; remove.textContent = "حذف";
        remove.addEventListener("click", () => {
          if (!confirm(`حذف غرفة ${room.name}؟`)) return;
          command("delete-room", { roomId: room.id, nickname: room.name });
        });
        actions.append(remove);
      }
      const label = document.createElement("strong");
      label.className = "room-admin-id"; label.textContent = `${room.name} · ${room.id}`;
      row.append(label, fields, actions);
      els.roomsManagerList.appendChild(row);
    });
  }

  function clearCharacterForm() {
    if (!els.characterId) return;
    els.characterId.value = ""; els.characterName.value = ""; els.characterThumbnailUrl.value = "";
    els.characterVrmUrl.value = ""; els.characterVoiceId.value = ""; els.characterDialect.value = "";
    els.characterOrder.value = "10"; els.characterDescription.value = "";
    els.characterVipOnly.checked = false; els.characterVisible.checked = true;
  }

  function fillCharacterForm(character) {
    if (!els.characterId) return;
    els.characterId.value = character.id || ""; els.characterName.value = character.name || "";
    els.characterThumbnailUrl.value = character.thumbnailUrl || ""; els.characterVrmUrl.value = character.vrmUrl || "";
    els.characterVoiceId.value = character.voiceId || ""; els.characterDialect.value = character.dialect || "";
    els.characterOrder.value = String(character.order || 0); els.characterDescription.value = character.description || "";
    els.characterVipOnly.checked = Boolean(character.vipOnly); els.characterVisible.checked = character.visible !== false;
    els.characterId.focus();
  }

  function renderCharactersManager() {
    if (!els.charactersManagerList) return;
    els.charactersManagerList.textContent = "";
    if (els.charactersCount) els.charactersCount.textContent = String(currentCharacters.length);
    currentCharacters.forEach((character) => {
      const row = document.createElement("article");
      row.className = `character-admin-row ${character.visible === false ? "disabled" : ""}`;
      const thumb = document.createElement("img");
      thumb.src = character.thumbnailUrl || "./assets/characters/lina.png"; thumb.alt = ""; thumb.loading = "lazy";
      const info = document.createElement("div");
      info.className = "character-admin-info";
      const title = document.createElement("strong"); title.textContent = `${character.name || character.id}${character.vipOnly ? " · 💎 VIP" : ""}`;
      const meta = document.createElement("span"); meta.textContent = `${character.id} · ${character.dialect || "بدون لهجة"} · ${character.visible === false ? "مخفية" : "ظاهرة"}`;
      info.append(title, meta);
      const actions = document.createElement("div"); actions.className = "character-admin-actions";
      const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "تعديل"; edit.addEventListener("click", () => fillCharacterForm(character));
      actions.append(edit);
      if (character.id !== "lina") {
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "danger"; remove.textContent = "حذف";
        remove.addEventListener("click", () => { if (confirm(`حذف شخصية ${character.name || character.id}؟`)) command("delete-character", { characterId: character.id, nickname: character.name }); });
        actions.append(remove);
      }
      row.append(thumb, info, actions);
      els.charactersManagerList.appendChild(row);
    });
  }

  async function uploadCharacterFile(file, kind, targetInput) {
    if (!file) { toast("اختر ملفاً أولاً."); return; }
    if (!identity?.staffSessionToken) { toast("رفع الملفات يعمل بعد تسجيل الدخول إلى نسخة Cloudflare المنشورة."); return; }
    const button = kind === "image" ? els.uploadCharacterThumbnail : els.uploadCharacterVrm;
    if (button) button.disabled = true;
    try {
      const response = await fetch(`/api/admin/characters/upload?kind=${encodeURIComponent(kind)}`, {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream", "x-rivo-staff-session": identity.staffSessionToken },
        body: file
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر رفع الملف.");
      targetInput.value = data.url || "";
      toast("تم رفع الملف بنجاح.");
    } catch (error) { toast(error.message || "تعذر رفع الملف."); }
    finally { if (button) button.disabled = false; }
  }

  function currentModeratorPermissions() {
    if (identity?.role !== "moderator") return permissionDefaults();
    const record = currentPermissions.find((item) => item.clientId === identity.clientId);
    return record?.permissions || {
      mic: false,
      private: false,
      kick: false,
      tempBan: false,
      permanentBan: false,
      gifts: false,
      reports: false,
      pin: false
    };
  }

  function setCardVisible(element, visible) {
    if (!element) return;
    element.classList.toggle("permission-hidden", !visible);
    element.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  function rebuildBanDurationOptions(permissions) {
    if (!els.banDuration) return;
    const currentValue = String(els.banDuration.value || "");
    const choices = [];
    if (permissions.tempBan) {
      choices.push(
        ["5", "حظر 5 دقائق"],
        ["30", "حظر 30 دقيقة"],
        ["60", "حظر ساعة"],
        ["1440", "حظر يوم كامل"]
      );
    }
    if (permissions.permanentBan) choices.push(["0", "حظر دائم"]);

    els.banDuration.textContent = "";
    for (const [value, label] of choices) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      els.banDuration.appendChild(option);
    }
    if ([...els.banDuration.options].some((option) => option.value === currentValue)) {
      els.banDuration.value = currentValue;
    }
  }

  function applyModeratorUiPermissions() {
    const isModerator = identity?.role === "moderator";
    const permissions = currentModeratorPermissions();

    if (!isModerator) {
      [els.roomControlCard, els.staffProfileCard, els.awardCard, els.moderationCard,
       els.announcementCard, els.reportsCard, els.usersManagementCard, els.adminLogCard]
        .forEach((card) => setCardVisible(card, true));
      rebuildBanDurationOptions({ tempBan: true, permanentBan: true });
      els.bannedUsersTitle?.classList.remove("permission-hidden");
      els.bannedUsersList?.classList.remove("permission-hidden");
      if (els.moderationHint) els.moderationHint.textContent = "اختر المستخدم ثم الإجراء ومدة الحظر.";
      return;
    }

    const canModerate = Boolean(permissions.kick || permissions.tempBan || permissions.permanentBan);
    const canManageUsers = Boolean(permissions.mic || permissions.private || permissions.kick);

    setCardVisible(els.roomControlCard, Boolean(permissions.mic || permissions.private));
    setCardVisible(els.staffProfileCard, true);
    setCardVisible(els.awardCard, Boolean(permissions.gifts));
    setCardVisible(els.moderationCard, canModerate);
    setCardVisible(els.announcementCard, Boolean(permissions.pin));
    setCardVisible(els.reportsCard, Boolean(permissions.reports));
    setCardVisible(els.usersManagementCard, canManageUsers);
    setCardVisible(els.adminLogCard, false);

    if (els.publicMic) {
      els.publicMic.disabled = !permissions.mic;
      els.publicMic.closest("label")?.classList.toggle("permission-hidden", !permissions.mic);
    }
    if (els.forceRelease) els.forceRelease.classList.toggle("permission-hidden", !permissions.mic);
    if (els.privateMic) {
      els.privateMic.disabled = !permissions.private;
      els.privateMic.closest("label")?.classList.toggle("permission-hidden", !permissions.private);
    }

    if (els.giveAward) els.giveAward.disabled = !permissions.gifts;
    if (els.removeAward) els.removeAward.disabled = !permissions.gifts;
    els.awardBadgeGrid?.querySelectorAll("button").forEach((button) => {
      button.disabled = !permissions.gifts;
    });

    if (els.kickSelected) els.kickSelected.classList.toggle("permission-hidden", !permissions.kick);
    if (els.banSelected) els.banSelected.classList.toggle(
      "permission-hidden",
      !(permissions.tempBan || permissions.permanentBan)
    );
    const canBan = Boolean(permissions.tempBan || permissions.permanentBan);
    if (els.banDuration) els.banDuration.classList.toggle("permission-hidden", !canBan);
    if (els.bannedUsersTitle) els.bannedUsersTitle.classList.toggle("permission-hidden", !canBan);
    if (els.bannedUsersList) els.bannedUsersList.classList.toggle("permission-hidden", !canBan);
    if (els.moderationHint) {
      els.moderationHint.textContent = canBan
        ? "اختر المستخدم ثم الإجراء ومدة الحظر المتاحة لك."
        : "اختر المستخدم ثم اضغط طرد الآن.";
    }
    rebuildBanDurationOptions(permissions);

    if (els.publishNotice) els.publishNotice.disabled = !permissions.pin;
    if (els.clearNotice) els.clearNotice.disabled = !permissions.pin;

    renderBans();
    renderReports();
    renderUsers(currentAdminUsers);
  }

  function appendLabeledParagraph(parent, label, value) {
    const paragraph = document.createElement("p");
    const bold = document.createElement("b");
    bold.textContent = label;
    paragraph.append(bold, document.createTextNode(String(value || "")));
    parent.appendChild(paragraph);
  }

  function renderReports() {
    els.reportsList.textContent = "";
    const openReports = currentReports.filter((report) => report.status !== "resolved");
    els.reportsCount.textContent = String(openReports.length);

    if (!openReports.length) {
      const empty = document.createElement("div");
      empty.className = "empty-admin-state";
      empty.textContent = "لا توجد بلاغات مفتوحة.";
      els.reportsList.appendChild(empty);
      return;
    }

    const reasonMap = {
      abuse: "إساءة أو سب",
      harassment: "تحرش أو إزعاج",
      spam: "سبام",
      impersonation: "انتحال",
      unsafe: "محتوى غير آمن",
      other: "سبب آخر"
    };

    openReports.forEach((report) => {
      const card = document.createElement("article");
      card.className = "report-admin-card";

      const header = document.createElement("header");
      const target = document.createElement("strong");
      target.textContent = firstName(report.targetNickname || "مستخدم");
      const time = document.createElement("time");
      time.textContent = new Date(Number(report.createdAt || Date.now())).toLocaleString("ar-IQ");
      header.append(target, time);
      card.appendChild(header);

      appendLabeledParagraph(card, "السبب: ", reasonMap[report.reason] || report.reason || "غير محدد");
      appendLabeledParagraph(card, "من: ", firstName(report.reporterNickname || "مستخدم"));

      if (report.details) {
        const detailsText = document.createElement("p");
        detailsText.textContent = String(report.details);
        card.appendChild(detailsText);
      }

      if (Array.isArray(report.context) && report.context.length) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "الرسائل الأخيرة";
        const list = document.createElement("ul");
        report.context.forEach((message) => {
          const item = document.createElement("li");
          item.textContent = String(message?.body || "");
          list.appendChild(item);
        });
        details.append(summary, list);
        card.appendChild(details);
      }

      const actions = document.createElement("div");
      actions.className = "report-admin-actions";

      const resolve = document.createElement("button");
      resolve.type = "button";
      resolve.textContent = "إغلاق البلاغ";
      resolve.addEventListener("click", () => command("resolve-report", {
        reportId: report.id,
        clientId: report.targetId,
        nickname: report.targetNickname
      }));

      const kick = document.createElement("button");
      kick.type = "button";
      kick.textContent = "طرد";
      kick.addEventListener("click", () => command("kick-user", {
        clientId: report.targetId,
        nickname: report.targetNickname
      }));

      const ban = document.createElement("button");
      ban.type = "button";
      ban.className = "danger";
      ban.textContent = "حظر ساعة";
      ban.addEventListener("click", () => command("ban-user", {
        clientId: report.targetId,
        nickname: report.targetNickname,
        durationMinutes: 60
      }));

      const permissions = currentModeratorPermissions();
      const targetUser = currentAdminUsers.find((user) => user.clientId === report.targetId);
      const canTarget = identity?.role !== "moderator" || !targetUser || (targetUser.role || "user") === "user";
      actions.append(resolve);
      if (canTarget && (identity?.role !== "moderator" || permissions.kick)) actions.append(kick);
      if (canTarget && (identity?.role !== "moderator" || permissions.tempBan)) actions.append(ban);
      card.appendChild(actions);
      els.reportsList.appendChild(card);
    });
  }

  function renderServerLogs() {
    els.log.textContent = "";

    if (!currentLogs.length) {
      const empty = document.createElement("div");
      empty.textContent = "لا توجد إجراءات مسجلة بعد.";
      els.log.appendChild(empty);
      return;
    }

    currentLogs.slice(0, 150).forEach((entry) => {
      const row = document.createElement("div");
      const time = new Date(Number(entry.createdAt || Date.now()))
        .toLocaleString("ar-IQ");
      const actor = document.createElement("strong");
      actor.textContent = String(entry.actorRole || "system");
      const action = document.createElement("span");
      action.textContent = String(entry.action || "");
      const details = document.createElement("small");
      details.textContent = `${String(entry.targetName || entry.details || "")} · ${time}`;
      row.append(actor, action, details);
      els.log.appendChild(row);
    });
  }

  function renderPinnedPreview() {
    if (!currentPinnedNotice?.text) {
      els.currentNotice.textContent = "لا توجد رسالة مثبتة.";
      return;
    }

    els.noticeKind.value = currentPinnedNotice.kind || "pinned";
    els.noticeText.value = currentPinnedNotice.text || "";
    els.currentNotice.textContent =
      `${currentPinnedNotice.kind === "announcement" ? "📣" : "📌"} ${currentPinnedNotice.text}`;
  }

  function isFileDemo() {
    return location.protocol === "file:";
  }

  function isSharedLocalServer() {
    return location.protocol !== "file:" && (
      location.hostname === "127.0.0.1" ||
      location.hostname === "localhost"
    );
  }

  function isLocal() {
    return isFileDemo() || isSharedLocalServer();
  }

  function avatarUrl(id) {
    return `./characters/${id}/portrait-small.webp`;
  }

  function showLoginStatus(message) {
    els.loginStatus.textContent = message;
    els.loginStatus.classList.remove("hidden");
  }

  function clearLoginStatus() {
    els.loginStatus.classList.add("hidden");
    els.loginStatus.textContent = "";
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    setTimeout(() => els.toast.classList.add("hidden"), 3000);
  }

  function log(message) {
    const row = document.createElement("div");
    row.textContent = `${new Date().toLocaleTimeString("ar-IQ")} — ${message}`;
    els.log.prepend(row);
  }

  function saveIdentity() {
    localStorage.setItem(SESSION_KEY, JSON.stringify(identity));
  }

  function validLocalCode(code, role) {
    // The local server is the source of truth. Do not expose the owner secret in public JavaScript.
    return role === "owner" && Boolean(String(code || "").trim());
  }

  function setLoginBusy(busy) {
    els.loginButton.disabled = busy;
    els.loginButton.textContent = busy
      ? "جاري التحقق…"
      : (PANEL_MODE === "owner" ? "فتح لوحة الإدارة والدردشة" : "فتح لوحة المراقب");
  }

  function showDashboard() {
    if (authenticated) return;
    authenticated = true;
    els.login.classList.add("hidden");
    els.dashboard.classList.remove("hidden");
    els.roleLabel.textContent = identity.role === "owner" ? "لوحة تحكم الإدارة" : "لوحة تحكم المراقب";
    els.stealth.checked = identity.visible === false;
    if (els.staffName) els.staffName.value = identity.name || (identity.role === "owner" ? "الإدارة" : "مراقب");
    buildStaffAvatarGrid();
    applyModeratorUiPermissions();
    const roomMeta = currentRoomCatalog.find((room) => room.id === ROOM);
    if (els.adminCurrentRoomName) els.adminCurrentRoomName.textContent = roomMeta?.name || (ROOM === "lobby" ? "العامة" : ROOM);
    els.backToMainAdmin?.classList.toggle("hidden", ROOM === "lobby");
    if (ROOM !== "lobby") {
      [els.vipSubscriptionsCard, els.roomsManagerCard, els.charactersManagerCard, els.staffAccountsCard, els.permissionsCard]
        .forEach((card) => card?.classList.add("hidden"));
    }
    loadEmbeddedChat();
  }

  function chatPageUrl() {
    const localPanel = location.pathname.endsWith("/admin.html") ||
      location.pathname.endsWith("/moderator.html");
    const base = localPanel
      ? new URL("./index.html", location.href)
      : new URL("../index.html", location.href);

    base.searchParams.set("staff", "1");
    return base;
  }

  function loadEmbeddedChat(force = false) {
    if (!identity) return;

    if (!force && els.chatFrame.src) return;

    els.chatFrameState.textContent = "جاري تحميل الدردشة";
    const url = chatPageUrl();
    url.searchParams.set("adminEmbedded", "1");
    url.searchParams.set("adminAutoName", identity.name || (identity.role === "owner" ? "الإدارة" : "مراقب"));
    url.searchParams.set("staffRole", identity.role);
    url.searchParams.set("room", ROOM);
    sessionStorage.setItem("rivo_active_room_v1", ROOM);
    url.searchParams.set("v", String(Date.now()));
    els.chatFrame.src = url.href;
  }

  function connect() {
    if (isFileDemo()) {
      connectDemo();
      showDashboard();
    } else if (isSharedLocalServer()) {
      connectLocalServer();
    } else {
      connectWorker();
    }
  }

  function connectDemo() {
    els.connection.textContent = "متصل بالدردشة محلياً";
    channel = new BroadcastChannel(`rivo_demo_${ROOM}`);
    channel.onmessage = (event) => receiveDemo(event.data);

    const settings = JSON.parse(localStorage.getItem(DEMO_SETTINGS_KEY) || "null") || {
      publicMicEnabled: true,
      privateMicEnabled: false
    };

    applyState({
      users: [],
      publicMicEnabled: settings.publicMicEnabled !== false,
      privateMicEnabled: Boolean(settings.privateMicEnabled),
      activeMic: JSON.parse(localStorage.getItem(DEMO_MIC_STATE_KEY) || "null")
    });

    channel.postMessage({
      type: "admin-request-state",
      admin: true,
      role: identity.role,
      at: Date.now()
    });

    demoCleanup = setInterval(() => {
      const cutoff = Date.now() - 8500;
      for (const [key, user] of demoUsers) {
        if (user.lastSeen < cutoff) demoUsers.delete(key);
      }
      renderUsers([...demoUsers.values()]);
    }, 3000);

    log("تم ربط لوحة الإدارة بالدردشة المحلية.");
  }

  function receiveDemo(data) {
    if (!data) return;

    if (data.type === "demo-join" || data.type === "demo-heartbeat") {
      if (data.user?.sessionId) {
        demoUsers.set(data.user.sessionId, { ...data.user, lastSeen: Date.now() });
        renderUsers([...demoUsers.values()]);
      }
      return;
    }

    if (data.type === "demo-leave") {
      demoUsers.delete(data.sessionId);
      renderUsers([...demoUsers.values()]);
      return;
    }

    if (data.type === "admin-state") {
      applyState(data);
      return;
    }

    if (data.type === "mic-state") {
      els.currentSpeaker.textContent = data.active
        ? `${data.nickname || "مستخدم"} على المايك`
        : "لا يوجد";
    }
  }

  async function connectLocalServer() {
    setLoginBusy(true);
    clearLoginStatus();
    els.connection.textContent = "جاري الاتصال بالخادم المحلي";
    localClosed = false;

    try {
      const response = await fetch("/api/local/connect", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        cache: "no-store",
        body: JSON.stringify({
          kind: "admin",
          role: identity.role,
          token: identity.token,
          visible: identity.visible,
          staffClientId: identity.clientId,
          roomId: ROOM,
          name: identity.name || (identity.role === "owner" ? "طلال" : "مراقب")
        })
      });

      if (!response.ok) {
        if (response.status === 401 && identity.role === "moderator") {
          localStorage.removeItem(SESSION_KEY);
        }
        throw new Error(response.status === 401
          ? (identity.role === "moderator"
              ? "رمز المراقب متوقف أو منتهي أو تم تغييره. ادخل من الصفحة الرئيسية من جديد."
              : "رمز المالك غير صحيح.")
          : `تعذر الاتصال: ${response.status}`);
      }

      const data = await response.json();
      localSessionId = String(data.sessionId || "");

      if (!localSessionId) {
        throw new Error("لم ينشئ الخادم جلسة إدارة.");
      }

      setLoginBusy(false);
      els.connection.textContent = "متصل بالدردشة المحلية";
      saveIdentity();
      applyState(data);
      showDashboard();
      log("تم ربط لوحة الإدارة بالخادم المشترك بين المتصفحات.");
      pollLocalAdmin();
    } catch (error) {
      setLoginBusy(false);
      authenticated = false;
      showLoginStatus(error.message || "تعذر الاتصال بالخادم المحلي.");
      els.connection.textContent = "لم يتم الاتصال";
    }
  }

  async function pollLocalAdmin() {
    while (!localClosed && localSessionId) {
      try {
        const response = await fetch(
          `/api/local/poll?sessionId=${encodeURIComponent(localSessionId)}&t=${Date.now()}`,
          { cache: "no-store" }
        );

        if (!response.ok) throw new Error(`Poll failed: ${response.status}`);

        const data = await response.json();
        if (data.closed) throw new Error("Admin session closed");

        for (const event of (data.events || [])) {
          if (event.type === "admin-init" || event.type === "admin-state") {
            applyState(event);
          }
          if (event.type === "admin-error") {
            toast(event.message || "ليس لديك صلاحية تنفيذ هذا الأمر.");
          }
          if (event.type === "staff-revoked") {
            localStorage.removeItem(SESSION_KEY);
            alert(event.message || "تم إيقاف حساب المراقب.");
            location.href = "./index.html";
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 350));
      } catch (error) {
        if (localClosed) return;
        els.connection.textContent = "انقطع اتصال الإدارة";
        toast("انقطع اتصال لوحة الإدارة بالخادم المحلي.");
        return;
      }
    }
  }

  function sendLocalAdminCommand(payload) {
    if (!localSessionId) {
      toast("لوحة الإدارة غير متصلة بالخادم.");
      return;
    }

    fetch("/api/local/send", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      cache: "no-store",
      body: JSON.stringify({
        sessionId: localSessionId,
        payload
      })
    }).catch(() => toast("تعذر إرسال أمر الإدارة."));
  }

  async function connectWorker() {
    setLoginBusy(true);
    clearLoginStatus();
    els.connection.textContent = "جاري التحقق من رمز الإدارة";

    try {
      const sessionValid = Boolean(
        identity.staffSessionToken &&
        Number(identity.staffExpiresAt || 0) > Date.now() + 60_000
      );

      if (!sessionValid) {
        if (!identity.token) {
          throw new Error("انتهت جلسة الإدارة. أدخل رمز الإدارة من جديد.");
        }

        const response = await fetch("/api/auth/staff", {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          cache: "no-store",
          body: JSON.stringify({
            code: identity.token,
            role: identity.role
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.staffSessionToken) {
          throw new Error(data.error || "رمز الإدارة غير صحيح.");
        }

        identity.staffSessionToken = String(data.staffSessionToken);
        identity.staffExpiresAt = Number(data.expiresAt || 0);
        identity.role = data.role;
        identity.clientId = String(data.staffId || identity.clientId || "");
        identity.token = "";
        saveIdentity();
      }

      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const params = new URLSearchParams({
        staffSessionToken: identity.staffSessionToken,
        role: identity.role,
        visible: identity.visible ? "1" : "0",
        staffClientId: identity.clientId
      });

      socket = new WebSocket(
        `${protocol}//${location.host}/api/rooms/${ROOM}/admin-ws?${params}`
      );
    } catch (error) {
      setLoginBusy(false);
      authenticated = false;
      els.connection.textContent = "لم يتم الاتصال";
      showLoginStatus(error.message || "تعذر إنشاء جلسة إدارة آمنة.");
      return;
    }

    let opened = false;

    socket.addEventListener("open", () => {
      opened = true;
      setLoginBusy(false);
      els.connection.textContent = "متصل بالدردشة";
      saveIdentity();
      showDashboard();
      log("تم التحقق من رمز الإدارة والاتصال بالدردشة.");
    });

    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "admin-init" || data.type === "admin-state") {
          applyState(data);
        }
        if (data.type === "admin-error") {
          toast(data.message || "تعذر تنفيذ الأمر.");
        }
        if (data.type === "staff-revoked") {
          localStorage.removeItem(SESSION_KEY);
          alert(data.message || "تم إيقاف حساب المراقب.");
          location.href = "./index.html";
        }
      } catch {}
    });

    socket.addEventListener("close", (event) => {
      setLoginBusy(false);

      if (!opened) {
        authenticated = false;
        showLoginStatus(
          event.code === 1006
            ? "تعذر التحقق من الرمز أو الاتصال بالخادم."
            : "رمز الإدارة غير صحيح أو انتهت الجلسة."
        );
        els.connection.textContent = "لم يتم الاتصال";
        return;
      }

      els.connection.textContent = "انقطع اتصال الإدارة";
      toast("انقطع اتصال لوحة الإدارة بالخادم.");
    });

    socket.addEventListener("error", () => {
      if (!opened) showLoginStatus("تعذر التحقق من رمز الإدارة.");
    });
  }

  function requiredPermissionForAction(action, extra = {}) {
    const map = {
      "set-public-mic": "mic",
      "set-private-mic": "private",
      "force-release-mic": "mic",
      "block-user-mic": "mic",
      "block-user-private": "private",
      "kick-user": "kick",
      "set-user-badge": "gifts",
      "resolve-report": "reports",
      "publish-pinned": "pin",
      "clear-pinned": "pin"
    };
    if (action === "ban-user") {
      return Number(extra.durationMinutes || 0) <= 0 ? "permanentBan" : "tempBan";
    }
    if (action === "unban-user") return extra.permanent ? "permanentBan" : "tempBan";
    return map[action] || "";
  }

  function command(action, extra = {}) {
    if (identity?.role === "moderator") {
      const selfServiceAction = ["set-staff-visible", "update-staff-avatar", "update-staff-name"].includes(action);
      const required = requiredPermissionForAction(action, extra);
      const permissions = currentModeratorPermissions();
      if (!selfServiceAction && (!required || !permissions[required])) {
        toast("هذا الإجراء غير موجود ضمن صلاحياتك.");
        return;
      }
    }

    const payload = {
      type: "admin-command",
      action,
      ...extra,
      role: identity.role,
      at: Date.now()
    };

    if (isFileDemo()) {
      if (action === "set-public-mic" || action === "set-private-mic") {
        const current = JSON.parse(localStorage.getItem(DEMO_SETTINGS_KEY) || "{}");

        if (action === "set-public-mic") {
          current.publicMicEnabled = Boolean(extra.enabled);
        }

        if (action === "set-private-mic") {
          current.privateMicEnabled = Boolean(extra.enabled);
        }

        localStorage.setItem(DEMO_SETTINGS_KEY, JSON.stringify(current));
      }

      channel?.postMessage({ ...payload, admin: true });
      log(describeCommand(action, extra));
      return;
    }

    if (isSharedLocalServer()) {
      sendLocalAdminCommand(payload);
      log(describeCommand(action, extra));
      return;
    }

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      log(describeCommand(action, extra));
    } else {
      toast("لوحة الإدارة غير متصلة بالخادم.");
    }
  }

  function describeCommand(action, extra) {
    const map = {
      "set-public-mic": `تم ${extra.enabled ? "فتح" : "إغلاق"} مايك العامة`,
      "set-private-mic": `تم ${extra.enabled ? "فتح" : "إغلاق"} مايك الخاص`,
      "force-release-mic": "تم إنزال المتحدث الحالي",
      "block-user-mic": `تم تغيير صلاحية مايك المستخدم ${extra.nickname || ""}`,
      "block-user-private": `تم تغيير صلاحية الخاص للمستخدم ${extra.nickname || ""}`,
      "kick-user": `تم إخراج المستخدم ${extra.nickname || ""}`,
      "set-staff-visible": `تم ${extra.visible ? "إظهار" : "إخفاء"} الإدارة من القائمة`,
      "update-staff-avatar": "تم تغيير صورة الإدارة",
      "update-staff-name": "تم تغيير اسم الإدارة في الدردشة",
      "set-user-badge": `تم منح شارة إلى ${extra.nickname || "المستخدم"}`,
      "ban-user": `تم حظر ${extra.nickname || "المستخدم"}`,
      "unban-user": `تم إلغاء حظر ${extra.nickname || "المستخدم"}`,
      "publish-pinned": "تم نشر رسالة مثبتة أو إعلان",
      "clear-pinned": "تمت إزالة الرسالة المثبتة",
      "resolve-report": `تم إغلاق بلاغ ${extra.nickname || ""}`,
      "set-moderator-permissions": "تم حفظ صلاحيات المراقب",
      "create-moderator-account": "تم إنشاء حساب ورمز مراقب جديد",
      "toggle-moderator-account": "تم تغيير حالة حساب المراقب",
      "renew-moderator-account": "تم تجديد اشتراك المراقب",
      "rotate-moderator-code": "تم إنشاء رمز جديد للمراقب",
      "delete-moderator-account": "تم حذف حساب المراقب",
      "approve-vip-request": "تمت الموافقة على طلب VIP",
      "reject-vip-request": "تم رفض طلب VIP",
      "activate-vip-request": "تم تفعيل VIP لمدة 30 يوماً",
      "toggle-vip-member": "تم تغيير حالة عضوية VIP",
      "renew-vip-member": "تم تجديد عضوية VIP",
      "create-room": "تم إنشاء غرفة جديدة",
      "update-room": "تم تحديث الغرفة",
      "delete-room": "تم حذف الغرفة",
      "save-character": "تم حفظ الشخصية",
      "delete-character": "تم حذف الشخصية"
    };
    return map[action] || action;
  }

  function applyState(data) {
    if (data.staff?.role && identity) {
      identity.role = data.staff.role;
      identity.clientId = data.staff.id || identity.clientId;
      identity.name = data.staff.name || identity.name || "";
      saveIdentity();
      els.roleLabel.textContent = identity.role === "owner" ? "لوحة تحكم الإدارة" : "لوحة تحكم المراقب";
    }

    els.publicMic.checked = data.publicMicEnabled !== false;
    els.privateMic.checked = Boolean(data.privateMicEnabled);
    els.currentSpeaker.textContent = data.activeMic?.active
      ? `${data.activeMic.nickname || "مستخدم"} على المايك`
      : "لا يوجد";

    if (typeof data.staffVisible === "boolean") {
      identity.visible = data.staffVisible;
      saveIdentity();
      els.stealth.checked = !data.staffVisible;
    }

    if (data.staffAvatar) {
      els.avatarGrid.querySelectorAll(".staff-avatar-option").forEach((button) => {
        button.classList.toggle("selected", button.dataset.avatar === data.staffAvatar);
      });
    }

    if (Array.isArray(data.users)) {
      currentAdminUsers = data.users;
      renderUsers(currentAdminUsers);
      fillUserSelects();
      fillModeratorSelect();
    }

    if (Array.isArray(data.bans)) {
      currentBans = data.bans;
      renderBans();
    }

    if (Array.isArray(data.reports)) {
      currentReports = data.reports;
      renderReports();
    }

    if (Array.isArray(data.logs)) {
      currentLogs = data.logs;
      renderServerLogs();
    }

    if (Array.isArray(data.moderatorPermissions)) {
      currentPermissions = data.moderatorPermissions;
      fillModeratorSelect();
    }

    if (Array.isArray(data.staffAccounts)) {
      currentStaffAccounts = data.staffAccounts;
      renderStaffAccounts();
      fillModeratorSelect();
    }

    if (Array.isArray(data.vipRequests)) {
      currentVipRequests = data.vipRequests;
      renderVipAdmin();
    }
    if (Array.isArray(data.vipMembers)) {
      currentVipMembers = data.vipMembers;
      renderVipAdmin();
    }
    if (Array.isArray(data.roomCatalog)) {
      currentRoomCatalog = data.roomCatalog;
      renderRoomsManager();
      const roomMeta = currentRoomCatalog.find((room) => room.id === ROOM);
      if (els.adminCurrentRoomName) els.adminCurrentRoomName.textContent = roomMeta?.name || (ROOM === "lobby" ? "العامة" : ROOM);
      refreshRoomStatuses();
    }
    if (Array.isArray(data.characters)) {
      currentCharacters = data.characters;
      renderCharactersManager();
    }

    applyModeratorUiPermissions();

    if (data.pinnedNotice !== undefined) {
      currentPinnedNotice = data.pinnedNotice || null;
      renderPinnedPreview();
    }

    if (identity?.role === "moderator") {
      els.permissionsCard.classList.add("hidden");
    } else {
      els.permissionsCard.classList.remove("hidden");
    }
  }

  function roleRank(user) {
    if (user.role === "owner") return 0;
    if (user.role === "moderator") return 1;
    if (user.isVip) return 2;
    return 3;
  }

  function renderUsers(users) {
    const unique = [];
    const seen = new Set();

    for (const user of users) {
      if (!user?.clientId || seen.has(user.clientId)) continue;
      seen.add(user.clientId);
      unique.push(user);
    }

    unique.sort((a, b) =>
      roleRank(a) - roleRank(b) ||
      Number(a.joinedAt || 0) - Number(b.joinedAt || 0) ||
      String(a.nickname).localeCompare(String(b.nickname), "ar")
    );

    els.usersList.textContent = "";
    els.usersCount.textContent = String(unique.length);

    if (!unique.length) {
      const empty = document.createElement("div");
      empty.className = "admin-log";
      const message = document.createElement("div");
      message.textContent = "لا يوجد مستخدمون متصلون حالياً.";
      empty.appendChild(message);
      els.usersList.appendChild(empty);
      return;
    }

    unique.forEach((user) => {
      const row = document.createElement("div");
      row.className = `admin-user role-${user.role || "user"}${user.isVip ? " is-vip" : ""}`;

      const img = document.createElement("img");
      img.src = avatarUrl(user.avatar);
      img.alt = "";

      const info = document.createElement("div");
      info.className = "admin-user-info";

      const name = document.createElement("strong");
      name.textContent = `${firstName(user.nickname)}${user.isVip ? " 💎" : ""}${user.badge ? " " + (ADMIN_BADGES[user.badge]?.icon || "") : ""}`;

      const status = document.createElement("span");
      const role = user.role === "owner"
        ? "الإدارة 👑"
        : user.role === "moderator"
          ? "المراقب ⭐"
          : user.isVip
            ? "VIP 💎"
            : "مستخدم";
      status.textContent = `${role} · ${user.adminVisible === false ? "مخفي" : "ظاهر"}`;

      if (user.role === "owner" || user.role === "moderator") {
        status.className = "role-badge";
      }

      info.append(name, status);

      const actions = document.createElement("div");
      actions.className = "admin-user-actions";

      if (canOperateOnUser(user)) {
        const permissions = currentModeratorPermissions();
        const isOwnerPanel = identity?.role !== "moderator";
        const mic = document.createElement("button");
        mic.type = "button";
        mic.textContent = user.micBlocked ? "فتح المايك" : "منع المايك";
        mic.addEventListener("click", () => command("block-user-mic", {
          clientId: user.clientId,
          blocked: !user.micBlocked,
          nickname: user.nickname
        }));

        const priv = document.createElement("button");
        priv.type = "button";
        priv.textContent = user.privateBlocked ? "فتح الخاص" : "إغلاق الخاص";
        priv.addEventListener("click", () => command("block-user-private", {
          clientId: user.clientId,
          blocked: !user.privateBlocked,
          nickname: user.nickname
        }));

        const kick = document.createElement("button");
        kick.type = "button";
        kick.className = "danger";
        kick.textContent = "إخراج";
        kick.addEventListener("click", () => command("kick-user", {
          clientId: user.clientId,
          nickname: user.nickname
        }));

        if (isOwnerPanel || permissions.mic) actions.append(mic);
        if (isOwnerPanel || permissions.private) actions.append(priv);
        if (isOwnerPanel || permissions.kick) actions.append(kick);
      }

      row.append(img, info, actions);
      els.usersList.appendChild(row);
    });
  }

  function setControlsVisible(visible) {
    els.controlRail.classList.toggle("hidden", !visible);
    els.showControls.classList.toggle("hidden", visible);
    els.workspace.classList.toggle("chat-expanded", !visible);
    chatExpanded = !visible;
    els.expandChat.textContent = chatExpanded ? "إظهار التحكم" : "تكبير الدردشة";
  }

  els.awardBadge?.addEventListener("change", () => {
    selectAwardBadge(els.awardBadge.value);
  });

  els.saveStaffName?.addEventListener("click", () => {
    const name = String(els.staffName?.value || "").trim().replace(/\s+/g, " ").slice(0, 24);
    if (name.length < 2) { toast("اكتب اسماً من حرفين على الأقل."); return; }
    identity.name = name;
    saveIdentity();
    command("update-staff-name", { name });
    toast("تم تغيير اسمك في الدردشة.");
  });

  els.stealth.addEventListener("change", () => {
    identity.visible = !els.stealth.checked;
    saveIdentity();
    command("set-staff-visible", { visible: identity.visible });
  });

  els.giveAward.addEventListener("click", () => {
    const user = selectedUser(els.awardUser);
    if (!user) {
      toast("اختر مستخدماً أولاً.");
      return;
    }

    command("set-user-badge", {
      clientId: user.clientId,
      nickname: user.nickname,
      badge: els.awardBadge.value
    });
  });

  els.removeAward.addEventListener("click", () => {
    const user = selectedUser(els.awardUser);
    if (!user) {
      toast("اختر مستخدماً أولاً.");
      return;
    }

    command("set-user-badge", {
      clientId: user.clientId,
      nickname: user.nickname,
      badge: ""
    });
  });

  els.kickSelected.addEventListener("click", () => {
    const user = selectedUser(els.moderationUser);
    if (!user) {
      toast("اختر مستخدماً أولاً.");
      return;
    }

    command("kick-user", {
      clientId: user.clientId,
      nickname: user.nickname
    });
  });

  els.banSelected.addEventListener("click", () => {
    const user = selectedUser(els.moderationUser);
    if (!user) {
      toast("اختر مستخدماً أولاً.");
      return;
    }

    command("ban-user", {
      clientId: user.clientId,
      nickname: user.nickname,
      durationMinutes: Number(els.banDuration.value || 0)
    });
  });

  els.publishNotice.addEventListener("click", () => {
    const text = els.noticeText.value.trim();
    if (!text) {
      toast("اكتب نص الرسالة أو الإعلان.");
      return;
    }

    command("publish-pinned", {
      kind: els.noticeKind.value,
      text
    });
  });

  els.clearNotice.addEventListener("click", () => {
    command("clear-pinned");
  });

  els.moderatorSelect.addEventListener("change", syncPermissionCheckboxes);

  els.saveModeratorPermissions.addEventListener("click", () => {
    const accountId = els.moderatorSelect.value;
    const account = currentStaffAccounts.find((item) => item.id === accountId) ||
      currentAdminUsers.find((item) => (item.staffClientId || item.clientId) === accountId);

    if (!accountId || !account) {
      toast("اختر مراقباً أولاً.");
      return;
    }

    command("set-moderator-permissions", {
      clientId: accountId,
      nickname: account.name || account.nickname,
      permissions: {
        mic: els.permMic.checked,
        private: els.permPrivate.checked,
        kick: els.permKick.checked,
        tempBan: els.permTempBan.checked,
        permanentBan: els.permPermanentBan.checked,
        gifts: els.permGifts.checked,
        reports: els.permReports.checked,
        pin: els.permPin.checked
      }
    });
  });

  els.createModeratorAccount?.addEventListener("click", () => {
    const name = String(els.newModeratorName?.value || "").trim();
    const durationDays = Number(els.newModeratorDuration?.value || 30);
    if (!name) {
      toast("اكتب اسم المراقب أولاً.");
      els.newModeratorName?.focus();
      return;
    }
    command("create-moderator-account", { name, durationDays });
    els.newModeratorName.value = "";
  });


  els.createRoom?.addEventListener("click", () => {
    const roomId = String(els.newRoomId?.value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    const name = String(els.newRoomName?.value || "").trim();
    if (!roomId || !name) { toast("اكتب معرّف الغرفة واسمها."); return; }
    command("create-room", { roomId, name });
    els.newRoomId.value = ""; els.newRoomName.value = "";
  });

  els.saveCharacter?.addEventListener("click", () => {
    const payload = {
      characterId: String(els.characterId?.value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-"),
      name: String(els.characterName?.value || "").trim(),
      thumbnailUrl: String(els.characterThumbnailUrl?.value || "").trim(),
      vrmUrl: String(els.characterVrmUrl?.value || "").trim(),
      voiceId: String(els.characterVoiceId?.value || "").trim(),
      dialect: String(els.characterDialect?.value || "").trim(),
      description: String(els.characterDescription?.value || "").trim(),
      order: Number(els.characterOrder?.value || 0),
      vipOnly: Boolean(els.characterVipOnly?.checked),
      visible: els.characterVisible?.checked !== false
    };
    if (!payload.characterId || !payload.name || !payload.vrmUrl) { toast("معرّف الشخصية والاسم ورابط VRM مطلوبة."); return; }
    command("save-character", payload);
  });
  els.clearCharacterForm?.addEventListener("click", clearCharacterForm);
  els.uploadCharacterThumbnail?.addEventListener("click", () => uploadCharacterFile(els.characterThumbnailFile?.files?.[0], "image", els.characterThumbnailUrl));
  els.uploadCharacterVrm?.addEventListener("click", () => uploadCharacterFile(els.characterVrmFile?.files?.[0], "vrm", els.characterVrmUrl));

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const role = PANEL_MODE === "owner" ? "owner" : "moderator";
    const token = els.code.value.trim();

    if (!token) return;

    if (isLocal() && !validLocalCode(token, role)) {
      showLoginStatus("رمز الدخول غير صحيح.");
      return;
    }

    identity = {
      token,
      role,
      visible: els.visible.checked,
      clientId: ensureClientId()
    };

    saveIdentity();
    connect();
  });

  els.publicMic.addEventListener("change", () =>
    command("set-public-mic", { enabled: els.publicMic.checked })
  );

  els.privateMic.addEventListener("change", () =>
    command("set-private-mic", { enabled: els.privateMic.checked })
  );

  els.forceRelease.addEventListener("click", () =>
    command("force-release-mic")
  );

  els.reloadChat.addEventListener("click", () => {
    loadEmbeddedChat(true);
    log("تم تحديث نافذة الدردشة داخل الإدارة.");
  });

  els.expandChat.addEventListener("click", () => {
    setControlsVisible(chatExpanded);
  });

  els.hideControls.addEventListener("click", () => {
    setControlsVisible(false);
  });

  els.showControls.addEventListener("click", () => {
    setControlsVisible(true);
  });

  els.openSeparateChat.addEventListener("click", () => {
    saveIdentity();
    window.open(chatPageUrl().href, "_blank");
  });

  els.chatFrame.addEventListener("load", () => {
    els.chatFrameState.textContent = "الدردشة متصلة";
  });

  els.logout.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    socket?.close();
    channel?.close();
    clearInterval(demoCleanup);
    localClosed = true;

    if (localSessionId) {
      fetch("/api/local/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ sessionId: localSessionId }),
        keepalive: true
      }).catch(() => {});
    }

    localSessionId = "";
    els.chatFrame.src = "about:blank";
    if (PANEL_MODE === "moderator") {
      location.href = "./index.html";
    } else {
      location.reload();
    }
  });

  buildAwardBadgeGrid();
  roomStatusTimer = window.setInterval(refreshRoomStatuses, 10000);
  window.addEventListener("beforeunload", () => { if (roomStatusTimer) clearInterval(roomStatusTimer); });

  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

    const hasLocalCode = Boolean(saved?.token);
    const hasCloudSession = Boolean(
      saved?.staffSessionToken &&
      Number(saved?.staffExpiresAt || 0) > Date.now() + 60_000
    );
    const expectedRole = PANEL_MODE === "owner" ? "owner" : "moderator";

    if (saved?.role === expectedRole && (hasLocalCode || hasCloudSession)) {
      identity = {
        ...saved,
        clientId: saved.clientId || ensureClientId()
      };
      saveIdentity();

      if (isLocal() && expectedRole === "owner" && (!identity.token || !validLocalCode(identity.token, identity.role))) {
        localStorage.removeItem(SESSION_KEY);
      } else {
        connect();
      }
    } else if (PANEL_MODE === "moderator") {
      if (saved?.role && saved.role !== "moderator") {
        showLoginStatus("هذه لوحة المراقب. ادخل برمز المراقب من الصفحة الرئيسية.");
      }
    } else if (saved) {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    if (PANEL_MODE === "owner") localStorage.removeItem(SESSION_KEY);
  }

})();
