import originalWorker, { ChatRoom as GiftChatRoom } from "./index-gifts.js";

const RADIO_STORAGE_KEY = "rivo-room-radio-state-v1";
const MAX_SOCKET_MESSAGE_LENGTH = 30000;
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const DIRECT_AUDIO_EXT_RE = /\.(?:mp3|m4a|aac|ogg|opus|wav)(?:$|[?#])/i;
const MAX_POSITION_SECONDS = 24 * 60 * 60;

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function roleRank(session) {
  if (session?.role === "owner") return 3;
  if (session?.role === "moderator") return 2;
  if (session?.isVip) return 1;
  return 0;
}

function controllerLabel(session) {
  if (session?.role === "owner") return "الإدارة";
  if (session?.role === "moderator") return "المراقب";
  return "VIP";
}

function safeHttpsUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    if (parsed.protocol !== "https:") return "";
    parsed.username = "";
    parsed.password = "";
    return parsed.href.slice(0, 1800);
  } catch {
    return "";
  }
}

export default originalWorker;

export class ChatRoom extends GiftChatRoom {
  async webSocketMessage(ws, rawMessage) {
    if (typeof rawMessage === "string" && rawMessage.length <= MAX_SOCKET_MESSAGE_LENGTH) {
      let data = null;
      try { data = JSON.parse(rawMessage); } catch {}

      if (data?.type === "room-radio-state-request") {
        return this.sendRoomRadioState(ws);
      }

      if (data?.type === "room-radio-play") {
        return this.handleRoomRadioPlay(ws, data);
      }

      if (data?.type === "room-radio-action") {
        return this.handleRoomRadioAction(ws, data);
      }
    }

    return super.webSocketMessage(ws, rawMessage);
  }

  async readRoomRadioState() {
    const stored = await this.ctx.storage.get(RADIO_STORAGE_KEY);
    if (!stored || typeof stored !== "object" || !stored.active) return null;
    return stored;
  }

  async writeRoomRadioState(state) {
    if (!state?.active) {
      await this.ctx.storage.delete(RADIO_STORAGE_KEY);
      return;
    }
    await this.ctx.storage.put(RADIO_STORAGE_KEY, state);
  }

  radioPayload(state) {
    return {
      type: "room-radio-state",
      state: state || null,
      serverNow: Date.now()
    };
  }

  async sendRoomRadioState(ws) {
    const state = await this.readRoomRadioState();
    this.safeSend(ws, this.radioPayload(state));
  }

  radioError(ws, message) {
    this.safeSend(ws, {
      type: "room-radio-error",
      message: cleanText(message, 180)
    });
  }

  canStartRadio(session, current) {
    const rank = roleRank(session);
    if (!rank) return false;
    if (!current?.active) return true;
    if (rank === 3) return true;
    if (rank === 2) return Number(current.controllerRank || 0) <= 2;
    return current.controllerClientId === session.clientId;
  }

  canControlRadio(session, current) {
    const rank = roleRank(session);
    if (!rank || !current?.active) return false;
    if (current.controllerClientId === session.clientId) return true;
    if (rank === 3) return true;
    if (rank === 2 && Number(current.controllerRank || 0) <= 1) return true;
    return false;
  }

