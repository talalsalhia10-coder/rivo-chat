const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const avatarSrc=value=>typeof value==='string'&&/^(data:image\/|blob:|https?:\/\/|\/|assets\/)/.test(value)?value:`assets/avatars/${value||'guest'}.svg`;
const CONFIG_KEY='rivoAdminConfigV1';
const CAMERA_KEY='rivoCameraRequestsV1';
const MIC_KEY='rivoMicRequestsV1';
const LOG_KEY='rivoAdminLogsV1';
const SYNC_CHANNEL='rivoAdminLiveSyncV1';
let syncChannel=null;
try{syncChannel=new BroadcastChannel(SYNC_CHANNEL)}catch(_){}
let previewExpanded=false;
let latestUploadedEntryAvatarId=null;
let selectedEntryAvatarId=null;

const adminFreeBadgeCatalog=[
 {id:'free_star',name:'نجمة ذهبية',icon:'⭐',style:'gold'},
 {id:'free_shining_star',name:'نجمة مضيئة',icon:'🌟',style:'shine'},
 {id:'free_sparkles',name:'بريق جميل',icon:'✨',style:'sparkle'},
 {id:'free_flower',name:'زهرة جميلة',icon:'🌸',style:'flower'},
 {id:'free_butterfly',name:'فراشة ملونة',icon:'🦋',style:'butterfly'},
 {id:'free_heart',name:'قلب مميز',icon:'💖',style:'heart'},
 {id:'free_fire',name:'شعلة حماس',icon:'🔥',style:'fire'},
 {id:'free_medal',name:'وسام تقدير',icon:'🏅',style:'medal'}
];
let selectedAdminBadgeUserId=null;
let activeAdminSessionBadges={};



const roleOrder=['guest','user','plus','vip','primo','moderator','owner'];
const roleMeta={
 guest:{label:'زائر',icon:'👤'},
 user:{label:'مستخدم مسجل',icon:'👤'},
 plus:{label:'Plus',icon:'➕'},
 vip:{label:'VIP',icon:'💎'},
 primo:{label:'بريمو',icon:'🔷'},
 moderator:{label:'مراقب',icon:'⭐'},
 owner:{label:'الإدارة',icon:'👑'}
};
function defaultPlans(){
 return{
  plus:{label:'Plus',icon:'➕',price:10,days:30,enabled:true,accessCode:'PLUS-4826'},
  vip:{label:'VIP',icon:'💎',price:20,days:30,enabled:true,accessCode:'VIP-7391'},
  primo:{label:'بريمو',icon:'🔷',price:30,days:30,enabled:true,accessCode:'PRIMO-9154'}
 };
}
function defaultPermissions(){
 const usage={
  guest:{publicMessages:true,privateChat:false,gifts:false,roomMic:'off',roomCamera:'off',privateMic:'off',privateCamera:'off',priority:0},
  user:{publicMessages:true,privateChat:true,gifts:true,roomMic:'request',roomCamera:'request',privateMic:'off',privateCamera:'off',priority:0},
  plus:{publicMessages:true,privateChat:true,gifts:true,roomMic:'request',roomCamera:'request',privateMic:'request',privateCamera:'off',priority:1},
  vip:{publicMessages:true,privateChat:true,gifts:true,roomMic:'direct',roomCamera:'request',privateMic:'direct',privateCamera:'request',priority:2},
  primo:{publicMessages:true,privateChat:true,gifts:true,roomMic:'direct',roomCamera:'direct',privateMic:'direct',privateCamera:'direct',priority:3},
  moderator:{publicMessages:true,privateChat:true,gifts:true,roomMic:'direct',roomCamera:'direct',privateMic:'direct',privateCamera:'direct',priority:4},
  owner:{publicMessages:true,privateChat:true,gifts:true,roomMic:'direct',roomCamera:'direct',privateMic:'direct',privateCamera:'direct',priority:5}
 };
 const admin={
  guest:{},user:{},plus:{},vip:{},primo:{},
  moderator:{deleteMessages:true,muteUsers:true,kickUsers:true,tempBan:true,permanentBan:false,manageAds:true,manageReports:true,approveMic:true,approveCamera:true,manageRadio:false,manageRooms:false,managePlans:false},
  owner:{deleteMessages:true,muteUsers:true,kickUsers:true,tempBan:true,permanentBan:true,manageAds:true,manageReports:true,approveMic:true,approveCamera:true,manageRadio:true,manageRooms:true,managePlans:true}
 };
 return{usage,admin};
}

const defaultEntryAvatars=[
 {id:'entry_avatar_1',src:'assets/entry-avatars/rivo-avatar-young-man-purple.jpg',alt:'صورة شخصية لشاب بخلفية بنفسجية',title:'صورة شخصية لشاب بخلفية بنفسجية'},
 {id:'entry_avatar_2',src:'assets/entry-avatars/rivo-avatar-young-woman-purple.jpg',alt:'صورة شخصية لفتاة بخلفية بنفسجية',title:'صورة شخصية لفتاة بخلفية بنفسجية'},
 {id:'entry_avatar_3',src:'assets/entry-avatars/rivo-avatar-man-blue-hoodie.jpg',alt:'صورة شخصية لشاب يرتدي سترة زرقاء',title:'صورة شخصية لشاب يرتدي سترة زرقاء'},
 {id:'entry_avatar_4',src:'assets/entry-avatars/rivo-avatar-young-man-light.jpg',alt:'صورة شخصية لشاب بخلفية فاتحة',title:'صورة شخصية لشاب بخلفية فاتحة'},
 {id:'entry_avatar_5',src:'assets/entry-avatars/rivo-avatar-woman-denim.jpg',alt:'صورة شخصية لفتاة ترتدي سترة جينز',title:'صورة شخصية لفتاة ترتدي سترة جينز'},
 {id:'entry_avatar_6',src:'assets/entry-avatars/rivo-avatar-woman-purple-hoodie.jpg',alt:'صورة شخصية لفتاة ترتدي سترة بنفسجية',title:'صورة شخصية لفتاة ترتدي سترة بنفسجية'}
];
function normalizeEntryAvatars(list){
 const fallback=structuredClone(defaultEntryAvatars);
 if(!Array.isArray(list)||!list.length)return fallback;
 const normalized=list.filter(Boolean).map((item,index)=>({
   id:item.id||`entry_avatar_${index+1}`,
   src:item.src||item.path||'',
   alt:item.alt||item.title||`صورة شخصية ${index+1}`,
   title:item.title||item.alt||`صورة شخصية ${index+1}`
 })).filter(item=>typeof item.src==='string'&&item.src);
 return normalized.length?normalized:fallback;
}

const defaultRooms=[
 {id:'general',name:'العامة',icon:'🌐',count:128,cams:4,mics:6,camOn:true,micOn:true,music:true,announcement:'أهلاً بكم في ريفو — الاحترام أساس الدردشة.',announcementOn:true},
 {id:'iraq',name:'العراق',icon:'🇮🇶',count:188,cams:2,mics:6,camOn:true,micOn:true,music:true,announcement:'أهلاً بكم في غرفة العراق.',announcementOn:true},
 {id:'syria',name:'سوريا',icon:'🇸🇾',count:96,cams:2,mics:5,camOn:true,micOn:true,music:true,announcement:'أهلاً بكم في غرفة سوريا.',announcementOn:true},
 {id:'lebanon',name:'لبنان',icon:'🇱🇧',count:74,cams:2,mics:5,camOn:true,micOn:true,music:true,announcement:'أهلاً بكم في غرفة لبنان.',announcementOn:true},
 {id:'jordan',name:'الأردن',icon:'🇯🇴',count:121,cams:2,mics:5,camOn:true,micOn:true,music:true,announcement:'أهلاً بكم في غرفة الأردن.',announcementOn:true},
 {id:'oman',name:'عُمان',icon:'🇴🇲',count:48,cams:1,mics:4,camOn:true,micOn:true,music:false,announcement:'أهلاً بكم في غرفة عُمان.',announcementOn:true},
 {id:'saudi',name:'السعودية',icon:'🇸🇦',count:133,cams:2,mics:5,camOn:true,micOn:true,music:true,announcement:'أهلاً بكم في غرفة السعودية.',announcementOn:true},
 {id:'kuwait',name:'الكويت',icon:'🇰🇼',count:61,cams:2,mics:4,camOn:true,micOn:true,music:true,announcement:'أهلاً بكم في غرفة الكويت.',announcementOn:true},
 {id:'turkey',name:'تركيا',icon:'🇹🇷',count:83,cams:2,mics:5,camOn:true,micOn:true,music:true,announcement:'أهلاً بكم في غرفة تركيا.',announcementOn:true},
 {id:'poets',name:'شعراء',icon:'✒️',count:39,cams:1,mics:6,camOn:true,micOn:true,music:false,announcement:'أهلاً بأصحاب الشعر والكلمة الجميلة.',announcementOn:true}
];
const defaultUsers=[
  {id:'owner',name:'الإدارة',avatar:'owner',room:'general',role:'owner',plan:'owner',authType:'owner',coins:99999,status:'online',vip:true,verified:true},
  {id:'ahmed',name:'أحمد',avatar:'ahmed',room:'general',role:'user',plan:'user',authType:'google',coins:420,status:'online',vip:false,verified:false},
  {id:'samar',name:'سمر',avatar:'samar',room:'general',role:'user',plan:'user',authType:'google',coins:280,status:'online',vip:false,verified:false},
  {id:'ali',name:'علي',avatar:'ali',room:'general',role:'user',plan:'user',authType:'google',coins:150,status:'online',vip:false,verified:false},
  {id:'noor',name:'نور',avatar:'noor',room:'general',role:'user',plan:'user',authType:'google',coins:520,status:'online',vip:false,verified:false},
  {id:'mira',name:'ميرا',avatar:'mira',room:'iraq',role:'user',plan:'user',authType:'google',coins:210,status:'online',vip:false,verified:false},
  {id:'guest1',name:'زائر بغداد',avatar:'guest',room:'general',role:'guest',plan:'guest',authType:'guest',coins:0,status:'online',vip:false,verified:false}
];
const defaultGifts=[
 ['kiss','قبلة','💋',5],['heart','قلب حب','❤️',10],['love','أحبك جداً','💞',20],['teddy','دبدوب فاخر','🧸',30],
 ['hearts','غيمة قلوب','💗',50],['ring','خاتم حب','💍',80],['cake','كعكة احتفال','🎂',100],['fireworks','ألعاب نارية','🎆',150],
 ['horse','حصان عربي','🐎',200],['car','سيارة فاخرة','🏎️',300],['tiger','نمر','🐅',500],['lion','أسد ملكي','🦁',750],
 ['yacht','يخت فاخر','🛥️',1000],['plane','طائرة خاصة','✈️',1500],['palace','قصر ريفو','🏰',2500],['dragon','تنين ذهبي','🐉',4000],
 ['galaxy','مجرة ريفو','🌌',7500]
].map(x=>({id:x[0],name:x[1],icon:x[2],price:x[3]}));

