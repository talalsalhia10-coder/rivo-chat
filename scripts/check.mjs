import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const roots = ["public", "src"];
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && path.endsWith(".js")) files.push(path);
  }
}
for (const root of roots) await walk(root);
const publicFiles = [];
async function walkPublic(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walkPublic(path);
    else if (entry.isFile()) publicFiles.push(path);
  }
}
await walkPublic("public");
const MAX_STATIC_ASSET_BYTES = 25 * 1024 * 1024;
for (const file of publicFiles) {
  const info = await stat(file);
  if (info.size > MAX_STATIC_ASSET_BYTES) {
    console.error(`Cloudflare static asset exceeds 25 MiB: ${file} (${info.size} bytes)`);
    process.exit(1);
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Rivo syntax check passed (${files.length} JavaScript files; ${publicFiles.length} Cloudflare assets within 25 MiB each).`);

const home = await readFile("public/index.html", "utf8");
const group = await readFile("public/group-chat/index.html", "utf8");
const groupApp = await readFile("public/group-chat/app.js", "utf8");
const groupAdmin = await readFile("public/group-chat/admin.js", "utf8");
const groupStyles = await readFile("public/group-chat/styles.css", "utf8");
const groupAdminStyles = await readFile("public/group-chat/admin.css", "utf8");
const moderator = await readFile("public/group-chat/moderator.html", "utf8");
const worker = await readFile("src/index.js", "utf8");
const localServer = await readFile("LOCAL_SERVER.ps1", "utf8");
const sitemap = await readFile("public/sitemap.xml", "utf8");
const robots = await readFile("public/robots.txt", "utf8");
const rootSw = await readFile("public/sw.js", "utf8");
const groupSw = await readFile("public/group-chat/sw.js", "utf8");
const wrangler = await readFile("wrangler.jsonc", "utf8");

const checks = [
  [home.includes('href="/group-chat/"'), "Homepage group chat link is missing"],
  [home.includes('دردشة جماعية مجانية'), "Homepage group chat label is missing"],
  [group.includes('href="/chat/?id=lina"'), "Lina AI link is missing from group chat"],
  [group.includes('https://rivolove.com/group-chat/'), "Group chat canonical metadata is missing"],
  [group.includes('application/ld+json'), "Group chat structured data is missing"],
  [sitemap.includes('https://rivolove.com/group-chat/'), "Group chat is missing from sitemap"],
  [robots.includes('Disallow: /group-chat/admin.html'), "Group chat admin is not protected from indexing"],
  [!group.includes('id="privateNavButton"'), "Generic private navigation is visible"],
  [group.includes('id="privateRequestModal"'), "Private approval modal is missing"],
  [groupApp.includes('type: "private-request"'), "Private request flow is missing"],
  [worker.includes('data.type === "private-response"'), "Cloud private approval flow is missing"],
  [localServer.includes('$type -eq "private-response"'), "Local private approval flow is missing"],
  [groupAdmin.includes('permission-hidden'), "Moderator permission hiding is missing"],
  [!moderator.includes('<option value="0">حظر دائم</option>'), "Moderator HTML exposes permanent ban"],
  [groupStyles.includes('background:transparent!important'), "Transparent gifts are missing"],
  [groupAdminStyles.includes('.permission-hidden{display:none!important}'), "Permission hidden rule is missing"],
  [rootSw.includes("k.startsWith('rivo-love-')||k.startsWith('rivo-v')"), "Root service worker cache isolation is missing"],
  [groupSw.includes("key.startsWith('rivo-group-chat-')"), "Group service worker cache isolation is missing"],
  [group.includes('id="roomsList"'), "Live rooms list is missing"],
  [group.includes('15$'), "VIP 15 dollar plan is missing"],
  [groupApp.includes('ROOM_CAPACITY = 20'), "20-user room capacity is missing"],
  [groupApp.includes('type: "vip-kick"'), "VIP room kick is missing"],
  [groupApp.includes('type: "vip-release-mic"'), "VIP mic control is missing"],
  [groupAdmin.includes('renderVipAdmin'), "VIP administration UI is missing"],
  [groupAdmin.includes('renderRoomsManager'), "Rooms administration UI is missing"],
  [groupAdmin.includes('renderCharactersManager'), "Character administration UI is missing"],
  [worker.includes('DEFAULT_ROOMS'), "Cloud room registry is missing"],
  [worker.includes('VIP_MONTHLY_PRICE_USD = 15'), "Cloud VIP price is incorrect"],
  [worker.includes('getGlobalModeratorState'), "Cross-room moderator validation is missing"],
  [worker.includes('CHARACTER_ASSETS'), "Optional character R2 support is missing"],
  [localServer.includes('/api/rooms'), "Local rooms endpoint is missing"],
  [localServer.includes('$script:RoomCapacity = 20'), "Local room capacity is missing"],
  [wrangler.includes('"/rivo-config.json"'), "Dynamic character configuration is not routed through the Worker"],
  [worker.includes('MAX_CHARACTER_VRM_BYTES = 25 * 1024 * 1024'), "VRM upload size protection is missing"],
  [!group.includes('Premium') && !groupApp.includes('Premium') && !groupAdmin.includes('Premium'), "Use VIP instead of Premium"]
];
for (const [ok, message] of checks) {
  if (!ok) { console.error(`Rivo invariant failed: ${message}`); process.exit(1); }
}
console.log(`RivoLove v141 integration invariants passed (${checks.length} checks).`);
