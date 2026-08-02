(() => {
  "use strict";
  if (window.__RIVO_GIFTS_144__) return;
  window.__RIVO_GIFTS_144__ = true;

  const GIFTS = {
    rose:      { icon: "🌹", label: "وردة حمراء", category: "لطيفة" },
    butterfly: { icon: "🦋", label: "فراشة مضيئة", category: "لطيفة" },
    blossom:   { icon: "🌸", label: "زهرة وردية", category: "لطيفة" },
    moon:      { icon: "🌙", label: "قمر هادئ", category: "لطيفة" },
    pinkHeart: { icon: "💗", label: "قلب وردي", category: "لطيفة" },
    ruby:      { icon: "♦️", label: "ياقوتة حمراء", category: "فاخرة" },
    emerald:   { icon: "💚", label: "زمردة خضراء", category: "فاخرة" },
    crystal:   { icon: "🔮", label: "كريستالة بنفسجية", category: "فاخرة" },
    medal:     { icon: "🏅", label: "ميدالية ذهبية", category: "فاخرة" },
    wings:     { icon: "🪽", label: "أجنحة مضيئة", category: "نادرة" },
    flame:     { icon: "🔥", label: "شعلة ذهبية", category: "نادرة" },
    galaxy:    { icon: "🌌", label: "مجرة صغيرة", category: "نادرة" }
  };

  const FALLBACK_BADGE = "ruby";
  const badgeByClient = new Map();
  const roleByClient = new Map();
  const giftIds = new Set(Object.keys(GIFTS));
  const appNativeBadges = new Set(["ruby", "emerald"]);
  let decorateQueued = false;

  function remember(clientId, badge) {
    const id = String(clientId || "");
    if (!id) return;
    if (giftIds.has(badge)) badgeByClient.set(id, badge);
    else if (!badge) badgeByClient.delete(id);
  }

  function rememberRole(clientId, role) {
    const id = String(clientId || "");
    const normalizedRole = String(role || "");
    if (!id || !normalizedRole) return;
    roleByClient.set(id, normalizedRole);
  }

  function isOwnerClient(clientId, holder = null) {
    const id = String(clientId || "");
    const role = String(holder?.role || roleByClient.get(id) || "");
    return role === "owner";
  }

  function normalizeBadgeHolder(holder, clientId) {
    if (!holder || typeof holder !== "object") return;
    const id = String(clientId || holder.clientId || "");
    rememberRole(id, holder.role);

    // الإدارة تظهر بالتاج فقط دائماً، ولا تظهر قربها أي هدية أو جوهرة.
    if (isOwnerClient(id, holder)) {
      remember(id, "");
      holder.badge = "";
      return;
    }

    const badge = String(holder.badge || "");
    if (!badge) {
      remember(id, "");
      return;
    }
    if (!giftIds.has(badge)) return;
    remember(id, badge);
    if (!appNativeBadges.has(badge)) holder.badge = FALLBACK_BADGE;
  }

  function normalizeServerEvent(data) {
    if (!data || typeof data !== "object") return;

    if (data.type === "init") {
      const users = Array.isArray(data.users) ? data.users : [];
      const messages = Array.isArray(data.messages) ? data.messages : [];

      // نحفظ الرتب أولاً حتى نمنع أي هدية قديمة من الظهور على حساب الإدارة.
      users.forEach((user) => rememberRole(user?.clientId, user?.role));
      rememberRole(data.self?.clientId, data.self?.role);

      messages.forEach((message) =>
        normalizeBadgeHolder(message, message?.clientId)
      );
      users.forEach((user) =>
        normalizeBadgeHolder(user, user?.clientId)
      );
      normalizeBadgeHolder(data.self, data.self?.clientId);
    } else if (data.type === "presence") {
      const users = Array.isArray(data.users) ? data.users : [];
      users.forEach((user) => rememberRole(user?.clientId, user?.role));
      users.forEach((user) =>
        normalizeBadgeHolder(user, user?.clientId)
      );
    } else if (data.type === "message") {
      normalizeBadgeHolder(data.message, data.message?.clientId);
    } else if (data.type === "badge-updated" || data.type === "profile-updated") {
      normalizeBadgeHolder(data, data.clientId);
    } else if (data.type === "gift-animation") {
      const badge = String(data.badge || "");
      if (giftIds.has(badge)) {
        const targetId = data.targetClientId || data.clientId || "";

        // لا نعرض أو نخزن هدايا للإدارة؛ التاج هو الشارة الوحيدة لها.
        if (isOwnerClient(targetId)) {
          remember(targetId, "");
          data.rivoGiftBadge = "";
          data.badge = "";
        } else {
          remember(targetId, badge);
          data.rivoGiftBadge = badge;
          data.badge = ""; // يمنع الحركة القديمة المكررة، والحركة الجديدة تظهر أدناه.
        }
      }
    }

    queueDecorate();
  }

  const nativeDispatchEvent = window.dispatchEvent.bind(window);
  window.dispatchEvent = function rivoGiftDispatch(event) {
    if (event?.type === "rivo:server-event") normalizeServerEvent(event.detail);
    return nativeDispatchEvent(event);
  };

  function giftMarkup(id, extraClass = "") {
    const gift = GIFTS[id];
    if (!gift) return null;
    const span = document.createElement("span");
    span.className = `rivo-award-badge rivo-gift-144 badge-${id} ${extraClass}`.trim();
    span.dataset.rivoGift = id;
    span.title = gift.label;
    span.setAttribute("aria-label", gift.label);
    span.textContent = gift.icon;
    return span;
  }

  function placeGiftBadge(container, giftId, extraClass) {
    if (!container) return;
    const directBadges = [...container.querySelectorAll(":scope > .rivo-award-badge")];
    const correct = directBadges.find((node) =>
      node.classList.contains("rivo-gift-144") &&
      node.classList.contains(extraClass) &&
      node.dataset.rivoGift === giftId
    );
    if (correct && directBadges.length === 1) return;
    directBadges.forEach((node) => node.remove());
    container.appendChild(giftMarkup(giftId, extraClass));
  }

  function removeGiftBadge(container) {
    container?.querySelectorAll(":scope > .rivo-gift-144").forEach((node) => node.remove());
  }

  function removeAllAwardBadges(container) {
    container?.querySelectorAll(":scope > .rivo-award-badge").forEach((node) => node.remove());
  }

  function decorateUserRow(row, giftId) {
    const avatarWrap = row.querySelector(".user-avatar-wrap");
    const nameWrap = row.querySelector(".user-name-wrap");

    if (row.classList.contains("role-owner")) {
      removeAllAwardBadges(avatarWrap);
      removeAllAwardBadges(nameWrap);
      return;
    }

    if (!giftId) {
      removeGiftBadge(avatarWrap);
      removeGiftBadge(nameWrap);
      return;
    }
    placeGiftBadge(avatarWrap, giftId, "user-avatar-award");
    placeGiftBadge(nameWrap, giftId, "user-name-award");
  }

  function decorateMessageRow(row, giftId) {
    const avatarWrap = row.querySelector(".message-avatar-wrap");
    const nameWrap = row.querySelector(".message-name-line");
    const owner = isOwnerClient(row.dataset.clientId || "");

    row.classList.toggle("rivo-role-owner", owner);
    if (owner) {
      removeAllAwardBadges(avatarWrap);
      removeAllAwardBadges(nameWrap);
      return;
    }

    if (!giftId) {
      removeGiftBadge(avatarWrap);
      removeGiftBadge(nameWrap);
      return;
    }
    placeGiftBadge(avatarWrap, giftId, "message-avatar-badge");
    placeGiftBadge(nameWrap, giftId, "message-name-badge");
  }

  function decoratePresence(button, giftId) {
    const avatarWrap = button.querySelector(".presence-avatar-image");
    const existing = avatarWrap?.querySelector(":scope > .presence-gift-144");

    if (button.classList.contains("role-owner")) {
      removeAllAwardBadges(avatarWrap);
      return;
    }

    if (!giftId) {
      existing?.remove();
      return;
    }
    if (existing?.dataset.rivoGift === giftId) return;
    avatarWrap?.querySelectorAll(":scope > .presence-gift-144").forEach((node) => node.remove());
    avatarWrap?.appendChild(giftMarkup(giftId, "presence-gift-144"));
  }

  function decorateAll() {
    decorateQueued = false;
    document.querySelectorAll(".user-row[data-client-id]").forEach((row) => {
      decorateUserRow(row, badgeByClient.get(row.dataset.clientId || "") || "");
    });
    document.querySelectorAll(".message-row[data-client-id]").forEach((row) => {
      decorateMessageRow(row, badgeByClient.get(row.dataset.clientId || "") || "");
    });
    document.querySelectorAll(".presence-avatar[data-client-id]").forEach((button) => {
      decoratePresence(button, badgeByClient.get(button.dataset.clientId || "") || "");
    });
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(decorateAll);
  }

  function installGiftGrid() {
    const grid = document.getElementById("vipGiftGrid");
    if (!grid || grid.dataset.rivoGifts144 === "1") return;
    grid.dataset.rivoGifts144 = "1";
    grid.textContent = "";

    ["لطيفة", "فاخرة", "نادرة"].forEach((category) => {
      const section = document.createElement("section");
      section.className = "rivo-gift-category-144";
      const title = document.createElement("h4");
      title.textContent = category;
      const items = document.createElement("div");
      items.className = "rivo-gift-items-144";

      Object.entries(GIFTS)
        .filter(([, gift]) => gift.category === category)
        .forEach(([id, gift]) => {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.gift = id;
          button.className = `rivo-gift-choice-144 gift-${id}`;
          button.title = `إرسال ${gift.label}`;
          button.innerHTML = `<span>${gift.icon}</span><b>${gift.label}</b>`;
          items.appendChild(button);
        });

      section.append(title, items);
      grid.appendChild(section);
    });
  }

  function showGiftAnimation(data) {
    const id = String(data?.rivoGiftBadge || "");
    const gift = GIFTS[id];
    if (!gift) return;

    const targetName = data.targetNickname || data.nickname || "المستخدم";
    const fromName = data.fromNickname || "الإدارة";
    const layer = document.getElementById("giftAnimationLayer") || document.body;
    const burst = document.createElement("div");
    burst.className = `rivo-gift-burst-144 gift-${id}`;
    burst.innerHTML = `
      <div class="rivo-gift-orbit-144" aria-hidden="true">
        <i>${gift.icon}</i><i>${gift.icon}</i><i>${gift.icon}</i><i>${gift.icon}</i>
      </div>
      <div class="rivo-gift-main-144">${gift.icon}</div>
      <strong>${gift.label}</strong>
      <small>${fromName} منح ${targetName} هذه الهدية</small>
    `;
    layer.appendChild(burst);
    window.setTimeout(() => burst.remove(), 3000);
  }

  window.addEventListener("rivo:server-event", (event) => {
    showGiftAnimation(event.detail);
    queueDecorate();
  });
  window.addEventListener("rivo:bridge-ready", queueDecorate);

  function installStyles() {
    if (document.getElementById("rivoGifts144Styles")) return;
    const style = document.createElement("style");
    style.id = "rivoGifts144Styles";
    style.textContent = `
      #vipGiftGrid[data-rivo-gifts144="1"]{display:block!important;max-height:min(58vh,520px);overflow:auto;padding-inline:3px}
      .rivo-gift-category-144{margin:0 0 13px;text-align:right}
      .rivo-gift-category-144 h4{margin:0 2px 7px;color:#b9c9e7;font-size:12px;font-weight:800}
      .rivo-gift-items-144{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      .rivo-gift-choice-144{min-height:82px!important;border:1px solid rgba(111,145,211,.28)!important;background:linear-gradient(145deg,rgba(26,39,73,.82),rgba(14,24,48,.88))!important;border-radius:15px!important;padding:9px 4px!important;color:#fff!important;cursor:pointer;transition:.18s ease}
      .rivo-gift-choice-144:hover,.rivo-gift-choice-144:focus-visible{transform:translateY(-2px) scale(1.02);border-color:rgba(128,102,255,.8)!important;box-shadow:0 10px 22px rgba(0,0,0,.22)}
      .rivo-gift-choice-144 span{display:block!important;font-size:34px!important;line-height:1.15!important;filter:drop-shadow(0 7px 9px rgba(0,0,0,.4))}
      .rivo-gift-choice-144 b{display:block!important;margin-top:7px!important;font-size:10px!important;line-height:1.35!important}
      .user-row.role-owner .rivo-award-badge,
      .presence-avatar.role-owner .rivo-award-badge,
      .message-row.rivo-role-owner .rivo-award-badge{display:none!important}
      .rivo-gift-144{display:inline-grid;place-items:center;background:transparent!important;filter:drop-shadow(0 0 7px rgba(143,116,255,.72));animation:rivoGiftPulse144 2.1s ease-in-out infinite;isolation:isolate}
      .rivo-gift-144.badge-flame{filter:drop-shadow(0 0 9px rgba(255,153,35,.9))}
      .rivo-gift-144.badge-galaxy,.rivo-gift-144.badge-crystal{filter:drop-shadow(0 0 10px rgba(163,102,255,.95))}
      .presence-gift-144{position:absolute;inset:auto -6px -5px auto;font-size:18px;z-index:6}
      .rivo-gift-burst-144{position:fixed;z-index:99999;left:50%;top:45%;width:min(88vw,430px);transform:translate(-50%,-50%);display:grid;justify-items:center;pointer-events:none;text-align:center;color:#fff;animation:rivoGiftShow144 3s ease both;text-shadow:0 3px 18px #000}
      .rivo-gift-main-144{font-size:96px;line-height:1;filter:drop-shadow(0 0 28px rgba(155,113,255,.95));animation:rivoGiftMain144 1.1s cubic-bezier(.2,.8,.2,1) both}
      .rivo-gift-burst-144 strong{font-size:23px;margin-top:9px}
      .rivo-gift-burst-144 small{font-size:13px;margin-top:5px;color:#e8ecff}
      .rivo-gift-orbit-144{position:absolute;width:220px;height:220px;animation:rivoGiftOrbit144 2.4s linear infinite}
      .rivo-gift-orbit-144 i{position:absolute;font-style:normal;font-size:31px}
      .rivo-gift-orbit-144 i:nth-child(1){left:50%;top:0}.rivo-gift-orbit-144 i:nth-child(2){right:0;top:50%}.rivo-gift-orbit-144 i:nth-child(3){left:50%;bottom:0}.rivo-gift-orbit-144 i:nth-child(4){left:0;top:50%}
      @keyframes rivoGiftPulse144{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
      @keyframes rivoGiftMain144{0%{opacity:0;transform:scale(.1) rotate(-25deg)}65%{opacity:1;transform:scale(1.18) rotate(5deg)}100%{transform:scale(1)}}
      @keyframes rivoGiftOrbit144{to{transform:rotate(360deg)}}
      @keyframes rivoGiftShow144{0%,100%{opacity:0}12%,78%{opacity:1}100%{transform:translate(-50%,-58%) scale(.92)}}
      @media(max-width:720px){.rivo-gift-items-144{grid-template-columns:repeat(3,minmax(0,1fr))}.rivo-gift-choice-144{min-height:76px!important}.rivo-gift-main-144{font-size:78px}}
      @media(prefers-reduced-motion:reduce){.rivo-gift-144,.rivo-gift-burst-144,.rivo-gift-main-144,.rivo-gift-orbit-144{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    installStyles();
    installGiftGrid();
    queueDecorate();
    const root = document.body || document.documentElement;
    if (root) {
      new MutationObserver(() => {
        installGiftGrid();
        queueDecorate();
      }).observe(root, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
