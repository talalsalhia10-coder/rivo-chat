import { DurableObject } from "cloudflare:workers";

const MAX_MESSAGE_LENGTH = 800;
const MAX_NAME_LENGTH = 24;
const MAX_HISTORY = 0;
const MAX_STORED_MESSAGES = 12;
const PUBLIC_RETENTION_MS = 24 * 60 * 60 * 1000;
const RESOLVED_REPORT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_REPORTS = 500;
const MAX_SOCKET_MESSAGE_LENGTH = 30000;
const CHARACTER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const ROOM_CAPACITY = 20;
const VIP_MONTHLY_PRICE_USD = 15;
const MAX_CHARACTER_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CHARACTER_VRM_BYTES = 25 * 1024 * 1024;
const DEFAULT_ROOMS = [
  { id: "lobby", name: "العامة", order: 0 },
  { id: "iraq", name: "العراق", order: 1 },
  { id: "syria", name: "سوريا", order: 2 },
  { id: "jordan", name: "الأردن", order: 3 },
  { id: "saudi", name: "السعودية", order: 4 },
  { id: "kuwait", name: "الكويت", order: 5 },
  { id: "oman", name: "عُمان", order: 6 },
  { id: "dubai", name: "دبي", order: 7 },
  { id: "expats", name: "المغتربون", order: 8 },
  { id: "artists-poets", name: "الفنانون والشعراء", order: 9 }
];
const VIP_GIFTS = new Set(["star", "diamond", "ruby", "heart", "emerald"]);

function securityHeaders(headers = new Headers()) {
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set("permissions-policy", "microphone=(self), camera=(), geolocation=()");
  return headers;
}

function json(data, status = 200) {
  const headers = securityHeaders(new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }));
  return new Response(JSON.stringify(data), { status, headers });
}

function secureAssetResponse(response) {
  const headers = securityHeaders(new Headers(response.headers));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanNickname(value) {
  return cleanText(value, MAX_NAME_LENGTH).replace(/\s{2,}/g, " ");
}

function cleanAvatar(value) {
  const id = String(value ?? "").toLowerCase().trim();
  return CHARACTER_PATTERN.test(id) ? id : "lina";
}

function cleanRoom(value) {
  const room = String(value ?? "lobby")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
  return room || "lobby";
}

function isWebSocketUpgrade(request) {
  return request.headers.get("Upgrade")?.toLowerCase() === "websocket";
}


function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function createSessionToken(payload, secret) {
  const body = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${encodeBase64Url(new Uint8Array(signature))}`;
}

async function stableUserClientId(googleSub, secret) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`rivo-user:${googleSub}`)
  );
  return `user:${encodeBase64Url(new Uint8Array(signature)).slice(0, 32)}`;
}

async function verifySignedToken(token, secret) {
  try {
    const [body, signature] = String(token || "").split(".");
    if (!body || !signature || !secret) return null;
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(body)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(body)));
    if (Number(payload?.exp || 0) <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function verifySessionToken(token, secret) {
  const payload = await verifySignedToken(token, secret);
  return payload?.sub ? payload : null;
}

async function verifyStaffSessionToken(token, secret) {
  const payload = await verifySignedToken(token, secret);
  if (
    payload?.type !== "staff" ||
    !payload.staffId ||
    !["owner", "moderator"].includes(payload.role)
  ) return null;
  return payload;
}

function parseStaffAccounts(env) {
  try {
    const parsed = JSON.parse(env.STAFF_ACCOUNTS || "{}");
    if (Array.isArray(parsed)) {
      const map = {};
      for (const item of parsed) {
        if (item?.code) map[String(item.code)] = item;
      }
      return map;
    }
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function resolveStaffIdentity(env, token, requestedRole, fallbackId = "") {
  const cleanToken = String(token || "");
  const accounts = parseStaffAccounts(env);
  const account = accounts[cleanToken];
  if (account?.role === "owner") {
    return {
      id: cleanText(account.id || fallbackId || "owner-main", 80),
      name: cleanText(account.name || "الإدارة", 40),
      role: "owner"
    };
  }

  if (requestedRole === "owner" && env.ADMIN_TOKEN && cleanToken === env.ADMIN_TOKEN) {
    return { id: "owner-main", name: "الإدارة", role: "owner" };
  }
  return null;
}

async function authenticateStaffCode(code, requestedRole, env) {
  if (!env.SESSION_SECRET) {
    return { error: "Staff sessions are not configured on the server.", status: 503 };
  }

  let staff = null;
  let accountExpiresAt = 0;
  let staffVersion = 0;

  if (requestedRole === "moderator") {
    const registry = env.CHAT_ROOMS.getByName("lobby");
    const response = await registry.fetch(new Request("https://rivo.internal/internal/staff-auth", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ code })
    }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.role !== "moderator") {
      return { error: data.error || "رمز المراقب غير صحيح أو الحساب متوقف أو منتهي.", status: response.status || 401 };
    }
    staff = {
      id: cleanText(data.staffId, 80),
      name: cleanText(data.name || "مراقب", 40),
      role: "moderator"
    };
    accountExpiresAt = Number(data.accountExpiresAt || 0);
    staffVersion = Number(data.sessionVersion || 0);
  } else {
    staff = resolveStaffIdentity(env, code, "owner", "owner-main");
  }

  if (!staff) return { error: "رمز الإدارة غير صحيح.", status: 401 };

  const maximumSessionExpiry = Date.now() + 12 * 60 * 60 * 1000;
  const expiresAt = accountExpiresAt > 0
    ? Math.min(maximumSessionExpiry, accountExpiresAt)
    : maximumSessionExpiry;

  if (expiresAt <= Date.now()) {
    return { error: "انتهت مدة اشتراك المراقب.", status: 401 };
  }

  const staffSessionToken = await createSessionToken({
    type: "staff",
    staffId: staff.id,
    role: staff.role,
    staffVersion,
    exp: expiresAt
  }, env.SESSION_SECRET);

  return {
    staffSessionToken,
    staffId: staff.id,
    role: staff.role,
    name: staff.name || "",
    accountExpiresAt,
    expiresAt
  };
}


async function authenticateGoogleCredential(credential, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.SESSION_SECRET) {
    return { error: "Google login is not configured on the server.", status: 503 };
  }

  const response = await fetch("https://oauth2.googleapis.com/tokeninfo", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: new URLSearchParams({ id_token: credential })
  });
  const info = await response.json().catch(() => ({}));

  if (!response.ok || info.aud !== env.GOOGLE_CLIENT_ID || !info.sub) {
    return { error: "تعذر التحقق من حساب Google.", status: 401 };
  }

  if (String(info.email_verified || "").toLowerCase() !== "true") {
    return { error: "يجب استخدام بريد Google موثّق.", status: 401 };
  }

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const sessionToken = await createSessionToken({
    sub: String(info.sub),
    exp: expiresAt
  }, env.SESSION_SECRET);

  return {
    sessionToken,
    googleUid: String(info.sub),
    email: String(info.email || ""),
    name: String(info.name || ""),
    picture: String(info.picture || ""),
    expiresAt
  };
}

async function readJsonResponse(response, fallback = {}) {
  try { return await response.json(); } catch { return fallback; }
}

async function getRoomCatalog(env) {
  const registry = env.CHAT_ROOMS.getByName("lobby");
  const response = await registry.fetch(new Request("https://rivo.internal/internal/rooms-config"));
  const data = await readJsonResponse(response, {});
  return Array.isArray(data.rooms) && data.rooms.length ? data.rooms : DEFAULT_ROOMS.map((room) => ({ ...room, enabled: true }));
}

async function getRoomStatuses(env) {
  const catalog = (await getRoomCatalog(env)).filter((room) => room.enabled !== false);
  const items = await Promise.all(catalog.map(async (room) => {
    const stub = env.CHAT_ROOMS.getByName(cleanRoom(room.id));
    const response = await stub.fetch(new Request(`https://rivo.internal/internal/room-status?room=${encodeURIComponent(room.id)}`));
    const status = await readJsonResponse(response, {});
    return {
      id: cleanRoom(room.id),
      name: cleanText(room.name, 40) || room.id,
      order: Number(room.order || 0),
      enabled: room.enabled !== false,
      ordinaryCount: Number(status.ordinaryCount || 0),
      vipCount: Number(status.vipCount || 0),
      staffCount: Number(status.staffCount || 0),
      count: Number(status.count || 0),
      capacity: ROOM_CAPACITY,
      full: Number(status.ordinaryCount || 0) >= ROOM_CAPACITY
    };
  }));
  return items.sort((a, b) => b.count - a.count || a.order - b.order || a.name.localeCompare(b.name, "ar"));
}

function chooseSmartRoom(rooms) {
  const available = rooms.filter((room) => room.enabled !== false && !room.full);
  if (!available.length) return null;
  const active = available.filter((room) => room.ordinaryCount > 0);
  const pool = (active.length ? active.slice(0, 3) : available);
  return pool[Math.floor(Math.random() * pool.length)] || available[0];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/public-config") {
      return json({
        googleClientId: cleanText(env.GOOGLE_CLIENT_ID, 300),
        requiredOnCloud: true,
        chatOrigin: url.origin
      });
    }

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "rivo-group-chat",
        version: "155.0.0",
        googleLoginConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.SESSION_SECRET),
        time: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/auth/google") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const body = await request.json().catch(() => ({}));
      const credential = cleanText(body.credential, 5000);
      if (!credential) return json({ error: "Google credential is required." }, 400);
      const result = await authenticateGoogleCredential(credential, env);
      if (result.error) return json({ error: result.error }, result.status || 400);
      return json(result);
    }

    if (url.pathname === "/api/auth/staff") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const body = await request.json().catch(() => ({}));
      const code = cleanText(body.code, 512);
      const role = cleanText(body.role, 20);
      if (!code) return json({ error: "Staff code is required." }, 400);
      const result = await authenticateStaffCode(code, role, env);
      if (result.error) return json({ error: result.error }, result.status || 400);
      return json(result);
    }

    if (url.pathname === "/api/rooms" && request.method === "GET") {
      const rooms = await getRoomStatuses(env);
      return json({ rooms, capacity: ROOM_CAPACITY, assignedRoom: chooseSmartRoom(rooms) });
    }

    if (url.pathname === "/api/vip/me" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const identity = await verifySessionToken(cleanText(body.authToken, 5000), env.SESSION_SECRET);
      if (!identity) return json({ error: "Google sign-in required" }, 401);
      const clientId = await stableUserClientId(cleanText(identity.sub, 120), env.SESSION_SECRET);
      const registry = env.CHAT_ROOMS.getByName("lobby");
      const response = await registry.fetch(new Request("https://rivo.internal/internal/vip-status", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId })
      }));
      return json(await readJsonResponse(response, { active: false }));
    }

    if (url.pathname === "/api/vip/request" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const identity = await verifySessionToken(cleanText(body.authToken, 5000), env.SESSION_SECRET);
      if (!identity) return json({ error: "Google sign-in required" }, 401);
      const clientId = await stableUserClientId(cleanText(identity.sub, 120), env.SESSION_SECRET);
      const registry = env.CHAT_ROOMS.getByName("lobby");
      const response = await registry.fetch(new Request("https://rivo.internal/internal/vip-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId, googleUid: cleanText(identity.sub, 120), nickname: cleanNickname(body.nickname || "مستخدم Rivo")
        })
      }));
      const data = await readJsonResponse(response, {});
      return json(data, response.status);
    }

    if (url.pathname === "/api/characters" && request.method === "GET") {
      const registry = env.CHAT_ROOMS.getByName("lobby");
      const response = await registry.fetch(new Request("https://rivo.internal/internal/characters"));
      return json(await readJsonResponse(response, { characters: [] }));
    }

    if (url.pathname === "/api/admin/characters/upload" && request.method === "POST") {
      if (!env.CHARACTER_ASSETS) return json({ error: "اربط حاوية R2 باسم CHARACTER_ASSETS لتفعيل رفع ملفات الشخصيات." }, 503);
      const token = cleanText(request.headers.get("x-rivo-staff-session"), 5000);
      const staff = await verifyStaffSessionToken(token, env.SESSION_SECRET);
      if (!staff || staff.role !== "owner") return json({ error: "Unauthorized" }, 401);

      const kind = cleanText(url.searchParams.get("kind"), 20);
      if (!['image', 'vrm'].includes(kind)) return json({ error: "نوع الملف غير مدعوم." }, 400);

      const contentType = cleanText(request.headers.get("content-type") || "application/octet-stream", 120).toLowerCase();
      const maxBytes = kind === "image" ? MAX_CHARACTER_IMAGE_BYTES : MAX_CHARACTER_VRM_BYTES;
      const declaredLength = Number(request.headers.get("content-length") || 0);
      if (declaredLength > maxBytes) return json({ error: `حجم الملف أكبر من الحد المسموح (${Math.round(maxBytes / 1024 / 1024)}MB).` }, 413);

      let ext = "vrm";
      if (kind === "image") {
        const allowedImages = new Map([
          ["image/webp", "webp"],
          ["image/png", "png"],
          ["image/jpeg", "jpg"]
        ]);
        ext = allowedImages.get(contentType) || "";
        if (!ext) return json({ error: "الصورة يجب أن تكون WebP أو PNG أو JPG." }, 415);
      } else if (!["application/octet-stream", "application/vrm", "model/gltf-binary"].includes(contentType)) {
        return json({ error: "ملف الشخصية يجب أن يكون بصيغة VRM." }, 415);
      }

      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength) return json({ error: "الملف فارغ." }, 400);
      if (bytes.byteLength > maxBytes) return json({ error: `حجم الملف أكبر من الحد المسموح (${Math.round(maxBytes / 1024 / 1024)}MB).` }, 413);

      const key = `characters/${crypto.randomUUID()}.${ext}`;
      await env.CHARACTER_ASSETS.put(key, bytes, { httpMetadata: { contentType } });
      return json({ ok: true, key, url: `/api/character-assets/${key}` });
    }

    if (url.pathname.startsWith("/api/character-assets/") && request.method === "GET") {
      if (!env.CHARACTER_ASSETS) return json({ error: "Character storage is not configured" }, 404);
      const key = url.pathname.slice("/api/character-assets/".length);
      const object = await env.CHARACTER_ASSETS.get(key);
      if (!object) return json({ error: "Not found" }, 404);
      const headers = securityHeaders(new Headers());
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public,max-age=31536000,immutable");
      return new Response(object.body, { headers });
    }

    const match = url.pathname.match(/^\/api\/rooms\/([^/]+)\/(ws|admin-ws)$/);
    if (match) {
      if (request.method !== "GET" || !isWebSocketUpgrade(request)) {
        return json({ error: "WebSocket upgrade required" }, 426);
      }

      const roomName = cleanRoom(match[1]);
      const room = env.CHAT_ROOMS.getByName(roomName);
      return room.fetch(request);
    }

    if (url.pathname === "/rivo-config.json" && request.method === "GET") {
      const assetResponse = await env.ASSETS.fetch(request);
      if (!assetResponse.ok) return secureAssetResponse(assetResponse);
      const config = await assetResponse.json().catch(() => ({}));
      const registry = env.CHAT_ROOMS.getByName("lobby");
      const characterResponse = await registry.fetch(new Request("https://rivo.internal/internal/characters"));
      const data = await readJsonResponse(characterResponse, { characters: [] });
      const dynamicCharacters = (data.characters || []).map((character) => ({
        id: character.id,
        name: character.name,
        gender: "شخصية",
        desc: character.description || "شخصية Rivo متحركة",
        dialect: character.dialect || "العربية",
        mediaType: "vrm",
        vrmUrl: character.vrmUrl,
        image: character.thumbnailUrl || "",
        enabled: character.visible !== false,
        draft: false,
        vipOnly: Boolean(character.vipOnly),
        voice: { enabled: true, lang: "ar", voiceId: character.voiceId || "" }
      })).filter((character) => character.id && character.vrmUrl);
      const map = new Map((Array.isArray(config.characters) ? config.characters : []).map((character) => [character.id, character]));
      for (const character of dynamicCharacters) map.set(character.id, { ...(map.get(character.id) || {}), ...character });
      config.characters = [...map.values()];
      config._meta = { ...(config._meta || {}), characterCount: config.characters.length, dynamicCharacters: true, updatedAt: Date.now() };
      return json(config);
    }

    return secureAssetResponse(await env.ASSETS.fetch(request));
  }
};