function defaultConfig(){
 return{
  schemaVersion:35,
  rooms:structuredClone(defaultRooms),
  users:structuredClone(defaultUsers),
  entryAvatars:structuredClone(defaultEntryAvatars),
  private:{enabled:true,mic:false,camera:false,paidOnly:true},
  radio:{status:'stopped',scope:'all',roomId:'general',title:'موسيقى ريفو التجريبية',source:'assets/audio/rivo-radio-demo.wav'},
  economy:{giftsEnabled:true,vipEnabled:true,verifyEnabled:true,gifts:structuredClone(defaultGifts)},
  plans:defaultPlans(),
  permissions:defaultPermissions(),
  moderatorTokens:[],
  features:{guestEntry:true,googleForMedia:true,crownProtection:true,antiSpam:true,maxMessageLength:500}
 };
}
function mergeConfig(saved){
 const base=defaultConfig();
 if(!saved)return base;
 const migrateUsers=Number(saved.schemaVersion||0)<32;
 return{
  schemaVersion:35,
  ...base,...saved,
  rooms:Array.isArray(saved.rooms)&&saved.rooms.length?saved.rooms:base.rooms,
  users:migrateUsers?base.users:(Array.isArray(saved.users)&&saved.users.length?saved.users:base.users),
  entryAvatars:normalizeEntryAvatars(saved.entryAvatars||base.entryAvatars),
  private:{...base.private,...(saved.private||{})},
  radio:{...base.radio,...(saved.radio||{})},
  economy:{...base.economy,...(saved.economy||{}),gifts:Array.isArray(saved.economy?.gifts)?saved.economy.gifts:base.economy.gifts},
  plans:Object.fromEntries(['plus','vip','primo'].map(key=>[key,{...base.plans[key],...(saved.plans?.[key]||{})}])),
  permissions:{
   usage:Object.fromEntries(roleOrder.map(role=>[role,{...base.permissions.usage[role],...(saved.permissions?.usage?.[role]||{})}])),
   admin:Object.fromEntries(roleOrder.map(role=>[role,{...base.permissions.admin[role],...(saved.permissions?.admin?.[role]||{})}]))
  },
  moderatorTokens:Array.isArray(saved.moderatorTokens)?saved.moderatorTokens:base.moderatorTokens,
  features:{...base.features,...(saved.features||{})}
 };
}
function readJSON(key,fallback){
 try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(_){return fallback}
}
let config=mergeConfig(readJSON(CONFIG_KEY,null));
try{localStorage.setItem(CONFIG_KEY,JSON.stringify(config))}catch(_){/* تبقى الإعدادات عاملة حتى لو امتلأت مساحة المتصفح */}
let cameraRequests=readJSON(CAMERA_KEY,[]);
let micRequests=readJSON(MIC_KEY,[]);
let logs=readJSON(LOG_KEY,[]);
let selectedRoomId=config.rooms[0]?.id||'general';


function sendLiveMessage(type,payload){
 const message={type,payload,source:'admin',time:Date.now()};
 try{$('#chatPreview')?.contentWindow?.postMessage(message,'*')}catch(_){}
 try{syncChannel?.postMessage(message)}catch(_){}
 flashPreviewSync();
}
function sendConfigLive(){
 sendLiveMessage('rivo-admin-config',structuredClone(config));
}
function sendCamerasLive(){
 sendLiveMessage('rivo-camera-requests',structuredClone(cameraRequests));
}
function sendMicsLive(){
 sendLiveMessage('rivo-mic-requests',structuredClone(micRequests));
}
function flashPreviewSync(){
 const viewport=$('#previewViewport');
 const label=$('#previewSyncState');
 if(viewport){
   viewport.classList.remove('previewSyncFlash');
   void viewport.offsetWidth;
   viewport.classList.add('previewSyncFlash');
 }
 if(label){
   label.textContent='تم التحديث مباشرة · '+new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
 }
}
function fitChatPreview(){
 const viewport=$('#previewViewport'),frame=$('#chatPreview');
 if(!viewport||!frame)return;
 const baseWidth=1366,baseHeight=768;
 const availableWidth=Math.max(1,viewport.clientWidth);
 const availableHeight=Math.max(1,viewport.clientHeight);
 const scale=Math.max(.1,Math.min(availableWidth/baseWidth,availableHeight/baseHeight));
 const scaledWidth=baseWidth*scale;
 const scaledHeight=baseHeight*scale;
 frame.style.transformOrigin='top left';
 frame.style.transform=`scale(${scale})`;
 frame.style.left=Math.max(0,(availableWidth-scaledWidth)/2)+'px';
 frame.style.top=Math.max(0,(availableHeight-scaledHeight)/2)+'px';
 frame.style.right='auto';
}
function setPreviewConnected(connected=true){
 const dot=$('#previewLiveDot');
 if(dot){
   dot.textContent=connected?'متصل':'بانتظار';
   dot.classList.toggle('waiting',!connected);
 }
}
function togglePreviewExpanded(){
 previewExpanded=!previewExpanded;
 document.body.classList.toggle('previewExpanded',previewExpanded);
 $('#expandPreviewBtn').textContent=previewExpanded?'❐':'□';
 renderCommunityPanel();requestAnimationFrame(fitChatPreview);
}
function collapsePreview(){
 document.body.classList.add('previewCollapsed');
 $('#showPreviewBtn')?.classList.remove('hidden');
 requestAnimationFrame(fitChatPreview);
}
function showPreview(){
 document.body.classList.remove('previewCollapsed');
 $('#showPreviewBtn')?.classList.add('hidden');
 requestAnimationFrame(fitChatPreview);
}
function refreshPreview(){
 const frame=$('#chatPreview');
 if(frame){
   setPreviewConnected(false);
   frame.src='index.html?adminPreview=1&t='+Date.now();
 }
}

