(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const BADGES = {
    star: { icon: "⭐", label: "نجمة ذهبية" },
    diamond: { icon: "💎", label: "ماسة زرقاء" },
    ruby: { icon: "♦️", label: "جوهرة حمراء" },
    heart: { icon: "❤️", label: "قلب ملكي" },
    emerald: { icon: "💚", label: "زمردة خضراء" }
  };

  const mutedBaseKey = "rivo_local_muted_users_v1";
  const dismissedPinKey = "rivo_dismissed_pin_v1";
  let bridge = null;
  let activeProfileUser = null;
  let reportTarget = null;
  let mutedUsers = new Set();
  let currentPinned = null;

  function mutedStorageKey() {
    const current = window.RIVO_APP?.getProfile?.();
    const scope = current?.googleUid || current?.clientId || "guest";
    return `${mutedBaseKey}:${scope}`;
  }

  function loadMuted() {
    try {
      mutedUsers = new Set(JSON.parse(localStorage.getItem(mutedStorageKey()) || "[]"));
    } catch {
      mutedUsers = new Set();
    }
  }

  loadMuted();

  const els = {
    usersList: $("usersList"),
    presenceAvatars: $("presenceAvatars"),
    messages: $("messages"),
    profileModal: $("userProfileModal"),
    profileAvatar: $("profileAvatar"),
    profileBadge: $("profileBadge"),
    profileName: $("profileDisplayName"),
    profileRole: $("profileRoleText"),
    profileOnline: $("profileOnlineState"),
    profilePrivate: $("profilePrivateState"),
    profileMic: $("profileMicState"),
    profileAward: $("profileAwardText"),
    profilePrivateButton: $("profilePrivateButton"),
    profileMuteButton: $("profileMuteButton"),
    profileReportButton: $("profileReportButton"),
    closeProfile: $("closeUserProfile"),
    reportModal: $("reportModal"),
    reportForm: $("reportForm"),
    reportTargetText: $("reportTargetText"),
    reportReason: $("reportReason"),
    reportDetails: $("reportDetails"),
    closeReport: $("closeReportModal"),
    pinned: $("pinnedNotice"),
    pinnedIcon: $("pinnedNoticeIcon"),
    pinnedTitle: $("pinnedNoticeTitle"),
    pinnedText: $("pinnedNoticeText"),
    dismissPinned: $("dismissPinnedNotice"),
    giftLayer: $("giftAnimationLayer")
  };

  function refreshBridge() {
    bridge = window.RIVO_APP || bridge;
    return bridge;
  }

  function firstName(value) {
    const clean = String(value || "").trim().replace(/\s+/g, " ");
    return clean ? clean.split(" ")[0] : "مستخدم";
  }

  function badgeHtml(id) {
    const badge = BADGES[id];
    return badge
      ? `<span class="profile-award badge-${id}">${badge.icon}</span>`
      : "";
  }

  function saveMuted() {
    localStorage.setItem(mutedStorageKey(), JSON.stringify([...mutedUsers]));
  }

  function roleText(user) {
    if (user.role === "owner") return "الإدارة 👑";
    if (user.role === "moderator") return "★ مراقب Rivo";
    return "مستخدم";
  }

  function showProfile(clientId) {
    refreshBridge();
    const own = bridge?.getProfile?.();
    const user = bridge?.getUsers?.().find((item) => item.clientId === clientId);
    if (!user || user.clientId === own?.clientId) return;

    activeProfileUser = user;
    els.profileAvatar.src = bridge.avatarUrl(user.avatar);
    els.profileName.textContent = firstName(user.nickname);
    els.profileRole.textContent = roleText(user);
    els.profileOnline.textContent = "● متصل الآن";
    els.profilePrivate.textContent = user.privateBusy ? "مشغول" : (user.privateOpen === false ? "مغلق" : "متاح");
    els.profileMic.textContent = user.micBlocked ? "ممنوع" : "متاح";

    const isOwnerProfile = user.role === "owner";
    const viewerIsOwner = own?.role === "owner";
    const awardFact = els.profileAward?.closest?.("div");
    if (awardFact) awardFact.hidden = isOwnerProfile;
    els.profileAward.textContent = isOwnerProfile ? "" : (BADGES[user.badge]?.label || "لا توجد");
    els.profileBadge.innerHTML = isOwnerProfile
      ? '<span class="profile-owner-crown" title="الإدارة" aria-label="تاج الإدارة">👑</span>'
      : badgeHtml(user.badge);

    els.profilePrivateButton.disabled = Boolean(user.privateBusy) || (!viewerIsOwner && user.privateOpen === false);
    els.profilePrivateButton.textContent = user.privateBusy
      ? "مشغول في الخاص"
      : viewerIsOwner
        ? "فتح خاص مباشر"
        : "طلب محادثة خاصة";
    els.profileMuteButton.textContent = mutedUsers.has(user.clientId)
      ? "إلغاء الكتم عندي"
      : "كتمه عندي";

    els.profileModal.style.removeProperty("display");
    els.profileModal.classList.remove("hidden");
    els.profileModal.setAttribute("aria-hidden", "false");
  }

  function closeProfile(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    els.profileModal.classList.add("hidden");
    els.profileModal.setAttribute("aria-hidden", "true");
    els.profileModal.style.display = "none";
    activeProfileUser = null;
  }

  function openReport(target) {
    reportTarget = target;
    els.reportTargetText.textContent =
      `الإبلاغ عن ${firstName(target.nickname || "المستخدم")}`;
    els.reportReason.value = "abuse";
    els.reportDetails.value = "";
    els.reportModal.classList.remove("hidden");
    els.reportModal.setAttribute("aria-hidden", "false");
  }

  function closeReport() {
    els.reportModal.classList.add("hidden");
    els.reportModal.setAttribute("aria-hidden", "true");
    reportTarget = null;
  }

  function applyLocalMute() {
    els.messages?.querySelectorAll(".message-row").forEach((row) => {
      const muted = mutedUsers.has(row.dataset.clientId);
      row.classList.toggle("locally-muted-message", muted);

      const body = row.querySelector(".message-body");
      if (body && muted) {
        if (!body.dataset.originalText) body.dataset.originalText = body.textContent;
        body.textContent = "تم كتم رسائل هذا المستخدم عندك.";
      } else if (body?.dataset.originalText) {
        body.textContent = body.dataset.originalText;
        delete body.dataset.originalText;
      }
    });
  }

  function decorateMessages() {
    const ownId = refreshBridge()?.getProfile?.()?.clientId;

    els.messages?.querySelectorAll(".message-row").forEach((row) => {
      if (!row.dataset.professionalDecorated) {
        row.dataset.professionalDecorated = "1";

        if (row.dataset.clientId && row.dataset.clientId !== ownId) {
          const head = row.querySelector(".message-head");
          if (head) {
            const report = document.createElement("button");
            report.type = "button";
            report.className = "message-report-button";
            report.textContent = "⋯";
            report.title = "إبلاغ عن هذه الرسالة";
            report.addEventListener("click", (event) => {
              event.stopPropagation();
              openReport({
                clientId: row.dataset.clientId,
                nickname: row.dataset.nickname,
                avatar: row.dataset.avatar,
                messageId: row.dataset.messageId
              });
            });
            head.appendChild(report);
          }
        }
      }
    });

    applyLocalMute();
  }

  function renderPinned(notice) {
    currentPinned = notice || null;

    if (!notice?.text) {
      els.pinned.classList.add("hidden");
      return;
    }

    const dismissed = sessionStorage.getItem(dismissedPinKey);
    if (dismissed && dismissed === String(notice.id || notice.createdAt || notice.text)) {
      els.pinned.classList.add("hidden");
      return;
    }

    const announcement = notice.kind === "announcement";
    els.pinnedIcon.textContent = announcement ? "📣" : "📌";
    els.pinnedTitle.textContent = announcement ? "إعلان الإدارة" : "رسالة مثبتة";
    els.pinnedText.textContent = notice.text;
    els.pinned.classList.remove("hidden");
    els.pinned.classList.toggle("announcement", announcement);
  }

  function animateGift(event) {
    const badge = BADGES[event.badge];
    if (!badge) return;

    const card = document.createElement("div");
    card.className = `gift-burst badge-${event.badge}`;
    const icon = document.createElement("span");
    icon.textContent = badge.icon;
    const title = document.createElement("strong");
    title.textContent = badge.label;
    const recipient = document.createElement("small");
    recipient.textContent = `هدية إلى ${firstName(event.nickname || "المستخدم")}`;
    card.append(icon, title, recipient);

    for (let index = 0; index < 12; index++) {
      const sparkle = document.createElement("i");
      sparkle.textContent = index % 3 === 0 ? "✦" : "•";
      sparkle.style.setProperty("--gift-angle", `${index * 30}deg`);
      sparkle.style.setProperty("--gift-distance", `${55 + (index % 4) * 14}px`);
      card.appendChild(sparkle);
    }

    els.giftLayer.appendChild(card);
    setTimeout(() => card.classList.add("show"), 20);
    setTimeout(() => card.classList.add("leave"), 2600);
    setTimeout(() => card.remove(), 3400);
  }

  function onServerEvent(event) {
    if (!event) return;

    if (event.type === "init") {
      renderPinned(event.pinnedNotice);
    }

    if (event.type === "pinned-notice") {
      renderPinned(event.notice);
    }

    if (event.type === "gift-animation") {
      animateGift(event);
    }

    if (event.type === "spam-warning") {
      refreshBridge()?.showMessage?.(event.message || "تمهّل قليلاً قبل الإرسال.", 7000);
    }

    if (event.type === "report-received") {
      refreshBridge()?.showMessage?.("وصل البلاغ إلى الإدارة.", 3500);
    }

    if (event.type === "presence" || event.type === "badge-updated") {
      setTimeout(decorateMessages, 30);
      if (activeProfileUser) {
        const fresh = refreshBridge()?.getUsers?.()
          .find((user) => user.clientId === activeProfileUser.clientId);
        if (fresh) showProfile(fresh.clientId);
      }
    }
  }

  els.usersList?.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    const row = event.target.closest(".user-row");
    if (row?.dataset.clientId) showProfile(row.dataset.clientId);
  });

  els.presenceAvatars?.addEventListener("click", (event) => {
    const button = event.target.closest(".presence-avatar");
    if (button?.dataset.clientId) showProfile(button.dataset.clientId);
  });

  els.profilePrivateButton?.addEventListener("click", () => {
    if (!activeProfileUser) return;
    refreshBridge()?.openPrivate?.(activeProfileUser.clientId);
    closeProfile();
  });

  els.profileMuteButton?.addEventListener("click", () => {
    if (!activeProfileUser) return;

    if (mutedUsers.has(activeProfileUser.clientId)) {
      mutedUsers.delete(activeProfileUser.clientId);
    } else {
      mutedUsers.add(activeProfileUser.clientId);
    }

    saveMuted();
    applyLocalMute();
    els.profileMuteButton.textContent = mutedUsers.has(activeProfileUser.clientId)
      ? "إلغاء الكتم عندي"
      : "كتمه عندي";
  });

  els.profileReportButton?.addEventListener("click", () => {
    if (!activeProfileUser) return;
    const target = { ...activeProfileUser };
    closeProfile();
    openReport(target);
  });

  const profileCloseSelector = "#closeUserProfile, [data-close-profile='1']";
  const handleProfileClose = (event) => {
    const target = event.target?.closest?.(profileCloseSelector);
    if (!target || !els.profileModal?.contains(target)) return;
    closeProfile(event);
  };

  ["pointerdown", "pointerup", "click"].forEach((type) => {
    document.addEventListener(type, handleProfileClose, true);
  });
  document.addEventListener("touchend", handleProfileClose, { capture: true, passive: false });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.profileModal?.classList.contains("hidden")) closeProfile(event);
  });

  window.addEventListener("popstate", () => {
    if (!els.profileModal?.classList.contains("hidden")) closeProfile();
  });

  els.closeReport?.addEventListener("click", closeReport);

  document.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-report]")) closeReport();
  });

  els.reportForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshBridge();

    if (!reportTarget || !bridge?.isReady?.()) return;

    bridge.send({
      type: "report-user",
      targetId: reportTarget.clientId,
      targetNickname: reportTarget.nickname || "",
      targetAvatar: reportTarget.avatar || "",
      messageId: reportTarget.messageId || "",
      reason: els.reportReason.value,
      details: els.reportDetails.value.trim()
    });

    closeReport();
    bridge.showMessage("تم إرسال البلاغ إلى الإدارة.", 3500);
  });

  els.dismissPinned?.addEventListener("click", () => {
    if (currentPinned) {
      sessionStorage.setItem(
        dismissedPinKey,
        String(currentPinned.id || currentPinned.createdAt || currentPinned.text)
      );
    }
    els.pinned.classList.add("hidden");
  });

  const observer = new MutationObserver(() => decorateMessages());
  if (els.messages) observer.observe(els.messages, { childList: true, subtree: true });

  window.addEventListener("rivo:bridge-ready", () => {
    refreshBridge();
    loadMuted();
    decorateMessages();
  });

  window.addEventListener("rivo:server-event", (event) => {
    onServerEvent(event.detail);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProfile();
      closeReport();
    }
  });

  refreshBridge();
  decorateMessages();
})();
