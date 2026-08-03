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
    if (name) name.textContent = "الدخول كضيف";
    if (email) email.textContent = "حساب مؤقت — سجّل بـ Google لحفظ إعداداتك";
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
    `;
    document.head.appendChild(style);
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
    note.textContent = "دخول سريع للدردشة العامة. الخاص وVIP يحتاجان حساب Google.";

    googleButton.insertAdjacentElement("afterend", divider);
    divider.insertAdjacentElement("afterend", button);
    button.insertAdjacentElement("afterend", note);
    button.addEventListener("click", activateGuest);

    const copy = document.querySelector(".join-copy p");
    if (copy) copy.textContent = "سجّل بحساب Google لحفظ حسابك ومزاياك، أو ادخل كضيف بسرعة لتجربة الدردشة العامة.";
  }

  async function activateGuest() {
    if (activating) return;
    activating = true;
    const button = document.getElementById("guestSignInButton");
    if (button) {
      button.disabled = true;
      button.querySelector("b").textContent = "جاري دخول الضيف…";
    }
    setStatus("جاري إنشاء دخول ضيف آمن…");

    try {
      const response = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        cache: "no-store",
        body: JSON.stringify({ deviceId: getDeviceId() })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر الدخول كضيف.");
      const session = saveGuestSession(data);
      applyGuestLabels();
      guestSuccess?.(session);
      setTimeout(() => {
        applyGuestLabels();
        const nickname = document.getElementById("nicknameInput");
        nickname?.focus();
      }, 30);
    } catch (error) {
      const message = error?.message || "تعذر الدخول كضيف.";
      setStatus(message, true);
      guestError?.(message);
    } finally {
      activating = false;
      if (button) {
        button.disabled = false;
        button.querySelector("b").textContent = "الدخول كضيف الآن";
      }
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
  const observer = new MutationObserver(() => applyGuestLabels());
  observer.observe(document.body, { childList: true, subtree: true });
})();