function persistAdminConfig(){
 try{localStorage.setItem(CONFIG_KEY,JSON.stringify(config));return true}catch(_){return false}
}
function saveConfig(message='تم حفظ الإعدادات'){
 if(!persistAdminConfig()){
  const warning='تعذر الحفظ لأن مساحة المتصفح ممتلئة. احذف بعض صور الدخول القديمة ثم أعد المحاولة.';
  setEntryAvatarUploadStatus(warning,'error');
  toast(warning);
  return false;
 }
 sendConfigLive();
 addLog(message);
 $('#lastSavedLabel').textContent='آخر حفظ: '+new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
 toast(message);
 renderOverview();
 return true;
}
function saveMicRequests(){
 localStorage.setItem(MIC_KEY,JSON.stringify(micRequests));
 sendMicsLive();
}
function saveCameraRequests(){
 localStorage.setItem(CAMERA_KEY,JSON.stringify(cameraRequests));
 sendCamerasLive();
 window.dispatchEvent(new StorageEvent('storage',{key:CAMERA_KEY,newValue:JSON.stringify(cameraRequests)}));
}
function addLog(action){
 logs.unshift({time:new Date().toISOString(),action});
 logs=logs.slice(0,100);
 try{localStorage.setItem(LOG_KEY,JSON.stringify(logs))}catch(_){logs=logs.slice(0,30)}
 renderLogs();
}
function toast(text){
 const n=document.createElement('div');n.className='adminToast';n.textContent=text;
 $('#adminToast').appendChild(n);setTimeout(()=>n.remove(),3200);
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function userAccessRole(user){
 if(user.role==='owner')return'owner';
 if(user.role==='moderator')return'moderator';
 if(user.role==='guest')return'guest';
 return ['plus','vip','primo'].includes(user.plan)?user.plan:'user';
}
function adminUserListRank(user={}){
 const key=userAccessRole(user);
 return ({owner:0,moderator:1,primo:2,vip:3,plus:4,user:5,guest:6})[key]??5;
}
function sortAdminUsersByHierarchy(users=[]){
 return users.map((user,index)=>({user,index})).sort((a,b)=>{
  const rankDiff=adminUserListRank(a.user)-adminUserListRank(b.user);
  return rankDiff||a.index-b.index;
 }).map(item=>item.user);
}
function roleLabel(user){
 const key=userAccessRole(user);
 return `${roleMeta[key]?.label||'مستخدم'} ${roleMeta[key]?.icon||''}`.trim();
}
function roomById(id){return config.rooms.find(r=>r.id===id)}
function userById(id){return config.users.find(u=>u.id===id)}


let communityTab='users';


function adminVerifiedBadgeHtml(user){
 if(!user?.verified)return '';
 return `<span class="adminVerifiedBadge" title="حساب موثق" aria-label="حساب موثق">
  <svg viewBox="0 0 24 24" aria-hidden="true">
   <path class="adminVerifiedBadgeShape" d="M12 1.7l2.15 1.77 2.75-.3 1.06 2.56 2.55 1.07-.29 2.75L22 12l-1.78 2.15.29 2.75-2.55 1.07-1.06 2.56-2.75-.3L12 22.3l-2.15-1.77-2.75.3-1.06-2.56-2.55-1.07.29-2.75L2 12l1.78-2.15-.29-2.75 2.55-1.07L7.1 3.17l2.75.3L12 1.7z"/>
   <path class="adminVerifiedBadgeCheck" d="M8.1 12.2l2.35 2.35 5.45-5.45"/>
  </svg>
 </span>`;
}

function communityRole(user){
 const hidden=user.isHidden?'🫥 ':'';
 if(user.role==='owner')return hidden+'👑';
 if(user.role==='moderator')return hidden+'⭐';
 if(userAccessRole(user)==='primo')return hidden+'🔷';
 if(userAccessRole(user)==='vip')return hidden+'💎';
 if(userAccessRole(user)==='plus')return hidden+'➕';
 return hidden;
}

function adminBadgeById(id){return adminFreeBadgeCatalog.find(b=>b.id===id)}
function openAdminBadgePanel(userId){
 const user=userById(userId);if(!user)return;
 selectedAdminBadgeUserId=userId;
 $('#adminBadgeTargetName').textContent=user.name;
 $('#adminBadgeChoices').innerHTML=adminFreeBadgeCatalog.map(b=>`<button class="adminBadgeChoice ${b.style}" data-admin-free-badge="${b.id}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>منح مجاناً</small></button>`).join('');
 $$('[data-admin-free-badge]').forEach(button=>button.onclick=()=>grantAdminBadge(button.dataset.adminFreeBadge));
 $('#removeAdminBadgeBtn').disabled=!activeAdminSessionBadges[userId];
 $('#adminFreeBadgeModal').classList.remove('hidden');
}
function closeAdminBadgePanel(){
 $('#adminFreeBadgeModal')?.classList.add('hidden');
 selectedAdminBadgeUserId=null;
}
function grantAdminBadge(badgeId){
 const user=userById(selectedAdminBadgeUserId),badge=adminBadgeById(badgeId);
 if(!user||!badge)return;
 activeAdminSessionBadges[user.id]=badge;
 sendLiveMessage('rivo-free-badge-grant',{userId:user.id,badge});
 renderCommunityPanel();renderUsersAdmin();
 closeAdminBadgePanel();
 toast(`تم وضع ${badge.name} قرب اسم ${user.name}`);
}
function removeAdminBadge(userId=selectedAdminBadgeUserId){
 const user=userById(userId);if(!user)return;
 delete activeAdminSessionBadges[user.id];
 sendLiveMessage('rivo-free-badge-remove',{userId:user.id});
 renderCommunityPanel();renderUsersAdmin();
 closeAdminBadgePanel();
 toast(`تمت إزالة الشارة من ${user.name}`);
}
function adminBadgeIcon(userId){return activeAdminSessionBadges[userId]?.icon||'⭐'}
function resendAdminSessionBadges(){
 Object.entries(activeAdminSessionBadges).forEach(([userId,badge])=>sendLiveMessage('rivo-free-badge-grant',{userId,badge}));
}

function renderCommunityPanel(){normalizeAdminData();
 const q=($('#communitySearchInput')?.value||'').trim();
 const users=sortAdminUsersByHierarchy(config.users.filter(u=>u.status!=='kicked'&&String(u.name||'').includes(q)));
 const rooms=config.rooms.filter(r=>r.name.includes(q));

 $('#communityUsersCount').textContent=users.filter(u=>u.status==='online'||u.status==='muted').length;
 $('#communityRoomsCount').textContent=rooms.length;

 $('#communityUsersList').innerHTML=users.map(u=>`<div class="communityUserItem adminBadgeUserRow" data-community-user="${u.id}">
   <img src="${avatarSrc(u.avatar)}" alt="">
   <span class="communityUserText">
     <b class="communityVerifiedName">${esc(u.name)}${adminVerifiedBadgeHtml(u)}</b>
     <small>${u.isHidden?'🫥 مخفي عن الزوار · ':''}${esc(roomById(u.room)?.name||'خارج الغرف')}</small>
   </span>
   <span class="communityRole">${communityRole(u)}</span>
   ${['owner','moderator'].includes(u.role)?`<button class="communityVisibilityBtn ${u.isHidden?'hiddenState':''}" data-community-visibility="${u.id}" title="إخفاء أو إظهار">${u.isHidden?'🫥':'👁️'}</button>`:''}
   <button class="adminQuickBadgeBtn ${activeAdminSessionBadges[u.id]?'active':''}" data-admin-badge-user="${u.id}" title="منح شارة مجانية">
    <span>${adminBadgeIcon(u.id)}</span><b>شارة</b>
   </button>
 </div>`).join('');

 $('#communityRoomsList').innerHTML=rooms.map(r=>`<button class="communityRoomItem" data-community-room="${r.id}">
   <span class="communityRoomIcon">${esc(r.icon)}</span>
   <span class="communityRoomText">
     <b>${esc(r.name)}</b>
     <small>${r.mics} مايك · ${r.cams} كاميرا</small>
   </span>
   <span class="communityRoomCount">${r.count}</span>
 </button>`).join('');

 $$('[data-community-user]').forEach(row=>row.onclick=e=>{
   if(e.target.closest('[data-admin-badge-user]')||e.target.closest('[data-community-visibility]'))return;
   const user=userById(row.dataset.communityUser);
   showSection('users');
   $('#userAdminSearch').value=user?.name||'';
   renderUsersAdmin();
 });
 $$('[data-admin-badge-user]').forEach(button=>button.onclick=e=>{e.stopPropagation();openAdminBadgePanel(button.dataset.adminBadgeUser)});
 $$('[data-community-visibility]').forEach(button=>button.onclick=e=>{e.stopPropagation();toggleStaffVisibility(button.dataset.communityVisibility)});
 $$('[data-community-room]').forEach(b=>b.onclick=()=>{
   selectedRoomId=b.dataset.communityRoom;
   showSection('rooms');
   renderRoomsAdmin();
 });
}
function setCommunityTab(tab){
 communityTab=tab;
 $$('.communityTabs button').forEach(b=>b.classList.toggle('active',b.dataset.communityTab===tab));
 $('#communityUsersPanel').classList.toggle('hidden',tab!=='users');
 $('#communityRoomsPanel').classList.toggle('hidden',tab!=='rooms');
 $('#communitySearchInput').placeholder=tab==='users'?'بحث عن مستخدم':'بحث عن غرفة';
 renderCommunityPanel();
}
function toggleSettingsColumn(){
 document.body.classList.toggle('settingsCollapsed');
 $('#compactSettingsBtn').textContent=document.body.classList.contains('settingsCollapsed')?'□':'—';
 requestAnimationFrame(fitChatPreview);
}


function normalizeAdminData(){
 if(!Array.isArray(config.rooms)||config.rooms.length===0)config.rooms=structuredClone(defaultRooms);
 if(!Array.isArray(config.users)||config.users.length===0)config.users=structuredClone(defaultUsers);
 config.entryAvatars=normalizeEntryAvatars(config.entryAvatars);
 config.rooms=config.rooms.filter(Boolean).map((r,index)=>({
   id:r.id||`room_${index}`,
   name:r.name||'غرفة',
   icon:r.icon||'🏠',
   count:Number.isFinite(+r.count)?+r.count:0,
   cams:Number.isFinite(+r.cams)?+r.cams:0,
   mics:Number.isFinite(+r.mics)?+r.mics:4,
   camOn:r.camOn!==false,
   micOn:r.micOn!==false,
   music:r.music!==false,
   announcement:r.announcement||'',
   announcementOn:r.announcementOn!==false
 }));
 config.users=config.users.filter(Boolean).map((u,index)=>({
   id:u.id||`user_${index}`,
   name:u.name||'مستخدم',
   avatar:u.avatar||'guest',
   room:config.rooms.some(r=>r.id===u.room)?u.room:config.rooms[0].id,
   role:u.role||'user',
   coins:Number.isFinite(+u.coins)?+u.coins:0,
   status:u.status||'online',
   vip:Boolean(u.vip),
   verified:Boolean(u.verified),
   authType:u.role==='guest'?'guest':u.role==='owner'?'owner':u.role==='moderator'?'moderator':(u.authType||'google'),
   isHidden:Boolean(u.isHidden),
   moderatorTokenId:u.moderatorTokenId||null,
   plan:u.role==='owner'?'owner':u.role==='moderator'?'moderator':u.role==='guest'?'guest':(['plus','vip','primo'].includes(u.plan)?u.plan:(u.vip?'vip':'user'))
 }));
 if(!config.rooms.some(r=>r.id===selectedRoomId))selectedRoomId=config.rooms[0].id;
}

function showSection(name){
 if(name==='avatars'){
  openEntryAvatarManager();
  return;
 }
 $$('.adminNav button').forEach(b=>b.classList.toggle('active',b.dataset.section===name));
 $$('.adminSection').forEach(s=>s.classList.toggle('active',s.id===`section-${name}`));
 if(name==='overview')renderOverview();
 if(name==='rooms')renderRoomsAdmin();
 if(name==='users')renderUsersAdmin();
 if(name==='camera')renderCameraRequests();
 if(name==='radio')renderRadioAdmin();
 if(name==='private')renderPrivateAdmin();
 if(name==='permissions')renderPermissionsAdmin();
 if(name==='moderators')renderModeratorTokens();
 if(name==='economy')renderEconomy();
 if(name==='announcements')renderAnnouncementAdmin();
 if(name==='security')renderSecurity();
 if(name==='logs')renderLogs();
}
function renderOverview(){normalizeAdminData();renderCommunityPanel();
 $('#metricUsers').textContent=config.users.length;
 $('#metricRooms').textContent=config.rooms.length;
 $('#metricCameraRequests').textContent=cameraRequests.filter(r=>r.status==='pending').length+micRequests.filter(r=>r.status==='pending').length;
 $('#metricRadio').textContent=config.radio.status==='playing'?'يعمل':config.radio.status==='paused'?'مؤقت':'متوقف';
 $('#serviceGuest').textContent=config.features.guestEntry?'مفتوح':'مغلق';
 $('#servicePrivate').textContent=config.private.enabled?'مفتوحة':'مغلقة';
 $('#servicePrivateCamera').textContent=config.private.camera?'مفتوحة':'مغلقة';
}
function renderRoomsAdmin(){
 const q=$('#roomAdminSearch').value.trim();
 const rooms=config.rooms.filter(r=>r.name.includes(q));
 $('#adminRoomList').innerHTML=rooms.map(r=>`<button class="adminRoomItem ${r.id===selectedRoomId?'active':''}" data-room-edit="${r.id}">
   <span class="icon">${esc(r.icon)}</span><span><b>${esc(r.name)}</b><small>${r.mics} مايك · ${r.cams} كاميرا</small></span><i>${r.count}</i>
 </button>`).join('');
 $$('[data-room-edit]').forEach(b=>b.onclick=()=>{selectedRoomId=b.dataset.roomEdit;renderRoomsAdmin();loadRoomEditor()});
 if(!roomById(selectedRoomId)&&config.rooms[0])selectedRoomId=config.rooms[0].id;
 loadRoomEditor();
}
function loadRoomEditor(){
 const r=roomById(selectedRoomId);if(!r)return;
 $('#roomEditorTitle').textContent='إعدادات غرفة '+r.name;
 $('#editRoomName').value=r.name;
 $('#editRoomIcon').value=r.icon;
 $('#editRoomAnnouncement').value=r.announcement||'';
 $('#editRoomAnnouncementOn').checked=r.announcementOn!==false;
 $('#editRoomMicOn').checked=r.micOn!==false;
 $('#editRoomMics').value=r.mics;
 $('#editRoomCamOn').checked=r.camOn!==false;
 $('#editRoomCams').value=r.cams;
 $('#editRoomMusic').checked=r.music!==false;
 $('#deleteRoomBtn').disabled=r.id==='general';
}
function saveRoom(){
 const r=roomById(selectedRoomId);if(!r)return;
 r.name=$('#editRoomName').value.trim()||r.name;
 r.icon=$('#editRoomIcon').value.trim()||'🏠';
 r.announcement=$('#editRoomAnnouncement').value.trim();
 r.announcementOn=$('#editRoomAnnouncementOn').checked;
 r.micOn=$('#editRoomMicOn').checked;
 r.mics=Math.max(0,Math.min(8,+$('#editRoomMics').value||0));
 r.camOn=$('#editRoomCamOn').checked;
 r.cams=Math.max(0,Math.min(4,+$('#editRoomCams').value||0));
 r.music=$('#editRoomMusic').checked;
 saveConfig('تم حفظ إعدادات غرفة '+r.name);
 renderRoomsAdmin();
}
function addRoom(){
 const id='room_'+Date.now();
 config.rooms.push({id,name:'غرفة جديدة',icon:'🏠',count:0,cams:0,mics:4,camOn:false,micOn:true,music:false,announcement:'أهلاً بكم.',announcementOn:true});
 selectedRoomId=id;renderRoomsAdmin();saveConfig('تمت إضافة غرفة جديدة');
}
function deleteRoom(){
 const r=roomById(selectedRoomId);if(!r||r.id==='general')return;
 if(!confirm(`حذف غرفة ${r.name}؟`))return;
 config.rooms=config.rooms.filter(x=>x.id!==r.id);
 config.users.forEach(u=>{if(u.room===r.id)u.room='general'});
 selectedRoomId='general';saveConfig('تم حذف الغرفة');renderRoomsAdmin();
}


function randomPlanCode(plan){
 const prefix=plan.toUpperCase();
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 let token='';
 if(globalThis.crypto?.getRandomValues){
  const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
  token=[...bytes].map(n=>alphabet[n%alphabet.length]).join('');
 }else{
  for(let i=0;i<6;i++)token+=alphabet[Math.floor(Math.random()*alphabet.length)];
 }
 return `${prefix}-${token}`;
}
function generatePlanCode(plan){
 const input=$(`[data-plan-code="${plan}"]`);if(!input)return;
 input.value=randomPlanCode(plan);
 input.type='text';
 const toggle=$(`[data-toggle-plan-code="${plan}"]`);if(toggle)toggle.textContent='إخفاء';
 readPermissionsForm();
 persistLiveDraft();
 toast(`تم إنشاء كلمة سر جديدة لخطة ${config.plans[plan].label}`);
}
async function copyTextValue(text){
 try{
  await navigator.clipboard.writeText(text);
  return true;
 }catch(_){
  const area=document.createElement('textarea');
  area.value=text;area.style.position='fixed';area.style.opacity='0';
  document.body.appendChild(area);area.select();
  const ok=document.execCommand('copy');area.remove();return ok;
 }
}
async function copyPlanCode(plan){
 const input=$(`[data-plan-code="${plan}"]`);if(!input)return;
 const code=input.value.trim();
 if(!code){toast('أنشئ كلمة سر أولاً');return}
 const ok=await copyTextValue(code);
 toast(ok?'تم نسخ كلمة السر':'تعذر النسخ؛ انسخها يدوياً');
}
function validatePlanCodes(){
 const enabledCodes=['plus','vip','primo']
  .filter(key=>config.plans[key].enabled)
  .map(key=>({key,code:String(config.plans[key].accessCode||'').trim().toUpperCase()}));
 const empty=enabledCodes.find(x=>!x.code);
 if(empty){toast(`ضع كلمة سر لخطة ${config.plans[empty.key].label}`);return false}
 const codes=enabledCodes.map(x=>x.code);
 if(new Set(codes).size!==codes.length){toast('يجب أن تكون كلمة سر كل خطة مختلفة');return false}
 return true;
}

function modeOptions(value){
 return[
  ['off','ممنوع'],
  ['request','طلب موافقة'],
  ['direct','مباشر']
 ].map(([v,label])=>`<option value="${v}" ${value===v?'selected':''}>${label}</option>`).join('');
}
function renderPermissionsAdmin(){
 const planGrid=$('#membershipPlansGrid');
 if(planGrid){
  planGrid.innerHTML=['plus','vip','primo'].map(key=>{
   const p=config.plans[key];
   return`<div class="membershipPlanCard ${key}">
    <div class="membershipPlanIcon">${p.icon}</div>
    <h3>${esc(p.label)}</h3>
    <label class="planEnabled"><span>تشغيل الخطة</span><input type="checkbox" data-plan-enabled="${key}" ${p.enabled?'checked':''}></label>
    <label>السعر الشهري<input type="number" min="0" data-plan-price="${key}" value="${p.price}"></label>
    <label>مدة الاشتراك بالأيام<input type="number" min="1" data-plan-days="${key}" value="${p.days}"></label>
    <div class="planAccessBox">
      <label>كلمة سر الدخول
        <input type="password" autocomplete="off" data-plan-code="${key}" value="${esc(p.accessCode||'')}">
      </label>
      <div class="planCodeActions">
        <button type="button" data-toggle-plan-code="${key}">إظهار</button>
        <button type="button" data-generate-plan-code="${key}">إنشاء جديد</button>
        <button type="button" data-copy-plan-code="${key}">نسخ</button>
      </div>
    </div>
   </div>`;
  }).join('');
  $$('[data-toggle-plan-code]').forEach(b=>b.onclick=()=>{
   const input=$(`[data-plan-code="${b.dataset.togglePlanCode}"]`);
   if(!input)return;
   const hidden=input.type==='password';
   input.type=hidden?'text':'password';
   b.textContent=hidden?'إخفاء':'إظهار';
  });
  $$('[data-generate-plan-code]').forEach(b=>b.onclick=()=>generatePlanCode(b.dataset.generatePlanCode));
  $$('[data-copy-plan-code]').forEach(b=>b.onclick=()=>copyPlanCode(b.dataset.copyPlanCode));
 }
 const usage=$('#usagePermissionsBody');
 if(usage){
  usage.innerHTML=roleOrder.map(role=>{
   const p=config.permissions.usage[role];
   const locked=role==='owner'?'disabled':'';
   return`<tr>
    <th><span class="permissionRole">${roleMeta[role].icon} ${roleMeta[role].label}</span></th>
    <td><input type="checkbox" data-usage-check="${role}:publicMessages" ${p.publicMessages?'checked':''} ${locked}></td>
    <td><input type="checkbox" data-usage-check="${role}:privateChat" ${p.privateChat?'checked':''} ${locked}></td>
    <td><input type="checkbox" data-usage-check="${role}:gifts" ${p.gifts?'checked':''} ${locked}></td>
    <td><select data-usage-mode="${role}:roomMic" ${locked}>${modeOptions(p.roomMic)}</select></td>
    <td><select data-usage-mode="${role}:roomCamera" ${locked}>${modeOptions(p.roomCamera)}</select></td>
    <td><select data-usage-mode="${role}:privateMic" ${locked}>${modeOptions(p.privateMic)}</select></td>
    <td><select data-usage-mode="${role}:privateCamera" ${locked}>${modeOptions(p.privateCamera)}</select></td>
    <td><input class="priorityInput" type="number" min="0" max="10" data-usage-priority="${role}" value="${p.priority}" ${locked}></td>
   </tr>`;
  }).join('');
 }
 const powers=$('#adminPermissionsBody');
 if(powers){
  const keys=[
   ['deleteMessages','حذف الرسائل'],['muteUsers','كتم'],['kickUsers','طرد'],['tempBan','حظر مؤقت'],
   ['permanentBan','حظر دائم'],['manageAds','الإعلانات'],['manageReports','البلاغات'],
   ['approveMic','طلبات المايك'],['approveCamera','طلبات الكاميرا'],['manageRadio','الراديو'],
   ['manageRooms','الغرف'],['managePlans','الاشتراكات']
  ];
  powers.innerHTML=['moderator','owner'].map(role=>`<tr>
   <th><span class="permissionRole">${roleMeta[role].icon} ${roleMeta[role].label}</span></th>
   ${keys.map(([key])=>`<td><input type="checkbox" data-admin-power="${role}:${key}" ${config.permissions.admin[role][key]?'checked':''} ${role==='owner'?'disabled':''}></td>`).join('')}
  </tr>`).join('');
 }
}
function readPermissionsForm(){
 $$('[data-plan-enabled]').forEach(i=>config.plans[i.dataset.planEnabled].enabled=i.checked);
 $$('[data-plan-price]').forEach(i=>config.plans[i.dataset.planPrice].price=Math.max(0,+i.value||0));
 $$('[data-plan-days]').forEach(i=>config.plans[i.dataset.planDays].days=Math.max(1,+i.value||30));
 $$('[data-plan-code]').forEach(i=>config.plans[i.dataset.planCode].accessCode=i.value.trim().toUpperCase());
 $$('[data-usage-check]').forEach(i=>{
  const[role,key]=i.dataset.usageCheck.split(':');config.permissions.usage[role][key]=i.checked;
 });
 $$('[data-usage-mode]').forEach(s=>{
  const[role,key]=s.dataset.usageMode.split(':');config.permissions.usage[role][key]=s.value;
 });
 $$('[data-usage-priority]').forEach(i=>config.permissions.usage[i.dataset.usagePriority].priority=Math.max(0,Math.min(10,+i.value||0)));
 $$('[data-admin-power]').forEach(i=>{
  const[role,key]=i.dataset.adminPower.split(':');config.permissions.admin[role][key]=i.checked;
 });
}
function savePermissions(){
 readPermissionsForm();
 if(!validatePlanCodes())return;
 saveConfig('تم حفظ الرتب والصلاحيات');
 renderPermissionsAdmin();
 renderUsersAdmin();
 renderCommunityPanel();
}


function moderatorTokenStatus(token){
 if(!token.enabled)return'disabled';
 if(Number(token.expiresAt||0)<=Date.now())return'expired';
 return'active';
}
function moderatorStatusLabel(status){return status==='active'?'فعال':status==='disabled'?'معطّل':'منتهي'}
function randomModeratorCode(){
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let token='';
 if(globalThis.crypto?.getRandomValues){const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);token=[...bytes].map(n=>alphabet[n%alphabet.length]).join('')}
 else for(let i=0;i<8;i++)token+=alphabet[Math.floor(Math.random()*alphabet.length)];
 return`MOD-${token}`;
}
function formatAdminDate(value){
 if(!value)return'لم يُستخدم';const d=new Date(Number(value)||value);if(Number.isNaN(d.getTime()))return'—';
 return d.toLocaleDateString('ar-IQ')+' '+d.toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
}
function moderatorUserForToken(token){return config.users.find(u=>u.id===token.userId||u.moderatorTokenId===token.id)}
function createModeratorToken(){
 const name=$('#moderatorNameInput').value.trim();const days=Math.max(1,+$('#moderatorDurationInput').value||30);
 if(name.length<2){toast('اكتب اسم المراقب');$('#moderatorNameInput').focus();return}
 let code=randomModeratorCode();while(config.moderatorTokens.some(t=>t.code===code))code=randomModeratorCode();
 const id='modtoken_'+Date.now();const userId='moderator_'+Date.now();const now=Date.now();
 const token={id,userId,name,code,durationDays:days,createdAt:now,expiresAt:now+days*86400000,lastUsedAt:null,enabled:true,isHidden:false};
 config.moderatorTokens.unshift(token);
 config.users.push({id:userId,name,avatar:'guest',room:'general',role:'moderator',plan:'moderator',authType:'moderator',moderatorTokenId:id,isHidden:false,coins:0,status:'offline',vip:false,verified:false});
 $('#moderatorNameInput').value='';saveConfig('تم إنشاء رمز مراقب جديد لـ '+name);renderModeratorTokens();renderUsersAdmin();renderCommunityPanel();
}
function regenerateModeratorCode(tokenId){
 const token=config.moderatorTokens.find(t=>t.id===tokenId);if(!token)return;let code=randomModeratorCode();while(config.moderatorTokens.some(t=>t.code===code))code=randomModeratorCode();
 token.code=code;token.lastUsedAt=null;token.enabled=true;saveConfig('تم إنشاء رمز جديد للمراقب '+token.name);renderModeratorTokens();
}
async function copyModeratorCode(tokenId){
 const token=config.moderatorTokens.find(t=>t.id===tokenId);if(!token)return;const ok=await copyTextValue(token.code);toast(ok?'تم نسخ رمز '+token.name:'تعذر النسخ؛ انسخه يدوياً');
}
function toggleModeratorToken(tokenId){
 const token=config.moderatorTokens.find(t=>t.id===tokenId);if(!token)return;token.enabled=!token.enabled;saveConfig(`${token.enabled?'تم تفعيل':'تم تعطيل'} رمز ${token.name}`);renderModeratorTokens();
}
function renewModeratorToken(tokenId){
 const token=config.moderatorTokens.find(t=>t.id===tokenId);if(!token)return;const now=Date.now();token.expiresAt=Math.max(now,Number(token.expiresAt)||now)+(Number(token.durationDays)||30)*86400000;token.enabled=true;saveConfig('تم تجديد اشتراك المراقب '+token.name);renderModeratorTokens();
}
function deleteModeratorToken(tokenId){
 const token=config.moderatorTokens.find(t=>t.id===tokenId);if(!token||!confirm('حذف رمز وحساب المراقب '+token.name+'؟'))return;
 config.moderatorTokens=config.moderatorTokens.filter(t=>t.id!==tokenId);config.users=config.users.filter(u=>u.id!==token.userId&&u.moderatorTokenId!==tokenId);saveConfig('تم حذف المراقب '+token.name);renderModeratorTokens();renderUsersAdmin();renderCommunityPanel();
}
function setStaffVisibility(userId,hidden){
 const user=userById(userId);if(!user||!['owner','moderator'].includes(user.role))return;user.isHidden=Boolean(hidden);
 if(user.moderatorTokenId){const token=config.moderatorTokens.find(t=>t.id===user.moderatorTokenId);if(token)token.isHidden=user.isHidden}
 saveConfig(`${user.name} أصبح ${user.isHidden?'مخفياً':'ظاهراً'}`);renderModeratorTokens();renderUsersAdmin();renderCommunityPanel();
}
function toggleStaffVisibility(userId){const user=userById(userId);if(user)setStaffVisibility(userId,!user.isHidden)}
function renderModeratorTokens(){
 const owner=userById('owner');const ownerBtn=$('#ownerVisibilityBtn');if(ownerBtn&&owner){ownerBtn.textContent=owner.isHidden?'🫥 مخفي — اضغط للإظهار':'👁️ ظاهر — اضغط للإخفاء';ownerBtn.classList.toggle('hiddenState',owner.isHidden)}
 const q=($('#moderatorSearchInput')?.value||'').trim().toLowerCase();const filter=$('#moderatorStatusFilter')?.value||'all';
 const items=config.moderatorTokens.filter(t=>{const status=moderatorTokenStatus(t);return(filter==='all'||filter===status)&&(`${t.name} ${t.code}`.toLowerCase().includes(q))});
 if($('#moderatorTokenCount'))$('#moderatorTokenCount').textContent=config.moderatorTokens.length;
 const box=$('#moderatorTokenList');if(!box)return;
 box.innerHTML=items.length?items.map(token=>{const status=moderatorTokenStatus(token);const user=moderatorUserForToken(token);return`<div class="moderatorTokenCard ${status} ${token.isHidden?'staffHidden':''}">
  <div class="moderatorTokenMain"><div class="moderatorAvatar">⭐</div><div><b>${esc(token.name)}</b><small>${status==='active'?'ينتهي: '+formatAdminDate(token.expiresAt):moderatorStatusLabel(status)} · آخر استخدام: ${formatAdminDate(token.lastUsedAt)}</small></div></div>
  <div class="moderatorCodeBox"><code>${esc(token.code)}</code><button data-mod-copy="${token.id}">نسخ</button></div>
  <div class="moderatorTokenMeta"><span>${token.durationDays} يوم</span><span class="tokenStatus ${status}">${moderatorStatusLabel(status)}</span><span>${token.isHidden?'🫥 مخفي':'👁️ ظاهر'}</span></div>
  <div class="moderatorTokenActions">
   <button data-mod-visibility="${token.id}">${token.isHidden?'إظهار المراقب':'إخفاء المراقب'}</button>
   <button data-mod-renew="${token.id}">تجديد</button><button data-mod-regenerate="${token.id}">رمز جديد</button>
   <button data-mod-toggle="${token.id}">${token.enabled?'تعطيل':'تفعيل'}</button><button class="danger" data-mod-delete="${token.id}">حذف</button>
  </div>
 </div>`}).join(''):'<div class="emptyState">لا توجد رموز مراقبين مطابقة.</div>';
 $$('[data-mod-copy]').forEach(b=>b.onclick=()=>copyModeratorCode(b.dataset.modCopy));
 $$('[data-mod-renew]').forEach(b=>b.onclick=()=>renewModeratorToken(b.dataset.modRenew));
 $$('[data-mod-regenerate]').forEach(b=>b.onclick=()=>regenerateModeratorCode(b.dataset.modRegenerate));
 $$('[data-mod-toggle]').forEach(b=>b.onclick=()=>toggleModeratorToken(b.dataset.modToggle));
 $$('[data-mod-delete]').forEach(b=>b.onclick=()=>deleteModeratorToken(b.dataset.modDelete));
 $$('[data-mod-visibility]').forEach(b=>b.onclick=()=>{const token=config.moderatorTokens.find(t=>t.id===b.dataset.modVisibility);if(!token)return;token.isHidden=!token.isHidden;const user=moderatorUserForToken(token);if(user)user.isHidden=token.isHidden;saveConfig(`${token.name} أصبح ${token.isHidden?'مخفياً':'ظاهراً'}`);renderModeratorTokens();renderUsersAdmin();renderCommunityPanel()});
}