  async handleRoomRadioPlay(ws, data) {
    const session = ws.deserializeAttachment?.();
    if (session?.kind !== "chat") return;

    const rank = roleRank(session);
    if (!rank) {
      this.radioError(ws, "تشغيل إذاعة الغرفة متاح للإدارة والمراقبين وأعضاء VIP فقط.");
      return;
    }

    if (!Array.isArray(session.radioActionTimes)) session.radioActionTimes = [];
    if (!this.rateAllowed(session.radioActionTimes, 60000, 8)) {
      this.radioError(ws, "تمهّل قليلاً قبل تغيير مقطع إذاعة الغرفة.");
      return;
    }
    ws.serializeAttachment?.(session);

    const current = await this.readRoomRadioState();
    if (!this.canStartRadio(session, current)) {
      this.radioError(ws, "يوجد مقطع يعمل الآن بصلاحية أعلى. لا يمكنك استبداله.");
      return;
    }

    const sourceType = cleanText(data.sourceType, 20);
    const contentKind = cleanText(data.contentKind, 20) === "quran" ? "quran" : "music";
    const title = cleanText(data.title, 120) || (contentKind === "quran" ? "تلاوة قرآنية" : "مقطع صوتي");
    const subtitle = cleanText(data.subtitle, 100);

    let youtubeId = "";
    let audioUrl = "";

    if (sourceType === "youtube") {
      youtubeId = cleanText(data.youtubeId, 20);
      if (!YOUTUBE_ID_RE.test(youtubeId)) {
        this.radioError(ws, "رابط YouTube غير صحيح.");
        return;
      }
    } else if (sourceType === "audio") {
      audioUrl = safeHttpsUrl(data.audioUrl);
      if (!audioUrl || !DIRECT_AUDIO_EXT_RE.test(audioUrl)) {
        this.radioError(ws, "استخدم رابط HTTPS مباشر ينتهي بـ MP3 أو AAC أو M4A أو OGG أو OPUS أو WAV.");
        return;
      }
    } else {
      this.radioError(ws, "نوع المقطع غير مدعوم.");
      return;
    }

    const now = Date.now();
    const state = {
      active: true,
      id: crypto.randomUUID(),
      sourceType,
      youtubeId,
      audioUrl,
      contentKind,
      title,
      subtitle,
      paused: false,
      offsetSeconds: 0,
      startedAt: now,
      updatedAt: now,
      controllerClientId: cleanText(session.clientId, 100),
      controllerName: cleanText(session.nickname, 60) || controllerLabel(session),
      controllerRole: session.role === "owner" || session.role === "moderator" ? session.role : "vip",
      controllerRank: rank
    };

    await this.writeRoomRadioState(state);
    this.broadcast(this.radioPayload(state));

    try {
      this.addAdminLog(
        session.role === "owner" || session.role === "moderator" ? session.role : "vip",
        session.staffClientId || session.clientId,
        "room-radio-play",
        state.id,
        state.title,
        sourceType
      );
    } catch {}
  }

  currentPosition(state, now = Date.now()) {
    const base = clampNumber(state?.offsetSeconds, 0, MAX_POSITION_SECONDS, 0);
    if (!state?.active || state.paused) return base;
    const elapsed = Math.max(0, (now - Number(state.startedAt || now)) / 1000);
    return clampNumber(base + elapsed, 0, MAX_POSITION_SECONDS, 0);
  }

  async handleRoomRadioAction(ws, data) {
    const session = ws.deserializeAttachment?.();
    if (session?.kind !== "chat") return;

    const current = await this.readRoomRadioState();
    if (!current?.active) {
      this.safeSend(ws, this.radioPayload(null));
      return;
    }

    if (!this.canControlRadio(session, current)) {
      this.radioError(ws, "لا تستطيع التحكم بالمقطع الذي شغله مستخدم بصلاحية أعلى.");
      return;
    }

    const requestedId = cleanText(data.stateId, 80);
    if (requestedId && requestedId !== current.id) {
      this.safeSend(ws, this.radioPayload(current));
      return;
    }

    const action = cleanText(data.action, 20);
    const now = Date.now();

    if (action === "stop") {
      await this.writeRoomRadioState(null);
      this.broadcast(this.radioPayload(null));
      return;
    }

    if (action === "pause") {
      if (!current.paused) {
        current.offsetSeconds = this.currentPosition(current, now);
        current.paused = true;
        current.startedAt = now;
      }
    } else if (action === "resume") {
      if (current.paused) {
        current.paused = false;
        current.startedAt = now;
      }
    } else if (action === "seek") {
      current.offsetSeconds = clampNumber(data.positionSeconds, 0, MAX_POSITION_SECONDS, 0);
      current.startedAt = now;
    } else {
      this.radioError(ws, "أمر التحكم غير معروف.");
      return;
    }

    current.updatedAt = now;
    await this.writeRoomRadioState(current);
    this.broadcast(this.radioPayload(current));
  }
}
