window.RIVO_ADMIN_CONFIG = {
  room: "lobby"
};

(() => {
  "use strict";

  const RELEASE = "1453-admin-connection-recovery";
  const NativeWebSocket = window.WebSocket;

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
