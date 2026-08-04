import originalWorker, { ChatRoom as BaseChatRoom } from "./index.js";

const MAX_SOCKET_MESSAGE_LENGTH = 30000;
const EXTRA_GIFTS = new Set([
  "rose", "butterfly", "blossom", "moon", "pinkHeart",
  "crystal", "medal", "wings", "flame", "galaxy"
]);

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export default originalWorker;

export class ChatRoom extends BaseChatRoom {
  async webSocketMessage(ws, rawMessage) {
    if (typeof rawMessage === "string" && rawMessage.length <= MAX_SOCKET_MESSAGE_LENGTH) {
      let data = null;
      try { data = JSON.parse(rawMessage); } catch {}
      const session = ws.deserializeAttachment?.();
      const gift = cleanText(data?.gift, 20);

      // تظل رسائل الإدارة والمراقبين تمر أولاً عبر التحقق الأصلي الكامل.
      if (
        data?.type === "vip-gift" &&
        session?.kind === "chat" &&
        session.role !== "moderator" &&
        EXTRA_GIFTS.has(gift)
      ) {
        return this.handleExpandedVipGift(ws, session, data, gift);
      }
    }
    return super.webSocketMessage(ws, rawMessage);
  }

  async handleExpandedVipGift(ws, session, data, gift) {
    if (!session.isVip) {
      this.safeSend(ws, { type: "error", message: "إرسال الهدايا من الدردشة خاص بأعضاء VIP." });
      return;
    }
    if (!Array.isArray(session.vipGiftTimes)) session.vipGiftTimes = [];
    if (!this.rateAllowed(session.vipGiftTimes, 60000, 10)) {
      this.safeSend(ws, { type: "error", message: "تمهّل قليلاً قبل إرسال هدية أخرى." });
      return;
    }

    const targetId = cleanText(data.to, 80);
    if (!targetId || targetId === session.clientId) return;
    const target = this.findClient(targetId);
    if (!target) {
      this.safeSend(ws, { type: "error", message: "المستخدم غير متصل الآن." });
      return;
    }

    ws.serializeAttachment(session);
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
  }

  async handleAdminCommand(ws, session, data) {
    const action = cleanText(data?.action, 60);
    const badge = cleanText(data?.badge, 30);
    if (data?.type !== "admin-command" || action !== "set-user-badge" || !EXTRA_GIFTS.has(badge)) {
      return await super.handleAdminCommand(ws, session, data);
    }

    const targetId = cleanText(data.clientId, 80);
    if (!targetId) return;

    if (!this.canAdminAction(session, action, data)) {
      this.safeSend(ws, { type: "admin-error", message: "ليست لديك صلاحية تنفيذ هذا الإجراء." });
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

    if (session.role === "moderator") {
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

    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const target = socket.deserializeAttachment();
      if (target?.kind === "chat" && target.clientId === targetId) {
        target.badge = badge;
        socket.serializeAttachment(target);
        await this.sendBadgeSession(socket, targetId, badge);
      }
    }

    this.broadcast({ type: "badge-updated", clientId: targetId, badge });
    this.broadcast({
      type: "gift-animation",
      clientId: targetId,
      nickname: cleanText(data.nickname, 40),
      badge
    });
    this.broadcastPresence();
    this.broadcastAdminState();
  }
}
