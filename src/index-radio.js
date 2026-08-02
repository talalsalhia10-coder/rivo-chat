import originalWorker, { ChatRoom as GiftChatRoom } from "./index-gifts.js";

const RADIO_STORAGE_KEY = "rivo-room-radio-state-v1";
const MAX_SOCKET_MESSAGE_LENGTH = 30000;
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const DIRECT_AUDIO_EXT_RE = /\.(?:mp3|m4a|aac|ogg|opus|wav)(?:$|[?#])/i;
const MAX_POSITION_SECONDS = 24 * 60 * 60;

const PRESENCE_LEAVE_DELAY_MS = 30 * 1000;
const PRESENCE_RETENTION_MS = 24 * 60 * 60 * 1000;
const PRESENCE_HISTORY_LIMIT = 50;
const PRESENCE_PENDING_TABLE = "presence_pending_leaves_v1";

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

function sessionControllerId(session) {
  return cleanText(session?.clientId || session?.staffClientId || "", 100);
}

function sessionControllerName(session) {
  return cleanText(session?.nickname || session?.name || "", 60) || controllerLabel(session);
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
  constructor(ctx, env) {
    super(ctx, env);

    // سجل مؤقت للخروج: ننتظر 30 ثانية حتى لا يظهر «خرج/دخل» عند التحديث السريع.
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS ${PRESENCE_PENDING_TABLE} (
        client_id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        avatar TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        is_vip INTEGER NOT NULL DEFAULT 0,
        due_at INTEGER NOT NULL
      )
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const isChatSocket = /\/api\/rooms\/[^/]+\/ws$/.test(url.pathname);

    if (!isChatSocket) {
      return super.fetch(request);
    }

    const before = new Map();
    for (const socket of this.ctx.getWebSockets()) {
      const session = socket.deserializeAttachment?.();
      if (session?.sessionId) before.set(session.sessionId, session);
    }

    const response = await super.fetch(request);

    // إذا نجح اتصال الدردشة، نلتقط الجلسة الجديدة بعد أن ينشئها الخادم الأصلي.
    let joinedSocket = null;
    let joinedSession = null;
    for (const socket of this.ctx.getWebSockets()) {
      const session = socket.deserializeAttachment?.();
      if (
        session?.kind === "chat" &&
        session.sessionId &&
        !before.has(session.sessionId)
      ) {
        joinedSocket = socket;
        joinedSession = session;
        break;
      }
    }

    if (joinedSocket && joinedSession && this.shouldShowPresenceEvent(joinedSession)) {
      const pending = this.getPendingPresenceLeave(joinedSession.clientId);
      const alreadyConnected = [...before.values()].some((session) =>
        session?.kind === "chat" &&
        session.clientId === joinedSession.clientId &&
        this.shouldShowPresenceEvent(session)
      );

      // العودة خلال مهلة الخروج أو فتح تبويب ثانٍ لا تُنشئ رسالة دخول جديدة.
      this.deletePendingPresenceLeave(joinedSession.clientId);
      if (!pending && !alreadyConnected) {
        this.persistPresenceMessage(joinedSession, "join");
      }
      await this.scheduleNextPresenceAlarm();
    }

    return response;
  }

  shouldShowPresenceEvent(session) {
    if (!session || session.kind !== "chat" || !session.clientId) return false;

    // الإدارة والمراقب في وضع التخفي لا يظهر دخولهما أو خروجهما.
    if (
      (session.role === "owner" || session.role === "moderator") &&
      session.adminVisible === false
    ) return false;

    // عضو VIP المتخفي لا يظهر دخوله أو خروجه.
    if (session.isVip && session.vipStealth) return false;

    return true;
  }

  hasAnotherVisibleConnection(clientId, excludedSocket = null) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === excludedSocket || socket.readyState !== WebSocket.OPEN) continue;
      const session = socket.deserializeAttachment?.();
      if (
        session?.kind === "chat" &&
        session.clientId === clientId &&
        this.shouldShowPresenceEvent(session)
      ) return true;
    }
    return false;
  }

  getPendingPresenceLeave(clientId) {
    if (!clientId) return null;
    return this.sql.exec(
      `SELECT client_id, nickname, avatar, role, is_vip, due_at
       FROM ${PRESENCE_PENDING_TABLE}
       WHERE client_id = ?
       LIMIT 1`,
      clientId
    ).toArray()[0] || null;
  }

  deletePendingPresenceLeave(clientId) {
    if (!clientId) return;
    this.sql.exec(
      `DELETE FROM ${PRESENCE_PENDING_TABLE} WHERE client_id = ?`,
      clientId
    );
  }

  queuePresenceLeave(session) {
    if (!this.shouldShowPresenceEvent(session)) return;
    if (this.hasAnotherVisibleConnection(session.clientId)) return;

    const dueAt = Date.now() + PRESENCE_LEAVE_DELAY_MS;
    this.sql.exec(
      `INSERT INTO ${PRESENCE_PENDING_TABLE}
       (client_id, nickname, avatar, role, is_vip, due_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(client_id) DO UPDATE SET
         nickname = excluded.nickname,
         avatar = excluded.avatar,
         role = excluded.role,
         is_vip = excluded.is_vip,
         due_at = excluded.due_at`,
      session.clientId,
      cleanText(session.nickname || "مستخدم", 24),
      cleanText(session.avatar || "lina", 40),
      cleanText(session.role || "user", 20),
      session.isVip ? 1 : 0,
      dueAt
    );

    this.scheduleNextPresenceAlarm().catch(() => {});
  }

  async scheduleNextPresenceAlarm() {
    const next = this.sql.exec(
      `SELECT due_at
       FROM ${PRESENCE_PENDING_TABLE}
       ORDER BY due_at ASC
       LIMIT 1`
    ).toArray()[0];

    if (!next?.due_at) {
      try { await this.ctx.storage.deleteAlarm(); } catch {}
      return;
    }

    const alarmAt = Math.max(Date.now() + 250, Number(next.due_at));
    await this.ctx.storage.setAlarm(alarmAt);
  }

  async alarm() {
    const now = Date.now();
    const dueRows = this.sql.exec(
      `SELECT client_id, nickname, avatar, role, is_vip, due_at
       FROM ${PRESENCE_PENDING_TABLE}
       WHERE due_at <= ?
       ORDER BY due_at ASC`,
      now
    ).toArray();

    for (const row of dueRows) {
      this.deletePendingPresenceLeave(row.client_id);

      // إذا عاد المستخدم قبل تنفيذ المنبه، نلغي رسالة الخروج.
      if (this.hasAnotherVisibleConnection(row.client_id)) continue;

      this.persistPresenceMessage({
        clientId: row.client_id,
        nickname: row.nickname,
        avatar: row.avatar,
        role: row.role || "user",
        isVip: Boolean(row.is_vip)
      }, "leave");
    }

    await this.scheduleNextPresenceAlarm();
  }

  persistPresenceMessage(session, action) {
    if (!session?.clientId) return;

    const now = Date.now();
    const nickname = cleanText(session.nickname || "مستخدم", 24) || "مستخدم";
    const isJoin = action === "join";
    const message = {
      id: crypto.randomUUID(),
      clientId: cleanText(session.clientId, 80),
      nickname,
      avatar: cleanText(session.avatar || "lina", 40) || "lina",
      role: cleanText(session.role || "user", 20) || "user",
      isVip: Boolean(session.isVip),
      badge: "",
      body: isJoin
        ? `🟢 دخل ${nickname} إلى الدردشة`
        : `⚪ غادر ${nickname} الدردشة`,
      createdAt: now,
      presenceEvent: isJoin ? "join" : "leave"
    };

    try {
      this.sql.exec(
        `INSERT INTO messages
         (id, client_id, nickname, avatar, role, is_vip, body, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        message.id,
        message.clientId,
        message.nickname,
        message.avatar,
        message.role,
        message.isVip ? 1 : 0,
        message.body,
        message.createdAt
      );

      this.sql.exec(
        `DELETE FROM messages WHERE created_at < ?`,
        now - PRESENCE_RETENTION_MS
      );

      this.sql.exec(
        `DELETE FROM messages
         WHERE id IN (
           SELECT id FROM messages
           ORDER BY created_at DESC
           LIMIT -1 OFFSET ?
         )`,
        PRESENCE_HISTORY_LIMIT
      );

      this.broadcast({ type: "message", message });
    } catch (error) {
      console.error("Failed to persist presence event", error);
    }
  }

  async webSocketMessage(ws, rawMessage) {
    if (typeof rawMessage === "string" && rawMessage.length <= MAX_SOCKET_MESSAGE_LENGTH) {
      let data = null;
      try { data = JSON.parse(rawMessage); } catch {}

      const session = ws.deserializeAttachment?.();

      if (
        data?.type === "admin-command" &&
        (session?.role === "owner" || session?.role === "moderator")
      ) {
        if (data.action === "room-radio-state-request") {
          return this.sendRoomRadioState(ws);
        }

        if (data.action === "room-radio-play") {
          return this.handleRoomRadioPlayForSession(ws, session, data);
        }

        if (data.action === "room-radio-action") {
          return this.handleRoomRadioActionForSession(ws, session, {
            ...data,
            action: data.radioAction
          });
        }
      }

      if (data?.type === "room-radio-state-request") {
        return this.sendRoomRadioState(ws);
      }

      if (data?.type === "room-radio-play") {
        if (session?.kind !== "chat") return;
        return this.handleRoomRadioPlayForSession(ws, session, data);
      }

      if (data?.type === "room-radio-action") {
        if (session?.kind !== "chat") return;
        return this.handleRoomRadioActionForSession(ws, session, data);
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
    return current.controllerClientId === sessionControllerId(session);
  }

  canControlRadio(session, current) {
    const rank = roleRank(session);
    if (!rank || !current?.active) return false;
    if (current.controllerClientId === sessionControllerId(session)) return true;
    if (rank === 3) return true;
    if (rank === 2 && Number(current.controllerRank || 0) <= 1) return true;
    return false;
  }

  async handleRoomRadioPlayForSession(ws, session, data) {
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
      controllerClientId: sessionControllerId(session),
      controllerName: sessionControllerName(session),
      controllerRole: session.role === "owner" || session.role === "moderator" ? session.role : "vip",
      controllerRank: rank
    };

    await this.writeRoomRadioState(state);
    const payload = this.radioPayload(state);
    this.broadcast(payload);
    this.safeSend(ws, payload);

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

  async handleRoomRadioActionForSession(ws, session, data) {
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
      const payload = this.radioPayload(null);
      this.broadcast(payload);
      this.safeSend(ws, payload);
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
    const payload = this.radioPayload(current);
    this.broadcast(payload);
    this.safeSend(ws, payload);
  }
  webSocketClose(ws) {
    const session = ws.deserializeAttachment?.();
    super.webSocketClose(ws);

    if (
      session?.kind === "chat" &&
      this.shouldShowPresenceEvent(session) &&
      !this.hasAnotherVisibleConnection(session.clientId, ws)
    ) {
      this.queuePresenceLeave(session);
    }
  }

  webSocketError(ws) {
    const session = ws.deserializeAttachment?.();
    super.webSocketError(ws);

    if (
      session?.kind === "chat" &&
      this.shouldShowPresenceEvent(session) &&
      !this.hasAnotherVisibleConnection(session.clientId, ws)
    ) {
      this.queuePresenceLeave(session);
    }
  }

}