export class ChatRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.sql = ctx.storage.sql;

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_created_at
      ON messages(created_at DESC);

      CREATE TABLE IF NOT EXISTS private_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        sender_nickname TEXT NOT NULL,
        sender_avatar TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        recipient_nickname TEXT NOT NULL,
        recipient_avatar TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_private_pair_time
      ON private_messages(sender_id, recipient_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS room_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_flags (
        client_id TEXT PRIMARY KEY,
        mic_blocked INTEGER NOT NULL DEFAULT 0,
        private_blocked INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS user_badges (
        client_id TEXT PRIMARY KEY,
        badge TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS user_bans (
        client_id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL DEFAULT '',
        until_at INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        reporter_nickname TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_nickname TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        message_id TEXT NOT NULL DEFAULT '',
        context_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'open',
        created_at INTEGER NOT NULL,
        resolved_at INTEGER NOT NULL DEFAULT 0,
        resolved_by TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS admin_logs (
        id TEXT PRIMARY KEY,
        actor_role TEXT NOT NULL,
        actor_id TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        target_id TEXT NOT NULL DEFAULT '',
        target_name TEXT NOT NULL DEFAULT '',
        details TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS moderator_permissions (
        client_id TEXT PRIMARY KEY,
        permissions_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS staff_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'moderator',
        code TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL DEFAULT 0,
        session_version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS staff_preferences (
        role TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        avatar TEXT NOT NULL DEFAULT '',
        visible INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(role, staff_id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_accounts_code
      ON staff_accounts(code);

      CREATE TABLE IF NOT EXISTS room_registry (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS vip_members (
        client_id TEXT PRIMARY KEY,
        google_uid TEXT NOT NULL DEFAULT '',
        nickname TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS vip_requests (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        google_uid TEXT NOT NULL DEFAULT '',
        nickname TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'requested',
        price_usd INTEGER NOT NULL DEFAULT 15,
        requested_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        reviewed_by TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_vip_requests_client ON vip_requests(client_id, requested_at DESC);

      CREATE TABLE IF NOT EXISTS character_registry (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        thumbnail_url TEXT NOT NULL DEFAULT '',
        vrm_url TEXT NOT NULL DEFAULT '',
        voice_id TEXT NOT NULL DEFAULT '',
        dialect TEXT NOT NULL DEFAULT '',
        vip_only INTEGER NOT NULL DEFAULT 0,
        visible INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    this.sql.exec(
      `INSERT OR IGNORE INTO room_settings(key, value) VALUES
       ('public_mic_enabled', '1'),
       ('private_mic_enabled', '0')`
    );

    for (const room of DEFAULT_ROOMS) {
      this.sql.exec(
        `INSERT OR IGNORE INTO room_registry(id, name, enabled, sort_order) VALUES(?, ?, 1, ?)`,
        room.id, room.name, room.order
      );
    }
    this.sql.exec(
      `INSERT OR IGNORE INTO character_registry(
         id, name, description, thumbnail_url, vrm_url, voice_id, dialect, vip_only, visible, sort_order, created_at
       ) VALUES('lina', 'لينا', 'شخصية Rivo الأساسية', '/assets/lina-instant-poster.webp', '/characters/Lina.vrm', 'lina', 'الخليجية', 0, 1, 0, ?)`,
      Date.now()
    );

    try {
      this.sql.exec(
        `ALTER TABLE messages ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`
      );
    } catch {
      // The role column already exists.
    }

    try {
      this.sql.exec(
        `ALTER TABLE messages ADD COLUMN is_vip INTEGER NOT NULL DEFAULT 0`
      );
    } catch {
      // The is_vip column already exists.
    }

    try {
      this.sql.exec(
        `ALTER TABLE staff_accounts ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1`
      );
    } catch {
      // The session_version column already exists.
    }

    // Rivo v24 keeps private history on each user device, not in Rivo storage.
    this.sql.exec(`DELETE FROM private_messages`);
    this.sql.exec(`DELETE FROM messages WHERE created_at < ?`, Date.now() - PUBLIC_RETENTION_MS);
    this.sql.exec(
      `DELETE FROM reports WHERE status = 'resolved' AND resolved_at > 0 AND resolved_at < ?`,
      Date.now() - RESOLVED_REPORT_RETENTION_MS
    );
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/internal/rooms-config") {
      return json({ rooms: this.getRoomCatalog() });
    }

    if (url.pathname === "/internal/room-status") {
      return json(this.getRoomStatus());
    }

    if (url.pathname === "/internal/vip-status") {
      const body = await request.json().catch(() => ({}));
      return json(this.getVipStatus(cleanText(body.clientId, 80)));
    }

    if (url.pathname === "/internal/vip-request") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const body = await request.json().catch(() => ({}));
      const result = this.createVipRequest({
        clientId: cleanText(body.clientId, 80),
        googleUid: cleanText(body.googleUid, 120),
        nickname: cleanNickname(body.nickname)
      });
      return json(result, result.error ? 400 : 200);
    }

    if (url.pathname === "/internal/characters") {
      return json({ characters: this.getCharacters(false) });
    }

    if (url.pathname === "/internal/staff-account-status") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const body = await request.json().catch(() => ({}));
      const account = this.getModeratorAccountById(cleanText(body.staffId, 80));
      if (!account) return json({ active: false }, 404);
      return json({
        active: this.isModeratorAccountActive(account),
        account,
        permissions: this.getModeratorPermissions(account.id)
      });
    }

    if (url.pathname === "/internal/staff-auth") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const body = await request.json().catch(() => ({}));
      const account = this.getModeratorAccountByCode(cleanText(body.code, 160));
      if (!this.isModeratorAccountActive(account)) {
        return json({ error: "رمز المراقب غير صحيح أو الحساب متوقف أو منتهي." }, 401);
      }
      return json({
        role: "moderator",
        staffId: account.id,
        name: account.name,
        accountExpiresAt: Number(account.expiresAt || 0),
        sessionVersion: Number(account.sessionVersion || 1)
      });
    }

    if (!isWebSocketUpgrade(request)) {
      return json({ error: "WebSocket upgrade required" }, 426);
    }

    if (url.pathname.endsWith("/admin-ws")) {
      return await this.acceptAdminSocket(request, url);
    }

    const roomPathMatch = url.pathname.match(/\/api\/rooms\/([^/]+)\/ws$/);
    const roomId = cleanRoom(roomPathMatch?.[1] || "lobby");
    let roomCatalog = this.getRoomCatalog();
    if (roomId !== "lobby") {
      const registry = this.env.CHAT_ROOMS.getByName("lobby");
      const response = await registry.fetch(new Request("https://rivo.internal/internal/rooms-config"));
      const data = await readJsonResponse(response, {});
      if (Array.isArray(data.rooms) && data.rooms.length) roomCatalog = data.rooms;
    }
    const roomMeta = roomCatalog.find((room) => room.id === roomId) || { id: roomId, name: roomId, enabled: true };
    if (roomMeta.enabled === false) return json({ error: "هذه الغرفة متوقفة حالياً." }, 403);

    const nickname = cleanNickname(url.searchParams.get("nickname"));
    const avatar = cleanAvatar(url.searchParams.get("avatar"));
    let clientId = cleanText(url.searchParams.get("clientId"), 80) || crypto.randomUUID();
    const privateOpen = url.searchParams.get("privateOpen") !== "0";

    const requestedRole = cleanText(url.searchParams.get("role"), 20);
    const requestedStaffClientId = cleanText(url.searchParams.get("staffClientId"), 80);
    const adminToken = cleanText(url.searchParams.get("adminToken"), 512);
    const staffSessionToken = cleanText(url.searchParams.get("staffSessionToken"), 5000);
    const authToken = cleanText(url.searchParams.get("authToken"), 5000);
    const badgeToken = cleanText(url.searchParams.get("badgeToken"), 5000);
    const adminVisible = url.searchParams.get("adminVisible") !== "0";

    const verifiedStaff = await verifyStaffSessionToken(
      staffSessionToken,
      this.env.SESSION_SECRET
    );
    let verifiedModeratorState = null;
    if (verifiedStaff?.role === "moderator") {
      verifiedModeratorState = await this.getGlobalModeratorState(verifiedStaff.staffId, roomId);
      const moderatorAccount = verifiedModeratorState.account;
      const versionMatches = Number(verifiedStaff.staffVersion || 0) === Number(moderatorAccount?.sessionVersion || 0);
      if (!verifiedModeratorState.active || !versionMatches) {
        return json({ error: "Moderator account disabled, expired or session revoked" }, 401);
      }
    }
    const staffIdentity = verifiedStaff
      ? { id: verifiedStaff.staffId, role: verifiedStaff.role, name: verifiedModeratorState?.account?.name || "" }
      : resolveStaffIdentity(
          this.env,
          adminToken,
          requestedRole,
          requestedStaffClientId
        );
    let role = staffIdentity?.role || "user";
    const staffClientId = staffIdentity?.id || "";
    let staffPreference = role === "user"
      ? { exists: false, name: "", avatar: "", visible: true }
      : this.getStaffPreference(role, staffClientId);
    if (role !== "user" && !staffPreference.exists) {
      this.setStaffPreference(role, staffClientId, {
        visible: adminVisible,
        name: staffIdentity?.name || nickname,
        avatar
      });
      staffPreference = this.getStaffPreference(role, staffClientId);
    }

    let googleUid = "";
    if (role === "user" && this.env.GOOGLE_CLIENT_ID) {
      const googleIdentity = await verifySessionToken(authToken, this.env.SESSION_SECRET);
      if (!googleIdentity) return json({ error: "Google sign-in required" }, 401);
      googleUid = cleanText(googleIdentity.sub, 120);
      clientId = await stableUserClientId(googleUid, this.env.SESSION_SECRET);
    }

    let vipStatus = { active: false, expiresAt: 0 };
    if (role === "user") {
      if (roomId === "lobby") {
        vipStatus = this.getVipStatus(clientId);
      } else {
        const registry = this.env.CHAT_ROOMS.getByName("lobby");
        const response = await registry.fetch(new Request("https://rivo.internal/internal/vip-status", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId })
        }));
        vipStatus = await readJsonResponse(response, { active: false, expiresAt: 0 });
      }
    }

    const isVip = role === "user" && Boolean(vipStatus.active);
    if (role === "user" && !isVip && this.getRoomStatus().ordinaryCount >= ROOM_CAPACITY) {
      return json({ error: "الغرفة ممتلئة", message: "هذه الغرفة وصلت إلى 20 مستخدماً. اختر غرفة أخرى." }, 409);
    }

    if (nickname.length < 2) {
      return json({ error: "الاسم المستعار قصير جداً" }, 400);
    }

    const activeBan = this.getActiveBan(clientId);
    if (activeBan) {
      return json({
        error: "Banned",
        message: "حسابك محظور بواسطة الإدارة.",
        banUntil: activeBan.until
      }, 403);
    }

    const flags = this.getUserFlags(clientId);
    const badgeIdentity = await verifySignedToken(badgeToken, this.env.SESSION_SECRET);
    const sessionBadge = (
      badgeIdentity?.type === "badge" &&
      badgeIdentity?.sub === clientId
    ) ? cleanText(badgeIdentity.badge, 30) : "";
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const session = {
      kind: "chat",
      sessionId: crypto.randomUUID(),
      clientId,
      nickname: role === "user" ? nickname : (staffPreference.name || nickname),
      avatar: role === "user" ? avatar : (staffPreference.avatar || avatar),
      privateOpen: privateOpen && !flags.privateBlocked,
      role,
      staffClientId,
      staffName: staffIdentity?.name || "",
      staffVersion: Number(verifiedStaff?.staffVersion || 0),
      permissions: verifiedModeratorState?.permissions || null,
      roomId,
      roomName: roomMeta.name || roomId,
      googleUid,
      isVip,
      vipExpiresAt: Number(vipStatus.expiresAt || 0),
      vipStealth: false,
      vipKickTimes: [],
      vipGiftTimes: [],
      adminVisible: role === "user" ? true : (staffPreference.exists ? staffPreference.visible : adminVisible),
      micBlocked: flags.micBlocked,
      privateBlocked: flags.privateBlocked,
      badge: sessionBadge,
      joinedAt: Date.now(),
      lastMessageAt: 0,
      lastVoiceAt: 0,
      publicTimes: [],
      privateTimes: [],
      privateWith: "",
      pendingPrivateFrom: "",
      pendingPrivateRequestId: "",
      pendingPrivateExpiresAt: 0,
      micTimes: [],
      reportTimes: [],
      lastPublicBody: "",
      lastPublicAt: 0,
      mutedUntil: 0,
      spamStrikes: 0
    };

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(session);

    this.safeSend(server, {
      type: "init",
      self: session,
      messages: this.getHistory(),
      users: this.getUsers(session),
      room: { id: roomId, name: roomMeta.name || roomId, capacity: ROOM_CAPACITY },
      roomControls: this.getRoomControls(),
      pinnedNotice: this.getPinnedNotice()
    });

    this.broadcastPresence();
    this.broadcastAdminState();

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async getGlobalModeratorState(staffId, roomId = "lobby") {
    if (!staffId) return { active: false, account: null, permissions: this.defaultModeratorPermissions() };
    if (roomId === "lobby") {
      const account = this.getModeratorAccountById(staffId);
      return { active: this.isModeratorAccountActive(account), account, permissions: this.getModeratorPermissions(staffId) };
    }
    const registry = this.env.CHAT_ROOMS.getByName("lobby");
    const response = await registry.fetch(new Request("https://rivo.internal/internal/staff-account-status", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ staffId })
    }));
    return await readJsonResponse(response, { active: false, account: null, permissions: this.defaultModeratorPermissions() });
  }

  async acceptAdminSocket(request, url) {
    const adminRoomMatch = url.pathname.match(/\/api\/rooms\/([^/]+)\/admin-ws$/);
    const adminRoomId = cleanRoom(adminRoomMatch?.[1] || "lobby");
    const token = cleanText(url.searchParams.get("token"), 512);
    const staffSessionToken = cleanText(url.searchParams.get("staffSessionToken"), 5000);
    const requestedRole = cleanText(url.searchParams.get("role"), 20);
    const requestedStaffClientId = cleanText(url.searchParams.get("staffClientId"), 80);
    const requestedVisible = url.searchParams.get("visible") !== "0";
    const verifiedStaff = await verifyStaffSessionToken(
      staffSessionToken,
      this.env.SESSION_SECRET
    );
    let verifiedModeratorState = null;
    if (verifiedStaff?.role === "moderator") {
      verifiedModeratorState = await this.getGlobalModeratorState(verifiedStaff.staffId, adminRoomId);
      const moderatorAccount = verifiedModeratorState.account;
      const versionMatches = Number(verifiedStaff.staffVersion || 0) === Number(moderatorAccount?.sessionVersion || 0);
      if (!verifiedModeratorState.active || !versionMatches) {
        return json({ error: "Moderator account disabled, expired or session revoked" }, 401);
      }
    }
    const staffIdentity = verifiedStaff
      ? { id: verifiedStaff.staffId, role: verifiedStaff.role, name: verifiedModeratorState?.account?.name || "" }
      : resolveStaffIdentity(
          this.env,
          token,
          requestedRole,
          requestedStaffClientId
        );
    const role = staffIdentity?.role || "";
    const staffClientId = staffIdentity?.id || requestedStaffClientId || crypto.randomUUID();

    if (!role) return json({ error: "Unauthorized" }, 401);
    let staffPreference = this.getStaffPreference(role, staffClientId);
    if (!staffPreference.exists) {
      this.setStaffPreference(role, staffClientId, {
        visible: requestedVisible,
        name: staffIdentity?.name || ""
      });
      staffPreference = this.getStaffPreference(role, staffClientId);
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const session = {
      kind: "admin-control",
      sessionId: crypto.randomUUID(),
      role,
      staffClientId,
      staffName: staffPreference.name || staffIdentity?.name || "",
      staffVersion: Number(verifiedStaff?.staffVersion || 0),
      permissions: verifiedModeratorState?.permissions || null,
      roomId: adminRoomId,
      joinedAt: Date.now()
    };

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(session);
    this.safeSend(server, {
      type: "admin-init",
      staff: {
        id: staffClientId,
        role,
        name: staffPreference.name || staffIdentity?.name || ""
      },
      users: this.getAdminUsers(),
      ...this.getRoomControls(),
      activeMic: this.getActiveMic(),
      bans: this.getVisibleBansForAdmin(session),
      staffVisible: this.getStaffSession(role, staffClientId)?.session.adminVisible !== false && staffPreference.visible !== false,
      staffAvatar: this.getStaffSession(role, staffClientId)?.session.avatar || staffPreference.avatar || "",
      reports: this.getVisibleReportsForAdmin(session),
      logs: this.getVisibleLogsForAdmin(session),
      moderatorPermissions: this.getVisiblePermissionListForAdmin(session),
      staffAccounts: role === "owner" ? this.getStaffAccounts() : [],
      vipRequests: role === "owner" ? this.getVipRequests() : [],
      vipMembers: role === "owner" ? this.getVipMembers() : [],
      roomCatalog: role === "owner" ? this.getRoomCatalog() : [],
      characters: role === "owner" ? this.getCharacters(true) : [],
      pinnedNotice: this.getPinnedNotice()
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  getRoomCatalog() {
    return this.sql.exec(
      `SELECT id, name, enabled, sort_order FROM room_registry ORDER BY sort_order, name`
    ).toArray().map((row) => ({
      id: row.id,
      name: row.name,
      enabled: Boolean(row.enabled),
      order: Number(row.sort_order || 0)
    }));
  }

  getRoomStatus() {
    let ordinaryCount = 0;
    let vipCount = 0;
    let staffCount = 0;
    const clients = new Set();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const session = ws.deserializeAttachment();
      if (session?.kind !== "chat" || !session.clientId || clients.has(session.clientId)) continue;
      clients.add(session.clientId);
      if (["owner", "moderator"].includes(session.role)) staffCount += 1;
      else if (session.isVip) vipCount += 1;
      else ordinaryCount += 1;
    }
    return { ordinaryCount, vipCount, staffCount, count: ordinaryCount + vipCount + staffCount, capacity: ROOM_CAPACITY };
  }

  getVipStatus(clientId) {
    if (!clientId) return { active: false, expiresAt: 0, status: "none" };
    const row = this.sql.exec(
      `SELECT client_id, nickname, enabled, created_at, expires_at FROM vip_members WHERE client_id = ? LIMIT 1`,
      clientId
    ).toArray()[0];
    if (!row) {
      const request = this.sql.exec(
        `SELECT status, requested_at, updated_at FROM vip_requests WHERE client_id = ? ORDER BY requested_at DESC LIMIT 1`,
        clientId
      ).toArray()[0];
      return { active: false, expiresAt: 0, status: request?.status || "none", requestedAt: Number(request?.requested_at || 0) };
    }
    const expiresAt = Number(row.expires_at || 0);
    const active = Boolean(row.enabled) && (expiresAt <= 0 || expiresAt > Date.now());
    return { active, enabled: Boolean(row.enabled), expiresAt, status: active ? "active" : "inactive", nickname: row.nickname || "" };
  }

  createVipRequest({ clientId, googleUid, nickname }) {
    if (!clientId) return { error: "تعذر تحديد حساب المستخدم." };
    const current = this.getVipStatus(clientId);
    if (current.active) return { ok: true, status: "active", message: "عضوية VIP مفعلة بالفعل.", membership: current };
    const pending = this.sql.exec(
      `SELECT id, status, requested_at FROM vip_requests WHERE client_id = ? AND status IN ('requested','approved','awaiting_payment') ORDER BY requested_at DESC LIMIT 1`,
      clientId
    ).toArray()[0];
    if (pending) return { ok: true, requestId: pending.id, status: pending.status, requestedAt: Number(pending.requested_at || 0), priceUsd: VIP_MONTHLY_PRICE_USD };
    const now = Date.now();
    const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO vip_requests(id, client_id, google_uid, nickname, status, price_usd, requested_at, updated_at, reviewed_by)
       VALUES(?, ?, ?, ?, 'requested', ?, ?, ?, '')`,
      id, clientId, googleUid || "", nickname || "مستخدم Rivo", VIP_MONTHLY_PRICE_USD, now, now
    );
    this.addAdminLog("system", "vip-system", "vip-request", clientId, nickname || "", `VIP $${VIP_MONTHLY_PRICE_USD}`);
    this.broadcastAdminState();
    return { ok: true, requestId: id, status: "requested", requestedAt: now, priceUsd: VIP_MONTHLY_PRICE_USD };
  }

  getVipRequests() {
    return this.sql.exec(
      `SELECT id, client_id, google_uid, nickname, status, price_usd, requested_at, updated_at, reviewed_by
       FROM vip_requests ORDER BY requested_at DESC LIMIT 300`
    ).toArray().map((row) => ({
      id: row.id, clientId: row.client_id, googleUid: row.google_uid, nickname: row.nickname, status: row.status,
      priceUsd: Number(row.price_usd || VIP_MONTHLY_PRICE_USD), requestedAt: Number(row.requested_at || 0),
      updatedAt: Number(row.updated_at || 0), reviewedBy: row.reviewed_by || ""
    }));
  }

  getVipMembers() {
    return this.sql.exec(
      `SELECT client_id, google_uid, nickname, enabled, created_at, expires_at FROM vip_members ORDER BY created_at DESC LIMIT 300`
    ).toArray().map((row) => {
      const expiresAt = Number(row.expires_at || 0);
      return {
        clientId: row.client_id, googleUid: row.google_uid, nickname: row.nickname, enabled: Boolean(row.enabled),
        createdAt: Number(row.created_at || 0), expiresAt, active: Boolean(row.enabled) && (expiresAt <= 0 || expiresAt > Date.now())
      };
    });
  }

  getCharacters(includeHidden = false) {
    const rows = this.sql.exec(
      `SELECT id, name, description, thumbnail_url, vrm_url, voice_id, dialect, vip_only, visible, sort_order, created_at
       FROM character_registry ORDER BY sort_order, created_at`
    ).toArray();
    return rows.filter((row) => includeHidden || Boolean(row.visible)).map((row) => ({
      id: row.id, name: row.name, description: row.description, thumbnailUrl: row.thumbnail_url, vrmUrl: row.vrm_url,
      voiceId: row.voice_id, dialect: row.dialect, vipOnly: Boolean(row.vip_only), visible: Boolean(row.visible),
      order: Number(row.sort_order || 0), createdAt: Number(row.created_at || 0)
    }));
  }

  getSetting(key, fallback) {
    const row = this.sql.exec(
      `SELECT value FROM room_settings WHERE key = ? LIMIT 1`,
      key
    ).toArray()[0];
    return row ? row.value : fallback;
  }

  setSetting(key, value) {
    this.sql.exec(
      `INSERT INTO room_settings(key, value) VALUES(?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      String(value)
    );
  }

  getRoomControls() {
    return {
      publicMicEnabled: this.getSetting("public_mic_enabled", "1") !== "0",
      privateMicEnabled: this.getSetting("private_mic_enabled", "0") === "1"
    };
  }

  addAdminLog(actorRole, actorId, action, targetId = "", targetName = "", details = "") {
    this.sql.exec(
      `INSERT INTO admin_logs(
         id, actor_role, actor_id, action, target_id, target_name, details, created_at
       ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      actorRole,
      actorId || "",
      action,
      targetId || "",
      targetName || "",
      details || "",
      Date.now()
    );

    this.sql.exec(
      `DELETE FROM admin_logs WHERE id IN (
         SELECT id FROM admin_logs ORDER BY created_at DESC LIMIT -1 OFFSET 500
       )`
    );
  }

  getAdminLogs() {
    return this.sql.exec(
      `SELECT id, actor_role, actor_id, action, target_id, target_name, details, created_at
       FROM admin_logs ORDER BY created_at DESC LIMIT 300`
    ).toArray().map((row) => ({
      id: row.id,
      actorRole: row.actor_role,
      actorId: row.actor_id,
      action: row.action,
      targetId: row.target_id,
      targetName: row.target_name,
      details: row.details,
      createdAt: row.created_at
    }));
  }

  getReports() {
    return this.sql.exec(
      `SELECT * FROM reports ORDER BY created_at DESC LIMIT 200`
    ).toArray().map((row) => ({
      id: row.id,
      reporterId: row.reporter_id,
      reporterNickname: row.reporter_nickname,
      targetId: row.target_id,
      targetNickname: row.target_nickname,
      reason: row.reason,
      details: row.details,
      messageId: row.message_id,
      context: JSON.parse(row.context_json || "[]"),
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by
    }));
  }

  getPinnedNotice() {
    const raw = this.getSetting("pinned_notice", "");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  setPinnedNotice(notice) {
    this.setSetting("pinned_notice", notice ? JSON.stringify(notice) : "");
  }

  generateModeratorCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const raw = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
    return `RIVO-MOD-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  }

  getModeratorAccountByCode(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode) return null;
    const row = this.sql.exec(
      `SELECT id, name, role, code, enabled, created_at, expires_at, session_version
       FROM staff_accounts WHERE code = ? AND role = 'moderator' LIMIT 1`,
      normalizedCode
    ).toArray()[0];
    return row ? {
      id: row.id,
      name: row.name,
      role: row.role,
      code: row.code,
      enabled: Boolean(row.enabled),
      createdAt: Number(row.created_at || 0),
      expiresAt: Number(row.expires_at || 0),
      sessionVersion: Number(row.session_version || 1)
    } : null;
  }

  getModeratorAccountById(id) {
    if (!id) return null;
    const row = this.sql.exec(
      `SELECT id, name, role, code, enabled, created_at, expires_at, session_version
       FROM staff_accounts WHERE id = ? AND role = 'moderator' LIMIT 1`,
      id
    ).toArray()[0];
    return row ? {
      id: row.id,
      name: row.name,
      role: row.role,
      code: row.code,
      enabled: Boolean(row.enabled),
      createdAt: Number(row.created_at || 0),
      expiresAt: Number(row.expires_at || 0),
      sessionVersion: Number(row.session_version || 1)
    } : null;
  }

  isModeratorAccountActive(account) {
    if (!account || account.enabled === false) return false;
    return Number(account.expiresAt || 0) <= 0 || Number(account.expiresAt) > Date.now();
  }

  getStaffAccounts() {
    return this.sql.exec(
      `SELECT id, name, role, code, enabled, created_at, expires_at
       FROM staff_accounts WHERE role = 'moderator' ORDER BY created_at DESC`
    ).toArray().map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      code: row.code,
      enabled: Boolean(row.enabled),
      createdAt: Number(row.created_at || 0),
      expiresAt: Number(row.expires_at || 0),
      active: Boolean(row.enabled) && (Number(row.expires_at || 0) <= 0 || Number(row.expires_at) > Date.now())
    }));
  }

  revokeModeratorSessions(accountId, message) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const session = socket.deserializeAttachment();
      if (session?.role !== "moderator" || session.staffClientId !== accountId) continue;
      this.safeSend(socket, { type: "staff-revoked", message });
      try { socket.close(4004, message || "Moderator account revoked"); } catch {}
    }
    this.broadcastPresence();
    this.broadcastAdminState();
  }

  defaultModeratorPermissions() {
    return {
      mic: true,
      private: true,
      kick: true,
      tempBan: true,
      permanentBan: false,
      gifts: true,
      reports: true,
      pin: false
    };
  }

  getModeratorPermissions(clientId) {
    const row = this.sql.exec(
      `SELECT permissions_json FROM moderator_permissions WHERE client_id = ? LIMIT 1`,
      clientId
    ).toArray()[0];

    if (!row) return this.defaultModeratorPermissions();
    try {
      return { ...this.defaultModeratorPermissions(), ...JSON.parse(row.permissions_json) };
    } catch {
      return this.defaultModeratorPermissions();
    }
  }

  getModeratorPermissionList() {
    const ids = new Set(
      this.getAdminUsers()
        .filter((user) => user.role === "moderator")
        .map((user) => user.staffClientId || user.clientId)
    );

    for (const row of this.sql.exec(
      `SELECT id AS client_id FROM staff_accounts WHERE role = 'moderator'
       UNION SELECT client_id FROM moderator_permissions`
    ).toArray()) {
      ids.add(row.client_id);
    }

    return [...ids].map((clientId) => ({
      clientId,
      permissions: this.getModeratorPermissions(clientId)
    }));
  }

  requiredPermission(action, data) {
    const map = {
      "set-public-mic": "mic",
      "set-private-mic": "private",
      "force-release-mic": "mic",
      "block-user-mic": "mic",
      "block-user-private": "private",
      "kick-user": "kick",
      "set-user-badge": "gifts",
      "resolve-report": "reports",
      "publish-pinned": "pin",
      "clear-pinned": "pin"
    };

    if (action === "ban-user") {
      return Number(data.durationMinutes || 0) <= 0 ? "permanentBan" : "tempBan";
    }

    if (action === "unban-user") {
      const existingBan = this.getActiveBan(cleanText(data.clientId, 120));
      return existingBan && Number(existingBan.until || 0) <= 0 ? "permanentBan" : "tempBan";
    }

    return map[action] || "";
  }

  canAdminAction(session, action, data) {
    if (session.role === "owner") return true;
    if (["set-staff-visible", "update-staff-avatar", "update-staff-name"].includes(action)) return true;
    if (action === "set-moderator-permissions") return false;

    const permission = this.requiredPermission(action, data);
    if (!permission) return false;
    const permissions = session.permissions || this.getModeratorPermissions(session.staffClientId);
    return Boolean(permissions?.[permission]);
  }

  trimTimes(times, windowMs) {
    const cutoff = Date.now() - windowMs;
    while (times.length && times[0] < cutoff) times.shift();
  }

  rateAllowed(times, windowMs, maximum) {
    this.trimTimes(times, windowMs);
    if (times.length >= maximum) return false;
    times.push(Date.now());
    return true;
  }

  warnSpam(ws, session, message, seconds = 20) {
    session.mutedUntil = Date.now() + seconds * 1000;
    session.spamStrikes = Number(session.spamStrikes || 0) + 1;
    ws.serializeAttachment(session);
    this.safeSend(ws, {
      type: "spam-warning",
      message,
      mutedUntil: session.mutedUntil
    });
    this.addAdminLog("system", "spam-protection", "spam-block",
      session.clientId, session.nickname, message);
    this.broadcastAdminState();
  }

  getUserBadge(clientId) {
    const row = this.sql.exec(
      `SELECT badge FROM user_badges WHERE client_id = ? LIMIT 1`,
      clientId
    ).toArray()[0];
    return row?.badge || "";
  }

  setUserBadge(clientId, badge) {
    if (badge) {
      this.sql.exec(
        `INSERT INTO user_badges(client_id, badge) VALUES(?, ?)
         ON CONFLICT(client_id) DO UPDATE SET badge = excluded.badge`,
        clientId,
        badge
      );
    } else {
      this.sql.exec(`DELETE FROM user_badges WHERE client_id = ?`, clientId);
    }
  }

  getActiveBan(clientId) {
    const row = this.sql.exec(
      `SELECT client_id, nickname, until_at
       FROM user_bans WHERE client_id = ? LIMIT 1`,
      clientId
    ).toArray()[0];

    if (!row) return null;

    if (row.until_at > 0 && row.until_at <= Date.now()) {
      this.sql.exec(`DELETE FROM user_bans WHERE client_id = ?`, clientId);
      return null;
    }

    return {
      clientId: row.client_id,
      nickname: row.nickname,
      until: row.until_at
    };
  }

  getBans() {
    this.sql.exec(
      `DELETE FROM user_bans WHERE until_at > 0 AND until_at <= ?`,
      Date.now()
    );

    return this.sql.exec(
      `SELECT client_id, nickname, until_at
       FROM user_bans ORDER BY nickname`
    ).toArray().map((row) => ({
      clientId: row.client_id,
      nickname: row.nickname,
      until: row.until_at
    }));
  }


  getVisibleBansForAdmin(session) {
    const bans = this.getBans();
    if (session?.role === "owner") return bans;
    const permissions = this.getModeratorPermissions(session?.staffClientId || "");
    return bans.filter((ban) => Number(ban.until || 0) <= 0
      ? Boolean(permissions.permanentBan)
      : Boolean(permissions.tempBan));
  }

  getVisibleReportsForAdmin(session) {
    if (session?.role === "owner") return this.getReports();
    const permissions = this.getModeratorPermissions(session?.staffClientId || "");
    return permissions.reports ? this.getReports() : [];
  }

  getVisibleLogsForAdmin(session) {
    return session?.role === "owner" ? this.getAdminLogs() : [];
  }

  getVisiblePermissionListForAdmin(session) {
    if (session?.role === "owner") return this.getModeratorPermissionList();
    const clientId = session?.staffClientId || "";
    return clientId ? [{ clientId, permissions: session.permissions || this.getModeratorPermissions(clientId) }] : [];
  }

  getStaffSession(role, staffClientId = "") {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const session = socket.deserializeAttachment();
      if (
        session?.kind === "chat" &&
        session.role === role &&
        (!staffClientId || session.staffClientId === staffClientId)
      ) {
        return { socket, session };
      }
    }
    return null;
  }

  getStaffPreference(role, staffClientId = "") {
    if (!["owner", "moderator"].includes(role) || !staffClientId) {
      return { exists: false, name: "", avatar: "", visible: true };
    }
    const row = this.sql.exec(
      `SELECT name, avatar, visible FROM staff_preferences WHERE role = ? AND staff_id = ? LIMIT 1`,
      role, staffClientId
    ).toArray()[0];
    return {
      exists: Boolean(row),
      name: cleanText(row?.name || "", 40),
      avatar: CHARACTER_PATTERN.test(String(row?.avatar || "").toLowerCase().trim())
        ? String(row.avatar).toLowerCase().trim()
        : "",
      visible: row ? Boolean(row.visible) : true
    };
  }

  setStaffPreference(role, staffClientId, patch = {}) {
    if (!["owner", "moderator"].includes(role) || !staffClientId) return;
    const current = this.getStaffPreference(role, staffClientId);
    const name = Object.prototype.hasOwnProperty.call(patch, "name")
      ? cleanText(patch.name || "", 40)
      : current.name;
    const requestedAvatar = String(patch.avatar || "").toLowerCase().trim();
    const avatar = Object.prototype.hasOwnProperty.call(patch, "avatar")
      ? (CHARACTER_PATTERN.test(requestedAvatar) ? requestedAvatar : "")
      : current.avatar;
    const visible = Object.prototype.hasOwnProperty.call(patch, "visible")
      ? Boolean(patch.visible)
      : current.visible;
    this.sql.exec(
      `INSERT INTO staff_preferences(role, staff_id, name, avatar, visible, updated_at)
       VALUES(?, ?, ?, ?, ?, ?)
       ON CONFLICT(role, staff_id) DO UPDATE SET
         name = excluded.name, avatar = excluded.avatar, visible = excluded.visible, updated_at = excluded.updated_at`,
      role, staffClientId, name, avatar, visible ? 1 : 0, Date.now()
    );
  }

  getUserFlags(clientId) {
    const row = this.sql.exec(
      `SELECT mic_blocked, private_blocked
       FROM user_flags WHERE client_id = ? LIMIT 1`,
      clientId
    ).toArray()[0];

    return {
      micBlocked: Boolean(row?.mic_blocked),
      privateBlocked: Boolean(row?.private_blocked)
    };
  }

  setUserFlag(clientId, field, blocked) {
    const current = this.getUserFlags(clientId);
    const micBlocked = field === "mic" ? Boolean(blocked) : current.micBlocked;
    const privateBlocked = field === "private" ? Boolean(blocked) : current.privateBlocked;

    this.sql.exec(
      `INSERT INTO user_flags(client_id, mic_blocked, private_blocked)
       VALUES(?, ?, ?)
       ON CONFLICT(client_id) DO UPDATE SET
         mic_blocked = excluded.mic_blocked,
         private_blocked = excluded.private_blocked`,
      clientId,
      micBlocked ? 1 : 0,
      privateBlocked ? 1 : 0
    );

    return { micBlocked, privateBlocked };
  }

  getActiveMic() {
    if (!this.activeMicClientId) return null;
    return {
      active: true,
      clientId: this.activeMicClientId,
      nickname: this.activeMicNickname,
      avatar: this.activeMicAvatar
    };
  }

  getHistory() {
    this.sql.exec(`DELETE FROM messages WHERE created_at < ?`, Date.now() - PUBLIC_RETENTION_MS);
    const rows = this.sql.exec(
      `SELECT id, client_id, nickname, avatar, role, is_vip, body, created_at
       FROM messages
       ORDER BY created_at DESC
       LIMIT ?`,
      MAX_HISTORY
    ).toArray();

    return rows.reverse().map((row) => ({
      id: row.id,
      clientId: row.client_id,
      nickname: row.nickname,
      avatar: row.avatar,
      role: row.role || "user",
      isVip: Boolean(row.is_vip),
      body: row.body,
      createdAt: row.created_at
    }));
  }

  getUsers(viewerSession = null) {
    const byClient = new Map();
    const viewerIsStaff = ["owner", "moderator"].includes(viewerSession?.role);

    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const session = ws.deserializeAttachment();
      if (session?.kind !== "chat" || !session.clientId) continue;
      if (["owner", "moderator"].includes(session.role) && session.adminVisible === false && !viewerIsStaff && session.clientId !== viewerSession?.clientId) continue;
      if (session.isVip && session.vipStealth && !viewerIsStaff && session.clientId !== viewerSession?.clientId) continue;

      const user = {
        clientId: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        privateOpen: session.privateOpen !== false && !session.privateBlocked,
        role: session.role || "user",
        isVip: Boolean(session.isVip),
        vipStealth: Boolean(session.vipStealth),
        vipExpiresAt: Number(session.vipExpiresAt || 0),
        staffClientId: session.staffClientId || "",
        adminVisible: session.adminVisible !== false,
        micBlocked: Boolean(session.micBlocked),
        privateBlocked: Boolean(session.privateBlocked),
        privateBusy: Boolean(session.privateWith),
        badge: session.badge || "",
        isGuest: Boolean(session.isGuest),
        verified: Boolean(session.googleUid && !session.isGuest && session.role === "user"),
        joinedAt: Number(session.joinedAt || Date.now())
      };

      const existing = byClient.get(user.clientId);
      if (!existing || user.joinedAt < existing.joinedAt) byClient.set(user.clientId, user);
    }

    const rank = (user) => user.role === "owner" ? 0 : user.role === "moderator" ? 1 : user.isVip ? 2 : 3;
    return [...byClient.values()].sort((a, b) =>
      rank(a) - rank(b) ||
      a.joinedAt - b.joinedAt ||
      a.nickname.localeCompare(b.nickname, "ar")
    );
  }

  getAdminUsers() {
    const byClient = new Map();

    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const session = ws.deserializeAttachment();
      if (session?.kind !== "chat" || !session.clientId) continue;

      const user = {
        clientId: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        privateOpen: session.privateOpen !== false,
        role: session.role || "user",
        isVip: Boolean(session.isVip),
        vipStealth: Boolean(session.vipStealth),
        vipExpiresAt: Number(session.vipExpiresAt || 0),
        staffClientId: session.staffClientId || "",
        adminVisible: session.adminVisible !== false,
        micBlocked: Boolean(session.micBlocked),
        privateBlocked: Boolean(session.privateBlocked),
        privateBusy: Boolean(session.privateWith),
        badge: session.badge || "",
        isGuest: Boolean(session.isGuest),
        verified: Boolean(session.googleUid && !session.isGuest && session.role === "user"),
        roomId: session.roomId || "lobby",
        roomName: session.roomName || "العامة",
        joinedAt: Number(session.joinedAt || Date.now())
      };

      const existing = byClient.get(user.clientId);
      if (!existing || user.joinedAt < existing.joinedAt) byClient.set(user.clientId, user);
    }

    const rank = (user) => user.role === "owner" ? 0 : user.role === "moderator" ? 1 : user.isVip ? 2 : 3;
    return [...byClient.values()].sort((a, b) =>
      rank(a) - rank(b) ||
      a.joinedAt - b.joinedAt ||
      a.nickname.localeCompare(b.nickname, "ar")
    );
  }

  async createBadgeSessionToken(clientId, badge) {
    if (!clientId || !this.env.SESSION_SECRET) return "";
    return await createSessionToken({
      type: "badge",
      sub: clientId,
      badge: cleanText(badge, 30),
      exp: Date.now() + 12 * 60 * 60 * 1000
    }, this.env.SESSION_SECRET);
  }

  async sendBadgeSession(socket, clientId, badge) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const token = badge ? await this.createBadgeSessionToken(clientId, badge) : "";
    this.safeSend(socket, {
      type: "badge-session",
      clientId,
      badge: cleanText(badge, 30),
      token
    });
  }

  safeSend(ws, payload) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    } catch {
      // The runtime will clean up disconnected sockets.
    }
  }

  broadcast(payload, exceptSocket = null) {
    const serialized = JSON.stringify(payload);

    for (const ws of this.ctx.getWebSockets()) {
      if (ws === exceptSocket) continue;
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(serialized);
      } catch {
        // Ignore stale connections.
      }
    }
  }

  sendToClient(clientId, payload) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const target = socket.deserializeAttachment();
      if (target?.clientId === clientId) {
        this.safeSend(socket, payload);
        return true;
      }
    }
    return false;
  }

  findClient(clientId) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const session = socket.deserializeAttachment();
      if (session?.clientId === clientId) {
        return { socket, session };
      }
    }
    return null;
  }

  endPrivateSession(clientId, message = "انتهت المحادثة الخاصة.", exceptSocket = null, partnerIdHint = "") {
    const current = this.findClient(clientId);
    const partnerId = current?.session?.privateWith || partnerIdHint || "";
    if (current) {
      current.session.privateWith = "";
      current.socket.serializeAttachment(current.session);
      if (current.socket !== exceptSocket) {
        this.safeSend(current.socket, { type: "private-ended", with: partnerId, message });
      }
    }
    if (partnerId) {
      const partner = this.findClient(partnerId);
      if (partner && partner.session.privateWith === clientId) {
        partner.session.privateWith = "";
        partner.socket.serializeAttachment(partner.session);
        this.safeSend(partner.socket, { type: "private-ended", with: clientId, message });
      }
    }
    this.broadcastPresence();
  }

  getPrivateHistory() {
    // Private history is stored locally on the user device for seven days.
    return [];
  }

  broadcastPresence() {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const session = ws.deserializeAttachment();
      if (session?.kind !== "chat") continue;
      this.safeSend(ws, {
        type: "presence",
        users: this.getUsers(session),
        at: Date.now()
      });
    }
  }

  broadcastAdminState() {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const session = ws.deserializeAttachment();
      if (session?.kind !== "admin-control") continue;

      const staffSession = this.getStaffSession(session.role, session.staffClientId);
      const staffPreference = this.getStaffPreference(session.role, session.staffClientId);
      this.safeSend(ws, {
        type: "admin-state",
        staff: {
          id: session.staffClientId || "",
          role: session.role || "moderator",
          name: session.role === "moderator"
            ? (staffPreference.name || session.staffName || this.getModeratorAccountById(session.staffClientId)?.name || "مراقب")
            : (staffSession?.session.nickname || staffPreference.name || "الإدارة")
        },
        users: this.getAdminUsers(),
        ...this.getRoomControls(),
        activeMic: this.getActiveMic(),
        bans: this.getVisibleBansForAdmin(session),
        staffVisible: staffSession ? staffSession.session.adminVisible !== false : staffPreference.visible !== false,
        staffAvatar: staffSession?.session.avatar || staffPreference.avatar || "",
        reports: this.getVisibleReportsForAdmin(session),
        logs: this.getVisibleLogsForAdmin(session),
        moderatorPermissions: this.getVisiblePermissionListForAdmin(session),
        staffAccounts: session.role === "owner" ? this.getStaffAccounts() : [],
        vipRequests: session.role === "owner" ? this.getVipRequests() : [],
        vipMembers: session.role === "owner" ? this.getVipMembers() : [],
        roomCatalog: session.role === "owner" ? this.getRoomCatalog() : [],
        characters: session.role === "owner" ? this.getCharacters(true) : [],
        pinnedNotice: this.getPinnedNotice()
      });
    }
  }

  broadcastRoomControls() {
    const payload = JSON.stringify({
      type: "room-controls",
      ...this.getRoomControls()
    });

    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const session = ws.deserializeAttachment();
      if (session?.kind !== "chat") continue;
      try { ws.send(payload); } catch {}
    }
  }

  async webSocketMessage(ws, rawMessage) {
    if (typeof rawMessage !== "string" || rawMessage.length > MAX_SOCKET_MESSAGE_LENGTH) {
      this.safeSend(ws, { type: "error", message: "البيانات المرسلة غير صالحة." });
      return;
    }

    let data;
    try {
      data = JSON.parse(rawMessage);
    } catch {
      this.safeSend(ws, { type: "error", message: "تعذر قراءة الرسالة." });
      return;
    }

    const session = ws.deserializeAttachment();
    if (!session) {
      ws.close(1011, "Missing session");
      return;
    }

    if (session.role === "moderator") {
      const state = await this.getGlobalModeratorState(session.staffClientId, session.roomId || "lobby");
      const moderatorAccount = state.account;
      const versionMatches = Number(session.staffVersion || 0) === Number(moderatorAccount?.sessionVersion || 0);
      if (!state.active || !versionMatches) {
        this.safeSend(ws, { type: "staff-revoked", message: "انتهى أو توقف اشتراك المراقب، أو تم تغيير رمز الدخول." });
        try { ws.close(4004, "Moderator account disabled, expired or session revoked"); } catch {}
        return;
      }
      session.permissions = state.permissions || session.permissions || this.defaultModeratorPermissions();
      session.staffName = moderatorAccount?.name || session.staffName || "مراقب";
      ws.serializeAttachment(session);
    }

    if (session.kind === "admin-control") {
      await this.handleAdminCommand(ws, session, data);
      return;
    }

    if (data.type === "ping") {
      this.safeSend(ws, { type: "pong", at: Date.now() });
      return;
    }

    if (data.type === "admin-command" && ["owner", "moderator"].includes(session.role)) {
      await this.handleAdminCommand(ws, session, data);
      return;
    }

    if (data.type === "vip-stealth") {
      if (!session.isVip) {
        this.safeSend(ws, { type: "error", message: "هذه الميزة خاصة بأعضاء VIP." });
        return;
      }
      session.vipStealth = Boolean(data.enabled);
      ws.serializeAttachment(session);
      this.safeSend(ws, { type: "vip-state", active: true, stealth: session.vipStealth, expiresAt: session.vipExpiresAt });
      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (data.type === "vip-gift") {
      if (!session.isVip) {
        this.safeSend(ws, { type: "error", message: "إرسال الهدايا من الدردشة خاص بأعضاء VIP." });
        return;
      }
      if (!this.rateAllowed(session.vipGiftTimes, 60000, 10)) {
        this.safeSend(ws, { type: "error", message: "تمهّل قليلاً قبل إرسال هدية أخرى." });
        return;
      }
      const targetId = cleanText(data.to, 80);
      const gift = cleanText(data.gift, 20);
      if (!targetId || targetId === session.clientId || !VIP_GIFTS.has(gift)) return;
      const target = this.findClient(targetId);
      if (!target) {
        this.safeSend(ws, { type: "error", message: "المستخدم غير متصل الآن." });
        return;
      }
      target.session.badge = gift;
      target.socket.serializeAttachment(target.session);
      await this.sendBadgeSession(target.socket, target.session.clientId, gift);
      this.broadcast({
        type: "gift-animation",
        badge: gift,
        fromClientId: session.clientId,
        fromNickname: session.nickname,
        targetClientId: target.session.clientId,
        targetNickname: target.session.nickname
      });
      this.broadcastPresence();
      this.addAdminLog("vip", session.clientId, "vip-gift", targetId, target.session.nickname, gift);
      return;
    }

    if (data.type === "vip-kick") {
      if (!session.isVip) {
        this.safeSend(ws, { type: "error", message: "هذه الصلاحية خاصة بأعضاء VIP." });
        return;
      }
      if (!this.rateAllowed(session.vipKickTimes, 10 * 60 * 1000, 2)) {
        this.safeSend(ws, { type: "error", message: "يمكنك إخراج مستخدمين اثنين فقط كل عشر دقائق." });
        return;
      }
      const targetId = cleanText(data.to, 80);
      const target = this.findClient(targetId);
      if (!target || target.session.role !== "user" || target.session.isVip) {
        this.safeSend(ws, { type: "error", message: "لا يمكنك إخراج الإدارة أو المراقبين أو أعضاء VIP." });
        return;
      }
      this.safeSend(target.socket, { type: "admin-kick", message: `أخرجك عضو VIP ${session.nickname} من هذه الغرفة. يمكنك دخول غرفة أخرى.` });
      this.addAdminLog("vip", session.clientId, "vip-kick", targetId, target.session.nickname, session.roomId || "");
      target.socket.close(4001, "Removed from room by VIP");
      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (data.type === "vip-release-mic") {
      if (!session.isVip) {
        this.safeSend(ws, { type: "error", message: "هذه الصلاحية خاصة بأعضاء VIP." });
        return;
      }
      const targetId = cleanText(data.to, 80);
      const target = this.findClient(targetId);
      if (!target || target.session.role !== "user" || target.session.isVip || this.activeMicClientId !== targetId) {
        this.safeSend(ws, { type: "error", message: "لا يمكنك إنزال هذا المستخدم من المايك." });
        return;
      }
      this.activeMicClientId = "";
      this.activeMicNickname = "";
      this.activeMicAvatar = "";
      this.safeSend(target.socket, { type: "mic-forced-release", message: "أنزلك عضو VIP من المايك." });
      this.broadcast({ type: "mic-state", active: false, clientId: targetId, nickname: target.session.nickname, avatar: target.session.avatar });
      this.addAdminLog("vip", session.clientId, "vip-release-mic", targetId, target.session.nickname, session.roomId || "");
      this.broadcastAdminState();
      return;
    }

    if (
      Number(session.mutedUntil || 0) > Date.now() &&
      ["chat", "private-chat", "mic-claim", "mic-release"].includes(data.type)
    ) {
      this.safeSend(ws, {
        type: "spam-warning",
        message: "تم إيقاف الإرسال مؤقتاً بسبب السرعة أو التكرار.",
        mutedUntil: session.mutedUntil
      });
      return;
    }

    if (data.type === "typing") {
      this.broadcast({
        type: "typing",
        clientId: session.clientId,
        nickname: session.nickname,
        active: Boolean(data.active)
      }, ws);
      return;
    }

    if (data.type === "privacy-setting") {
      session.privateOpen = Boolean(data.privateOpen);
      ws.serializeAttachment(session);
      if (!session.privateOpen && session.privateWith) {
        this.endPrivateSession(session.clientId, "أغلق المستخدم الرسائل الخاصة.");
      } else {
        this.broadcastPresence();
      }
      return;
    }

    if (data.type === "private-request") {
      const targetId = cleanText(data.to, 80);
      if (!targetId || targetId === session.clientId) return;
      const target = this.findClient(targetId);
      if (!target) {
        this.safeSend(ws, { type: "private-denied", to: targetId, message: "المستخدم غير متصل الآن." });
        return;
      }
      const now = Date.now();
      const ownerOverride = session.role === "owner";

      if (ownerOverride) {
        if (session.privateWith || target.session.privateWith) {
          this.safeSend(ws, {
            type: "private-denied",
            to: targetId,
            message: target.session.privateWith
              ? `${target.session.nickname} مشغول في الخاص الآن.`
              : "أنت مشغول في محادثة خاصة حالياً."
          });
          return;
        }

        target.session.pendingPrivateFrom = "";
        target.session.pendingPrivateRequestId = "";
        target.session.pendingPrivateExpiresAt = 0;
        session.privateWith = target.session.clientId;
        target.session.privateWith = session.clientId;
        ws.serializeAttachment(session);
        target.socket.serializeAttachment(target.session);

        this.safeSend(ws, {
          type: "private-started",
          with: target.session.clientId,
          adminOverride: true,
          peer: {
            clientId: target.session.clientId,
            nickname: target.session.nickname,
            avatar: target.session.avatar,
            role: target.session.role,
            privateOpen: true,
            privateBusy: true
          }
        });
        this.safeSend(target.socket, {
          type: "private-started",
          with: session.clientId,
          adminOverride: true,
          peer: {
            clientId: session.clientId,
            nickname: session.nickname,
            avatar: session.avatar,
            role: session.role,
            privateOpen: true,
            privateBusy: true
          }
        });
        this.broadcastPresence();
        return;
      }
      const targetPendingActive = target.session.pendingPrivateRequestId && Number(target.session.pendingPrivateExpiresAt || 0) > now;
      const senderIncomingPending = session.pendingPrivateRequestId && Number(session.pendingPrivateExpiresAt || 0) > now;
      if (
        session.privateBlocked || target.session.privateBlocked || target.session.privateOpen === false ||
        session.privateWith || target.session.privateWith || targetPendingActive || senderIncomingPending
      ) {
        const message = target.session.privateWith || targetPendingActive
          ? `${target.session.nickname} مشغول في الخاص الآن.`
          : "الرسائل الخاصة غير متاحة حالياً.";
        this.safeSend(ws, { type: "private-denied", to: targetId, message });
        return;
      }
      const requestId = crypto.randomUUID();
      target.session.pendingPrivateFrom = session.clientId;
      target.session.pendingPrivateRequestId = requestId;
      target.session.pendingPrivateExpiresAt = now + 45000;
      target.socket.serializeAttachment(target.session);
      this.safeSend(target.socket, {
        type: "private-request",
        requestId,
        from: session.clientId,
        fromNickname: session.nickname,
        fromAvatar: session.avatar,
        expiresAt: now + 45000
      });
      this.safeSend(ws, { type: "private-request-sent", requestId, to: targetId });
      return;
    }

    if (data.type === "private-response") {
      const requestId = cleanText(data.requestId, 80);
      const requesterId = session.pendingPrivateFrom || "";
      const valid = requestId && requestId === session.pendingPrivateRequestId && Number(session.pendingPrivateExpiresAt || 0) > Date.now();
      session.pendingPrivateFrom = "";
      session.pendingPrivateRequestId = "";
      session.pendingPrivateExpiresAt = 0;
      ws.serializeAttachment(session);
      if (!valid || !requesterId) return;
      const requester = this.findClient(requesterId);
      if (!requester) return;
      if (!data.accept) {
        this.safeSend(requester.socket, { type: "private-rejected", message: `${session.nickname} رفض طلب المحادثة الخاصة.` });
        return;
      }
      if (session.privateWith || requester.session.privateWith || session.privateBlocked || requester.session.privateBlocked || session.privateOpen === false) {
        this.safeSend(requester.socket, { type: "private-denied", to: session.clientId, message: "تعذر بدء الخاص لأن أحد المستخدمين أصبح مشغولاً." });
        return;
      }
      session.privateWith = requester.session.clientId;
      requester.session.privateWith = session.clientId;
      ws.serializeAttachment(session);
      requester.socket.serializeAttachment(requester.session);
      this.safeSend(ws, {
        type: "private-started",
        with: requester.session.clientId,
        peer: { clientId: requester.session.clientId, nickname: requester.session.nickname, avatar: requester.session.avatar, role: requester.session.role, privateOpen: true, privateBusy: true }
      });
      this.safeSend(requester.socket, {
        type: "private-started",
        with: session.clientId,
        peer: { clientId: session.clientId, nickname: session.nickname, avatar: session.avatar, role: session.role, privateOpen: true, privateBusy: true }
      });
      this.broadcastPresence();
      return;
    }

    if (data.type === "private-end") {
      if (session.privateWith) this.endPrivateSession(session.clientId, "أنهى المستخدم المحادثة الخاصة.");
      return;
    }

    if (data.type === "private-history-request") {
      const targetId = cleanText(data.with, 80);
      if (!targetId || targetId === session.clientId || session.privateWith !== targetId) return;

      this.safeSend(ws, {
        type: "private-history",
        with: targetId,
        messages: this.getPrivateHistory(session.clientId, targetId)
      });
      return;
    }

    if (data.type === "private-chat") {
      if (!this.rateAllowed(session.privateTimes, 20000, 8)) {
        this.warnSpam(ws, session, "تم إيقاف الرسائل الخاصة مؤقتاً بسبب السرعة.", 25);
        return;
      }

      const targetId = cleanText(data.to, 80);
      const body = cleanText(data.body, MAX_MESSAGE_LENGTH);

      if (!targetId || targetId === session.clientId || !body) return;

      const target = this.findClient(targetId);
      if (!target) {
        this.safeSend(ws, {
          type: "private-denied",
          to: targetId,
          message: "المستخدم غير متصل الآن."
        });
        return;
      }

      if (
        session.privateBlocked ||
        target.session.privateBlocked ||
        target.session.privateOpen === false ||
        session.privateWith !== targetId ||
        target.session.privateWith !== session.clientId
      ) {
        this.safeSend(ws, {
          type: "private-denied",
          to: targetId,
          message: session.privateWith !== targetId
            ? "يجب أن يوافق المستخدم على طلب الخاص أولاً."
            : `${target.session.nickname} أغلق الرسائل الخاصة.`
        });
        return;
      }

      const message = {
        id: crypto.randomUUID(),
        senderId: session.clientId,
        senderNickname: session.nickname,
        senderAvatar: session.avatar,
        recipientId: target.session.clientId,
        recipientNickname: target.session.nickname,
        recipientAvatar: target.session.avatar,
        body,
        createdAt: Date.now()
      };

      // Deliver only to the two connected users. The browser stores a bounded,
      // self-cleaning local copy; Rivo does not keep a private-message archive.

      const payload = { type: "private-message", message };
      this.safeSend(ws, payload);
      this.safeSend(target.socket, payload);
      return;
    }

    if (data.type === "report-user") {
      if (!this.rateAllowed(session.reportTimes, 300000, 3)) {
        this.safeSend(ws, {
          type: "spam-warning",
          message: "وصلت إلى الحد المؤقت للبلاغات. حاول لاحقاً."
        });
        return;
      }

      const targetId = cleanText(data.targetId, 80);
      if (!targetId || targetId === session.clientId) return;

      const target = this.findClient(targetId);
      const targetNickname = target?.session.nickname ||
        cleanText(data.targetNickname, 40) || "مستخدم";
      const context = this.getHistory()
        .filter((message) => message.clientId === targetId)
        .slice(-5);

      const report = {
        id: crypto.randomUUID(),
        reporterId: session.clientId,
        reporterNickname: session.nickname,
        targetId,
        targetNickname,
        reason: cleanText(data.reason, 40),
        details: cleanText(data.details, 400),
        messageId: cleanText(data.messageId, 80),
        context,
        status: "open",
        createdAt: Date.now()
      };

      this.sql.exec(
        `INSERT INTO reports(
          id, reporter_id, reporter_nickname, target_id, target_nickname,
          reason, details, message_id, context_json, status, created_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        report.id,
        report.reporterId,
        report.reporterNickname,
        report.targetId,
        report.targetNickname,
        report.reason,
        report.details,
        report.messageId,
        JSON.stringify(report.context),
        report.status,
        report.createdAt
      );

      this.sql.exec(
        `DELETE FROM reports WHERE status = 'resolved' AND resolved_at > 0 AND resolved_at < ?`,
        Date.now() - RESOLVED_REPORT_RETENTION_MS
      );
      this.sql.exec(
        `DELETE FROM reports WHERE id IN (
           SELECT id FROM reports ORDER BY created_at DESC LIMIT -1 OFFSET ?
         )`,
        MAX_REPORTS
      );

      this.safeSend(ws, { type: "report-received", reportId: report.id });
      this.addAdminLog("system", "report-system", "new-report",
        targetId, targetNickname, report.reason);
      this.broadcastAdminState();
      return;
    }

    if (data.type === "rtc-ready") {
      const to = cleanText(data.to, 80);
      const payload = {
        type: "rtc-ready",
        from: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        active: Boolean(data.active)
      };

      if (to) {
        payload.to = to;
        this.sendToClient(to, payload);
      } else {
        this.broadcast(payload, ws);
      }
      return;
    }

    if (data.type === "rtc-signal") {
      const to = cleanText(data.to, 80);
      const signal = data.signal;

      if (!to || !signal || typeof signal !== "object") {
        this.safeSend(ws, {
          type: "error",
          message: "بيانات ربط الصوت غير صالحة."
        });
        return;
      }

      const description = signal.description;
      const candidate = signal.candidate;

      const safeSignal = {};
      if (description && typeof description === "object") {
        const type = String(description.type || "");
        const sdp = String(description.sdp || "");
        if (!["offer", "answer", "rollback"].includes(type) || sdp.length > 20000) {
          return;
        }
        safeSignal.description = { type, sdp };
      }

      if (candidate && typeof candidate === "object") {
        const candidateText = String(candidate.candidate || "");
        if (candidateText.length > 4000) return;
        safeSignal.candidate = {
          candidate: candidateText,
          sdpMid: candidate.sdpMid == null ? null : String(candidate.sdpMid).slice(0, 100),
          sdpMLineIndex: Number.isFinite(Number(candidate.sdpMLineIndex))
            ? Number(candidate.sdpMLineIndex)
            : null,
          usernameFragment: candidate.usernameFragment == null
            ? null
            : String(candidate.usernameFragment).slice(0, 256)
        };
      }

      if (!safeSignal.description && !safeSignal.candidate) return;

      this.sendToClient(to, {
        type: "rtc-signal",
        from: session.clientId,
        to,
        signal: safeSignal
      });
      return;
    }

    if (data.type === "audio-opus") {
      // Only the user currently holding the public microphone may relay audio.
      if (!this.activeMicClientId || this.activeMicClientId !== session.clientId) return;

      const sessionId = cleanText(data.sessionId, 90);
      const mime = cleanText(data.mime, 80);
      const encoded = String(data.data || "");
      const sequence = Math.max(0, Math.min(1000000000, Number(data.seq || 0)));
      const allowedMime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus"
      ].includes(mime);

      if (!sessionId || !allowedMime || !encoded || encoded.length > 120000) return;
      if (!/^[A-Za-z0-9+/=]+$/.test(encoded)) return;

      this.broadcast({
        type: "audio-opus",
        from: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        sessionId,
        seq: sequence,
        mime,
        data: encoded
      }, ws);
      return;
    }

    if (data.type === "audio-opus-end") {
      const sessionId = cleanText(data.sessionId, 90);
      this.broadcast({
        type: "audio-opus-end",
        from: session.clientId,
        sessionId
      }, ws);
      return;
    }

    if (data.type === "mic-claim") {
      if (!this.rateAllowed(session.micTimes, 15000, 8)) {
        this.warnSpam(ws, session, "تم إيقاف تبديل المايك مؤقتاً بسبب التكرار السريع.", 20);
        return;
      }

      const controls = this.getRoomControls();

      if (!controls.publicMicEnabled) {
        this.safeSend(ws, {
          type: "mic-denied",
          to: session.clientId,
          message: "الإدارة أغلقت مايك العامة."
        });
        return;
      }

      if (session.micBlocked) {
        this.safeSend(ws, {
          type: "mic-denied",
          to: session.clientId,
          message: "الإدارة منعت المايك عن حسابك."
        });
        return;
      }

      const currentMic = this.activeMicClientId ? this.findClient(this.activeMicClientId) : null;
      const vipCanTake = Boolean(session.isVip && currentMic && currentMic.session.role === "user" && !currentMic.session.isVip);
      if (!this.activeMicClientId || this.activeMicClientId === session.clientId || vipCanTake) {
        if (vipCanTake) {
          this.safeSend(currentMic.socket, { type: "mic-forced-release", message: "أخذ عضو VIP أولوية المايك." });
        }
        this.activeMicClientId = session.clientId;
        this.activeMicNickname = session.nickname;
        this.activeMicAvatar = session.avatar;
        this.broadcast({
          type: "mic-state",
          active: true,
          clientId: session.clientId,
          nickname: session.nickname,
          avatar: session.avatar
        });
        this.broadcastAdminState();
      } else {
        this.safeSend(ws, {
          type: "mic-denied",
          to: session.clientId,
          clientId: this.activeMicClientId,
          nickname: this.activeMicNickname,
          avatar: this.activeMicAvatar
        });
      }
      return;
    }

    if (data.type === "mic-release") {
      if (this.activeMicClientId && this.activeMicClientId === session.clientId) {
        this.activeMicClientId = "";
        this.activeMicNickname = "";
        this.activeMicAvatar = "";
        this.broadcast({
          type: "mic-state",
          active: false,
          clientId: session.clientId,
          nickname: session.nickname,
          avatar: session.avatar
        });
        this.broadcast({
          type: "audio-opus-end",
          from: session.clientId,
          sessionId: ""
        }, ws);
        this.broadcastAdminState();
      }
      return;
    }

    if (data.type === "voice-state") {
      const now = Date.now();
      if (now - Number(session.lastVoiceAt || 0) < 75) return;
      session.lastVoiceAt = now;
      ws.serializeAttachment(session);

      const level = Math.max(0, Math.min(1, Number(data.level || 0)));
      this.broadcast({
        type: "voice-state",
        clientId: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        active: Boolean(data.active),
        level,
        laugh: Boolean(data.laugh)
      }, ws);
      return;
    }

    if (data.type === "profile") {
      const nextNickname = cleanNickname(data.nickname);
      const nextAvatar = cleanAvatar(data.avatar);

      if (nextNickname.length < 2) {
        this.safeSend(ws, { type: "error", message: "الاسم المستعار قصير جداً." });
        return;
      }

      session.nickname = nextNickname;
      session.avatar = nextAvatar;
      ws.serializeAttachment(session);
      this.broadcastPresence();
      return;
    }

    if (data.type !== "chat") return;

    const now = Date.now();
    const body = cleanText(data.body, MAX_MESSAGE_LENGTH);
    if (!body) return;

    const duplicate = (
      session.lastPublicBody === body &&
      now - Number(session.lastPublicAt || 0) < 10000
    );

    if (!this.rateAllowed(session.publicTimes, 10000, 5) || duplicate) {
      this.warnSpam(
        ws,
        session,
        "تمهّل: الرسائل سريعة جداً أو مكررة.",
        Math.min(60, 15 + Number(session.spamStrikes || 0) * 10)
      );
      return;
    }

    session.lastMessageAt = now;
    session.lastPublicBody = body;
    session.lastPublicAt = now;
    ws.serializeAttachment(session);

    const message = {
      id: crypto.randomUUID(),
      clientId: session.clientId,
      nickname: session.nickname,
      avatar: session.avatar,
      role: session.role || "user",
      isVip: Boolean(session.isVip),
      isGuest: Boolean(session.isGuest),
      verified: Boolean(session.googleUid && !session.isGuest && session.role === "user"),
      badge: session.badge || "",
      body,
      createdAt: now
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
        Date.now() - PUBLIC_RETENTION_MS
      );
      this.sql.exec(
        `DELETE FROM messages
         WHERE id IN (
           SELECT id FROM messages
           ORDER BY created_at DESC
           LIMIT -1 OFFSET ?
         )`,
        MAX_STORED_MESSAGES
      );
    } catch (error) {
      console.error("Failed to persist chat message", error);
      this.safeSend(ws, { type: "error", message: "تعذر حفظ الرسالة. حاول مرة أخرى." });
      return;
    }

    this.broadcast({ type: "message", message });
  }

  async handleAdminCommand(ws, session, data) {
    if (data.type === "ping") {
      this.safeSend(ws, { type: "pong", at: Date.now() });
      return;
    }

    if (data.type !== "admin-command") return;

    const action = cleanText(data.action, 60);
    const targetId = cleanText(data.clientId, 80);

    if (!this.canAdminAction(session, action, data)) {
      this.safeSend(ws, {
        type: "admin-error",
        message: "ليست لديك صلاحية تنفيذ هذا الإجراء."
      });
      this.addAdminLog(
        session.role,
        session.staffClientId,
        `denied:${action}`,
        targetId,
        cleanText(data.nickname, 40),
        "permission denied"
      );
      this.broadcastAdminState();
      return;
    }

    if (session.role === "moderator" && [
      "block-user-mic", "block-user-private", "kick-user", "ban-user", "set-user-badge"
    ].includes(action)) {
      const target = this.findClient(targetId);
      if (target && target.session.role !== "user") {
        this.safeSend(ws, {
          type: "admin-error",
          message: "لا يستطيع المراقب تنفيذ هذا الإجراء على المالك أو مراقب آخر."
        });
        this.addAdminLog(
          session.role,
          session.staffClientId,
          `denied-target:${action}`,
          targetId,
          cleanText(data.nickname, 40),
          "staff target denied"
        );
        return;
      }
    }

    this.addAdminLog(
      session.role,
      session.staffClientId,
      action,
      targetId,
      cleanText(data.nickname, 40),
      ""
    );

    if (action === "approve-vip-request") {
      if (session.role !== "owner") return;
      const requestId = cleanText(data.requestId, 80);
      this.sql.exec(
        `UPDATE vip_requests SET status = 'approved', updated_at = ?, reviewed_by = ? WHERE id = ?`,
        Date.now(), session.staffClientId || "owner-main", requestId
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "reject-vip-request") {
      if (session.role !== "owner") return;
      const requestId = cleanText(data.requestId, 80);
      this.sql.exec(
        `UPDATE vip_requests SET status = 'rejected', updated_at = ?, reviewed_by = ? WHERE id = ?`,
        Date.now(), session.staffClientId || "owner-main", requestId
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "activate-vip-request") {
      if (session.role !== "owner") return;
      const requestId = cleanText(data.requestId, 80);
      const requestRow = this.sql.exec(
        `SELECT client_id, google_uid, nickname FROM vip_requests WHERE id = ? LIMIT 1`, requestId
      ).toArray()[0];
      if (!requestRow) return;
      const existing = this.sql.exec(
        `SELECT expires_at FROM vip_members WHERE client_id = ? LIMIT 1`, requestRow.client_id
      ).toArray()[0];
      const expiresAt = Math.max(Date.now(), Number(existing?.expires_at || 0)) + 30 * 24 * 60 * 60 * 1000;
      this.sql.exec(
        `INSERT INTO vip_members(client_id, google_uid, nickname, enabled, created_at, expires_at)
         VALUES(?, ?, ?, 1, ?, ?)
         ON CONFLICT(client_id) DO UPDATE SET google_uid = excluded.google_uid, nickname = excluded.nickname, enabled = 1, expires_at = excluded.expires_at`,
        requestRow.client_id, requestRow.google_uid || "", requestRow.nickname || "", Date.now(), expiresAt
      );
      this.sql.exec(
        `UPDATE vip_requests SET status = 'active', updated_at = ?, reviewed_by = ? WHERE id = ?`,
        Date.now(), session.staffClientId || "owner-main", requestId
      );
      const target = this.findClient(requestRow.client_id);
      if (target) {
        target.session.isVip = true;
        target.session.vipExpiresAt = expiresAt;
        target.socket.serializeAttachment(target.session);
        this.safeSend(target.socket, { type: "vip-state", active: true, stealth: Boolean(target.session.vipStealth), expiresAt });
      }
      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "toggle-vip-member") {
      if (session.role !== "owner" || !targetId) return;
      const enabled = data.enabled ? 1 : 0;
      this.sql.exec(`UPDATE vip_members SET enabled = ? WHERE client_id = ?`, enabled, targetId);
      const target = this.findClient(targetId);
      if (target) {
        target.session.isVip = Boolean(enabled) && Number(target.session.vipExpiresAt || 0) > Date.now();
        if (!target.session.isVip) target.session.vipStealth = false;
        target.socket.serializeAttachment(target.session);
        this.safeSend(target.socket, { type: "vip-state", active: Boolean(target.session.isVip), stealth: Boolean(target.session.vipStealth), expiresAt: target.session.vipExpiresAt || 0 });
      }
      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "renew-vip-member") {
      if (session.role !== "owner" || !targetId) return;
      const row = this.sql.exec(`SELECT expires_at FROM vip_members WHERE client_id = ? LIMIT 1`, targetId).toArray()[0];
      if (!row) return;
      const days = Math.max(1, Math.min(3650, Number(data.days || 30)));
      const expiresAt = Math.max(Date.now(), Number(row.expires_at || 0)) + days * 24 * 60 * 60 * 1000;
      this.sql.exec(`UPDATE vip_members SET enabled = 1, expires_at = ? WHERE client_id = ?`, expiresAt, targetId);
      const target = this.findClient(targetId);
      if (target) {
        target.session.isVip = true;
        target.session.vipExpiresAt = expiresAt;
        target.socket.serializeAttachment(target.session);
        this.safeSend(target.socket, { type: "vip-state", active: true, stealth: Boolean(target.session.vipStealth), expiresAt });
      }
      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "create-room") {
      if (session.role !== "owner") return;
      const id = cleanRoom(data.roomId || cleanText(data.name, 40).toLowerCase().replace(/\s+/g, "-"));
      const name = cleanText(data.name, 40);
      if (!id || !name) return;
      const count = Number(this.sql.exec(`SELECT COUNT(*) AS count FROM room_registry`).toArray()[0]?.count || 0);
      if (count >= 30) { this.safeSend(ws, { type: "admin-error", message: "وصلت إلى الحد الأقصى للغرف." }); return; }
      this.sql.exec(
        `INSERT INTO room_registry(id, name, enabled, sort_order) VALUES(?, ?, 1, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, enabled = 1`,
        id, name, count
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "update-room") {
      if (session.role !== "owner") return;
      const roomId = cleanRoom(data.roomId);
      if (!roomId) return;
      const name = cleanText(data.name, 40);
      this.sql.exec(
        `UPDATE room_registry SET name = COALESCE(NULLIF(?, ''), name), enabled = ?, sort_order = ? WHERE id = ?`,
        name, data.enabled === false ? 0 : 1, Math.max(0, Math.min(999, Number(data.order || 0))), roomId
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "delete-room") {
      if (session.role !== "owner") return;
      const roomId = cleanRoom(data.roomId);
      if (!roomId || roomId === "lobby") return;
      this.sql.exec(`DELETE FROM room_registry WHERE id = ?`, roomId);
      this.broadcastAdminState();
      return;
    }

    if (action === "save-character") {
      if (session.role !== "owner") return;
      const id = cleanAvatar(data.characterId || data.id);
      const name = cleanText(data.name, 40);
      const vrmUrl = cleanText(data.vrmUrl, 500);
      if (!id || !name || !vrmUrl) { this.safeSend(ws, { type: "admin-error", message: "اسم الشخصية وملف VRM مطلوبان." }); return; }
      const existing = this.sql.exec(`SELECT created_at FROM character_registry WHERE id = ? LIMIT 1`, id).toArray()[0];
      this.sql.exec(
        `INSERT INTO character_registry(id, name, description, thumbnail_url, vrm_url, voice_id, dialect, vip_only, visible, sort_order, created_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, thumbnail_url = excluded.thumbnail_url,
           vrm_url = excluded.vrm_url, voice_id = excluded.voice_id, dialect = excluded.dialect, vip_only = excluded.vip_only,
           visible = excluded.visible, sort_order = excluded.sort_order`,
        id, name, cleanText(data.description, 300), cleanText(data.thumbnailUrl, 500), vrmUrl, cleanText(data.voiceId, 100),
        cleanText(data.dialect, 80), data.vipOnly ? 1 : 0, data.visible === false ? 0 : 1,
        Math.max(0, Math.min(999, Number(data.order || 0))), Number(existing?.created_at || Date.now())
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "delete-character") {
      if (session.role !== "owner") return;
      const id = cleanAvatar(data.characterId || data.id);
      if (!id || id === "lina") return;
      this.sql.exec(`DELETE FROM character_registry WHERE id = ?`, id);
      this.broadcastAdminState();
      return;
    }

    if (action === "create-moderator-account") {
      if (session.role !== "owner") return;
      const name = cleanText(data.name || "مراقب جديد", 40) || "مراقب جديد";
      const durationDays = Math.max(0, Math.min(3650, Number(data.durationDays ?? 30)));
      const now = Date.now();
      const id = `moderator-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      let code = this.generateModeratorCode();
      while (this.getModeratorAccountByCode(code)) code = this.generateModeratorCode();
      const expiresAt = durationDays <= 0 ? 0 : now + durationDays * 24 * 60 * 60 * 1000;
      this.sql.exec(
        `INSERT INTO staff_accounts(id, name, role, code, enabled, created_at, expires_at)
         VALUES(?, ?, 'moderator', ?, 1, ?, ?)`,
        id, name, code, now, expiresAt
      );
      this.sql.exec(
        `INSERT OR IGNORE INTO moderator_permissions(client_id, permissions_json) VALUES(?, ?)`,
        id, JSON.stringify(this.defaultModeratorPermissions())
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "toggle-moderator-account") {
      if (session.role !== "owner" || !targetId) return;
      const enabled = data.enabled ? 1 : 0;
      this.sql.exec(
        `UPDATE staff_accounts SET enabled = ?, session_version = session_version + 1 WHERE id = ?`,
        enabled,
        targetId
      );
      if (!enabled) this.revokeModeratorSessions(targetId, "أوقف المالك اشتراك المراقب.");
      this.broadcastAdminState();
      return;
    }

    if (action === "renew-moderator-account") {
      if (session.role !== "owner" || !targetId) return;
      const account = this.getModeratorAccountById(targetId);
      if (!account) return;
      const durationDays = Math.max(1, Math.min(3650, Number(data.durationDays || 30)));
      const base = Math.max(Date.now(), Number(account.expiresAt || 0));
      const expiresAt = base + durationDays * 24 * 60 * 60 * 1000;
      this.sql.exec(
        `UPDATE staff_accounts
         SET expires_at = ?, enabled = 1, session_version = session_version + 1
         WHERE id = ?`,
        expiresAt,
        targetId
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "rotate-moderator-code") {
      if (session.role !== "owner" || !targetId) return;
      let code = this.generateModeratorCode();
      while (this.getModeratorAccountByCode(code)) code = this.generateModeratorCode();
      this.sql.exec(
        `UPDATE staff_accounts SET code = ?, session_version = session_version + 1 WHERE id = ?`,
        code,
        targetId
      );
      this.revokeModeratorSessions(targetId, "غيّر المالك رمز دخول المراقب. استخدم الرمز الجديد.");
      this.broadcastAdminState();
      return;
    }

    if (action === "delete-moderator-account") {
      if (session.role !== "owner" || !targetId) return;
      this.revokeModeratorSessions(targetId, "حذف المالك حساب المراقب.");
      this.sql.exec(`DELETE FROM staff_accounts WHERE id = ?`, targetId);
      this.sql.exec(`DELETE FROM moderator_permissions WHERE client_id = ?`, targetId);
      this.broadcastAdminState();
      return;
    }

    if (action === "set-moderator-permissions") {
      if (session.role !== "owner" || !targetId) return;
      const permissions = {
        ...this.defaultModeratorPermissions(),
        ...(data.permissions || {})
      };
      this.sql.exec(
        `INSERT INTO moderator_permissions(client_id, permissions_json) VALUES(?, ?)
         ON CONFLICT(client_id) DO UPDATE SET permissions_json = excluded.permissions_json`,
        targetId,
        JSON.stringify(permissions)
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "resolve-report") {
      const reportId = cleanText(data.reportId, 80);
      this.sql.exec(
        `UPDATE reports SET status = 'resolved', resolved_at = ?, resolved_by = ?
         WHERE id = ?`,
        Date.now(),
        session.staffClientId || "",
        reportId
      );
      this.broadcastAdminState();
      return;
    }

    if (action === "publish-pinned") {
      const text = cleanText(data.text, 500);
      if (!text) return;
      const notice = {
        id: crypto.randomUUID(),
        kind: data.kind === "announcement" ? "announcement" : "pinned",
        text,
        actorRole: session.role,
        createdAt: Date.now()
      };
      this.setPinnedNotice(notice);
      this.broadcast({ type: "pinned-notice", notice });
      this.broadcastAdminState();
      return;
    }

    if (action === "clear-pinned") {
      this.setPinnedNotice(null);
      this.broadcast({ type: "pinned-notice", notice: null });
      this.broadcastAdminState();
      return;
    }

    if (action === "set-public-mic") {
      this.setSetting("public_mic_enabled", data.enabled ? "1" : "0");
      this.broadcastRoomControls();

      if (!data.enabled && this.activeMicClientId) {
        const activeId = this.activeMicClientId;
        this.sendToClient(activeId, { type: "admin-force-mic-off" });
        this.activeMicClientId = "";
        this.activeMicNickname = "";
        this.activeMicAvatar = "";
        this.broadcast({
          type: "mic-state",
          active: false,
          clientId: activeId,
          nickname: "",
          avatar: ""
        });
      }

      this.broadcastAdminState();
      return;
    }

    if (action === "set-private-mic") {
      this.setSetting("private_mic_enabled", data.enabled ? "1" : "0");
      this.broadcastRoomControls();
      this.broadcastAdminState();
      return;
    }

    if (action === "force-release-mic") {
      const activeId = this.activeMicClientId;
      if (activeId) {
        this.sendToClient(activeId, { type: "admin-force-mic-off" });
        this.activeMicClientId = "";
        this.activeMicNickname = "";
        this.activeMicAvatar = "";
        this.broadcast({
          type: "mic-state",
          active: false,
          clientId: activeId,
          nickname: "",
          avatar: ""
        });
      }
      this.broadcastAdminState();
      return;
    }

    if (action === "set-staff-visible") {
      const visible = Boolean(data.visible);
      this.setStaffPreference(session.role, session.staffClientId, { visible });

      for (const socket of this.ctx.getWebSockets()) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        const target = socket.deserializeAttachment();

        if (
          target?.kind === "chat" &&
          target.role === session.role &&
          target.staffClientId === session.staffClientId
        ) {
          target.adminVisible = visible;
          socket.serializeAttachment(target);
          this.safeSend(socket, {
            type: "profile-updated",
            clientId: target.clientId,
            adminVisible: visible
          });
        }
      }

      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "update-staff-avatar") {
      const allowed = new Set(["lina","girl2","girl3","girl4","man1","avatar6","avatar7"]);
      const avatar = cleanText(data.avatar, 30);
      if (!allowed.has(avatar)) return;
      this.setStaffPreference(session.role, session.staffClientId, { avatar });

      for (const socket of this.ctx.getWebSockets()) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        const target = socket.deserializeAttachment();

        if (
          target?.kind === "chat" &&
          target.role === session.role &&
          target.staffClientId === session.staffClientId
        ) {
          target.avatar = avatar;
          socket.serializeAttachment(target);
          this.safeSend(socket, {
            type: "profile-updated",
            clientId: target.clientId,
            avatar
          });
        }
      }

      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "update-staff-name") {
      if (session.role !== "owner") return;
      const name = cleanNickname(data.name);
      if (!name || (name.length < 2 && name !== "__rivo_crown_only__")) return;
      this.setStaffPreference(session.role, session.staffClientId, { name });
      session.staffName = name;
      ws.serializeAttachment(session);

      for (const socket of this.ctx.getWebSockets()) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        const target = socket.deserializeAttachment();
        if (target?.kind === "chat" && target.role === "owner" && target.staffClientId === session.staffClientId) {
          target.nickname = name;
          socket.serializeAttachment(target);
          this.safeSend(socket, { type: "profile-updated", clientId: target.clientId, nickname: name });
        }
      }
      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "set-user-badge" && targetId) {
      const allowed = new Set(["","star","diamond","ruby","heart","emerald"]);
      const badge = cleanText(data.badge, 30);
      if (!allowed.has(badge)) return;

      for (const socket of this.ctx.getWebSockets()) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        const target = socket.deserializeAttachment();

        if (target?.kind === "chat" && target.clientId === targetId) {
          target.badge = badge;
          socket.serializeAttachment(target);
          await this.sendBadgeSession(socket, targetId, badge);
        }
      }

      this.broadcast({
        type: "badge-updated",
        clientId: targetId,
        badge
      });

      if (badge) {
        this.broadcast({
          type: "gift-animation",
          clientId: targetId,
          nickname: cleanText(data.nickname, 40),
          badge
        });
      }

      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "ban-user" && targetId) {
      const duration = Math.max(0, Number(data.durationMinutes || 0));
      const until = duration > 0 ? Date.now() + duration * 60000 : 0;
      const nickname = cleanText(data.nickname, 40);

      this.sql.exec(
        `INSERT INTO user_bans(client_id, nickname, until_at) VALUES(?, ?, ?)
         ON CONFLICT(client_id) DO UPDATE SET
           nickname = excluded.nickname,
           until_at = excluded.until_at`,
        targetId,
        nickname,
        until
      );

      for (const socket of this.ctx.getWebSockets()) {
        if (socket.readyState !== WebSocket.OPEN) continue;
        const target = socket.deserializeAttachment();

        if (target?.kind === "chat" && target.clientId === targetId && target.role !== "owner") {
          this.safeSend(socket, {
            type: "admin-ban",
            message: until > 0
              ? "تم حظر حسابك مؤقتاً بواسطة الإدارة."
              : "تم حظر حسابك بصورة دائمة بواسطة الإدارة.",
            banUntil: until
          });
          socket.close(4003, "Banned by admin");
        }
      }

      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "unban-user" && targetId) {
      this.sql.exec(`DELETE FROM user_bans WHERE client_id = ?`, targetId);
      this.broadcastAdminState();
      return;
    }

    if (action === "block-user-mic" && targetId) {
      const flags = this.setUserFlag(targetId, "mic", Boolean(data.blocked));
      const target = this.findClient(targetId);
      if (target) {
        target.session.micBlocked = flags.micBlocked;
        target.socket.serializeAttachment(target.session);
        this.safeSend(target.socket, {
          type: "user-restrictions",
          clientId: targetId,
          ...flags
        });
        if (flags.micBlocked && this.activeMicClientId === targetId) {
          this.safeSend(target.socket, { type: "admin-force-mic-off" });
          this.activeMicClientId = "";
          this.activeMicNickname = "";
          this.activeMicAvatar = "";
        }
      }
      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "block-user-private" && targetId) {
      const flags = this.setUserFlag(targetId, "private", Boolean(data.blocked));
      const target = this.findClient(targetId);
      if (target) {
        target.session.privateBlocked = flags.privateBlocked;
        if (flags.privateBlocked) target.session.privateOpen = false;
        target.socket.serializeAttachment(target.session);
        if (flags.privateBlocked && target.session.privateWith) {
          this.endPrivateSession(targetId, "أوقفت الإدارة المحادثة الخاصة لهذا المستخدم.");
        }
        this.safeSend(target.socket, {
          type: "user-restrictions",
          clientId: targetId,
          ...flags
        });
      }
      this.broadcastPresence();
      this.broadcastAdminState();
      return;
    }

    if (action === "kick-user" && targetId) {
      const target = this.findClient(targetId);
      if (target && target.session.role !== "owner") {
        this.safeSend(target.socket, {
          type: "admin-kick",
          message: "تم إخراجك من الدردشة بواسطة الإدارة."
        });
        target.socket.close(4001, "Removed by admin");
      }
      this.broadcastAdminState();
    }
  }

  webSocketClose(ws) {
    const session = ws.deserializeAttachment();
    if (session?.kind === "chat") {
      this.broadcast({
        type: "voice-state",
        clientId: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        active: false,
        level: 0,
        laugh: false
      }, ws);
      this.broadcast({
        type: "rtc-ready",
        from: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        active: false
      }, ws);
      this.broadcast({
        type: "audio-opus-end",
        from: session.clientId,
        sessionId: ""
      }, ws);
      if (this.activeMicClientId && this.activeMicClientId === session.clientId) {
        this.activeMicClientId = "";
        this.activeMicNickname = "";
        this.activeMicAvatar = "";
        this.broadcast({
          type: "mic-state",
          active: false,
          clientId: session.clientId,
          nickname: session.nickname,
          avatar: session.avatar
        }, ws);
      }
    }
    if (session?.kind === "chat" && session.privateWith) {
      this.endPrivateSession(session.clientId, "انتهت المحادثة لأن المستخدم غادر.", ws, session.privateWith);
    } else {
      this.broadcastPresence();
    }
    this.broadcastAdminState();
  }

  webSocketError(ws) {
    const session = ws.deserializeAttachment();
    if (session?.kind === "chat") {
      this.broadcast({
        type: "voice-state",
        clientId: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        active: false,
        level: 0,
        laugh: false
      }, ws);
      this.broadcast({
        type: "rtc-ready",
        from: session.clientId,
        nickname: session.nickname,
        avatar: session.avatar,
        active: false
      }, ws);
      this.broadcast({
        type: "audio-opus-end",
        from: session.clientId,
        sessionId: ""
      }, ws);
      if (this.activeMicClientId && this.activeMicClientId === session.clientId) {
        this.activeMicClientId = "";
        this.activeMicNickname = "";
        this.activeMicAvatar = "";
        this.broadcast({
          type: "mic-state",
          active: false,
          clientId: session.clientId,
          nickname: session.nickname,
          avatar: session.avatar
        }, ws);
      }
    }
    if (session?.kind === "chat" && session.privateWith) {
      this.endPrivateSession(session.clientId, "انتهت المحادثة لأن الاتصال انقطع.", ws, session.privateWith);
    } else {
      this.broadcastPresence();
    }
    this.broadcastAdminState();
  }
}