function renderUsersAdmin(){
 const q=$('#userAdminSearch').value.trim(),filter=$('#userRoleFilter').value;
 const users=sortAdminUsersByHierarchy(config.users.filter(u=>{
  const access=userAccessRole(u);
  return String(u.name||'').includes(q)&&(filter==='all'||access===filter);
 }));
 $('#adminUsersBody').innerHTML=users.map(u=>`<tr>
  <td><div class="tableUser"><img src="${avatarSrc(u.avatar)}"><div><b>${esc(u.name)}</b><small>${u.verified?'موثق 🔵':'غير موثق'}</small></div></div></td>
  <td>${esc(roomById(u.room)?.name||'—')}</td>
  <td><select class="roleSelect" data-role-user="${u.id}" ${u.role==='owner'?'disabled':''}>
    <option value="user" ${userAccessRole(u)==='user'?'selected':''}>مستخدم</option>
    <option value="plus" ${userAccessRole(u)==='plus'?'selected':''}>Plus ➕</option>
    <option value="vip" ${userAccessRole(u)==='vip'?'selected':''}>VIP 💎</option>
    <option value="primo" ${userAccessRole(u)==='primo'?'selected':''}>بريمو 🔷</option>
    <option value="moderator" ${userAccessRole(u)==='moderator'?'selected':''}>مراقب ⭐</option>
    <option value="guest" ${userAccessRole(u)==='guest'?'selected':''}>ضيف</option>
  </select></td>
  <td><input type="number" min="0" value="${u.coins}" data-coins-user="${u.id}" style="width:90px;border:1px solid #ccd5e1;border-radius:8px;padding:6px"></td>
  <td><span class="statusBadge ${u.status==='muted'?'muted':''} ${u.isHidden?'hiddenStaffStatus':''}">${u.isHidden?'مخفي':u.status==='muted'?'مكتوم':u.status==='offline'?'غير متصل':'متصل'}</span></td>
  <td><div class="rowActions">
    <button class="tableBadgeBtn ${activeAdminSessionBadges[u.id]?'active':''}" data-table-badge-user="${u.id}">${adminBadgeIcon(u.id)} شارة</button>
    ${['owner','moderator'].includes(u.role)?`<button data-user-action="visibility" data-user="${u.id}">${u.isHidden?'👁️ إظهار':'🫥 إخفاء'}</button>`:''}
    <button data-user-action="mute" data-user="${u.id}">${u.status==='muted'?'إلغاء الكتم':'كتم'}</button>
    <button data-user-action="camera" data-user="${u.id}">إغلاق كاميرا</button>
    <button data-user-action="kick" data-user="${u.id}" class="danger" ${u.role==='owner'?'disabled':''}>طرد</button>
  </div></td>
 </tr>`).join('');
 $$('[data-role-user]').forEach(s=>s.onchange=()=>changeUserRole(s.dataset.roleUser,s.value));
 $$('[data-coins-user]').forEach(i=>i.onchange=()=>changeUserCoins(i.dataset.coinsUser,+i.value||0));
 $$('[data-user-action]').forEach(b=>b.onclick=()=>userAction(b.dataset.user,b.dataset.userAction));
 $$('[data-table-badge-user]').forEach(b=>b.onclick=()=>openAdminBadgePanel(b.dataset.tableBadgeUser));
}
function changeUserRole(id,value){
 const u=userById(id);if(!u||u.role==='owner')return;
 if(value==='moderator'){u.role='moderator';u.plan='moderator';u.vip=false}
 else if(value==='guest'){u.role='guest';u.plan='guest';u.vip=false}
 else{u.role='user';u.plan=value;u.vip=['vip','primo'].includes(value)}
 saveConfig('تم تغيير رتبة '+u.name+' إلى '+roleLabel(u));
 renderUsersAdmin();renderCommunityPanel();
}
function changeUserCoins(id,value){
 const u=userById(id);if(!u)return;u.coins=Math.max(0,value);saveConfig('تم تعديل رصيد '+u.name);
}
function userAction(id,action){
 const u=userById(id);if(!u)return;
 if(action==='visibility'){toggleStaffVisibility(id);return}
 if(u.role==='owner')return;
 if(action==='mute'){u.status=u.status==='muted'?'online':'muted';addLog(`${u.status==='muted'?'كتم':'إلغاء كتم'} ${u.name}`)}
 if(action==='camera'){
  cameraRequests.forEach(r=>{if(r.userId===u.id&&r.status==='approved')r.status='denied'});
  saveCameraRequests();addLog('إغلاق كاميرا '+u.name);
 }
 if(action==='kick'){u.status='kicked';delete activeAdminSessionBadges[u.id];sendLiveMessage('rivo-free-badge-remove',{userId:u.id});addLog('طرد '+u.name)}
 saveConfig('تم تنفيذ الإجراء على '+u.name);renderUsersAdmin();
}

