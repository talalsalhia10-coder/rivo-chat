(() => {
  "use strict";

  const SESSION_KEY = "rivo_google_session_v1";
  const config = window.RIVO_GOOGLE_CONFIG || {};
  let configPromise = null;

  async function ensureConfig() {
    if (configured()) return config;
    if (!configPromise) {
      configPromise = fetch("/api/public-config", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : {})
        .then((data) => {
          if (data.googleClientId) config.clientId = data.googleClientId;
          if (typeof data.requiredOnCloud === "boolean") config.requiredOnCloud = data.requiredOnCloud;
          return config;
        })
        .catch(() => config);
    }
    return configPromise;
  }

  function configured() {
    return Boolean(config.clientId) && !String(config.clientId).startsWith("PUT_YOUR_");
  }

  function loadSession() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!session?.sessionToken || !session?.googleUid) return null;
      if (Number(session.expiresAt || 0) <= Date.now() + 60_000) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
  }

  async function exchangeCredential(credential) {
    const response = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      cache: "no-store",
      body: JSON.stringify({ credential })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "تعذر التحقق من حساب Google.");
    saveSession(data);
    return data;
  }

  function renderButton(container, onSuccess, onError) {
    if (!configured()) {
      ensureConfig().then(() => {
        if (configured()) renderButton(container, onSuccess, onError);
        else onError?.("أضف GOOGLE_CLIENT_ID من إعدادات Worker ثم أعد تحميل الصفحة.");
      });
      return true;
    }

    if (!window.google?.accounts?.id) {
      onError?.("تعذر تحميل تسجيل Google. تحقق من الإنترنت ثم أعد المحاولة.");
      return false;
    }

    window.google.accounts.id.initialize({
      client_id: config.clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: async (response) => {
        try {
          if (!response?.credential) throw new Error("لم يصل رمز تسجيل Google.");
          const session = await exchangeCredential(response.credential);
          onSuccess?.(session);
        } catch (error) {
          onError?.(error?.message || "فشل تسجيل Google.");
        }
      }
    });

    container.textContent = "";
    window.google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      logo_alignment: "left",
      width: Math.min(360, Math.max(240, container.clientWidth || 320))
    });
    return true;
  }

  window.RivoGoogleAuth = {
    config,
    configured,
    loadSession,
    clearSession,
    renderButton,
    ensureConfig
  };
})();
