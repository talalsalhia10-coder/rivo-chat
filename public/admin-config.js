window.RIVO_ADMIN_CONFIG = {
  room: "lobby"
};

(() => {
  "use strict";

  const RELEASE = "150-rivo-lina-engine-controls";
  const NativeWebSocket = window.WebSocket;
  const adminSockets = window.__RIVO_ADMIN_SOCKETS__ = window.__RIVO_ADMIN_SOCKETS__ || new Set();

  if (!NativeWebSocket || window.__RIVO_ADMIN_CONNECTION_FIX__ === RELEASE) return;
  window.__RIVO_ADMIN_CONNECTION_FIX__ = RELEASE;

  function isAdminSocket(url) {
    try {
      const parsed = new URL(String(url), location.href);
      return parsed.origin === location.origin &&
        /\/api\/rooms\/[^/]+\/admin-ws$/.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  function createEvent(type) {
    return new Event(type);
  }

  function createCloseEvent(nativeEvent, fallbackReason = "") {
    return new CloseEvent("close", {
      code: Number(nativeEvent?.code || 1006),
      reason: String(nativeEvent?.reason || fallbackReason || ""),
      wasClean: Boolean(nativeEvent?.wasClean)
    });
  }

  class StableAdminWebSocket extends EventTarget {
    constructor(url, protocols) {
      super();

      // لا نتدخل بأي WebSocket آخر؛ الإصلاح خاص بلوحة الإدارة والمراقب فقط.
      if (!isAdminSocket(url)) {
        return protocols === undefined
          ? new NativeWebSocket(url)
          : new NativeWebSocket(url, protocols);
      }

      this.url = String(url);
      this.protocol = "";
      adminSockets.add(this);
      this.extensions = "";
      this.bufferedAmount = 0;
      this.binaryType = "blob";
      this.readyState = NativeWebSocket.CONNECTING;

      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;

      this._protocols = protocols;
      this._native = null;
      this._manualClose = false;
      this._everOpened = false;
      this._attempt = 0;
      this._reconnectTimer = null;
      this._pingTimer = null;
      this._queue = [];

      this._connect();
    }

    _emit(event) {
      this.dispatchEvent(event);
      try {
        window.dispatchEvent(new CustomEvent("rivo:admin-socket-event", {
          detail: { socket: this, type: event.type, data: event.type === "message" ? event.data : null }
        }));
      } catch {}
      const handler = this[`on${event.type}`];
      if (typeof handler === "function") {
        try { handler.call(this, event); } catch (error) { setTimeout(() => { throw error; }); }
      }
    }

    _connect() {
      if (this._manualClose) return;

      clearTimeout(this._reconnectTimer);
      this.readyState = NativeWebSocket.CONNECTING;

      let socket;
      try {
        socket = this._protocols === undefined
          ? new NativeWebSocket(this.url)
          : new NativeWebSocket(this.url, this._protocols);
      } catch {
        this._scheduleReconnect();
        return;
      }

      this._native = socket;
      socket.binaryType = this.binaryType;

      socket.addEventListener("open", () => {
        if (this._manualClose || socket !== this._native) return;

        const wasReconnect = this._everOpened;
        this._everOpened = true;
        this._attempt = 0;
        this.readyState = NativeWebSocket.OPEN;
        this.protocol = socket.protocol;
        this.extensions = socket.extensions;
        this.bufferedAmount = socket.bufferedAmount;

        this._flushQueue();
        this._startPing();

        // نرسل open أيضاً بعد إعادة الاتصال حتى تعيد لوحة الإدارة حالتها إلى «متصل».
        this._emit(createEvent("open"));

        if (wasReconnect) {
          try {
            socket.send(JSON.stringify({ type: "ping", at: Date.now(), reconnect: true }));
          } catch {}
        }
      });

      socket.addEventListener("message", (nativeEvent) => {
        if (socket !== this._native) return;
        this.bufferedAmount = socket.bufferedAmount;
        this._emit(new MessageEvent("message", {
          data: nativeEvent.data,
          origin: nativeEvent.origin,
          lastEventId: nativeEvent.lastEventId,
          source: nativeEvent.source,
          ports: nativeEvent.ports
        }));
      });

      socket.addEventListener("error", () => {
        // أخطاء الشبكة المؤقتة ستتبعها محاولة اتصال جديدة، فلا نعرض فشلاً كاذباً للمستخدم.
        if (this._manualClose || socket !== this._native) return;
      });

      socket.addEventListener("close", (nativeEvent) => {
        if (socket !== this._native) return;

        this._stopPing();
        this.bufferedAmount = socket.bufferedAmount;

        if (this._manualClose) {
          this.readyState = NativeWebSocket.CLOSED;
          this._emit(createCloseEvent(nativeEvent));
          return;
        }

        const authFailure = [4003, 4004, 1008].includes(Number(nativeEvent.code || 0));
        if (authFailure) {
          this.readyState = NativeWebSocket.CLOSED;
          this._emit(createCloseEvent(nativeEvent, "انتهت جلسة الإدارة أو أُلغيت الصلاحية."));
          return;
        }

        // نشر Cloudflare أو انقطاع الشبكة يغلق WebSocket. نعيده تلقائياً ونحتفظ بالأوامر.
        this.readyState = NativeWebSocket.CONNECTING;
        this._scheduleReconnect();
      });
    }

    _scheduleReconnect() {
      if (this._manualClose) return;

      this._attempt += 1;
      const delay = Math.min(1000 * (2 ** Math.min(this._attempt - 1, 4)), 15000);

      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = setTimeout(() => this._connect(), delay);
    }

    _startPing() {
      this._stopPing();
      this._pingTimer = setInterval(() => {
        if (this._native?.readyState !== NativeWebSocket.OPEN) return;
        try {
          this._native.send(JSON.stringify({ type: "ping", at: Date.now() }));
        } catch {}
      }, 25000);
    }

    _stopPing() {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }

    _flushQueue() {
      if (this._native?.readyState !== NativeWebSocket.OPEN) return;

      while (this._queue.length) {
        const data = this._queue.shift();
        try {
          this._native.send(data);
        } catch {
          this._queue.unshift(data);
          break;
        }
      }
      this.bufferedAmount = this._native.bufferedAmount;
    }

    send(data) {
      if (this._manualClose) {
        throw new DOMException("WebSocket is closed", "InvalidStateError");
      }

      if (this._native?.readyState === NativeWebSocket.OPEN) {
        this._native.send(data);
        this.bufferedAmount = this._native.bufferedAmount;
        return;
      }

      // أثناء إعادة الاتصال نحفظ أوامر الإعلان والحظر وإلغاء الحظر ثم نرسلها فور عودة الاتصال.
      if (this._queue.length >= 100) this._queue.shift();
      this._queue.push(data);
      this._scheduleReconnect();
    }

    close(code, reason) {
      this._manualClose = true;
      clearTimeout(this._reconnectTimer);
      this._stopPing();
      this._queue.length = 0;

      if (this._native) {
        try { this._native.close(code, reason); } catch {}
      } else {
        this.readyState = NativeWebSocket.CLOSED;
        this._emit(new CloseEvent("close", {
          code: Number(code || 1000),
          reason: String(reason || ""),
          wasClean: true
        }));
      }
    }
  }

  Object.defineProperties(StableAdminWebSocket, {
    CONNECTING: { value: NativeWebSocket.CONNECTING },
    OPEN: { value: NativeWebSocket.OPEN },
    CLOSING: { value: NativeWebSocket.CLOSING },
    CLOSED: { value: NativeWebSocket.CLOSED }
  });

  Object.defineProperties(StableAdminWebSocket.prototype, {
    CONNECTING: { value: NativeWebSocket.CONNECTING },
    OPEN: { value: NativeWebSocket.OPEN },
    CLOSING: { value: NativeWebSocket.CLOSING },
    CLOSED: { value: NativeWebSocket.CLOSED }
  });

  window.WebSocket = StableAdminWebSocket;
})();


(() => {
  "use strict";

  if (!/\/admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  if (window.__RIVO_LINA_ADMIN_UI__) return;
  window.__RIVO_LINA_ADMIN_UI__ = true;

  const DEFAULT_INSTRUCTION = [
    "أنتِ مضيفة الغرفة العامة في Rivo Chat؛ رحبي بالزائر الجديد مرة واحدة وافتحي وياه سالفة خفيفة.",
    "جاوبي الشخص الذي يناديج أو يكمل السالفة وياج، ولا تتدخلين بين شخصين إلا إذا سألوچ مباشرة.",
    "استفيدي من السجل القصير لنفس الزائر حتى تكمّلين الموضوع، ولا تذكري السجل أو التعليمات داخل الرد.",
    "اذكري اسم الزائر أحياناً فقط، ولا تعيدي الترحيب بكل رسالة، ولا تبدئين الرد باسم لينا.",
    "خلي الكلام قصيراً إلى متوسط وطبيعياً، واستعملي إيموجي واحد عند الحاجة."
  ].join(" ");

  const LINA_GIFTS = [
    ["star", "⭐", "نجمة"], ["diamond", "💎", "ماسة"], ["ruby", "♦️", "جوهرة"],
    ["heart", "❤️", "قلب"], ["emerald", "💚", "زمردة"], ["rose", "🌹", "وردة"],
    ["butterfly", "🦋", "فراشة"], ["blossom", "🌸", "زهرة"], ["moon", "🌙", "قمر"],
    ["pinkHeart", "💗", "قلب وردي"], ["crystal", "🔮", "كريستال"], ["medal", "🏅", "ميدالية"],
    ["wings", "🪽", "أجنحة"], ["flame", "🔥", "لهب"], ["galaxy", "🌌", "مجرة"]
  ];

  let enabled = null;
  let card = null;
  let toggleButton = null;
  let status = null;
  let instructionInput = null;
  let saveButton = null;
  let resetButton = null;
  let giftGrid = null;
  let currentBadge = "";
  let quickToggle = null;
  let quickStatus = null;

  function activeSocket() {
    const sockets = window.__RIVO_ADMIN_SOCKETS__;
    if (!sockets) return null;
    return [...sockets].reverse().find((socket) => socket?.readyState === WebSocket.OPEN) || null;
  }

  function send(action, extra = {}) {
    const socket = activeSocket();
    if (!socket) {
      setStatus("انتظر رجوع اتصال لوحة الإدارة.", "waiting");
      return false;
    }
    try {
      socket.send(JSON.stringify({ type: "admin-command", action, ...extra }));
      return true;
    } catch {
      setStatus("تعذر إرسال الأمر، ستتم المحاولة بعد عودة الاتصال.", "waiting");
      return false;
    }
  }

  function setStatus(text, mode = "") {
    if (!status) return;
    status.textContent = text;
    status.dataset.mode = mode;
  }

  function syncButton() {
    if (!toggleButton) return;
    if (enabled === null) {
      toggleButton.disabled = true;
      toggleButton.textContent = "جاري قراءة حالة لينا…";
      toggleButton.classList.remove("is-on", "is-off");
      return;
    }
    toggleButton.disabled = false;
    toggleButton.textContent = enabled ? "إيقاف لينا" : "تشغيل لينا";
    toggleButton.classList.toggle("is-on", enabled);
    toggleButton.classList.toggle("is-off", !enabled);
    setStatus(enabled ? "لينا ظاهرة الآن في قائمة المتصلين وترد على الزوار." : "لينا متوقفة ومختفية من قائمة المتصلين.", enabled ? "on" : "off");
    if (quickToggle) {
      quickToggle.disabled = false;
      quickToggle.dataset.mode = enabled ? "on" : "off";
      quickToggle.textContent = enabled ? "⏹ إيقاف لينا" : "▶ تشغيل لينا";
    }
    if (quickStatus) quickStatus.textContent = enabled ? "لينا تعمل بمحرك ريفو" : "لينا متوقفة";
  }

  function syncGiftSelection() {
    giftGrid?.querySelectorAll(".lina-gift").forEach((button) => {
      button.classList.toggle("selected", button.dataset.gift === currentBadge);
    });
  }

  function requestState() {
    send("lina-state-request");
  }

  function ensureQuickToggle() {
    if (quickToggle?.isConnected) return;
    if (!document.body) return;

    const wrap = document.createElement("div");
    wrap.id = "linaQuickControl";
    wrap.innerHTML = `
      <span id="linaQuickStatus">جاري قراءة حالة لينا…</span>
      <button id="linaQuickToggle" type="button" disabled>انتظر…</button>
    `;
    const style = document.createElement("style");
    style.textContent = `
      #linaQuickControl{position:fixed;left:16px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid rgba(153,134,255,.45);border-radius:15px;background:rgba(8,16,36,.96);box-shadow:0 12px 35px rgba(0,0,0,.38);color:#eef2ff;font:700 12px/1.4 "Segoe UI",Tahoma,Arial,sans-serif;backdrop-filter:blur(10px)}
      #linaQuickControl button{min-height:38px;border:0;border-radius:11px;padding:0 14px;color:white;font-weight:900;cursor:pointer;background:#7559ff}
      #linaQuickControl button[data-mode="on"]{background:#df526c}
      #linaQuickControl button[data-mode="off"]{background:#21a979}
      #linaQuickControl button:disabled{opacity:.55;cursor:wait}
      @media(max-width:700px){#linaQuickControl{left:8px;bottom:8px;right:8px;justify-content:space-between}#linaQuickControl span{font-size:11px}}
    `;
    document.head.appendChild(style);
    document.body.appendChild(wrap);
    quickToggle = wrap.querySelector("#linaQuickToggle");
    quickStatus = wrap.querySelector("#linaQuickStatus");
    quickToggle.addEventListener("click", () => {
      if (enabled === null) return requestState();
      quickToggle.disabled = true;
      quickStatus.textContent = "جاري تنفيذ الأمر…";
      if (!send("lina-toggle", { enabled: !enabled })) syncButton();
    });
    syncButton();
  }

  function ensureCard() {
    ensureQuickToggle();
    if (card?.isConnected) return;
    const rail = document.getElementById("adminControlRail") ||
      document.querySelector("[data-admin-control-rail], .admin-control-rail, .control-rail");
    if (!rail) return;

    const style = document.createElement("style");
    style.textContent = `
      #linaControlCard{border:1px solid rgba(139,112,255,.38);background:linear-gradient(155deg,rgba(124,92,255,.12),rgba(14,24,48,.94));}
      #linaControlCard .lina-admin-head{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
      #linaControlCard .lina-admin-avatar{width:54px;height:54px;border-radius:16px;object-fit:cover;border:2px solid rgba(164,139,255,.8);box-shadow:0 8px 25px rgba(89,62,210,.24);}
      #linaControlCard .lina-admin-head div{min-width:0;flex:1;}
      #linaControlCard h2{margin:0 0 4px;font-size:18px;}
      #linaControlCard .lina-state{display:inline-flex;margin-top:5px;padding:5px 9px;border-radius:999px;font-size:12px;background:rgba(255,255,255,.07);}
      #linaControlCard .lina-state[data-mode="on"]{background:rgba(24,190,126,.16);color:#7ef0bc;}
      #linaControlCard .lina-state[data-mode="off"]{background:rgba(244,86,111,.15);color:#ff9aab;}
      #linaControlCard .lina-state[data-mode="waiting"]{color:#ffd58b;}
      #linaControlCard .lina-toggle{width:100%;min-height:46px;border:0;border-radius:13px;font-weight:800;cursor:pointer;margin:4px 0 14px;background:#7559ff;color:white;}
      #linaControlCard .lina-toggle.is-on{background:#e14f69;}
      #linaControlCard .lina-toggle.is-off{background:#21a979;}
      #linaControlCard .lina-toggle:disabled{opacity:.6;cursor:wait;}
      #linaControlCard .lina-gift-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 8px;font-weight:800;}
      #linaControlCard .lina-gift-title small{margin:0;opacity:.68;font-weight:500;}
      #linaControlCard .lina-gift-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-bottom:14px;}
      #linaControlCard .lina-gift{min-height:42px;border:1px solid rgba(155,169,214,.22);border-radius:11px;background:rgba(255,255,255,.06);color:white;font-size:21px;cursor:pointer;}
      #linaControlCard .lina-gift:hover{background:rgba(117,89,255,.22);transform:translateY(-1px);}
      #linaControlCard .lina-gift.selected{border-color:#9d88ff;background:rgba(117,89,255,.32);box-shadow:0 0 0 2px rgba(157,136,255,.12) inset;}
      #linaControlCard label{display:block;font-weight:800;margin-bottom:7px;}
      #linaControlCard textarea{width:100%;min-height:145px;resize:vertical;box-sizing:border-box;border:1px solid rgba(155,169,214,.24);border-radius:13px;background:rgba(5,12,28,.7);color:#eef2ff;padding:12px;line-height:1.7;font:inherit;}
      #linaControlCard .lina-admin-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
      #linaControlCard .lina-admin-actions button{min-height:42px;border:0;border-radius:11px;font-weight:800;cursor:pointer;}
      #linaControlCard .lina-save{background:#6f58ee;color:white;}
      #linaControlCard .lina-reset{background:rgba(255,255,255,.09);color:#e9edff;}
      #linaControlCard small{display:block;margin-top:10px;line-height:1.6;opacity:.76;}
      @media(max-width:700px){#linaControlCard .lina-admin-actions{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);

    card = document.createElement("article");
    card.id = "linaControlCard";
    card.className = "card control-card owner-only-card";
    card.innerHTML = `
      <div class="lina-admin-head">
        <img class="lina-admin-avatar" src="./characters/lina/portrait-small.webp" alt="لينا">
        <div>
          <h2>لينا — محرك ريفو الأصلي <small style="display:inline;margin:0 6px;opacity:.65">v150</small></h2>
          <p class="card-hint">تستخدم نفس محرك وشخصية لينا في Rivo، وتظهر باسمها وصورتها داخل الغرفة.</p>
          <span id="linaAdminStatus" class="lina-state" data-mode="waiting">جاري قراءة الحالة…</span>
        </div>
      </div>
      <button id="linaAdminToggle" class="lina-toggle" type="button" disabled>جاري قراءة حالة لينا…</button>
      <div class="lina-gift-title"><span>أعطِ لينا هدية</span><small>اضغط على الهدية مباشرة</small></div>
      <div id="linaAdminGiftGrid" class="lina-gift-grid" aria-label="هدايا لينا"></div>
      <label for="linaAdminInstruction">تعليمات إضافية للينا داخل الغرفة</label>
      <textarea id="linaAdminInstruction" maxlength="1400" spellcheck="true"></textarea>
      <div class="lina-admin-actions">
        <button id="linaAdminSave" class="lina-save" type="button">حفظ تعليمات الغرفة</button>
        <button id="linaAdminReset" class="lina-reset" type="button">إرجاع تعليمات الغرفة</button>
      </div>
      <small>الشخصية الأساسية ثابتة من محرك ريفو، وهذا المربع يضيف فقط تعليمات خاصة بالغرفة. الهدايا تظهر قرب صورتها ورسائلها.</small>
    `;

    rail.prepend(card);

    toggleButton = card.querySelector("#linaAdminToggle");
    status = card.querySelector("#linaAdminStatus");
    instructionInput = card.querySelector("#linaAdminInstruction");
    saveButton = card.querySelector("#linaAdminSave");
    resetButton = card.querySelector("#linaAdminReset");
    giftGrid = card.querySelector("#linaAdminGiftGrid");
    instructionInput.value = DEFAULT_INSTRUCTION;

    LINA_GIFTS.forEach(([id, icon, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lina-gift";
      button.dataset.gift = id;
      button.textContent = icon;
      button.title = `إعطاء لينا ${label}`;
      button.setAttribute("aria-label", `إعطاء لينا ${label}`);
      button.addEventListener("click", () => {
        if (!enabled) {
          setStatus("شغّل لينا أولاً حتى تستلم الهدية.", "waiting");
          return;
        }
        setStatus(`جاري إعطاء لينا ${label}…`, "waiting");
        send("set-user-badge", {
          clientId: "rivo-ai-lina",
          nickname: "لينا • AI",
          badge: id
        });
        currentBadge = id;
        syncGiftSelection();
        setTimeout(requestState, 350);
      });
      giftGrid.appendChild(button);
    });

    toggleButton.addEventListener("click", () => {
      if (enabled === null) return requestState();
      toggleButton.disabled = true;
      setStatus("جاري تنفيذ الأمر…", "waiting");
      if (!send("lina-toggle", { enabled: !enabled })) syncButton();
    });

    saveButton.addEventListener("click", () => {
      const instruction = instructionInput.value.trim();
      if (!instruction) {
        instructionInput.value = DEFAULT_INSTRUCTION;
      }
      saveButton.disabled = true;
      setStatus("جاري حفظ تعليمات الغرفة…", "waiting");
      if (!send("lina-instruction-update", { instruction: instructionInput.value.trim() })) {
        saveButton.disabled = false;
      }
    });

    resetButton.addEventListener("click", () => {
      instructionInput.value = DEFAULT_INSTRUCTION;
      instructionInput.focus();
      setStatus("اضغط «حفظ تعليمات الغرفة» لاعتماد التعليمات العراقية.", "waiting");
    });

    syncButton();
    setTimeout(requestState, 300);
  }

  window.addEventListener("rivo:admin-socket-event", (event) => {
    ensureCard();
    const detail = event.detail || {};
    if (detail.type === "open") {
      setTimeout(requestState, 200);
      return;
    }
    if (detail.type !== "message" || typeof detail.data !== "string") return;
    let data = null;
    try { data = JSON.parse(detail.data); } catch { return; }
    if (data?.type !== "lina-state") return;

    enabled = Boolean(data.enabled);
    currentBadge = typeof data.badge === "string" ? data.badge : "";
    syncGiftSelection();
    if (instructionInput && typeof data.instruction === "string" && data.instruction.trim()) {
      instructionInput.value = data.instruction;
    }
    if (saveButton) saveButton.disabled = false;
    if (quickStatus && data.engine === "rivo-original") quickStatus.textContent = enabled ? "لينا تعمل بمحرك ريفو" : "لينا متوقفة";
    syncButton();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { ensureQuickToggle(); ensureCard(); }, { once: true });
  } else {
    ensureQuickToggle();
    ensureCard();
  }

  const observer = new MutationObserver(ensureCard);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => {
    ensureQuickToggle();
    ensureCard();
    if (enabled === null && activeSocket()) requestState();
  }, 2500);
})();