function renderMicRequests(){
 micRequests=readJSON(MIC_KEY,[]);
 const box=$('#micRequestsAdmin');if(!box)return;
 box.innerHTML=micRequests.length?micRequests.map(r=>`<div class="cameraRequestRow ${r.status}">
  <img src="${avatarSrc(r.avatar||'guest')}"><div><b>${esc(r.userName)}</b><small>${esc(r.roomName||roomById(r.roomId)?.name||'غرفة')} · ${esc(r.time||'')} · ${r.status==='pending'?'بانتظار القرار':r.status==='approved'?'موافق عليه':'مرفوض'}</small></div>
  <div class="cameraRequestActions">${r.status==='pending'?`<button data-mic-action="approve" data-request="${r.id}">موافقة</button><button class="deny" data-mic-action="deny" data-request="${r.id}">رفض</button>`:r.status==='approved'?`<button class="deny" data-mic-action="revoke" data-request="${r.id}">سحب الإذن</button>`:''}</div>
 </div>`).join(''):'<div class="emptyState">لا توجد طلبات مايك.</div>';
 $$('[data-mic-action]').forEach(b=>b.onclick=()=>micAction(b.dataset.request,b.dataset.micAction));
}
function micAction(id,action){
 const r=micRequests.find(x=>x.id===id);if(!r)return;
 r.status=action==='approve'?'approved':'denied';
 saveMicRequests();addLog(`${action==='approve'?'الموافقة على':'رفض/سحب'} مايك ${r.userName}`);renderMicRequests();renderOverview();
}
function closeAllMics(){
 micRequests.forEach(r=>{if(r.status==='approved')r.status='denied'});
 saveMicRequests();addLog('إنزال جميع المستخدمين من المايك');renderMicRequests();toast('تم إنزال الجميع من المايك');
}

