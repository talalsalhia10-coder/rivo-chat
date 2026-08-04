import { readFile, readdir, stat, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const roots = ["public", "src"];
const jsFiles = [];
const publicFiles = [];

async function walk(dir, collector, suffix = null) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path, collector, suffix);
    else if (entry.isFile() && (!suffix || path.endsWith(suffix))) collector.push(path);
  }
}

for (const root of roots) await walk(root, jsFiles, ".js");
await walk("public", publicFiles);

const MAX_STATIC_ASSET_BYTES = 25 * 1024 * 1024;
for (const file of publicFiles) {
  const info = await stat(file);
  if (info.size > MAX_STATIC_ASSET_BYTES) {
    console.error(`Cloudflare static asset exceeds 25 MiB: ${file} (${info.size} bytes)`);
    process.exit(1);
  }
}

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

const requiredFiles = [
  "public/index.html", "public/app.js", "public/styles.css", "public/live-bridge.js",
  "public/google-auth.js", "public/google-config.js", "public/relay-audio.js",
  "public/admin.html", "public/admin.js", "public/moderator.html", "public/legacy.html",
  "src/index.js", "src/index-gifts.js", "src/index-radio.js", "wrangler.jsonc"
];
for (const file of requiredFiles) {
  try { await access(file); }
  catch { console.error(`Required merged file is missing: ${file}`); process.exit(1); }
}

const home = await readFile("public/index.html", "utf8");
const bridge = await readFile("public/live-bridge.js", "utf8");
const worker = await readFile("src/index.js", "utf8");
const gifts = await readFile("src/index-gifts.js", "utf8");
const radio = await readFile("src/index-radio.js", "utf8");
const wrangler = await readFile("wrangler.jsonc", "utf8");
const legacy = await readFile("public/legacy.html", "utf8");

const checks = [
  [home.includes("دردشة ريفو العراقية"), "New Rivo desktop UI title is missing"],
  [home.includes("live-bridge.js"), "Live bridge is not loaded by the new UI"],
  [home.includes("accounts.google.com/gsi/client"), "Google Identity script is missing"],
  [home.includes('id="googleAuthModal"'), "Google login modal is missing"],
  [bridge.includes('/api/auth/google') || bridge.includes('RivoGoogleAuth'), "Google authentication bridge is missing"],
  [bridge.includes('/api/auth/guest'), "Guest authentication bridge is missing"],
  [bridge.includes('/api/auth/staff'), "Staff authentication bridge is missing"],
  [bridge.includes('/api/rooms/'), "Room WebSocket bridge is missing"],
  [bridge.includes('type: "admin-command"'), "Staff live commands are missing"],
  [bridge.includes('BADGE_TOKEN_KEY'), "Session-only badge token handling is missing"],
  [worker.includes('const MAX_HISTORY = 0'), "Old message history is still sent on room entry"],
  [worker.includes('const MAX_STORED_MESSAGES = 12'), "The 12-message storage cap is missing"],
  [worker.includes('data.type === "admin-command" && ["owner", "moderator"].includes(session.role)'), "Chat staff command routing is missing"],
  [worker.includes('type: "badge-session"'), "Session-only badge response is missing"],
  [worker.includes('verified: Boolean(session.googleUid'), "Verified Google account flag is missing"],
  [gifts.includes('await this.sendBadgeSession'), "Expanded gifts do not preserve the session badge across rooms"],
  [!gifts.includes('this.setUserBadge(targetId, badge)'), "User badge is still persisted after leaving the website"],
  [radio.includes('const PRESENCE_HISTORY_LIMIT = 12'), "Presence history cap is incorrect"],
  [radio.includes('joinedSession.isGuest = true'), "Guest sessions are not marked"],
  [wrangler.includes('"main": "src/index-radio.js"'), "Cloudflare entry module is incorrect"],
  [legacy.includes('./legacy/app.js?v=155'), "Legacy rollback page does not load its preserved app"],
  [legacy.includes('./legacy/styles.css?v=155'), "Legacy rollback page does not load its preserved stylesheet"],
  [home.includes('v155'), "Visible build version was not updated"]
];

for (const [ok, message] of checks) {
  if (!ok) { console.error(`Rivo v155 invariant failed: ${message}`); process.exit(1); }
}

console.log(`Rivo v155 validation passed (${jsFiles.length} JavaScript files; ${publicFiles.length} Cloudflare assets; ${checks.length} integration checks).`);
