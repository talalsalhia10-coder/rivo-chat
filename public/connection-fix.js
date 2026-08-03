(() => {
  if (window.__RIVO_GIFTS_144__ || document.querySelector('script[src*="gifts-upgrade.js"]')) return;
  const src = `./gifts-upgrade.js?v=1440`;
  if (document.readyState === "loading") {
    document.write(`<script src="${src}"><\/script>`);
  } else {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }
})();
(() => {
  "use strict";

  const RELEASE = "1434-connection-stability";
  const SESSION_KEY = "rivo_google_session_v1";
  const RESET_NOTICE_KEY = "rivo_connection_reset_notice_v1";
  const RELOAD_GUARD_KEY = "rivo_connection_reload_guard_v1";
  const NativeWebSocket = window.WebSocket;

  if (!NativeWebSocket || window.__RIVO_CONNECTION_FIX__ === RELEASE) return;
  window.__RIVO_CONNECTION_FIX__ = RELEASE;

  function isRivoRoomSocket(url) {
    try {
      const parsed = new URL(String(url), location.href);
      return parsed.origin === location.origin && /\/api\/rooms\/[^/]+\/ws$/.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  function clearExpiredGoogleSession() {
    try { window.RivoGoogleAuth?.clearSession?.(); } catch {}
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    // الملف المحفوظ قد يحمل رمز جلسة قديم؛ نزيله فقط عند ثبوت رفض الجلسة من الخادم.
    try { localStorage.removeItem("rivo_group_profile_v1"); } catch {}
    try { sessionStorage.removeItem("rivo_active_room_v1"); } catch {}
    try { sessionStorage.setItem(RESET_NOTICE_KEY, "1"); } catch {}
  }

  function goToFreshLogin() {
    clearExpiredGoogleSession();
    const target = new URL(location.href);
    target.searchParams.delete("room");
    target.searchParams.set("session", "expired");
    target.searchParams.set("v", RELEASE);
    location.replace(target.href);
  }

  async function sessionIsAccepted(authToken) {
    if (!authToken) return true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/api/vip/me", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ authToken }),
        signal: controller.signal
      });
      // 401 يعني أن رمز Google المحفوظ لم يعد صالحاً. بقية الأخطاء قد تكون مؤقتة.
      if (response.status === 401) return false;
      return true;
    } catch {
      return true;
    } finally {
      clearTimeout(timer);
    }
  }

  class RivoWebSocket extends EventTarget {
    constructor(url, protocols) {
      super();
      this.url = String(url);
      this.protocol = "";
      this.extensions = "";
      this.bufferedAmount = 0;
      this.readyState = NativeWebSocket.CONNECTING;
      this.binaryType = "blob";
      this._native = null;
      this._closedBeforeOpen = false;
      this._connectTimer = null;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;

      this._start(protocols);
    }

    async _start(protocols) {
      if (isRivoRoomSocket(this.url)) {
        const parsed = new URL(this.url, location.href);
        const role = parsed.searchParams.get("role") || "user";
        const authToken = parsed.searchParams.get("authToken") || "";
        if (role === "user" && authToken) {
          const accepted = await sessionIsAccepted(authToken);
          if (!accepted) {
            this.readyState = NativeWebSocket.CLOSED;
            queueMicrotask(() => {
              const event = new Event("error");
              this.dispatchEvent(event);
              if (typeof this.onerror === "function") this.onerror.call(this, event);
            });
            setTimeout(goToFreshLogin, 0);
            return;
          }
        }
      }

      if (this._closedBeforeOpen) return;
      this._openNative(protocols);
    }

    _openNative(protocols) {
      let socket;
      try {
        socket = protocols === undefined
          ? new NativeWebSocket(this.url)
          : new NativeWebSocket(this.url, protocols);
      } catch (error) {
        this.readyState = NativeWebSocket.CLOSED;
        throw error;
      }

      this._native = socket;
      socket.binaryType = this.binaryType;

      this._connectTimer = setTimeout(() => {
        if (socket.readyState === NativeWebSocket.CONNECTING) {
          try { socket.close(4000, "Connection timeout"); } catch {}
        }
      }, 15000);

      socket.addEventListener("open", (nativeEvent) => {
        clearTimeout(this._connectTimer);
        this.readyState = socket.readyState;
        this.protocol = socket.protocol;
        this.extensions = socket.extensions;
        this.bufferedAmount = socket.bufferedAmount;
        const event = new Event("open");
        this.dispatchEvent(event);
        if (typeof this.onopen === "function") this.onopen.call(this, event);
      });

      socket.addEventListener("message", (nativeEvent) => {
        this.readyState = socket.readyState;
        this.bufferedAmount = socket.bufferedAmount;
        const event = new MessageEvent("message", {
          data: nativeEvent.data,
          origin: nativeEvent.origin,
          lastEventId: nativeEvent.lastEventId,
          source: nativeEvent.source,
          ports: nativeEvent.ports
        });
        this.dispatchEvent(event);
        if (typeof this.onmessage === "function") this.onmessage.call(this, event);
      });

      socket.addEventListener("error", () => {
        this.readyState = socket.readyState;
        const event = new Event("error");
        this.dispatchEvent(event);
        if (typeof this.onerror === "function") this.onerror.call(this, event);
      });

      socket.addEventListener("close", (nativeEvent) => {
        clearTimeout(this._connectTimer);
        this.readyState = NativeWebSocket.CLOSED;
        this.bufferedAmount = socket.bufferedAmount;
        const event = new CloseEvent("close", {
          code: nativeEvent.code,
          reason: nativeEvent.reason,
          wasClean: nativeEvent.wasClean
        });
        this.dispatchEvent(event);
        if (typeof this.onclose === "function") this.onclose.call(this, event);
      });
    }

    send(data) {
      if (!this._native || this._native.readyState !== NativeWebSocket.OPEN) {
        throw new DOMException("WebSocket is not open", "InvalidStateError");
      }
      this._native.send(data);
      this.bufferedAmount = this._native.bufferedAmount;
    }

    close(code, reason) {
      this._closedBeforeOpen = true;
      clearTimeout(this._connectTimer);
      if (this._native) {
        this.readyState = this._native.readyState;
        this._native.close(code, reason);
      } else {
        this.readyState = NativeWebSocket.CLOSED;
      }
    }
  }

  Object.defineProperties(RivoWebSocket, {
    CONNECTING: { value: NativeWebSocket.CONNECTING },
    OPEN: { value: NativeWebSocket.OPEN },
    CLOSING: { value: NativeWebSocket.CLOSING },
    CLOSED: { value: NativeWebSocket.CLOSED }
  });
  Object.defineProperties(RivoWebSocket.prototype, {
    CONNECTING: { value: NativeWebSocket.CONNECTING },
    OPEN: { value: NativeWebSocket.OPEN },
    CLOSING: { value: NativeWebSocket.CLOSING },
    CLOSED: { value: NativeWebSocket.CLOSED }
  });

  window.WebSocket = RivoWebSocket;

  function showSessionResetNotice() {
    let show = false;
    try {
      show = sessionStorage.getItem(RESET_NOTICE_KEY) === "1";
      if (show) sessionStorage.removeItem(RESET_NOTICE_KEY);
    } catch {}
    if (!show) return;

    const display = () => {
      const status = document.getElementById("googleLoginStatus");
      if (status) status.textContent = "انتهت جلسة Google القديمة. سجّل الدخول من جديد ثم ادخل الدردشة.";
      const banner = document.getElementById("errorBanner");
      if (banner) {
        banner.textContent = "انتهت جلسة Google القديمة. سجّل الدخول من جديد.";
        banner.classList.remove("hidden");
      }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", display, { once: true });
    else display();
  }

  function chatIsVisible() {
    const app = document.getElementById("chatApp");
    return Boolean(app && !app.classList.contains("hidden"));
  }

  function connectionIsDown() {
    const status = document.getElementById("connectionStatus");
    return Boolean(status && !status.classList.contains("connected"));
  }

  function guardedReload(delay = 1200) {
    if (!navigator.onLine || !chatIsVisible() || !connectionIsDown()) return;
    let last = 0;
    try { last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0); } catch {}
    if (Date.now() - last < 90000) return;
    try { sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now())); } catch {}
    setTimeout(() => {
      if (!navigator.onLine || !chatIsVisible() || !connectionIsDown()) return;
      const target = new URL(location.href);
      target.searchParams.set("reconnect", String(Date.now()));
      location.replace(target.href);
    }, delay);
  }

  window.addEventListener("online", () => guardedReload(1500));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") guardedReload(2000);
  });
  setTimeout(() => guardedReload(0), 20000);

  showSessionResetNotice();
})();

