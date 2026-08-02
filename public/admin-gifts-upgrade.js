(() => {
  "use strict";
  if (window.__RIVO_ADMIN_GIFTS_144__) return;
  window.__RIVO_ADMIN_GIFTS_144__ = true;

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

  function installStyles() {
    if (document.getElementById("rivoAdminGifts144Styles")) return;
    const style = document.createElement("style");
    style.id = "rivoAdminGifts144Styles";
    style.textContent = `
      #awardBadgeGrid[data-rivo-gifts144="1"]{display:block!important;max-height:520px;overflow:auto;padding:2px}
      .admin-gift-category-144{margin:0 0 14px}
      .admin-gift-category-144 h4{margin:0 1px 7px;color:#b8c6e4;font-size:12px}
      .admin-gift-items-144{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .admin-gift-option-144{display:grid!important;grid-template-columns:52px 1fr!important;align-items:center!important;text-align:right!important;min-height:82px;border:1px solid rgba(108,143,208,.25)!important;background:linear-gradient(145deg,rgba(29,42,76,.86),rgba(17,27,51,.9))!important;border-radius:16px!important;padding:10px!important;color:#fff!important;cursor:pointer;transition:.18s ease}
      .admin-gift-option-144:hover,.admin-gift-option-144.selected{border-color:#806bff!important;box-shadow:0 0 0 2px rgba(128,107,255,.16),0 12px 24px rgba(0,0,0,.2);transform:translateY(-1px)}
      .admin-gift-option-144 .gift-icon-144{font-size:38px;filter:drop-shadow(0 7px 9px rgba(0,0,0,.4));animation:adminGiftPulse144 2s ease-in-out infinite}
      .admin-gift-option-144 strong{display:block;font-size:12px}.admin-gift-option-144 small{display:block;margin-top:4px;color:#9eafd0;font-size:9px}
      #selectedAwardIcon.rivo-admin-gift-preview-144{font-size:42px;filter:drop-shadow(0 0 12px rgba(137,106,255,.8))}
      @keyframes adminGiftPulse144{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
      @media(max-width:720px){.admin-gift-items-144{grid-template-columns:1fr}.admin-gift-option-144{min-height:70px}}
      @media(prefers-reduced-motion:reduce){.admin-gift-option-144 .gift-icon-144{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function selectGift(id) {
    const gift = GIFTS[id] || GIFTS.rose;
    const select = document.getElementById("awardBadgeSelect");
    const grid = document.getElementById("awardBadgeGrid");
    if (select) select.value = id in GIFTS ? id : "rose";
    grid?.querySelectorAll(".admin-gift-option-144").forEach((button) => {
      const active = button.dataset.badge === (select?.value || "rose");
      button.classList.toggle("selected", active);
      button.setAttribute("aria-checked", active ? "true" : "false");
    });
    const icon = document.getElementById("selectedAwardIcon");
    const label = document.getElementById("selectedAwardLabel");
    if (icon) {
      icon.className = `gift-preview-icon rivo-admin-gift-preview-144 badge-${select?.value || "rose"}`;
      icon.textContent = gift.icon;
    }
    if (label) label.textContent = gift.label;
  }

  function install() {
    const grid = document.getElementById("awardBadgeGrid");
    const select = document.getElementById("awardBadgeSelect");
    if (!grid || !select) return false;
    if (grid.dataset.rivoGifts144 === "1" && grid.querySelector('[data-badge="galaxy"]')) return true;

    const previous = Object.prototype.hasOwnProperty.call(GIFTS, select.value) ? select.value : "rose";
    select.textContent = "";
    Object.entries(GIFTS).forEach(([id, gift]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${gift.icon} ${gift.label}`;
      select.appendChild(option);
    });

    grid.dataset.rivoGifts144 = "1";
    grid.textContent = "";
    ["لطيفة", "فاخرة", "نادرة"].forEach((category) => {
      const section = document.createElement("section");
      section.className = "admin-gift-category-144";
      const title = document.createElement("h4");
      title.textContent = category;
      const items = document.createElement("div");
      items.className = "admin-gift-items-144";

      Object.entries(GIFTS)
        .filter(([, gift]) => gift.category === category)
        .forEach(([id, gift]) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `award-badge-option admin-gift-option-144 badge-card-${id}`;
          button.dataset.badge = id;
          button.setAttribute("role", "radio");
          button.innerHTML = `<span class="gift-icon-144 badge-${id}">${gift.icon}</span><span><strong>${gift.label}</strong><small>اضغط للاختيار</small></span>`;
          button.addEventListener("click", () => selectGift(id));
          items.appendChild(button);
        });

      section.append(title, items);
      grid.appendChild(section);
    });

    selectGift(previous);
    return true;
  }

  function boot() {
    installStyles();
    if (!install()) {
      const timer = window.setInterval(() => {
        if (install()) window.clearInterval(timer);
      }, 250);
      window.setTimeout(() => window.clearInterval(timer), 15000);
    }
    const root = document.body || document.documentElement;
    if (root) new MutationObserver(install).observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
