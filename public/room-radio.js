(() => {
  "use strict";
  const RELEASE = "1451-room-radio-socket-bridge";
  if (window.__RIVO_ROOM_RADIO__ === RELEASE) return;
  window.__RIVO_ROOM_RADIO__ = RELEASE;

  const UNLOCK_KEY = "rivo_room_radio_unlocked_v1";
  const MUTED_KEY = "rivo_room_radio_muted_v1";
  const VOLUME_KEY = "rivo_room_radio_volume_v1";

  let roomSocket = null;
  let self = { clientId: "", nickname: "", role: "user", isVip: false };
  let radioState = null;
  let serverClockOffset = 0;
  let unlocked = localStorage.getItem(UNLOCK_KEY) === "1";
  let muted = localStorage.getItem(MUTED_KEY) === "1";
  let volume = Math.max(0, Math.min(1, Number(localStorage.getItem(VOLUME_KEY) || 0.75)));
  let remoteMicActive = false;
  let localMicActive = false;
  let currentSourceKey = "";
  let youtubeApiPromise = null;
  let youtubePlayer = null;
  let youtubeReady = false;
  let youtubeDesired = null;
  let syncTimer = null;
  let ui = null;

  function isRoomSocket(url) {
    try {
      const parsed = new URL(String(url), location.href);
      return parsed.origin === location.origin && /\/api\/rooms\/[^/]+\/ws$/.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  function installSocketCapture() {
    const NativeWebSocket = window.WebSocket;
    if (!NativeWebSocket || NativeWebSocket.__rivoRadioProxy) return;

    const proxy = new Proxy(NativeWebSocket, {
      construct(Target, args) {
        const socket = Reflect.construct(Target, args, Target);
        if (isRoomSocket(args[0])) {
          roomSocket = socket;
          socket.addEventListener("open", () => {
            roomSocket = socket;
            window.__RIVO_ACTIVE_ROOM_SOCKET__ = socket;
            setTimeout(requestState, 350);
          });
          socket.addEventListener("close", () => {
            if (roomSocket === socket) roomSocket = null;
            if (window.__RIVO_ACTIVE_ROOM_SOCKET__ === socket) {
              window.__RIVO_ACTIVE_ROOM_SOCKET__ = null;
            }
            stopLocalPlayback(false);
          });
        }
        return socket;
      }
    });

    Object.defineProperty(proxy, "__rivoRadioProxy", { value: true });
    window.WebSocket = proxy;
  }

  function getActiveRoomSocket() {
    const shared = window.__RIVO_ACTIVE_ROOM_SOCKET__;
    if (shared && shared.readyState === WebSocket.OPEN) {
      roomSocket = shared;
      return shared;
    }
    if (roomSocket && roomSocket.readyState === WebSocket.OPEN) return roomSocket;
    return null;
  }

  function send(payload) {
    try {
      const socket = getActiveRoomSocket();
      if (socket) {
        socket.send(JSON.stringify(payload));
        return true;
      }
    } catch (error) {
      console.warn("Rivo room radio send failed:", error);
    }
    toast("تعذر ربط زر الإذاعة باتصال الغرفة. أغلق الدردشة وافتحها مرة واحدة.");
    return false;
  }

  function requestState() {
    send({ type: "room-radio-state-request" });
  }

  function canControl() {
    return self.role === "owner" || self.role === "moderator" || self.isVip;
  }

  function controllerRank() {
    if (self.role === "owner") return 3;
    if (self.role === "moderator") return 2;
    if (self.isVip) return 1;
    return 0;
  }

  function canControlCurrent() {
    if (!radioState?.active) return canControl();
    if (radioState.controllerClientId === self.clientId) return canControl();
    const rank = controllerRank();
    if (rank === 3) return true;
    return rank === 2 && Number(radioState.controllerRank || 0) <= 1;
  }

  function clean(value, max = 120) {
    return String(value || "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
  }

  function parseYouTubeId(value) {
    const raw = String(value || "").trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
    try {
      const url = new URL(raw);
      if (url.hostname === "youtu.be") return clean(url.pathname.split("/").filter(Boolean)[0], 20);
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") return clean(url.searchParams.get("v"), 20);
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0])) return clean(parts[1], 20);
      }
    } catch {}
    return "";
  }

  function expectedPosition(state = radioState) {
    if (!state?.active) return 0;
    const base = Math.max(0, Number(state.offsetSeconds || 0));
    if (state.paused) return base;
    const serverNow = Date.now() + serverClockOffset;
    return Math.max(0, base + Math.max(0, (serverNow - Number(state.startedAt || serverNow)) / 1000));
  }

  function sourceKey(state = radioState) {
    if (!state?.active) return "";
    return state.sourceType === "youtube" ? `youtube:${state.youtubeId}` : `audio:${state.audioUrl}`;
  }

  function roleText(role) {
    if (role === "owner") return "الإدارة";
    if (role === "moderator") return "المراقب";
    return "VIP";
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds || 0)));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function toast(message) {
    const banner = document.getElementById("errorBanner");
    if (banner) {
      banner.textContent = message;
      banner.classList.remove("hidden");
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => banner.classList.add("hidden"), 4500);
      return;
    }
    console.warn(message);
  }

  function injectStyles() {
    if (document.getElementById("rivoRoomRadioStyles")) return;
    const style = document.createElement("style");
    style.id = "rivoRoomRadioStyles";
    style.textContent = `
      .rivo-radio-button{position:relative}.rivo-radio-button.active{box-shadow:0 0 0 1px rgba(111,77,255,.45),0 0 18px rgba(111,77,255,.25)}
      .rivo-radio-bar{margin:10px 14px 0;padding:10px 12px;border:1px solid rgba(132,101,255,.25);border-radius:16px;background:linear-gradient(135deg,rgba(30,24,57,.94),rgba(20,17,38,.94));display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;box-shadow:0 10px 28px rgba(0,0,0,.18)}
      .rivo-radio-bar.hidden{display:none!important}.rivo-radio-cover{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-size:25px;background:rgba(128,92,255,.16);border:1px solid rgba(149,120,255,.25)}
      .rivo-radio-copy{min-width:0}.rivo-radio-title{display:flex;align-items:center;gap:7px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rivo-radio-meta{display:flex;gap:7px;align-items:center;color:#bdb4d4;font-size:12px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rivo-radio-actions{display:flex;align-items:center;gap:6px}.rivo-radio-icon-btn{width:36px;height:36px;border:0;border-radius:11px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:17px}.rivo-radio-icon-btn:hover{background:rgba(139,105,255,.24)}
      .rivo-radio-unlock{border:0;border-radius:10px;padding:8px 11px;background:#7b57ff;color:#fff;font-weight:800;cursor:pointer}.rivo-radio-unlock.hidden{display:none}
      .rivo-radio-modal{position:fixed;inset:0;z-index:10060;display:grid;place-items:center;padding:18px}.rivo-radio-modal.hidden{visibility:hidden;opacity:0;pointer-events:none}.rivo-radio-backdrop{position:absolute;inset:0;background:rgba(4,3,11,.72);backdrop-filter:blur(6px)}
      .rivo-radio-sheet{position:relative;width:min(520px,100%);max-height:min(760px,92vh);overflow:auto;border:1px solid rgba(160,129,255,.28);border-radius:22px;padding:20px;background:linear-gradient(145deg,#1e1834,#100d20);box-shadow:0 30px 90px rgba(0,0,0,.55);color:#fff}
      .rivo-radio-sheet h2{margin:0 0 4px}.rivo-radio-sheet>p{margin:0 0 16px;color:#bfb6d5}.rivo-radio-close{position:absolute;left:14px;top:14px;width:35px;height:35px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
      .rivo-radio-form{display:grid;gap:11px}.rivo-radio-form label{display:grid;gap:6px;color:#d8d1e8;font-size:13px;font-weight:700}.rivo-radio-form input,.rivo-radio-form select{width:100%;box-sizing:border-box;border:1px solid rgba(164,137,255,.28);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;padding:11px 12px;outline:none}.rivo-radio-form select option{color:#111}
      .rivo-radio-start{border:0;border-radius:13px;padding:12px;background:linear-gradient(135deg,#805cff,#a047ff);color:#fff;font-weight:900;cursor:pointer}.rivo-radio-current{margin-top:15px;padding:12px;border-radius:15px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08)}
      .rivo-radio-player-box{margin-top:10px;display:grid;place-items:center}.rivo-radio-youtube-wrap{width:min(100%,320px);aspect-ratio:16/9;overflow:hidden;border-radius:13px;background:#09070f}.rivo-radio-youtube-wrap iframe{width:100%!important;height:100%!important}.rivo-radio-audio{width:100%;margin-top:8px}.rivo-radio-hidden{display:none!important}
      .rivo-radio-control-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.rivo-radio-control-row button{flex:1 1 92px;border:0;border-radius:11px;padding:10px;background:rgba(255,255,255,.09);color:#fff;font-weight:800;cursor:pointer}.rivo-radio-control-row button.danger{background:rgba(211,62,84,.22);color:#ffb5c0}
      .rivo-radio-volume{width:92px;accent-color:#8b67ff}.rivo-radio-help{font-size:12px;color:#aaa0c2;line-height:1.6}.rivo-radio-permission{padding:9px 11px;border-radius:11px;background:rgba(96,210,158,.1);color:#9de8c5;font-size:12px}
      @media(max-width:720px){.rivo-radio-bar{margin:8px 8px 0;grid-template-columns:auto minmax(0,1fr)}.rivo-radio-actions{grid-column:1/-1;justify-content:flex-end}.rivo-radio-volume{width:78px}.rivo-radio-button b{display:none}.rivo-radio-sheet{padding:18px 14px}}
    `;
    document.head.appendChild(style);
  }

  function createUi() {
    if (ui || !document.body) return;
    injectStyles();

    const headerActions = document.querySelector(".conversation-header .header-actions");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "soft-button rivo-radio-button hidden";
    button.innerHTML = "<span>🎧</span><b>إذاعة الغرفة</b>";
    button.title = "تشغيل القرآن أو الأغاني في الغرفة";
    headerActions?.insertBefore(button, document.getElementById("roomSoundButton") || null);

    const bar = document.createElement("section");
    bar.className = "rivo-radio-bar hidden";
    bar.innerHTML = `
      <div class="rivo-radio-cover">🎧</div>
      <div class="rivo-radio-copy"><div class="rivo-radio-title">إذاعة الغرفة</div><div class="rivo-radio-meta">لا يوجد مقطع يعمل</div></div>
      <div class="rivo-radio-actions">
        <button class="rivo-radio-unlock hidden" type="button">تشغيل الصوت 🔊</button>
        <button class="rivo-radio-icon-btn rivo-radio-mute" type="button" title="كتم أو تشغيل الصوت">🔊</button>
        <input class="rivo-radio-volume" type="range" min="0" max="1" step="0.05" aria-label="مستوى صوت الإذاعة">
        <button class="rivo-radio-icon-btn rivo-radio-open" type="button" title="تفاصيل الإذاعة">⋮</button>
      </div>`;
    const presence = document.getElementById("presenceStrip");
    presence?.parentNode?.insertBefore(bar, presence);

    const modal = document.createElement("div");
    modal.className = "rivo-radio-modal hidden";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="rivo-radio-backdrop"></div>
      <section class="rivo-radio-sheet" role="dialog" aria-modal="true" aria-labelledby="rivoRadioTitle">
        <button class="rivo-radio-close" type="button" aria-label="إغلاق">✕</button>
        <h2 id="rivoRadioTitle">إذاعة الغرفة 🎧</h2>
        <p>تشغيل متزامن للقرآن أو الأغاني لجميع الموجودين.</p>
        <div class="rivo-radio-permission"></div>
        <form class="rivo-radio-form">
          <label>نوع المحتوى<select name="contentKind"><option value="quran">قرآن كريم</option><option value="music">أغنية أو صوت</option></select></label>
          <label>المصدر<select name="sourceType"><option value="youtube">رابط YouTube</option><option value="audio">رابط صوت مباشر MP3 / AAC</option></select></label>
          <label>الرابط<input name="sourceUrl" type="url" inputmode="url" placeholder="الصق رابط YouTube أو رابط الملف المباشر" required></label>
          <label>اسم المقطع<input name="title" maxlength="120" placeholder="مثلاً: سورة الرحمن أو اسم الأغنية"></label>
          <label>اسم القارئ أو الفنان<input name="subtitle" maxlength="100" placeholder="اختياري"></label>
          <div class="rivo-radio-help">روابط الصوت المباشر يجب أن تكون HTTPS وتنتهي بـ MP3 أو M4A أو AAC أو OGG أو OPUS أو WAV. لا يتم سحب الصوت من YouTube أو تحويله؛ يستخدم المشغّل الرسمي.</div>
          <button class="rivo-radio-start" type="submit">تشغيل للجميع</button>
        </form>
        <div class="rivo-radio-current">
          <strong class="rivo-radio-current-title">لا يوجد مقطع يعمل</strong>
          <div class="rivo-radio-player-box"><div class="rivo-radio-youtube-wrap rivo-radio-hidden"><div id="rivoRadioYoutube"></div></div><audio class="rivo-radio-audio rivo-radio-hidden" controls preload="auto"></audio></div>
          <div class="rivo-radio-control-row">
            <button type="button" data-radio-action="back">−10 ثوانٍ</button>
            <button type="button" data-radio-action="toggle">إيقاف مؤقت</button>
            <button type="button" data-radio-action="forward">+10 ثوانٍ</button>
            <button class="danger" type="button" data-radio-action="stop">إيقاف للجميع</button>
          </div>
        </div>
      </section>`;
    document.body.appendChild(modal);

    ui = {
      button, bar, modal,
      cover: bar.querySelector(".rivo-radio-cover"),
      title: bar.querySelector(".rivo-radio-title"),
      meta: bar.querySelector(".rivo-radio-meta"),
      unlock: bar.querySelector(".rivo-radio-unlock"),
      mute: bar.querySelector(".rivo-radio-mute"),
      volume: bar.querySelector(".rivo-radio-volume"),
      open: bar.querySelector(".rivo-radio-open"),
      close: modal.querySelector(".rivo-radio-close"),
      backdrop: modal.querySelector(".rivo-radio-backdrop"),
      permission: modal.querySelector(".rivo-radio-permission"),
      form: modal.querySelector(".rivo-radio-form"),
      sourceType: modal.querySelector('[name="sourceType"]'),
      sourceUrl: modal.querySelector('[name="sourceUrl"]'),
      titleInput: modal.querySelector('[name="title"]'),
      subtitleInput: modal.querySelector('[name="subtitle"]'),
      contentKind: modal.querySelector('[name="contentKind"]'),
      currentTitle: modal.querySelector(".rivo-radio-current-title"),
      youtubeBox: modal.querySelector(".rivo-radio-youtube-wrap"),
      youtubeHost: modal.querySelector("#rivoRadioYoutube"),
      audio: modal.querySelector("audio"),
      controlRow: modal.querySelector(".rivo-radio-control-row"),
      toggle: modal.querySelector('[data-radio-action="toggle"]')
    };

    ui.volume.value = String(volume);
    ui.button.addEventListener("click", openModal);
    ui.open.addEventListener("click", openModal);
    ui.close.addEventListener("click", closeModal);
    ui.backdrop.addEventListener("click", closeModal);
    ui.unlock.addEventListener("click", unlockAudio);
    ui.mute.addEventListener("click", toggleMute);
    ui.volume.addEventListener("input", () => {
      volume = Math.max(0, Math.min(1, Number(ui.volume.value || 0)));
      localStorage.setItem(VOLUME_KEY, String(volume));
      applyVolume();
    });
    ui.form.addEventListener("submit", startRadioFromForm);
    ui.controlRow.addEventListener("click", handleControlClick);
    ui.audio.addEventListener("ended", () => {
      if (radioState?.controllerClientId === self.clientId) sendAction("stop");
    });
    ui.audio.addEventListener("error", () => toast("تعذر تشغيل رابط الصوت المباشر على هذا الجهاز."));

    const voiceButton = document.getElementById("voiceButton");
    if (voiceButton) {
      new MutationObserver(() => {
        localMicActive = voiceButton.classList.contains("voice-live");
        applyVolume();
      }).observe(voiceButton, { attributes: true, attributeFilter: ["class"] });
    }

    document.addEventListener("pointerdown", () => {
      if (radioState?.active && !unlocked) unlockAudio();
    }, { once: true, capture: true });

    refreshUi();
  }

  function openModal() {
    if (!ui) return;
    ui.modal.classList.remove("hidden");
    ui.modal.setAttribute("aria-hidden", "false");
    refreshUi();
  }

  function closeModal() {
    if (!ui) return;
    ui.modal.classList.add("hidden");
    ui.modal.setAttribute("aria-hidden", "true");
  }

  function unlockAudio() {
    unlocked = true;
    localStorage.setItem(UNLOCK_KEY, "1");
    applyStateToPlayer(true);
    refreshUi();
  }

  function toggleMute() {
    muted = !muted;
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
    applyVolume();
    refreshUi();
  }

  function effectiveVolume() {
    if (muted) return 0;
    return Math.max(0, Math.min(1, volume * ((remoteMicActive || localMicActive) ? 0.22 : 1)));
  }

  function applyVolume() {
    const value = effectiveVolume();
    if (ui?.audio) {
      ui.audio.muted = value === 0;
      ui.audio.volume = value;
    }
    try {
      if (youtubeReady && youtubePlayer) {
        youtubePlayer.setVolume(Math.round(value * 100));
        if (value === 0) youtubePlayer.mute();
        else youtubePlayer.unMute();
      }
    } catch {}
  }

  function refreshUi() {
    if (!ui) return;
    const active = Boolean(radioState?.active);
    const privileged = canControl();

    ui.button.classList.toggle("hidden", !privileged);
    ui.button.classList.toggle("active", active);
    ui.bar.classList.toggle("hidden", !active);
    ui.unlock.classList.toggle("hidden", !active || unlocked);
    ui.mute.textContent = muted || effectiveVolume() === 0 ? "🔇" : "🔊";
    ui.permission.textContent = privileged
      ? `صلاحيتك: ${self.role === "owner" ? "الإدارة 👑" : self.role === "moderator" ? "المراقب ⭐" : "VIP 💎"}.`
      : "يمكنك الاستماع والكتم وتغيير مستوى الصوت. التشغيل خاص بالإدارة والمراقبين وVIP.";
    ui.form.classList.toggle("rivo-radio-hidden", !privileged);
    ui.controlRow.classList.toggle("rivo-radio-hidden", !active || !canControlCurrent());

    if (!active) {
      ui.cover.textContent = "🎧";
      ui.title.textContent = "إذاعة الغرفة";
      ui.meta.textContent = "لا يوجد مقطع يعمل";
      ui.currentTitle.textContent = "لا يوجد مقطع يعمل";
      ui.toggle.textContent = "إيقاف مؤقت";
      return;
    }

    const icon = radioState.contentKind === "quran" ? "📖" : "🎵";
    const subtitle = radioState.subtitle ? ` — ${radioState.subtitle}` : "";
    ui.cover.textContent = icon;
    ui.title.textContent = `${radioState.title || "مقطع صوتي"}${subtitle}`;
    ui.meta.textContent = `${radioState.paused ? "متوقف مؤقتاً" : formatTime(expectedPosition())} • شغّله ${radioState.controllerName || roleText(radioState.controllerRole)} (${roleText(radioState.controllerRole)})`;
    ui.currentTitle.textContent = `${icon} ${radioState.title || "مقطع صوتي"}${subtitle}`;
    ui.toggle.textContent = radioState.paused ? "متابعة التشغيل" : "إيقاف مؤقت";
  }

  async function startRadioFromForm(event) {
    event.preventDefault();
    if (!canControl()) return;

    const sourceType = ui.sourceType.value;
    const sourceUrl = ui.sourceUrl.value.trim();
    const payload = {
      type: "room-radio-play",
      sourceType,
      contentKind: ui.contentKind.value,
      title: clean(ui.titleInput.value, 120),
      subtitle: clean(ui.subtitleInput.value, 100)
    };

    if (sourceType === "youtube") {
      const youtubeId = parseYouTubeId(sourceUrl);
      if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
        toast("رابط YouTube غير صحيح.");
        return;
      }
      payload.youtubeId = youtubeId;
    } else {
      let parsed;
      try { parsed = new URL(sourceUrl); } catch {}
      if (!parsed || parsed.protocol !== "https:" || !/\.(?:mp3|m4a|aac|ogg|opus|wav)(?:$|[?#])/i.test(parsed.href)) {
        toast("استخدم رابط HTTPS مباشر لملف MP3 أو AAC أو M4A أو OGG أو OPUS أو WAV.");
        return;
      }
      payload.audioUrl = parsed.href;
    }

    if (send(payload)) {
      unlocked = true;
      localStorage.setItem(UNLOCK_KEY, "1");
      ui.sourceUrl.value = "";
    }
  }

  function handleControlClick(event) {
    const button = event.target.closest("[data-radio-action]");
    if (!button || !radioState?.active || !canControlCurrent()) return;
    const action = button.dataset.radioAction;
    if (action === "toggle") sendAction(radioState.paused ? "resume" : "pause");
    else if (action === "back") sendAction("seek", Math.max(0, expectedPosition() - 10));
    else if (action === "forward") sendAction("seek", expectedPosition() + 10);
    else if (action === "stop" && confirm("إيقاف صوت الغرفة عن جميع الزوار؟")) sendAction("stop");
  }

  function sendAction(action, positionSeconds) {
    send({
      type: "room-radio-action",
      action,
      stateId: radioState?.id || "",
      positionSeconds: Number(positionSeconds || 0)
    });
  }

  function loadYouTubeApi() {
    if (youtubeApiPromise) return youtubeApiPromise;
    youtubeApiPromise = new Promise((resolve, reject) => {
      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try { previous?.(); } catch {}
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("YouTube API failed"));
      document.head.appendChild(script);
      setTimeout(() => {
        if (window.YT?.Player) resolve(window.YT);
      }, 3000);
    });
    return youtubeApiPromise;
  }

  async function ensureYoutubePlayer() {
    if (youtubePlayer) return youtubePlayer;
    if (!ui?.youtubeHost) return null;
    try {
      const YT = await loadYouTubeApi();
      youtubePlayer = new YT.Player(ui.youtubeHost, {
        width: 320,
        height: 180,
        playerVars: {
          playsinline: 1,
          rel: 0,
          controls: 1,
          origin: location.origin
        },
        events: {
          onReady: () => {
            youtubeReady = true;
            applyVolume();
            if (youtubeDesired) applyYoutubeDesired();
          },
          onStateChange: (event) => {
            if (event.data === window.YT?.PlayerState?.ENDED && radioState?.controllerClientId === self.clientId) {
              sendAction("stop");
            }
          },
          onError: () => toast("تعذر تشغيل هذا الفيديو من YouTube داخل الموقع.")
        }
      });
      return youtubePlayer;
    } catch {
      toast("تعذر تحميل مشغّل YouTube الآن.");
      return null;
    }
  }

  function applyYoutubeDesired() {
    if (!youtubeReady || !youtubePlayer || !youtubeDesired) return;
    const desired = youtubeDesired;
    try {
      const currentId = youtubePlayer.getVideoData?.().video_id || "";
      if (currentId !== desired.videoId) {
        if (unlocked && !desired.paused) youtubePlayer.loadVideoById({ videoId: desired.videoId, startSeconds: desired.position });
        else youtubePlayer.cueVideoById({ videoId: desired.videoId, startSeconds: desired.position });
      } else {
        const actual = Number(youtubePlayer.getCurrentTime?.() || 0);
        if (Math.abs(actual - desired.position) > 2.5) youtubePlayer.seekTo(desired.position, true);
        if (desired.paused || !unlocked) youtubePlayer.pauseVideo();
        else youtubePlayer.playVideo();
      }
      applyVolume();
      setTimeout(() => {
        try {
          const title = youtubePlayer.getVideoData?.().title;
          if (title && radioState?.title === "مقطع صوتي") {
            ui.currentTitle.textContent = `${radioState.contentKind === "quran" ? "📖" : "🎵"} ${title}`;
          }
        } catch {}
      }, 1200);
    } catch {}
  }

  async function applyStateToPlayer(force = false) {
    if (!ui) return;
    if (!radioState?.active) {
      stopLocalPlayback(true);
      return;
    }

    const key = sourceKey();
    const changed = key !== currentSourceKey;
    currentSourceKey = key;
    const position = expectedPosition();

    if (radioState.sourceType === "youtube") {
      ui.youtubeBox.classList.remove("rivo-radio-hidden");
      ui.audio.classList.add("rivo-radio-hidden");
      try { ui.audio.pause(); } catch {}
      youtubeDesired = {
        videoId: radioState.youtubeId,
        position,
        paused: Boolean(radioState.paused)
      };
      await ensureYoutubePlayer();
      if (force || changed || youtubeReady) applyYoutubeDesired();
    } else {
      ui.youtubeBox.classList.add("rivo-radio-hidden");
      ui.audio.classList.remove("rivo-radio-hidden");
      try { youtubePlayer?.pauseVideo?.(); } catch {}
      if (changed || ui.audio.src !== radioState.audioUrl) {
        ui.audio.src = radioState.audioUrl;
        ui.audio.load();
      }
      try {
        if (Math.abs(Number(ui.audio.currentTime || 0) - position) > 2.5 && Number.isFinite(position)) {
          ui.audio.currentTime = position;
        }
      } catch {}
      applyVolume();
      if (radioState.paused || !unlocked) {
        ui.audio.pause();
      } else {
        try { await ui.audio.play(); }
        catch { unlocked = false; localStorage.removeItem(UNLOCK_KEY); }
      }
    }

    refreshUi();
  }

  function stopLocalPlayback(resetSource) {
    if (!ui) return;
    try { ui.audio.pause(); } catch {}
    try { youtubePlayer?.pauseVideo?.(); } catch {}
    if (resetSource) {
      currentSourceKey = "";
      youtubeDesired = null;
      try {
        ui.audio.removeAttribute("src");
        ui.audio.load();
      } catch {}
    }
  }

  function syncPlayback() {
    if (!radioState?.active || !unlocked) return;
    const position = expectedPosition();
    if (radioState.sourceType === "audio") {
      if (!radioState.paused && Math.abs(Number(ui?.audio?.currentTime || 0) - position) > 3) {
        try { ui.audio.currentTime = position; } catch {}
      }
    } else if (youtubeReady && youtubePlayer && !radioState.paused) {
      try {
        const actual = Number(youtubePlayer.getCurrentTime?.() || 0);
        if (Math.abs(actual - position) > 3) youtubePlayer.seekTo(position, true);
      } catch {}
    }
    refreshUi();
  }

  function handleServerEvent(event) {
    if (!event || typeof event !== "object") return;

    if (event.type === "init") {
      self = {
        clientId: clean(event.self?.clientId, 100),
        nickname: clean(event.self?.nickname, 60),
        role: clean(event.self?.role, 20) || "user",
        isVip: Boolean(event.self?.isVip)
      };
      setTimeout(requestState, 250);
      refreshUi();
      return;
    }

    if (event.type === "vip-state") {
      self.isVip = Boolean(event.active);
      refreshUi();
      return;
    }

    if (event.type === "mic-state") {
      remoteMicActive = Boolean(event.active);
      applyVolume();
      return;
    }

    if (event.type === "room-radio-state") {
      serverClockOffset = Number(event.serverNow || Date.now()) - Date.now();
      radioState = event.state?.active ? event.state : null;
      if (!radioState) stopLocalPlayback(true);
      applyStateToPlayer(true);
      refreshUi();
      return;
    }

    if (event.type === "room-radio-error") {
      toast(event.message || "تعذر تنفيذ أمر إذاعة الغرفة.");
    }
  }

  installSocketCapture();
  window.addEventListener("rivo:room-socket-ready", (event) => {
    const socket = event.detail?.socket;
    if (socket) {
      roomSocket = socket;
      setTimeout(requestState, 150);
    }
  });
  window.addEventListener("rivo:server-event", (event) => handleServerEvent(event.detail));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createUi, { once: true });
  else createUi();
  syncTimer = setInterval(syncPlayback, 5000);
  window.addEventListener("beforeunload", () => clearInterval(syncTimer));
})();