(() => {
  "use strict";
  if (window.__RIVO_ROOM_RADIO__ || document.querySelector('script[src*="room-radio.js"]')) return;
  const src = "./room-radio.js?v=1452";
  if (document.readyState === "loading") {
    document.write(`<script src="${src}"><\/script>`);
  } else {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }
})();
(() => {
  "use strict";

  const GUEST_SESSION_KEY = "rivo_guest_session_v1";
  const GUEST_DEVICE_KEY = "rivo_guest_device_v1";
  const LAST_GUEST_UID_KEY = "rivo_last_guest_uid_v1";
  const PROFILE_KEY = "rivo_group_profile_v1";
  const GUEST_REQUEST_TIMEOUT_MS = 10000;
  const auth = window.RivoGoogleAuth;
  if (!auth) return;

  const original = {
    loadSession: auth.loadSession?.bind(auth),
    clearSession: auth.clearSession?.bind(auth),
    renderButton: auth.renderButton?.bind(auth)
  };

  let guestSuccess = null;
  let guestError = null;
  let activating = false;
  let selectedGuestAvatar = "lina";

  function randomDeviceId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function getDeviceId() {
    let id = localStorage.getItem(GUEST_DEVICE_KEY) || "";
    if (id.length < 8) {
      id = randomDeviceId();
      localStorage.setItem(GUEST_DEVICE_KEY, id);
    }
    return id;
  }

  function loadGuestSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(GUEST_SESSION_KEY) || "null");
      if (!session?.sessionToken || !session?.googleUid || session.isGuest !== true) return null;
      if (Number(session.expiresAt || 0) <= Date.now() + 60_000) {
        sessionStorage.removeItem(GUEST_SESSION_KEY);
        return null;
      }
      localStorage.setItem(LAST_GUEST_UID_KEY, session.googleUid);
      return session;
    } catch {
      return null;
    }
  }

  function saveGuestSession(session) {
    const safe = { ...session, isGuest: true };
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(safe));
    if (safe.googleUid) localStorage.setItem(LAST_GUEST_UID_KEY, safe.googleUid);
    return safe;
  }

  function isGuestActive() {
    return Boolean(loadGuestSession());
  }

  function migrateGuestProfile(googleUid) {
    try {
      const guestUid = localStorage.getItem(LAST_GUEST_UID_KEY) || "";
      if (!guestUid || !googleUid || guestUid === googleUid) return;
      const oldKey = `${PROFILE_KEY}:${guestUid}`;
      const newKey = `${PROFILE_KEY}:${googleUid}`;
      if (localStorage.getItem(newKey)) return;
      const profile = JSON.parse(localStorage.getItem(oldKey) || "null");
      if (!profile) return;
      delete profile.googleUid;
      delete profile.googleEmail;
      delete profile.googleSessionToken;
      profile.clientId = `google:${googleUid}`;
      localStorage.setItem(newKey, JSON.stringify(profile));
    } catch {}
  }

  function setStatus(message, error = false) {
    const status = document.getElementById("googleLoginStatus");
    if (status) {
      status.textContent = message;
      status.classList.toggle("guest-access-error", error);
    }
  }

  function applyGuestLabels() {
    const active = isGuestActive();
    document.documentElement.classList.toggle("rivo-guest-active", active);
    if (!active) return;

    const name = document.getElementById("googleUserName");
    const email = document.getElementById("googleUserEmail");
    const picture = document.getElementById("googleUserPicture");
    const logout = document.getElementById("googleLogoutButton");
    if (name) name.textContent = "حساب ضيف";
    if (email) email.textContent = "مؤقت — سجّل بـ Google لحفظ حسابك";
    if (picture && !picture.getAttribute("src")) picture.src = "./icons/icon-192.png";
    if (logout) logout.textContent = "حفظ الحساب بـ Google";
  }

  function injectStyles() {
    if (document.getElementById("rivoGuestAccessStyles")) return;
    const style = document.createElement("style");
    style.id = "rivoGuestAccessStyles";
    style.textContent = `
      .guest-access-divider{display:flex;align-items:center;gap:10px;margin:13px 0;color:#98a5c4;font-size:11px}
      .guest-access-divider::before,.guest-access-divider::after{content:"";height:1px;flex:1;background:rgba(255,255,255,.11)}
      .guest-access-button{width:100%;border:1px solid rgba(118,135,255,.48);border-radius:16px;padding:13px 16px;cursor:pointer;font-weight:850;background:linear-gradient(135deg,rgba(118,135,255,.20),rgba(182,108,255,.14));color:#f5f7ff;display:flex;align-items:center;justify-content:center;gap:9px;transition:.18s}
      .guest-access-button:hover{transform:translateY(-1px);border-color:rgba(145,160,255,.82);background:linear-gradient(135deg,rgba(118,135,255,.30),rgba(182,108,255,.22))}
      .guest-access-button:disabled{opacity:.55;cursor:wait;transform:none}
      .guest-access-note{display:block;margin-top:8px;text-align:center;color:#98a5c4;font-size:10px;line-height:1.6}
      .guest-access-error{color:#ff8295!important}
      html.rivo-guest-active #privateToggleButton,
      html.rivo-guest-active #privateNavButton,
      html.rivo-guest-active #profilePrivateButton{display:none!important}
      html.rivo-guest-active #myNameSide::after{content:" ضيف";display:inline-flex;margin-right:6px;padding:2px 6px;border-radius:8px;background:rgba(246,200,111,.16);color:#f6c86f;font-size:9px;font-weight:800}
      .rivo-guest-modal{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:18px;background:rgba(3,7,22,.76);backdrop-filter:blur(10px)}
      .rivo-guest-modal.hidden{display:none!important}
      .rivo-guest-sheet{width:min(510px,100%);max-height:min(760px,92vh);overflow:auto;border:1px solid rgba(143,157,255,.28);border-radius:26px;padding:22px;background:linear-gradient(155deg,#111a39,#0b1229);box-shadow:0 28px 90px rgba(0,0,0,.55);color:#f7f8ff;direction:rtl}
      .rivo-guest-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
      .rivo-guest-head h2{margin:0 0 5px;font-size:22px}.rivo-guest-head p{margin:0;color:#aab4d4;font-size:13px;line-height:1.65}
      .rivo-guest-close{border:0;background:rgba(255,255,255,.08);color:#fff;width:38px;height:38px;border-radius:12px;cursor:pointer;font-size:18px}
      .rivo-guest-label{display:grid;gap:8px;margin:14px 0}.rivo-guest-label span{font-weight:850;font-size:13px}
      .rivo-guest-label input{width:100%;box-sizing:border-box;border:1px solid rgba(143,157,255,.35);border-radius:14px;background:#0a1127;color:#fff;padding:13px 14px;outline:none;font:inherit}
      .rivo-guest-label input:focus{border-color:#8f9dff;box-shadow:0 0 0 3px rgba(143,157,255,.13)}
      .rivo-guest-avatars-title{display:block;margin:16px 0 9px;font-weight:850;font-size:13px}
      .rivo-guest-avatars{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
      .rivo-guest-avatar{position:relative;aspect-ratio:1;border:2px solid transparent;border-radius:18px;padding:3px;background:rgba(255,255,255,.06);cursor:pointer;overflow:hidden}
      .rivo-guest-avatar img{width:100%;height:100%;object-fit:cover;border-radius:14px;display:block}.rivo-guest-avatar.selected{border-color:#8f7bff;background:rgba(143,123,255,.18);box-shadow:0 0 0 3px rgba(143,123,255,.10)}
      .rivo-guest-actions{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:18px}.rivo-guest-start{border:0;border-radius:15px;padding:14px 18px;background:linear-gradient(135deg,#7e64ff,#a657eb);color:#fff;font-weight:900;cursor:pointer}.rivo-guest-start:disabled{opacity:.58;cursor:wait}.rivo-guest-cancel{border:1px solid rgba(255,255,255,.14);border-radius:15px;padding:12px 16px;background:transparent;color:#d7dcf1;cursor:pointer}
      .rivo-guest-inline-status{min-height:21px;margin:12px 0 0;color:#aeb8d7;font-size:12px}.rivo-guest-inline-status.error{color:#ff8799}
      .rivo-google-gate .rivo-guest-sheet{text-align:center;max-width:430px}.rivo-google-gate-icon{font-size:48px;margin:3px 0 10px}.rivo-google-gate h2{margin:0 0 8px}.rivo-google-gate p{color:#aeb8d7;line-height:1.7}.rivo-google-gate-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.rivo-google-gate-actions button{border-radius:14px;padding:13px 14px;font-weight:850;cursor:pointer}.rivo-google-now{border:0;background:linear-gradient(135deg,#6b7cff,#a45be9);color:#fff}.rivo-google-later{border:1px solid rgba(255,255,255,.14);background:transparent;color:#d9def1}
      @media(max-width:560px){.rivo-guest-avatars{grid-template-columns:repeat(4,minmax(0,1fr))}.rivo-guest-sheet{padding:18px;border-radius:21px}.rivo-guest-actions{grid-template-columns:1fr}.rivo-guest-cancel{order:2}}
    `;
    document.head.appendChild(style);
  }

  function charactersForGuest() {
    const list = Array.isArray(window.RIVO_CHARACTERS) ? window.RIVO_CHARACTERS : [];
    const usable = list.filter((item) => item && item.available !== false && !item.vipOnly).slice(0, 15);
    if (usable.length) return usable;
    return [{ id: "lina", name: "لينا", portraitSmall: "./characters/lina/portrait-small.webp", portrait: "./characters/lina/portrait.webp" }];
  }

  function ensureGuestSetupModal() {
    let modal = document.getElementById("rivoGuestSetupModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "rivoGuestSetupModal";
    modal.className = "rivo-guest-modal hidden";
    modal.innerHTML = `
      <section class="rivo-guest-sheet" role="dialog" aria-modal="true" aria-labelledby="rivoGuestTitle">
        <div class="rivo-guest-head"><div><h2 id="rivoGuestTitle">دخول سريع كضيف</h2><p>اختار اسماً مستعاراً وصورة، وبعدها تدخل الغرفة العامة مباشرة.</p></div><button class="rivo-guest-close" type="button" aria-label="إغلاق">✕</button></div>
        <label class="rivo-guest-label"><span>الاسم المستعار</span><input id="rivoGuestNickname" type="text" minlength="2" maxlength="24" placeholder="مثلاً: ابن بغداد" autocomplete="off"></label>
        <span class="rivo-guest-avatars-title">اختار صورتك</span>
        <div id="rivoGuestAvatars" class="rivo-guest-avatars"></div>
        <p id="rivoGuestInlineStatus" class="rivo-guest-inline-status"></p>
        <div class="rivo-guest-actions"><button id="rivoGuestStart" class="rivo-guest-start" type="button">دخول الدردشة</button><button class="rivo-guest-cancel" type="button">إلغاء</button></div>
      </section>`;
    document.body.appendChild(modal);
    const grid = modal.querySelector("#rivoGuestAvatars");
    const characters = charactersForGuest();
    selectedGuestAvatar = characters[0]?.id || "lina";
    for (const character of characters) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `rivo-guest-avatar${character.id === selectedGuestAvatar ? " selected" : ""}`;
      button.dataset.avatar = character.id;
      button.title = character.name || "صورة";
      const img = document.createElement("img");
      img.src = character.portraitSmall || character.portrait || "./characters/lina/portrait-small.webp";
      img.alt = character.name || "صورة الضيف";
      button.appendChild(img);
      button.addEventListener("click", () => {
        selectedGuestAvatar = character.id;
        grid.querySelectorAll(".rivo-guest-avatar").forEach((node) => node.classList.toggle("selected", node === button));
      });
      grid.appendChild(button);
    }
    const close = () => modal.classList.add("hidden");
    modal.querySelector(".rivo-guest-close").addEventListener("click", close);
    modal.querySelector(".rivo-guest-cancel").addEventListener("click", close);
    modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
    modal.querySelector("#rivoGuestStart").addEventListener("click", activateGuest);
    modal.querySelector("#rivoGuestNickname").addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); activateGuest(); }
    });
    return modal;
  }

  function openGuestSetup() {
    const modal = ensureGuestSetupModal();
    const status = modal.querySelector("#rivoGuestInlineStatus");
    status.textContent = "";
    status.classList.remove("error");
    modal.classList.remove("hidden");
    setTimeout(() => modal.querySelector("#rivoGuestNickname")?.focus(), 50);
  }

  function showGoogleGate() {
    let modal = document.getElementById("rivoGoogleGateModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "rivoGoogleGateModal";
      modal.className = "rivo-guest-modal rivo-google-gate hidden";
      modal.innerHTML = `
        <section class="rivo-guest-sheet" role="dialog" aria-modal="true">
          <div class="rivo-google-gate-icon">🎙️</div><h2>المايك يحتاج حساب Google</h2><p>الدخول كضيف مخصص للكتابة في الغرفة العامة. سجّل بحساب Google حتى تستخدم المايك وتحافظ على هويتك.</p>
          <div class="rivo-google-gate-actions"><button class="rivo-google-now" type="button">التسجيل بحساب Google</button><button class="rivo-google-later" type="button">لاحقاً</button></div>
        </section>`;
      document.body.appendChild(modal);
      modal.querySelector(".rivo-google-later").addEventListener("click", () => modal.classList.add("hidden"));
      modal.querySelector(".rivo-google-now").addEventListener("click", () => {
        sessionStorage.removeItem(GUEST_SESSION_KEY);
        document.documentElement.classList.remove("rivo-guest-active");
        location.reload();
      });
      modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.add("hidden"); });
    }
    modal.classList.remove("hidden");
  }

  function installGuestMicGate() {
    const block = (event) => {
      if (!isGuestActive()) return;
      const target = event.target?.closest?.("#voiceButton, #toggleLiveMic");
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showGoogleGate();
    };
    document.addEventListener("pointerdown", block, true);
    document.addEventListener("click", block, true);
  }

  function injectGuestButton() {
    injectStyles();
    const signedOut = document.getElementById("googleSignedOut");
    const googleButton = document.getElementById("googleSignInButton");
    if (!signedOut || !googleButton || document.getElementById("guestSignInButton")) return;

    const divider = document.createElement("div");
    divider.className = "guest-access-divider";
    divider.textContent = "أو";

    const button = document.createElement("button");
    button.id = "guestSignInButton";
    button.className = "guest-access-button";
    button.type = "button";
    button.innerHTML = "<span>👤</span><b>الدخول كضيف الآن</b>";

    const note = document.createElement("small");
    note.className = "guest-access-note";
    note.textContent = "دخول سريع للكتابة في الغرفة العامة. المايك والخاص وVIP تحتاج حساب Google.";

    googleButton.insertAdjacentElement("afterend", divider);
    divider.insertAdjacentElement("afterend", button);
    button.insertAdjacentElement("afterend", note);
    button.addEventListener("click", openGuestSetup);

    const copy = document.querySelector(".join-copy p");
    if (copy) copy.textContent = "سجّل بحساب Google لحفظ حسابك ومزاياك، أو ادخل كضيف بسرعة لتجربة الكتابة في الدردشة العامة.";
  }

  async function activateGuest() {
    if (activating) return;
    const modal = ensureGuestSetupModal();
    const input = modal.querySelector("#rivoGuestNickname");
    const status = modal.querySelector("#rivoGuestInlineStatus");
    const start = modal.querySelector("#rivoGuestStart");
    const nickname = String(input?.value || "").replace(/\s+/g, " ").trim().slice(0, 24);
    if (nickname.length < 2) {
      status.textContent = "اكتب اسماً مستعاراً من حرفين على الأقل.";
      status.classList.add("error");
      input?.focus();
      return;
    }

    activating = true;
    start.disabled = true;
    start.textContent = "جاري الدخول…";
    status.textContent = "جاري إنشاء جلسة الضيف…";
    status.classList.remove("error");
    setStatus("جاري إنشاء دخول ضيف آمن…");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GUEST_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        cache: "no-store",
        body: JSON.stringify({ deviceId: getDeviceId() }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `تعذر الدخول كضيف (${response.status}).`);
      const session = saveGuestSession(data);
      applyGuestLabels();
      guestSuccess?.(session);

      const mainNickname = document.getElementById("nicknameInput");
      if (mainNickname) mainNickname.value = nickname;
      const avatarButton = document.querySelector(`#avatarGrid [data-avatar="${CSS.escape(selectedGuestAvatar)}"]`);
      avatarButton?.click();
      modal.classList.add("hidden");
      setStatus("تم تجهيز حساب الضيف. جاري دخول الدردشة…");

      setTimeout(() => {
        applyGuestLabels();
        const form = document.getElementById("joinForm");
        if (form?.requestSubmit) form.requestSubmit();
        else document.getElementById("joinButton")?.click();
      }, 100);
    } catch (error) {
      const message = error?.name === "AbortError"
        ? "تأخر الخادم أكثر من 10 ثوانٍ. أعد المحاولة، وإذا تكرر الخطأ أرسل صورة شاشة."
        : (error?.message || "تعذر الدخول كضيف.");
      status.textContent = message;
      status.classList.add("error");
      setStatus(message, true);
      guestError?.(message);
    } finally {
      clearTimeout(timeout);
      activating = false;
      start.disabled = false;
      start.textContent = "دخول الدردشة";
    }
  }

  auth.loadSession = function () {
    const google = original.loadSession?.() || null;
    if (google) {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      return google;
    }
    const guest = loadGuestSession();
    if (guest) queueMicrotask(applyGuestLabels);
    return guest;
  };

  auth.clearSession = function () {
    const hadGuest = isGuestActive();
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    original.clearSession?.();
    document.documentElement.classList.remove("rivo-guest-active");
    if (hadGuest) setTimeout(() => location.reload(), 80);
  };

  auth.renderButton = function (container, onSuccess, onError) {
    guestSuccess = onSuccess;
    guestError = onError;
    injectGuestButton();
    return original.renderButton?.(
      container,
      (session) => {
        migrateGuestProfile(session?.googleUid || "");
        sessionStorage.removeItem(GUEST_SESSION_KEY);
        document.documentElement.classList.remove("rivo-guest-active");
        onSuccess?.(session);
      },
      onError
    );
  };

  injectGuestButton();
  applyGuestLabels();
  installGuestMicGate();
  const observer = new MutationObserver(() => applyGuestLabels());
  observer.observe(document.body, { childList: true, subtree: true });
})();
