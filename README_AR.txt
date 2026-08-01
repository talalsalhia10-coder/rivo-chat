Rivo Chat v142 — خادم الدردشة المستقل
=====================================

هذا المشروع يُنشر مرة واحدة كـ Cloudflare Worker على:
https://chat.rivolove.com

لا يحتاج Node.js على حاسوبك عند استخدام Cloudflare Builds مع GitHub أو GitLab.

الإعدادات المطلوبة داخل Cloudflare Worker > Settings > Variables and Secrets:

GOOGLE_CLIENT_ID = Google Web Client ID
SESSION_SECRET   = رمز عشوائي طويل جداً (Secret)
ADMIN_TOKEN      = رمز دخول الإدارة (Secret)
STAFF_ACCOUNTS   = اختياري، حسابات مراقبين أولية بصيغة JSON

الربط المطلوب موجود داخل wrangler.jsonc:
CHAT_ROOMS -> Durable Object class: ChatRoom

خطوات النشر مرة واحدة:
1) أنشئ مستودعاً جديداً في GitHub أو GitLab.
2) فك هذا ZIP وارفع محتوياته إلى المستودع (لا ترفع المجلد الخارجي نفسه).
3) Cloudflare > Workers & Pages > Create application > Import a repository.
4) اختر المستودع ثم Save and Deploy.
5) افتح Worker > Settings > Variables and Secrets وأضف القيم أعلاه.
6) Settings > Domains & Routes > Add Custom Domain > chat.rivolove.com
7) في Google OAuth أضف https://chat.rivolove.com إلى Authorized JavaScript origins.

روابط بعد النشر:
الدردشة: https://chat.rivolove.com/
الإدارة: https://chat.rivolove.com/admin.html
الفحص:   https://chat.rivolove.com/api/health

ملاحظة:
ملفات الشخصيات الأساسية داخل المشروع. رفع شخصيات جديدة من لوحة الإدارة يحتاج R2 Binding اختياري باسم CHARACTER_ASSETS.
