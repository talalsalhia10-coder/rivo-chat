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

  const RELEASE = "1435-connection-radio-bridge";
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

      if (isRivoRoomSocket(this.url)) {
        window.__RIVO_ACTIVE_ROOM_SOCKET__ = this;
      }

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
        if (isRivoRoomSocket(this.url)) {
          window.__RIVO_ACTIVE_ROOM_SOCKET__ = this;
          window.dispatchEvent(new CustomEvent("rivo:room-socket-ready", {
            detail: { socket: this }
          }));
        }
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
        if (window.__RIVO_ACTIVE_ROOM_SOCKET__ === this) {
          window.__RIVO_ACTIVE_ROOM_SOCKET__ = null;
        }
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
      if (isRivoRoomSocket(this.url)) {
        window.__RIVO_ACTIVE_ROOM_SOCKET__ = this;
      }
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
  const src = "./room-radio.js?v=1451";
  if (document.readyState === "loading") {
    document.write(`<script src="${src}"><\/script>`);
  } else {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  }
})();
