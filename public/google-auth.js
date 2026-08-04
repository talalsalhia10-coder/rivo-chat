(() => {
  "use strict";

  const SESSION_KEY = "rivo_google_session_v1";
  const config = window.RIVO_GOOGLE_CONFIG || {};
  const GOOGLE_READY_TIMEOUT_MS = 15000;
  const SERVER_TIMEOUT_MS = 15000;

  let configPromise = null;
  let initialized = false;
  let activeCallbacks = { onSuccess: null, onError: null, onProgress: null };

  function reportProgress(message) {
    try { activeCallbacks.onProgress?.(message); } catch {}
  }

  function reportError(message) {
    try { activeCallbacks.onError?.(message || "فشل تسجيل Google."); } catch {}
  }

  async function ensureConfig() {
    if (configured()) return config;
    if (!configPromise) {
      configPromise = fetch("/api/public-config", {
        cache: "no-store",
        credentials: "same-origin"
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "تعذر تحميل إعداد Google.");
          if (data.googleClientId) config.clientId = String(data.googleClientId).trim();
          if (typeof data.requiredOnCloud === "boolean") config.requiredOnCloud = data.requiredOnCloud;
          return config;
        })
        .catch((error) => {
          console.error("Rivo Google config failed", error);
          return config;
        });
    }
    return configPromise;
  }

  function configured() {
    const clientId = String(config.clientId || "").trim();
    return Boolean(clientId) && !clientId.startsWith("PUT_YOUR_");
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
    reportProgress("تم اختيار الحساب، جاري التحقق الآمن…");

    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ credential }),
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `تعذر التحقق من حساب Google (${response.status}).`);
      if (!data.sessionToken || !data.googleUid) throw new Error("لم يُرجع الخادم جلسة Google صالحة.");
      saveSession(data);
      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("تأخر التحقق من Google. أعد المحاولة بعد لحظات.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function handleCredentialResponse(response) {
    try {
      if (!response?.credential) throw new Error("لم يصل رمز تسجيل Google.");
      const session = await exchangeCredential(response.credential);
      reportProgress("تم تسجيل الدخول بنجاح، جاري فتح الدردشة…");
      await activeCallbacks.onSuccess?.(session);
    } catch (error) {
      console.error("Rivo Google sign-in failed", error);
      reportError(error?.message || "فشل تسجيل Google.");
    }
  }

  function initializeGoogle() {
    if (initialized) return true;
    if (!window.google?.accounts?.id) return false;

    window.google.accounts.id.initialize({
      client_id: String(config.clientId || "").trim(),
      callback: handleCredentialResponse,
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: false,
      context: "signin",
      use_fedcm_for_button: true,
      button_auto_select: false
    });
    initialized = true;
    return true;
  }

  async function waitForGoogleLibrary() {
    const startedAt = Date.now();
    while (!window.google?.accounts?.id) {
      if (Date.now() - startedAt > GOOGLE_READY_TIMEOUT_MS) {
        throw new Error("تعذر تحميل زر Google. حدّث الصفحة ثم أعد المحاولة.");
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  async function renderButton(container, onSuccess, onError, onProgress) {
    activeCallbacks = { onSuccess, onError, onProgress };
    if (!container) {
      reportError("مكان زر Google غير موجود في الصفحة.");
      return false;
    }

    reportProgress("جاري تجهيز تسجيل Google…");
    await ensureConfig();
    if (!configured()) {
      reportError("إعداد GOOGLE_CLIENT_ID غير موجود في Cloudflare.");
      return false;
    }

    try {
      await waitForGoogleLibrary();
      if (!initializeGoogle()) throw new Error("تعذر تشغيل مكتبة Google.");

      container.replaceChildren();
      container.style.pointerEvents = "auto";
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        logo_alignment: "left",
        locale: "ar",
        width: Math.min(380, Math.max(260, container.clientWidth || 340)),
        click_listener: () => reportProgress("تم الضغط على Google، اختر الحساب للمتابعة…")
      });

      const iframe = container.querySelector("iframe");
      if (iframe) {
        iframe.style.pointerEvents = "auto";
        iframe.style.position = "relative";
        iframe.style.zIndex = "2";
      }
      reportProgress("اضغط زر Google ثم اختر حسابك");
      return true;
    } catch (error) {
      console.error("Rivo Google button render failed", error);
      reportError(error?.message || "تعذر تجهيز تسجيل Google.");
      return false;
    }
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