function fileToDataURL(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||''));
  reader.onerror=()=>reject(new Error('file_read_failed'));
  reader.readAsDataURL(file);
 });
}
function loadEntryAvatarImage(src){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error('image_load_failed'));
  image.src=src;
 });
}
function dataUrlApproxBytes(value=''){
 const comma=value.indexOf(',');
 const body=comma>=0?value.slice(comma+1):value;
 return Math.ceil(body.length*3/4);
}
function cropLoadedImageToSquareDataURL(image,size=380,quality=.82){
 const width=image.naturalWidth||image.width||0;
 const height=image.naturalHeight||image.height||0;
 if(!width||!height)throw new Error('image_dimensions_failed');
 const edge=Math.min(width,height);
 const sx=Math.max(0,(width-edge)/2);
 const sy=Math.max(0,(height-edge)/2);
 const canvas=document.createElement('canvas');
 canvas.width=size;canvas.height=size;
 const ctx=canvas.getContext('2d',{alpha:false});
 ctx.fillStyle='#eef2f7';
 ctx.fillRect(0,0,size,size);
 ctx.imageSmoothingEnabled=true;
 ctx.imageSmoothingQuality='high';
 ctx.drawImage(image,sx,sy,edge,edge,0,0,size,size);
 return canvas.toDataURL('image/jpeg',quality);
}
async function prepareEntryAvatarData(file,compact=false){
 const raw=await fileToDataURL(file);
 const image=await loadEntryAvatarImage(raw);
 const attempts=compact
  ?[[300,.68],[260,.62],[220,.58]]
  :[[420,.86],[380,.82],[340,.76],[300,.70]];
 let result='';
 for(const [size,quality] of attempts){
  result=cropLoadedImageToSquareDataURL(image,size,quality);
  if(dataUrlApproxBytes(result)<=220*1024)break;
 }
 if(!result)throw new Error('image_encode_failed');
 return result;
}
function setEntryAvatarUploadStatus(text='',type=''){
 const status=$('#entryAvatarUploadStatus');
 if(!status)return;
 status.textContent=text;
 status.className=`entryAvatarUploadStatus ${text?'show':''} ${type}`.trim();
}
function setEntryAvatarUploadBusy(busy){
 const label=$('#uploadEntryAvatarBtn');
 const input=$('#entryAvatarAdminInput');
 if(label){
  label.classList.toggle('uploading',Boolean(busy));
  const text=label.querySelector('span');
  if(text)text.textContent=busy?'جارٍ تجهيز الصورة…':'رفع صورة من الجهاز';
 }
 if(input)input.disabled=Boolean(busy);
}
function openEntryAvatarManager(){
 normalizeAdminData();
 const modal=$('#entryAvatarManagerModal');
 if(!modal)return;
 if(!selectedEntryAvatarId||!config.entryAvatars.some(item=>item.id===selectedEntryAvatarId)){
  selectedEntryAvatarId=config.entryAvatars[0]?.id||null;
 }
 setEntryAvatarUploadStatus('','');
 renderEntryAvatarsAdmin();
 modal.classList.remove('hidden');
 document.body.classList.add('entryAvatarManagerOpen');
 $('.adminNav button[data-section="avatars"]')?.classList.add('modalActive');
 setTimeout(()=>$('#closeEntryAvatarManager')?.focus(),0);
}
function closeEntryAvatarManager(){
 const modal=$('#entryAvatarManagerModal');
 if(!modal)return;
 modal.classList.add('hidden');
 document.body.classList.remove('entryAvatarManagerOpen');
 $('.adminNav button[data-section="avatars"]')?.classList.remove('modalActive');
}
function selectEntryAvatar(id){
 if(!config.entryAvatars.some(item=>item.id===id))return;
 selectedEntryAvatarId=id;
 renderEntryAvatarsAdmin();
}
function updateSelectedEntryAvatarPreview(){
 config.entryAvatars=normalizeEntryAvatars(config.entryAvatars);
 let index=config.entryAvatars.findIndex(item=>item.id===selectedEntryAvatarId);
 if(index<0){index=0;selectedEntryAvatarId=config.entryAvatars[0]?.id||null;}
 const item=config.entryAvatars[index];
 const preview=$('#entryAvatarSelectedPreview');
 const title=$('#entryAvatarSelectedTitle');
 const badge=$('#entryAvatarSelectedBadge');
 const promote=$('#promoteSelectedEntryAvatar');
 const remove=$('#deleteSelectedEntryAvatar');
 if(preview&&item){preview.src=avatarSrc(item.src);preview.alt=item.alt||'الصورة المختارة';}
 if(title)title.textContent=item?`الصورة ${index+1}`:'اختر صورة';
 if(badge)badge.textContent=index===0?'⭐ الصورة الأولى':'الصورة المختارة';
 if(promote){promote.disabled=!item||index===0;promote.textContent=index===0?'هي الصورة الأولى':'اجعلها الأولى';}
 if(remove)remove.disabled=config.entryAvatars.length<=1||!item;
}
async function handleEntryAvatarUpload(event){
 const input=event.currentTarget||event.target;
 const file=input?.files?.[0];
 if(!file)return;
 const looksLikeImage=file.type.startsWith('image/')||/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name||'');
 if(!looksLikeImage){setEntryAvatarUploadStatus('الملف المختار ليس صورة صالحة.','error');toast('اختر ملف صورة صالحاً');input.value='';return;}
 if(file.size>20*1024*1024){setEntryAvatarUploadStatus('حجم الصورة أكبر من 20 ميغابايت.','error');toast('اختر صورة أصغر من 20 ميغابايت');input.value='';return;}
 setEntryAvatarUploadBusy(true);
 setEntryAvatarUploadStatus(`جارٍ قص الصورة وضغطها: ${file.name||'صورة جديدة'}…`,'loading');
 let item=null;
 try{
  let cropped=await prepareEntryAvatarData(file,false);
  config.entryAvatars=normalizeEntryAvatars(config.entryAvatars);
  const number=config.entryAvatars.length+1;
  item={id:`entry_avatar_${Date.now()}`,src:cropped,alt:`صورة شخصية ${number}`,title:`صورة شخصية ${number}`,custom:true,createdAt:Date.now()};
  // تبقى الصورة الافتراضية الأولى في مكانها، وتظهر الصورة الجديدة بعدها مباشرة بدلاً من أسفل القائمة.
  config.entryAvatars.splice(Math.min(1,config.entryAvatars.length),0,item);
  if(!persistAdminConfig()){
   config.entryAvatars=config.entryAvatars.filter(entry=>entry.id!==item.id);
   cropped=await prepareEntryAvatarData(file,true);
   item.src=cropped;
   config.entryAvatars.splice(Math.min(1,config.entryAvatars.length),0,item);
   if(!persistAdminConfig()){
    config.entryAvatars=config.entryAvatars.filter(entry=>entry.id!==item.id);
    throw new Error('storage_failed');
   }
  }
  latestUploadedEntryAvatarId=item.id;
  selectedEntryAvatarId=item.id;
  sendConfigLive();
  addLog('رفع صورة جديدة لواجهة الدخول');
  renderEntryAvatarsAdmin();
  renderOverview();
  const sizeKb=Math.max(1,Math.round(dataUrlApproxBytes(item.src)/1024));
  setEntryAvatarUploadStatus(`تم رفع الصورة بنجاح (${sizeKb} كيلوبايت). ظهرت هنا وداخل مربع اختيار الصورة في صفحة الدخول، وفي أعلى القائمة. `,'success');
  toast('تم رفع الصورة وإظهارها في صفحة الدخول');
  const frame=$('#chatPreview');
  try{frame?.contentWindow?.postMessage({type:'rivo-admin-config',payload:structuredClone(config),source:'admin',time:Date.now()},'*')}catch(_){}
  requestAnimationFrame(()=>{
   const card=document.querySelector(`[data-entry-avatar-id="${item.id}"]`);
   card?.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
 }catch(error){
  if(item)config.entryAvatars=config.entryAvatars.filter(entry=>entry.id!==item.id);
  const message=error?.message==='storage_failed'
   ?'تعذر حفظ الصورة لأن مساحة المتصفح ممتلئة. احذف بعض صور الدخول القديمة ثم أعد المحاولة.'
   :'تعذر قراءة هذه الصورة. جرّب صورة JPG أو PNG أو WEBP أخرى.';
  setEntryAvatarUploadStatus(message,'error');
  toast(message);
 }finally{
  setEntryAvatarUploadBusy(false);
  if(input)input.value='';
 }
}
function promoteEntryAvatar(id){
 config.entryAvatars=normalizeEntryAvatars(config.entryAvatars);
 const index=config.entryAvatars.findIndex(item=>item.id===id);
 if(index<=0)return;
 const [item]=config.entryAvatars.splice(index,1);
 config.entryAvatars.unshift(item);
 selectedEntryAvatarId=item.id;
 saveConfig('تم جعل الصورة المختارة في بداية القائمة');
 renderEntryAvatarsAdmin();
}
function removeEntryAvatar(id){
 config.entryAvatars=normalizeEntryAvatars(config.entryAvatars);
 if(config.entryAvatars.length<=1){toast('يجب أن تبقى صورة واحدة على الأقل');return;}
 const index=config.entryAvatars.findIndex(item=>item.id===id);
 config.entryAvatars=config.entryAvatars.filter(item=>item.id!==id);
 selectedEntryAvatarId=config.entryAvatars[Math.min(Math.max(index-1,0),config.entryAvatars.length-1)]?.id||config.entryAvatars[0]?.id||null;
 saveConfig('تم حذف الصورة من واجهة الدخول');
 renderEntryAvatarsAdmin();
}
function renderEntryAvatarsAdmin(){
 normalizeAdminData();
 const grid=$('#entryAvatarAdminGrid');
 if(!grid)return;
 if(!selectedEntryAvatarId||!config.entryAvatars.some(item=>item.id===selectedEntryAvatarId))selectedEntryAvatarId=config.entryAvatars[0]?.id||null;
 grid.innerHTML=config.entryAvatars.map((item,index)=>`<button type="button" class="entryAvatarManagerItem ${index===0?'default':''} ${item.id===selectedEntryAvatarId?'selected':''} ${item.id===latestUploadedEntryAvatarId?'justUploaded':''}" data-entry-avatar-select="${esc(item.id)}" data-entry-avatar-id="${esc(item.id)}" title="اختيار صورة ${index+1}">
   ${index===0?'<span class="entryAvatarDefaultBadge">⭐ الأولى</span>':''}
   ${item.id===latestUploadedEntryAvatarId?'<span class="entryAvatarNewBadge">جديدة</span>':''}
   <img src="${avatarSrc(item.src)}" alt="${esc(item.alt||'صورة شخصية')}" loading="lazy">
 </button>`).join('');
 $$('[data-entry-avatar-select]').forEach(button=>button.onclick=()=>selectEntryAvatar(button.dataset.entryAvatarSelect));
 updateSelectedEntryAvatarPreview();
 if(latestUploadedEntryAvatarId){
  const currentLatest=latestUploadedEntryAvatarId;
  setTimeout(()=>{
   const newest=document.querySelector(`[data-entry-avatar-id="${currentLatest}"]`);
   newest?.classList.remove('justUploaded');
   newest?.querySelector('.entryAvatarNewBadge')?.remove();
   if(latestUploadedEntryAvatarId===currentLatest)latestUploadedEntryAvatarId=null;
  },2200);
 }
}

function renderCameraRequests(){
 cameraRequests=readJSON(CAMERA_KEY,[]);
 $('#cameraRequestsAdmin').innerHTML=cameraRequests.length?cameraRequests.map(r=>`<div class="cameraRequestRow ${r.status}">
  <img src="${avatarSrc(r.avatar||'guest')}"><div><b>${esc(r.userName)}</b><small>${esc(r.roomName||roomById(r.roomId)?.name||'غرفة')} · ${esc(r.time||'')} · ${r.status==='pending'?'بانتظار القرار':r.status==='approved'?'موافق عليه':'مرفوض'}</small></div>
  <div class="cameraRequestActions">${r.status==='pending'?`<button data-cam-action="approve" data-request="${r.id}">موافقة</button><button class="deny" data-cam-action="deny" data-request="${r.id}">رفض</button>`:r.status==='approved'?`<button class="deny" data-cam-action="revoke" data-request="${r.id}">سحب الإذن</button>`:''}</div>
 </div>`).join(''):'<div class="emptyState">لا توجد طلبات كاميرا.</div>';
 $$('[data-cam-action]').forEach(b=>b.onclick=()=>cameraAction(b.dataset.request,b.dataset.camAction));
}
function cameraAction(id,action){
 const r=cameraRequests.find(x=>x.id===id);if(!r)return;
 r.status=action==='approve'?'approved':'denied';
 saveCameraRequests();addLog(`${action==='approve'?'الموافقة على':'رفض/سحب'} كاميرا ${r.userName}`);renderCameraRequests();renderOverview();
}
function closeAllCameras(){
 cameraRequests.forEach(r=>{if(r.status==='approved')r.status='denied'});
 saveCameraRequests();addLog('إغلاق جميع الكاميرات');renderCameraRequests();renderOverview();toast('تم إغلاق جميع الكاميرات');
}
function populateRoomSelect(selectId,value){
 const s=$(selectId);if(!s)return;s.innerHTML=config.rooms.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');s.value=value||config.rooms[0]?.id;
}
function renderRadioAdmin(){
 $('#radioAdminTitle').value=config.radio.title;
 $('#radioAdminSource').value=config.radio.source;
 $('#radioAdminScope').value=config.radio.scope;
 populateRoomSelect('#radioAdminRoom',config.radio.roomId);
 $('#radioAdminRoomField').classList.toggle('hidden',config.radio.scope!=='room');
 renderRadioState();
}
function updateRadioFromForm(){
 config.radio.title=$('#radioAdminTitle').value.trim()||'راديو ريفو';
 config.radio.source=$('#radioAdminSource').value.trim()||'assets/audio/rivo-radio-demo.wav';
 config.radio.scope=$('#radioAdminScope').value;
 config.radio.roomId=$('#radioAdminRoom').value||'general';
}
function setRadioStatus(status){
 updateRadioFromForm();config.radio.status=status;saveConfig(status==='playing'?'بدأ بث الراديو':status==='paused'?'تم إيقاف الراديو مؤقتاً':'تم إيقاف الراديو');renderRadioState();
}
function renderRadioState(){
 const box=$('#radioAdminState'),r=config.radio;
 box.className='bigStatus '+r.status;
 box.textContent=r.status==='playing'?`يبث الآن: ${r.title} — ${r.scope==='all'?'جميع الغرف':roomById(r.roomId)?.name}`:r.status==='paused'?`متوقف مؤقتاً: ${r.title}`:'لا يوجد بث الآن.';
}
function renderPrivateAdmin(){
 $('#privateEnabledAdmin').checked=config.private.enabled;
 $('#privateMicAdmin').checked=config.private.mic;
 $('#privateCameraAdmin').checked=config.private.camera;
 $('#privatePaidOnlyAdmin').checked=config.private.paidOnly;
}
function savePrivate(){
 config.private.enabled=$('#privateEnabledAdmin').checked;
 config.private.mic=$('#privateMicAdmin').checked;
 config.private.camera=$('#privateCameraAdmin').checked;
 config.private.paidOnly=$('#privatePaidOnlyAdmin').checked;
 saveConfig('تم حفظ إعدادات الدردشة الخاصة');renderOverview();
}
function renderEconomy(){
 $('#giftsEnabledAdmin').checked=config.economy.giftsEnabled;
 $('#vipEnabledAdmin').checked=config.economy.vipEnabled;
 $('#verifyEnabledAdmin').checked=config.economy.verifyEnabled;
 $('#giftPriceGrid').innerHTML=config.economy.gifts.map(g=>`<div class="giftPriceItem"><span>${g.icon}</span><b>${esc(g.name)}</b><input type="number" min="1" value="${g.price}" data-gift-price="${g.id}"></div>`).join('');
}
function saveEconomy(){
 config.economy.giftsEnabled=$('#giftsEnabledAdmin').checked;
 config.economy.vipEnabled=$('#vipEnabledAdmin').checked;
 config.economy.verifyEnabled=$('#verifyEnabledAdmin').checked;
 $$('[data-gift-price]').forEach(i=>{const g=config.economy.gifts.find(x=>x.id===i.dataset.giftPrice);if(g)g.price=Math.max(1,+i.value||1)});
 saveConfig('تم حفظ العملات وأسعار الهدايا');
}
function renderAnnouncementAdmin(){
 $('#announcementAdminText').value=roomById('general')?.announcement||'';
 $('#announcementAdminScope').value='all';
 populateRoomSelect('#announcementAdminRoom','general');
 $('#announcementAdminOn').checked=true;
 $('#announcementRoomField').classList.add('hidden');
}
function publishAnnouncement(){
 const text=$('#announcementAdminText').value.trim();
 const scope=$('#announcementAdminScope').value,on=$('#announcementAdminOn').checked;
 if(scope==='all')config.rooms.forEach(r=>{r.announcement=text;r.announcementOn=on});
 else{const r=roomById($('#announcementAdminRoom').value);if(r){r.announcement=text;r.announcementOn=on}}
 saveConfig(scope==='all'?'تم نشر الإعلان في جميع الغرف':'تم نشر الإعلان في الغرفة المحددة');
}
function renderSecurity(){
 $('#guestEntryAdmin').checked=config.features.guestEntry;
 $('#googleMediaAdmin').checked=config.features.googleForMedia;
 $('#crownProtectionAdmin').checked=config.features.crownProtection;
 $('#antiSpamAdmin').checked=config.features.antiSpam;
 $('#maxMessageAdmin').value=config.features.maxMessageLength;
}
function saveSecurity(){
 config.features.guestEntry=$('#guestEntryAdmin').checked;
 config.features.googleForMedia=$('#googleMediaAdmin').checked;
 config.features.crownProtection=$('#crownProtectionAdmin').checked;
 config.features.antiSpam=$('#antiSpamAdmin').checked;
 config.features.maxMessageLength=Math.max(50,Math.min(1000,+$('#maxMessageAdmin').value||500));
 saveConfig('تم حفظ إعدادات الحماية');renderOverview();
}
function renderLogs(){
 $('#adminLogs').innerHTML=logs.length?logs.map(l=>`<div class="logRow"><time>${new Date(l.time).toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})}</time><b>${esc(l.action)}</b><span>${new Date(l.time).toLocaleDateString('ar-IQ')}</span></div>`).join(''):'<div class="emptyState">لا توجد عمليات مسجلة.</div>';
}
function saveAll(){
 saveRoom();savePrivate();savePermissions();saveEconomy();saveSecurity();updateRadioFromForm();saveConfig('تم حفظ جميع إعدادات لوحة الإدارة');
}


let liveSaveTimer=null;
function persistLiveDraft(){
 clearTimeout(liveSaveTimer);
 liveSaveTimer=setTimeout(()=>{
   localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
   sendConfigLive();
   $('#lastSavedLabel').textContent='معاينة مباشرة: '+new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
   renderOverview();
 },180);
}
function applyActiveSectionDraft(){
 const active=$('.adminSection.active')?.id||'';
 if(active==='section-rooms'){
   const r=roomById(selectedRoomId);
   if(r){
     r.name=$('#editRoomName').value.trim()||r.name;
     r.icon=$('#editRoomIcon').value.trim()||'🏠';
     r.announcement=$('#editRoomAnnouncement').value;
     r.announcementOn=$('#editRoomAnnouncementOn').checked;
     r.micOn=$('#editRoomMicOn').checked;
     r.mics=Math.max(0,Math.min(8,+$('#editRoomMics').value||0));
     r.camOn=$('#editRoomCamOn').checked;
     r.cams=Math.max(0,Math.min(4,+$('#editRoomCams').value||0));
     r.music=$('#editRoomMusic').checked;
   }
 }
 if(active==='section-private'){
   config.private.enabled=$('#privateEnabledAdmin').checked;
   config.private.mic=$('#privateMicAdmin').checked;
   config.private.camera=$('#privateCameraAdmin').checked;
   config.private.paidOnly=$('#privatePaidOnlyAdmin').checked;
 }
 if(active==='section-security'){
   config.features.guestEntry=$('#guestEntryAdmin').checked;
   config.features.googleForMedia=$('#googleMediaAdmin').checked;
   config.features.crownProtection=$('#crownProtectionAdmin').checked;
   config.features.antiSpam=$('#antiSpamAdmin').checked;
   config.features.maxMessageLength=Math.max(50,Math.min(1000,+$('#maxMessageAdmin').value||500));
 }
 if(active==='section-permissions'){readPermissionsForm()}
 if(active==='section-economy'){
   config.economy.giftsEnabled=$('#giftsEnabledAdmin').checked;
   config.economy.vipEnabled=$('#vipEnabledAdmin').checked;
   config.economy.verifyEnabled=$('#verifyEnabledAdmin').checked;
   $$('[data-gift-price]').forEach(i=>{const g=config.economy.gifts.find(x=>x.id===i.dataset.giftPrice);if(g)g.price=Math.max(1,+i.value||1)});
 }
 if(active==='section-radio'){
   updateRadioFromForm();
 }
 persistLiveDraft();
}


function resetAdminData(){
 if(!confirm('إعادة الغرف والمستخدمين والخيارات التجريبية إلى وضعها الأصلي؟'))return;
 config=defaultConfig();
 cameraRequests=[];
 selectedRoomId='general';
 localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
 localStorage.setItem(CAMERA_KEY,'[]');
 sendConfigLive();
 sendCamerasLive();
 addLog('إعادة بيانات التجربة');
 renderOverview();
 renderRoomsAdmin();
 renderUsersAdmin();
 renderEntryAvatarsAdmin();
 renderCameraRequests();
 renderRadioAdmin();
 renderPrivateAdmin();
 renderPermissionsAdmin();
 renderModeratorTokens();
 renderEconomy();
 renderAnnouncementAdmin();
 renderSecurity();
 renderCommunityPanel();
 toast('تمت إعادة بيانات التجربة');
}

function bind(){
 if($('#closeAdminBadgeModal'))$('#closeAdminBadgeModal').onclick=closeAdminBadgePanel;
 if($('#removeAdminBadgeBtn'))$('#removeAdminBadgeBtn').onclick=()=>removeAdminBadge();
 if($('#adminFreeBadgeModal'))$('#adminFreeBadgeModal').onclick=e=>{if(e.target.id==='adminFreeBadgeModal')closeAdminBadgePanel()};

 $$('.adminNav button').forEach(b=>b.onclick=()=>showSection(b.dataset.section));
 $$('[data-jump]').forEach(b=>b.onclick=()=>showSection(b.dataset.jump));
 if($('#resetAdminDataBtn')) $('#resetAdminDataBtn').onclick=resetAdminData;
 $('#saveAllBtn').onclick=saveAll;
 if($('#compactSettingsBtn')) $('#compactSettingsBtn').onclick=toggleSettingsColumn;
 $$('.communityTabs button').forEach(b=>b.onclick=()=>setCommunityTab(b.dataset.communityTab));
 if($('#communitySearchInput')) $('#communitySearchInput').oninput=renderCommunityPanel;
 if($('#ownerVisibilityBtn'))$('#ownerVisibilityBtn').onclick=()=>toggleStaffVisibility('owner');
 if($('#createModeratorTokenBtn'))$('#createModeratorTokenBtn').onclick=createModeratorToken;
 if($('#moderatorSearchInput'))$('#moderatorSearchInput').oninput=renderModeratorTokens;
 if($('#moderatorStatusFilter'))$('#moderatorStatusFilter').onchange=renderModeratorTokens;
 if($('#refreshPreviewBtn')) $('#refreshPreviewBtn').onclick=refreshPreview;
 if($('#expandPreviewBtn')) $('#expandPreviewBtn').onclick=togglePreviewExpanded;
 if($('#collapsePreviewBtn')) $('#collapsePreviewBtn').onclick=collapsePreview;
 if($('#showPreviewBtn')) $('#showPreviewBtn').onclick=showPreview;
 $('#chatPreview').addEventListener('load',()=>{
   setPreviewConnected(true);
   fitChatPreview();
   sendConfigLive();
   sendCamerasLive();
 });
 window.addEventListener('resize',fitChatPreview);
 $('#radioAdminTitle').addEventListener('input',applyActiveSectionDraft);
 $('#radioAdminSource').addEventListener('input',applyActiveSectionDraft);
 $('#radioAdminScope').addEventListener('change',applyActiveSectionDraft);
 $('#radioAdminRoom').addEventListener('change',applyActiveSectionDraft);
 $('#section-rooms').addEventListener('input',e=>{if(e.target.id!=='roomAdminSearch')applyActiveSectionDraft()});
 $('#section-rooms').addEventListener('change',e=>{if(e.target.id!=='roomAdminSearch')applyActiveSectionDraft()});
 $('#section-private').addEventListener('change',applyActiveSectionDraft);
 $('#section-permissions').addEventListener('input',applyActiveSectionDraft);
 $('#section-permissions').addEventListener('change',applyActiveSectionDraft);
 $('#section-security').addEventListener('input',applyActiveSectionDraft);
 $('#section-security').addEventListener('change',applyActiveSectionDraft);
 $('#section-economy').addEventListener('input',applyActiveSectionDraft);
 $('#section-economy').addEventListener('change',applyActiveSectionDraft);
 $('#roomAdminSearch').oninput=renderRoomsAdmin;
 $('#saveRoomBtn').onclick=saveRoom;$('#addRoomBtn').onclick=addRoom;$('#deleteRoomBtn').onclick=deleteRoom;
 $('#userAdminSearch').oninput=renderUsersAdmin;$('#userRoleFilter').onchange=renderUsersAdmin;
 const entryAvatarInput=$('#entryAvatarAdminInput');
 if(entryAvatarInput)entryAvatarInput.addEventListener('change',handleEntryAvatarUpload);
 if($('#closeEntryAvatarManager'))$('#closeEntryAvatarManager').onclick=closeEntryAvatarManager;
 if($('#cancelEntryAvatarManager'))$('#cancelEntryAvatarManager').onclick=closeEntryAvatarManager;
 if($('#saveEntryAvatarManager'))$('#saveEntryAvatarManager').onclick=closeEntryAvatarManager;
 if($('#entryAvatarManagerModal'))$('#entryAvatarManagerModal').onclick=e=>{if(e.target.id==='entryAvatarManagerModal')closeEntryAvatarManager()};
 if($('#promoteSelectedEntryAvatar'))$('#promoteSelectedEntryAvatar').onclick=()=>{if(selectedEntryAvatarId)promoteEntryAvatar(selectedEntryAvatarId)};
 if($('#deleteSelectedEntryAvatar'))$('#deleteSelectedEntryAvatar').onclick=()=>{if(selectedEntryAvatarId&&confirm('حذف الصورة المختارة؟'))removeEntryAvatar(selectedEntryAvatarId)};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#entryAvatarManagerModal')?.classList.contains('hidden'))closeEntryAvatarManager()});
 $('#closeAllCamerasAdmin').onclick=closeAllCameras;
 if($('#closeAllMicsAdmin')) $('#closeAllMicsAdmin').onclick=closeAllMics;
 $('#radioAdminScope').onchange=()=>{$('#radioAdminRoomField').classList.toggle('hidden',$('#radioAdminScope').value!=='room')};
 $('#radioDemoBtn').onclick=()=>{$('#radioAdminTitle').value='موسيقى ريفو التجريبية';$('#radioAdminSource').value='assets/audio/rivo-radio-demo.wav';toast('تم اختيار المقطع التجريبي')};
 $('#radioStartBtn').onclick=()=>setRadioStatus('playing');$('#radioPauseBtn').onclick=()=>setRadioStatus('paused');$('#radioStopBtn').onclick=()=>setRadioStatus('stopped');
 $('#savePrivateBtn').onclick=savePrivate;if($('#savePermissionsBtn'))$('#savePermissionsBtn').onclick=savePermissions;$('#saveEconomyBtn').onclick=saveEconomy;
 $('#announcementAdminScope').onchange=()=>$('#announcementRoomField').classList.toggle('hidden',$('#announcementAdminScope').value!=='room');
 $('#publishAnnouncementBtn').onclick=publishAnnouncement;$('#saveSecurityBtn').onclick=saveSecurity;
 $('#clearLogsBtn').onclick=()=>{if(confirm('مسح السجل الإداري؟')){logs=[];localStorage.setItem(LOG_KEY,'[]');renderLogs();toast('تم مسح السجل')}};
 window.addEventListener('storage',e=>{
   if(e.key===CAMERA_KEY){cameraRequests=readJSON(CAMERA_KEY,[]);renderCameraRequests();renderOverview();sendCamerasLive()}
   if(e.key===MIC_KEY){micRequests=readJSON(MIC_KEY,[]);renderMicRequests();renderOverview();sendMicsLive()}
 });
 window.addEventListener('message',e=>{
   const msg=e.data;
   if(!msg||typeof msg!=='object')return;
   if(msg.type==='rivo-chat-ready'){setPreviewConnected(true);sendConfigLive();sendCamerasLive();sendMicsLive()}
   if(msg.type==='rivo-moderator-token-used'){const token=config.moderatorTokens.find(t=>t.id===msg.payload?.tokenId);if(token){token.lastUsedAt=msg.payload.time||Date.now();const user=moderatorUserForToken(token);if(user)user.status='online';localStorage.setItem(CONFIG_KEY,JSON.stringify(config));renderModeratorTokens();renderUsersAdmin();renderCommunityPanel()}}
   if(msg.type==='rivo-staff-visibility'){const user=userById(msg.payload?.userId);if(user&&['owner','moderator'].includes(user.role)){user.isHidden=Boolean(msg.payload.hidden);if(user.moderatorTokenId){const token=config.moderatorTokens.find(t=>t.id===user.moderatorTokenId);if(token)token.isHidden=user.isHidden}localStorage.setItem(CONFIG_KEY,JSON.stringify(config));renderModeratorTokens();renderUsersAdmin();renderCommunityPanel()}}
   if(msg.type==='rivo-mic-requests'){
     micRequests=Array.isArray(msg.payload)?msg.payload:[];
     localStorage.setItem(MIC_KEY,JSON.stringify(micRequests));
     renderMicRequests();renderOverview();sendMicsLive();
   }
   if(msg.type==='rivo-camera-requests'){
     cameraRequests=Array.isArray(msg.payload)?msg.payload:[];
     localStorage.setItem(CAMERA_KEY,JSON.stringify(cameraRequests));
     renderCameraRequests();renderOverview();sendCamerasLive();
   }
   if(msg.type==='rivo-chat-state'){
     setPreviewConnected(true);
     const stateText=$('#previewSyncState');
     if(stateText)stateText.textContent=`الغرفة: ${roomById(msg.payload?.room)?.name||'—'} · الزوار الظاهرون: ${msg.payload?.users??0}`;
   }
 });
 if(syncChannel)syncChannel.onmessage=e=>{
   const msg=e.data;
   if(msg?.source==='chat'&&msg.type==='rivo-mic-requests'){
     micRequests=Array.isArray(msg.payload)?msg.payload:[];
     localStorage.setItem(MIC_KEY,JSON.stringify(micRequests));
     renderMicRequests();renderOverview();
   }
   if(msg?.source==='chat'&&msg.type==='rivo-camera-requests'){
     cameraRequests=Array.isArray(msg.payload)?msg.payload:[];
     localStorage.setItem(CAMERA_KEY,JSON.stringify(cameraRequests));
     renderCameraRequests();renderOverview();
   }
 };
}
normalizeAdminData();bind();renderOverview();renderRoomsAdmin();renderUsersAdmin();renderEntryAvatarsAdmin();renderCameraRequests();renderMicRequests();renderRadioAdmin();renderPrivateAdmin();renderPermissionsAdmin();renderModeratorTokens();renderEconomy();renderAnnouncementAdmin();renderSecurity();renderLogs();renderCommunityPanel();requestAnimationFrame(fitChatPreview);
