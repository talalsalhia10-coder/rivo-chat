const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const RIVO_ADMIN_AVATAR_MAP={
 entry1:'assets/entry-avatars/rivo-avatar-young-man-purple.jpg',
 entry2:'assets/entry-avatars/rivo-avatar-young-woman-purple.jpg',
 entry3:'assets/entry-avatars/rivo-avatar-man-blue-hoodie.jpg',
 entry4:'assets/entry-avatars/rivo-avatar-young-man-light.jpg',
 entry5:'assets/entry-avatars/rivo-avatar-woman-denim.jpg',
 entry6:'assets/entry-avatars/rivo-avatar-woman-purple-hoodie.jpg',
 lina:'characters/lina/portrait-small.webp',
 girl2:'characters/girl2/portrait-small.webp',
 girl3:'characters/girl3/portrait-small.webp',
 girl4:'characters/girl4/portrait-small.webp',
 man1:'characters/man1/portrait-small.webp',
 avatar6:'characters/avatar6/portrait-small.webp',
 avatar7:'characters/avatar7/portrait-small.webp',
 owner:'assets/avatars/owner.svg',
 guest:'assets/avatars/guest.svg'
};
const avatarSrc=value=>{
 const source=typeof value==='string'?value.trim():'';
 if(/^(data:image\/|blob:|https?:\/\/|\/|assets\/|characters\/)/.test(source))return source;
 return RIVO_ADMIN_AVATAR_MAP[source]||`assets/avatars/${source||'guest'}.svg`;
};
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
const OWNER_SESSION_KEY='rivo_staff_identity_owner_v1';
let ownerSession=null;
let remoteSaveTimer=null;
let remoteSaveSerial=0;
let adminSocket=null;
let adminSocketRoom='';
let adminSocketReconnectTimer=null;
let adminSocketClosing=false;
const DEMO_USER_IDS=new Set(['owner','ahmed','samar','ali','noor','mira','guest1']);
const liveUsersByRoom=new Map();
const presenceSockets=new Map();
const presenceReconnectTimers=new Map();
let presenceSyncStarted=false;
const badgeBackendMap={free_star:'star',free_shining_star:'galaxy',free_sparkles:'crystal',free_flower:'blossom',free_butterfly:'butterfly',free_heart:'heart',free_fire:'flame',free_medal:'medal',free_diamond:'diamond',free_ruby:'ruby',free_emerald:'emerald',free_rose:'rose',free_moon:'moon',free_pink_heart:'pinkHeart',free_wings:'wings'};

const adminFreeBadgeCatalog=[
 {id:'free_star',name:'نجمة ذهبية',icon:'⭐',style:'gold'},
 {id:'free_shining_star',name:'نجمة مضيئة',icon:'🌟',style:'shine'},
 {id:'free_sparkles',name:'بريق جميل',icon:'✨',style:'sparkle'},
 {id:'free_flower',name:'زهرة جميلة',icon:'🌸',style:'flower'},
 {id:'free_butterfly',name:'فراشة ملونة',icon:'🦋',style:'butterfly'},
 {id:'free_heart',name:'قلب مميز',icon:'💖',style:'heart'},
 {id:'free_fire',name:'شعلة حماس',icon:'🔥',style:'fire'},
 {id:'free_medal',name:'وسام تقدير',icon:'🏅',style:'medal'},
 {id:'free_diamond',name:'جوهرة زرقاء',icon:'💎',style:'diamond'},
 {id:'free_ruby',name:'ياقوتة حمراء',icon:'♦️',style:'ruby'},
 {id:'free_emerald',name:'زمردة خضراء',icon:'💚',style:'emerald'},
 {id:'free_rose',name:'وردة فاخرة',icon:'🌹',style:'rose'},
 {id:'free_moon',name:'قمر مضيء',icon:'🌙',style:'moon'},
 {id:'free_pink_heart',name:'قلب وردي',icon:'💗',style:'pinkHeart'},
 {id:'free_wings',name:'أجنحة جميلة',icon:'🪽',style:'wings'}
];
let selectedAdminBadgeUserId=null;
let activeAdminSessionBadges={};
let selectedAdminMessageUserId='all';
let pendingAdminMessage=null;
const ADMIN_PRIVATE_THREADS_KEY='rivoAdminPrivateThreadsV1';
let adminPrivateThreads={};
const adminPrivateReplyIds=new Set();
try{adminPrivateThreads=JSON.parse(localStorage.getItem(ADMIN_PRIVATE_THREADS_KEY)||'{}')||{}}catch(_){adminPrivateThreads={}}



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
const defaultUsers=[];
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
  users:migrateUsers?[]:(Array.isArray(saved.users)?saved.users.filter(user=>!DEMO_USER_IDS.has(String(user?.id||''))):[]),
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
function readOwnerSession(){
 try{
  const value=JSON.parse(localStorage.getItem(OWNER_SESSION_KEY)||'null');
  if(!value?.staffSessionToken||value.role!=='owner')return null;
  if(Number(value.expiresAt||0)&&Number(value.expiresAt)<=Date.now())return null;
  return value;
 }catch(_){return null}
}
function writeOwnerSession(value){
 ownerSession=value||null;
 try{if(value)localStorage.setItem(OWNER_SESSION_KEY,JSON.stringify(value));else localStorage.removeItem(OWNER_SESSION_KEY)}catch(_){ }
}
function setServerSyncState(text,state=''){
 const el=$('#serverSyncState');if(!el)return;
 el.textContent=text;
 el.classList.toggle('connected',state==='connected');
 el.classList.toggle('error',state==='error');
}
function showRemoteAdminLogin(message=''){
 const modal=$('#remoteAdminLogin'),status=$('#remoteAdminLoginStatus');
 if(status)status.textContent=message;
 modal?.classList.remove('hidden');
 setTimeout(()=>$('#remoteAdminCode')?.focus(),50);
}
function hideRemoteAdminLogin(){
 $('#remoteAdminLogin')?.classList.add('hidden');
 if($('#remoteAdminCode'))$('#remoteAdminCode').value='';
 if($('#remoteAdminLoginStatus'))$('#remoteAdminLoginStatus').textContent='';
}
async function authenticateRemoteOwner(code){
 const response=await fetch('/api/auth/staff',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,role:'owner'})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.staffSessionToken)throw new Error(data.error||'رمز الإدارة غير صحيح');
 const session={...data,role:'owner',staffClientId:data.staffId||'owner-main',name:data.name||'الإدارة'};
 writeOwnerSession(session);hideRemoteAdminLogin();setServerSyncState('متصل بالخادم','connected');
 return session;
}
async function ensureOwnerSession(interactive=true){
 ownerSession=readOwnerSession();
 if(ownerSession)return ownerSession;
 if(interactive)showRemoteAdminLogin();
 return null;
}
async function loadRemoteAdminConfig(){
 const session=await ensureOwnerSession(false);if(!session)return false;
 setServerSyncState('جاري تحميل الإعدادات…');
 const response=await fetch('/api/admin/settings',{cache:'no-store',headers:{'x-rivo-staff-session':session.staffSessionToken}});
 const data=await response.json().catch(()=>({}));
 if(response.status===401){writeOwnerSession(null);showRemoteAdminLogin('انتهت جلسة الإدارة. اكتب الرمز من جديد.');setServerSyncState('غير متصل','error');return false}
 if(!response.ok)throw new Error(data.error||'تعذر تحميل إعدادات الإدارة');
 if(data.settings&&Object.keys(data.settings).length){
  config=mergeConfig(data.settings);
  try{localStorage.setItem(CONFIG_KEY,JSON.stringify(config))}catch(_){ }
 }
 setServerSyncState('متصل بالخادم','connected');
 return true;
}
async function saveRemoteAdminConfig(snapshot,serial){
 const session=await ensureOwnerSession(false);if(!session){showRemoteAdminLogin();return false}
 setServerSyncState('جاري الحفظ…');
 const response=await fetch('/api/admin/settings',{method:'PUT',headers:{'content-type':'application/json','x-rivo-staff-session':session.staffSessionToken},body:JSON.stringify({settings:snapshot})});
 const data=await response.json().catch(()=>({}));
 if(response.status===401){writeOwnerSession(null);showRemoteAdminLogin('انتهت جلسة الإدارة. اكتب الرمز من جديد.');setServerSyncState('غير متصل','error');return false}
 if(!response.ok)throw new Error(data.error||'تعذر حفظ إعدادات الإدارة');
 if(serial===remoteSaveSerial){
  setServerSyncState('محفوظ ومتصل','connected');
  const label=$('#lastSavedLabel');if(label)label.textContent='حفظ سحابي: '+new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
 }
 return true;
}
function queueRemoteAdminSave(delay=350){
 clearTimeout(remoteSaveTimer);
 const serial=++remoteSaveSerial;
 const snapshot=structuredClone(config);
 remoteSaveTimer=setTimeout(()=>saveRemoteAdminConfig(snapshot,serial).catch(error=>{console.error(error);setServerSyncState('فشل الحفظ','error');toast(error.message||'تعذر الحفظ السحابي')}),delay);
}
function normalizeLiveRoomId(id){return id==='general'?'lobby':(id||'lobby')}
function closeAdminSocket(){
 adminSocketClosing=true;clearTimeout(adminSocketReconnectTimer);
 try{adminSocket?.close()}catch(_){ }
 adminSocket=null;adminSocketRoom='';
 setTimeout(()=>{adminSocketClosing=false},0);
}
function sendAdminCommand(action,payload={}){
 let socket=adminSocket;
 if(payload?.clientId){
  const target=config.users.find(user=>user.id===payload.clientId);
  const roomKey=normalizeLiveRoomId(target?.room||selectedRoomId);
  const roomSocket=presenceSockets.get(roomKey);
  if(roomSocket?.readyState===WebSocket.OPEN)socket=roomSocket;
 }
 if(!socket||socket.readyState!==WebSocket.OPEN){toast('انتظر اتصال لوحة الإدارة بالدردشة');connectAdminSocket(true);syncPresenceSockets(true);return false}
 socket.send(JSON.stringify({type:'admin-command',action,...payload}));return true;
}
function mapLiveAdminUser(user,roomId){
 const role=user.role==='owner'?'owner':user.role==='moderator'?'moderator':user.isGuest?'guest':'user';
 const existing=config.users.find(item=>item.id===user.clientId)||{};
 return{...existing,id:user.clientId,name:user.nickname||'مستخدم',avatar:user.avatar||'guest',room:roomId,role,plan:role==='owner'?'owner':role==='moderator'?'moderator':user.isVip?'vip':role==='guest'?'guest':'user',authType:role==='guest'?'guest':role==='owner'?'owner':role==='moderator'?'moderator':'google',coins:Number(existing.coins||0),status:'online',vip:Boolean(user.isVip),verified:Boolean(user.verified),isHidden:user.adminVisible===false,micBlocked:Boolean(user.micBlocked),privateBlocked:Boolean(user.privateBlocked),badge:user.badge||''};
}
function uiRoomId(id){return normalizeLiveRoomId(id)==='lobby'?'general':normalizeLiveRoomId(id)}
function cleanConfiguredUsers(users=[]){return users.filter(user=>user&&!DEMO_USER_IDS.has(String(user.id||'')))}
function rebuildUsersFromLivePresence(){
 const live=[];
 for(const roomUsers of liveUsersByRoom.values())for(const user of roomUsers)live.push(user);
 const liveIds=new Set(live.map(user=>user.id));
 const preserved=cleanConfiguredUsers(config.users).filter(user=>['owner','moderator'].includes(userAccessRole(user))&&!liveIds.has(user.id)).map(user=>({...user,status:'offline'}));
 const unique=new Map();
 for(const user of [...preserved,...live])unique.set(user.id,user);
 config.users=[...unique.values()];
 for(const room of config.rooms){room.count=(liveUsersByRoom.get(room.id)||[]).length}
}
function closePresenceSocket(roomKey){
 const socket=presenceSockets.get(roomKey);
 if(socket){try{socket.close()}catch(_){}}
 presenceSockets.delete(roomKey);
 clearTimeout(presenceReconnectTimers.get(roomKey));
 presenceReconnectTimers.delete(roomKey);
}
function connectPresenceSocket(roomKey,force=false){
 const session=readOwnerSession();if(!session)return;
 const backendRoom=normalizeLiveRoomId(roomKey);
 const existing=presenceSockets.get(backendRoom);
 if(!force&&existing&&existing.readyState<=WebSocket.OPEN)return;
 closePresenceSocket(backendRoom);
 const protocol=location.protocol==='https:'?'wss:':'ws:';
 const params=new URLSearchParams({staffSessionToken:session.staffSessionToken,role:'owner',staffClientId:`presence-${session.staffClientId||session.staffId||'owner'}-${backendRoom}`,visible:'0'});
 const socket=new WebSocket(`${protocol}//${location.host}/api/rooms/${encodeURIComponent(backendRoom)}/admin-ws?${params}`);
 presenceSockets.set(backendRoom,socket);
 socket.onmessage=event=>{let data=null;try{data=JSON.parse(event.data)}catch(_){return}if(['admin-init','admin-state'].includes(data.type))applyAdminSocketState(data,uiRoomId(backendRoom),true);handleAdminMessageSocketReply(data,backendRoom)};
 socket.onclose=()=>{if(presenceSockets.get(backendRoom)!==socket)return;presenceSockets.delete(backendRoom);clearTimeout(presenceReconnectTimers.get(backendRoom));presenceReconnectTimers.set(backendRoom,setTimeout(()=>connectPresenceSocket(backendRoom,true),2200))};
 socket.onerror=()=>{};
}
function syncPresenceSockets(force=false){
 const wanted=new Set(config.rooms.filter(room=>room.enabled!==false).map(room=>normalizeLiveRoomId(room.id)));
 for(const key of [...presenceSockets.keys()])if(!wanted.has(key))closePresenceSocket(key);
 for(const key of wanted)connectPresenceSocket(key,force);
 presenceSyncStarted=true;
}
function applyAdminSocketState(data,sourceRoomId=selectedRoomId,fromPresenceSocket=false){
 if(Array.isArray(data.roomCatalog)&&data.roomCatalog.length){
  const old=new Map(config.rooms.map(room=>[normalizeLiveRoomId(room.id),room]));
  config.rooms=data.roomCatalog.map((room,index)=>({...(old.get(room.id)||{}),id:room.id==='lobby'?'general':room.id,name:room.name||room.id,icon:(old.get(room.id)||{}).icon||'💬',order:Number(room.order??index),enabled:room.enabled!==false,cams:Number((old.get(room.id)||{}).cams||0),mics:Number((old.get(room.id)||{}).mics||4),camOn:(old.get(room.id)||{}).camOn!==false,micOn:(old.get(room.id)||{}).micOn!==false,music:(old.get(room.id)||{}).music!==false,announcement:(old.get(room.id)||{}).announcement||'',announcementOn:(old.get(room.id)||{}).announcementOn!==false}));
  if(!roomById(selectedRoomId))selectedRoomId=config.rooms[0]?.id||'general';
  queueMicrotask(()=>syncPresenceSockets(false));
 }
 if(Array.isArray(data.users)){
  const currentRoom=uiRoomId(sourceRoomId);
  const mapped=data.users.map(user=>mapLiveAdminUser(user,currentRoom));
  liveUsersByRoom.set(currentRoom,mapped);
  rebuildUsersFromLivePresence();
  for(const user of data.users){if(user.badge){activeAdminSessionBadges[user.clientId]={id:user.badge,name:'شارة',icon:({'star':'⭐','galaxy':'🌟','crystal':'✨','blossom':'🌸','butterfly':'🦋','heart':'💖','flame':'🔥','medal':'🏅','diamond':'💎','ruby':'♦️','emerald':'💚','rose':'🌹','moon':'🌙','pinkHeart':'💗','wings':'🪽'})[user.badge]||'🎁'}}}
 }
 if(Array.isArray(data.logs)&&data.logs.length){
  logs=data.logs.slice(0,100).map(item=>({time:Number(item.createdAt||Date.now()),action:`${item.action||'إجراء'} ${item.targetNickname||''}`.trim()}));
  try{localStorage.setItem(LOG_KEY,JSON.stringify(logs))}catch(_){ }
 }
 renderOverview();renderRoomsAdmin();renderUsersAdmin();renderCommunityPanel();renderLogs();
}
function connectAdminSocket(force=false){
 const session=readOwnerSession();if(!session)return;
 const roomId=normalizeLiveRoomId(selectedRoomId);
 if(!force&&adminSocket&&adminSocket.readyState<=WebSocket.OPEN&&adminSocketRoom===roomId)return;
 closeAdminSocket();adminSocketClosing=false;adminSocketRoom=roomId;
 const protocol=location.protocol==='https:'?'wss:':'ws:';
 const params=new URLSearchParams({staffSessionToken:session.staffSessionToken,role:'owner',staffClientId:session.staffClientId||session.staffId||'owner-main',visible:'1'});
 const socket=new WebSocket(`${protocol}//${location.host}/api/rooms/${encodeURIComponent(roomId)}/admin-ws?${params}`);adminSocket=socket;
 socket.onopen=()=>{setServerSyncState('متصل بالخادم والدردشة','connected')};
 socket.onmessage=event=>{let data=null;try{data=JSON.parse(event.data)}catch(_){return}if(['admin-init','admin-state'].includes(data.type))applyAdminSocketState(data,uiRoomId(roomId),false);if(!handleAdminMessageSocketReply(data,roomId)&&data.type==='admin-error')toast(data.message||'تعذر تنفيذ أمر الإدارة')};
 socket.onclose=()=>{if(adminSocket!==socket)return;adminSocket=null;if(!adminSocketClosing){setServerSyncState('إعادة الاتصال…');clearTimeout(adminSocketReconnectTimer);adminSocketReconnectTimer=setTimeout(()=>connectAdminSocket(true),1800)}};
 socket.onerror=()=>setServerSyncState('تعذر اتصال الدردشة','error');
}
function renderAdminDesignAll(){
 ensureAdminMessageUi();
 normalizeAdminData();renderOverview();renderRoomsAdmin();renderUsersAdmin();renderEntryAvatarsAdmin();renderCameraRequests();renderMicRequests();renderRadioAdmin();renderPrivateAdmin();renderPermissionsAdmin();renderModeratorTokens();renderEconomy();renderAnnouncementAdmin();renderSecurity();renderLogs();renderCommunityPanel();requestAnimationFrame(fitChatPreview);
}
let config=mergeConfig(readJSON(CONFIG_KEY,null));
try{localStorage.setItem(CONFIG_KEY,JSON.stringify(config))}catch(_){/* تبقى الإعدادات عاملة حتى لو امتلأت مساحة المتصفح */}
let cameraRequests=readJSON(CAMERA_KEY,[]);
let micRequests=readJSON(MIC_KEY,[]);
let logs=readJSON(LOG_KEY,[]);
let selectedRoomId=(()=>{const requested=new URLSearchParams(location.search).get('room')||'';const normalized=requested==='lobby'?'general':requested;return config.rooms.some(room=>room.id===normalized)?normalized:(config.rooms[0]?.id||'general')})();


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
 queueRemoteAdminSave(0);
 addLog(message);
 $('#lastSavedLabel').textContent='آخر حفظ: '+new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
 toast(message);
 renderOverview();
 return true;
}
async function saveEntryAvatarConfigToCloud(message='تم حفظ صور الدخول'){
 if(!persistAdminConfig()){
  const warning='تعذر الحفظ لأن مساحة المتصفح ممتلئة. احذف بعض صور الدخول القديمة ثم أعد المحاولة.';
  setEntryAvatarUploadStatus(warning,'error');
  toast(warning);
  return false;
 }
 const serial=++remoteSaveSerial;
 const snapshot=structuredClone(config);
 try{
  const saved=await saveRemoteAdminConfig(snapshot,serial);
  if(!saved){
   setEntryAvatarUploadStatus('لم يتم الحفظ على الخادم. سجّل دخول المالك ثم اضغط حفظ وإغلاق.','error');
   return false;
  }
  sendConfigLive();
  addLog(message);
  const label=$('#lastSavedLabel');
  if(label)label.textContent='حفظ سحابي: '+new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
  renderOverview();
  return true;
 }catch(error){
  console.error('Entry avatars cloud save failed',error);
  setServerSyncState('فشل حفظ الصور','error');
  setEntryAvatarUploadStatus(error?.message||'تعذر حفظ صور الدخول على الخادم.','error');
  toast(error?.message||'تعذر حفظ صور الدخول على الخادم');
  return false;
 }
}
async function saveEntryAvatarManagerAndClose(){
 setEntryAvatarUploadBusy(true);
 setEntryAvatarUploadStatus('جارٍ حفظ صور الدخول على الخادم…','loading');
 const saved=await saveEntryAvatarConfigToCloud('تم حفظ صور الدخول ونشرها للمستخدمين');
 setEntryAvatarUploadBusy(false);
 if(!saved)return;
 setEntryAvatarUploadStatus('تم الحفظ على الخادم وستظهر الصور للضيوف والمسجلين.','success');
 toast('تم حفظ صور الدخول ونشرها للجميع');
 setTimeout(closeEntryAvatarManager,250);
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
 sendAdminCommand('set-user-badge',{clientId:user.id,nickname:user.name,badge:badgeBackendMap[badge.id]||'star'});
 renderCommunityPanel();renderUsersAdmin();
 closeAdminBadgePanel();
 toast(`تم وضع ${badge.name} قرب اسم ${user.name}`);
}
function removeAdminBadge(userId=selectedAdminBadgeUserId){
 const user=userById(userId);if(!user)return;
 delete activeAdminSessionBadges[user.id];
 sendLiveMessage('rivo-free-badge-remove',{userId:user.id});
 sendAdminCommand('set-user-badge',{clientId:user.id,nickname:user.name,badge:''});
 renderCommunityPanel();renderUsersAdmin();
 closeAdminBadgePanel();
 toast(`تمت إزالة الشارة من ${user.name}`);
}
function adminBadgeIcon(userId){return activeAdminSessionBadges[userId]?.icon||'⭐'}
function resendAdminSessionBadges(){
 Object.entries(activeAdminSessionBadges).forEach(([userId,badge])=>sendLiveMessage('rivo-free-badge-grant',{userId,badge}));
}

function ensureAdminMessageUi(){
 if(!document.getElementById('rivoAdminMessageStyles')){
  const style=document.createElement('style');style.id='rivoAdminMessageStyles';style.textContent=`
  .adminMessageIconBtn{width:38px;height:38px;border:0;border-radius:12px;background:linear-gradient(135deg,#2563eb,#4f8cff);color:#fff;display:grid;place-items:center;font-size:19px;box-shadow:0 7px 16px rgba(37,99,235,.22);flex:0 0 auto}
  .adminMessageIconBtn:hover{transform:translateY(-1px);filter:brightness(1.05)}
  .adminBroadcastMessageBtn{width:calc(100% - 18px);margin:6px 9px 8px;border:0;border-radius:11px;padding:10px 12px;background:linear-gradient(135deg,#653cff,#3188ff);color:#fff;font-weight:900;box-shadow:0 8px 18px rgba(73,76,220,.2)}
  .adminDirectMessageOverlay{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.58);display:grid;place-items:center;padding:18px;backdrop-filter:blur(5px)}
  .adminDirectMessageCard{width:min(560px,96vw);max-height:90vh;background:#fff;border-radius:22px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.3);position:relative;direction:rtl;display:flex;flex-direction:column}
  .adminDirectMessageCard h2{margin:0 0 6px;font-size:25px}.adminDirectMessageCard p{margin:0 0 14px;color:#667085}
  .adminDirectMessageCard textarea{width:100%;min-height:76px;max-height:150px;resize:vertical;border:1px solid #cbd5e1;border-radius:14px;padding:13px;font:inherit;outline:none}
  .adminDirectMessageCard textarea:focus{border-color:#4f7cff;box-shadow:0 0 0 3px rgba(79,124,255,.13)}
  .adminDirectMessageActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}
  .adminDirectMessageActions button{border:0;border-radius:12px;padding:12px;font-weight:900}
  .adminDirectMessageSend{background:linear-gradient(135deg,#5b46f4,#2f8cff);color:#fff}.adminDirectMessageCancel{background:#edf1f6;color:#334155}
  .adminDirectMessageClose{position:absolute;left:14px;top:13px;width:34px;height:34px;border:0;border-radius:50%;background:#eef2f7;font-size:20px}
  .adminDirectMessageTarget{display:inline-flex;align-items:center;gap:7px;background:#eef3ff;color:#3157b7;border-radius:999px;padding:7px 11px;font-weight:800;margin-bottom:12px}
  .adminDirectMessageStatus{min-height:38px;margin-top:10px;border-radius:11px;padding:9px 11px;background:#f3f5f8;color:#526072;font-weight:700}.adminDirectMessageStatus.success{background:#e8fff3;color:#087b4c}.adminDirectMessageStatus.error{background:#fff0f1;color:#b42335}.adminDirectMessageStatus.sending{background:#eef4ff;color:#3157b7}
  .adminDirectMessageSentCopy{margin-top:9px;border:1px solid #dce5f4;background:#f8faff;border-radius:12px;padding:10px 12px;white-space:pre-wrap;word-break:break-word;color:#1f2937}

  .adminDirectMessageThread{min-height:170px;max-height:42vh;overflow:auto;background:#f7f9fc;border:1px solid #e0e6ef;border-radius:16px;padding:12px;margin:2px 0 12px;display:flex;flex-direction:column;gap:9px}
  .adminDirectMessageBubble{max-width:82%;border-radius:16px;padding:10px 12px;white-space:pre-wrap;word-break:break-word;line-height:1.55;box-shadow:0 4px 12px rgba(31,41,55,.07)}
  .adminDirectMessageBubble.mine{align-self:flex-start;background:linear-gradient(135deg,#5b46f4,#2f8cff);color:#fff;border-bottom-left-radius:5px}
  .adminDirectMessageBubble.theirs{align-self:flex-end;background:#fff;color:#1f2937;border:1px solid #e0e6ef;border-bottom-right-radius:5px}
  .adminDirectMessageBubble small{display:block;margin-top:4px;font-size:10px;opacity:.78}
  .adminDirectMessageEmpty{text-align:center;color:#7b8494;padding:34px 10px}
  `;document.head.appendChild(style);
 }
 if(!document.getElementById('adminDirectMessageOverlay')){
  const overlay=document.createElement('div');overlay.id='adminDirectMessageOverlay';overlay.className='adminDirectMessageOverlay hidden';overlay.innerHTML=`<div class="adminDirectMessageCard"><button id="adminDirectMessageClose" class="adminDirectMessageClose">×</button><h2>محادثة خاصة من الإدارة</h2><p>هذه المحادثة تتجاوز إغلاق الخاص، وتبقى النافذة مفتوحة حتى تغلقها بنفسك.</p><div id="adminDirectMessageTarget" class="adminDirectMessageTarget">👥 الجميع</div><div id="adminDirectMessageThread" class="adminDirectMessageThread"></div><textarea id="adminDirectMessageText" maxlength="500" placeholder="اكتب رسالتك الخاصة هنا..."></textarea><div id="adminDirectMessageStatus" class="adminDirectMessageStatus">اكتب الرسالة ثم اضغط إرسال.</div><div id="adminDirectMessageSentCopy" class="adminDirectMessageSentCopy hidden"></div><div class="adminDirectMessageActions"><button id="adminDirectMessageSend" class="adminDirectMessageSend">إرسال</button><button id="adminDirectMessageCancel" class="adminDirectMessageCancel">إغلاق</button></div></div>`;
  document.body.appendChild(overlay);
  $('#adminDirectMessageClose').onclick=closeAdminMessagePanel;
  $('#adminDirectMessageCancel').onclick=closeAdminMessagePanel;
  $('#adminDirectMessageSend').onclick=sendAdminMessageNow;
  $('#adminDirectMessageText').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAdminMessageNow()}});
  overlay.onclick=e=>{if(e.target===overlay)closeAdminMessagePanel()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.classList.contains('hidden'))closeAdminMessagePanel()});
 }
 const panel=$('#communityUsersPanel');
 if(panel&&!$('#adminBroadcastMessageBtn')){
  const button=document.createElement('button');button.id='adminBroadcastMessageBtn';button.className='adminBroadcastMessageBtn';button.textContent='📣 رسالة لجميع المتصلين';
  button.onclick=()=>openAdminMessagePanel('all');
  panel.insertBefore(button,panel.querySelector('.communityCount')?.nextSibling||panel.firstChild);
 }
}

function saveAdminPrivateThreads(){
 try{localStorage.setItem(ADMIN_PRIVATE_THREADS_KEY,JSON.stringify(adminPrivateThreads))}catch(_){}
}
function adminPrivateThread(userId){
 const id=String(userId||'');
 if(!Array.isArray(adminPrivateThreads[id]))adminPrivateThreads[id]=[];
 return adminPrivateThreads[id];
}
function appendAdminPrivateThread(userId,message){
 const id=String(userId||'');if(!id||id==='all')return;
 const item={id:String(message.id||`${Date.now()}-${Math.random()}`),direction:message.direction==='in'?'in':'out',body:String(message.body||'').trim(),createdAt:Number(message.createdAt||Date.now()),name:String(message.name||'')};
 if(!item.body)return;
 const list=adminPrivateThread(id);
 if(list.some(entry=>entry.id===item.id))return;
 list.push(item);adminPrivateThreads[id]=list.slice(-120);saveAdminPrivateThreads();renderAdminPrivateThread();
}
function renderAdminPrivateThread(){
 const box=$('#adminDirectMessageThread');if(!box)return;
 const target=selectedAdminMessageUserId||'all';
 if(target==='all'){box.innerHTML='<div class="adminDirectMessageEmpty">هذه رسالة جماعية، ولا توجد محادثة ردود جماعية.</div>';return}
 const list=adminPrivateThread(target);
 box.innerHTML=list.length?list.map(item=>`<div class="adminDirectMessageBubble ${item.direction==='in'?'theirs':'mine'}"><div>${esc(item.body)}</div><small>${item.direction==='in'?(item.name||'المستخدم'):'الإدارة'} · ${new Date(item.createdAt).toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})}</small></div>`).join(''):'<div class="adminDirectMessageEmpty">ابدأ المحادثة الخاصة مع هذا المستخدم</div>';
 requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight});
}
function openAdminMessagePanel(userId='all'){
 ensureAdminMessageUi();selectedAdminMessageUserId=userId||'all';
 const user=selectedAdminMessageUserId==='all'?null:userById(selectedAdminMessageUserId);
 $('#adminDirectMessageTarget').textContent=user?`💬 إلى ${user.name}`:'📣 إلى جميع المتصلين';
 $('#adminDirectMessageText').value='';
 renderAdminPrivateThread();
 const status=$('#adminDirectMessageStatus');if(status){status.className='adminDirectMessageStatus';status.textContent='اكتب الرسالة ثم اضغط إرسال.'}
 const copy=$('#adminDirectMessageSentCopy');if(copy){copy.classList.add('hidden');copy.textContent=''}
 const sendButton=$('#adminDirectMessageSend');if(sendButton){sendButton.disabled=false;sendButton.textContent='إرسال'}
 pendingAdminMessage=null;
 $('#adminDirectMessageOverlay').classList.remove('hidden');
 setTimeout(()=>$('#adminDirectMessageText')?.focus(),60);
}
function closeAdminMessagePanel(){$('#adminDirectMessageOverlay')?.classList.add('hidden')}
function adminMessageSocketForRoom(roomId){
 const backendRoom=normalizeLiveRoomId(roomId||selectedRoomId);
 const presence=presenceSockets.get(backendRoom);
 if(presence?.readyState===WebSocket.OPEN)return{socket:presence,room:backendRoom};
 if(adminSocket?.readyState===WebSocket.OPEN&&adminSocketRoom===backendRoom)return{socket:adminSocket,room:backendRoom};
 connectPresenceSocket(backendRoom,true);
 return{socket:null,room:backendRoom};
}
function sendAdminMessageCommand(targetId,body){
 if(targetId==='all'){
  const sockets=[];
  for(const [roomId,socket] of presenceSockets.entries()){
   if(socket?.readyState===WebSocket.OPEN)sockets.push({roomId,socket});
  }
  if(!sockets.length&&adminSocket?.readyState===WebSocket.OPEN)sockets.push({roomId:adminSocketRoom,socket:adminSocket});
  for(const item of sockets)item.socket.send(JSON.stringify({type:'admin-command',action:'send-admin-message',body,all:true}));
  return{ok:sockets.length>0,expected:sockets.length,rooms:sockets.map(item=>item.roomId)};
 }
 const user=userById(targetId);
 if(!user)return{ok:false,expected:0,error:'المستخدم غير موجود في القائمة'};
 const route=adminMessageSocketForRoom(user.room);
 if(!route.socket)return{ok:false,expected:0,error:'جاري الاتصال بغرفة المستخدم، حاول الإرسال بعد لحظة'};
 route.socket.send(JSON.stringify({type:'admin-command',action:'send-admin-message',clientId:targetId,nickname:user.name||'مستخدم',body}));
 return{ok:true,expected:1,rooms:[route.room]};
}
function setAdminMessageStatus(text,type=''){
 const status=$('#adminDirectMessageStatus');if(!status)return;
 status.className=`adminDirectMessageStatus ${type}`.trim();status.textContent=text;
}
function handleAdminMessageSocketReply(data,roomId=''){
 if(!data)return false;
 if(data.type==='admin-private-reply'){
  const message=data.message||{};const senderId=String(message.senderId||'');if(!senderId||!message.body)return true;
  const mid=String(message.id||`${senderId}-${message.createdAt||Date.now()}-${message.body}`);if(adminPrivateReplyIds.has(mid))return true;adminPrivateReplyIds.add(mid);
  appendAdminPrivateThread(senderId,{id:mid,direction:'in',body:message.body,createdAt:message.createdAt,name:message.senderNickname||'المستخدم'});
  const user=userById(senderId);toast(`رد خاص جديد من ${user?.name||message.senderNickname||'مستخدم'}`);
  if(selectedAdminMessageUserId===senderId&&!$('#adminDirectMessageOverlay')?.classList.contains('hidden')){renderAdminPrivateThread();setAdminMessageStatus('وصل رد جديد من المستخدم','success')}
  return true;
 }
 if(!['admin-message-sent','admin-error'].includes(data.type))return false;
 if(data.type==='admin-error'){
  if(pendingAdminMessage){
   pendingAdminMessage.errors=(pendingAdminMessage.errors||0)+1;
   setAdminMessageStatus(data.message||'تعذر إرسال الرسالة','error');
   const button=$('#adminDirectMessageSend');if(button){button.disabled=false;button.textContent='إعادة الإرسال'}
  }else toast(data.message||'تعذر تنفيذ أمر الإدارة');
  return true;
 }
 if(!pendingAdminMessage){toast(data.message||'تم إرسال الرسالة');return true}
 pendingAdminMessage.acks=(pendingAdminMessage.acks||0)+1;
 pendingAdminMessage.confirmations ||= [];
 pendingAdminMessage.confirmations.push(data.message||'تم إرسال الرسالة');
 const done=pendingAdminMessage.acks>=pendingAdminMessage.expected;
 const targetUser=pendingAdminMessage.target==='all'?null:userById(pendingAdminMessage.target);
 const label=targetUser?`تم إرسال الرسالة إلى ${targetUser.name}.`:`تم إرسال الرسالة إلى المتصلين في ${pendingAdminMessage.acks} من ${pendingAdminMessage.expected} غرفة.`;
 setAdminMessageStatus(label,done?'success':'sending');
 const copy=$('#adminDirectMessageSentCopy');if(copy){copy.textContent=pendingAdminMessage.body;copy.classList.remove('hidden')}
 if(done){
  const button=$('#adminDirectMessageSend');if(button){button.disabled=false;button.textContent='إرسال'}
  addLog(targetUser?`أرسلت الإدارة رسالة إلى ${targetUser.name}`:'أرسلت الإدارة رسالة إلى جميع المتصلين');
  toast(label);
  pendingAdminMessage=null;
 }
 return true;
}
function sendAdminMessageNow(){
 const body=String($('#adminDirectMessageText')?.value||'').trim();
 if(!body){toast('اكتب الرسالة أولاً');$('#adminDirectMessageText')?.focus();return}
 const target=selectedAdminMessageUserId||'all';
 const result=sendAdminMessageCommand(target,body);
 if(!result.ok){setAdminMessageStatus(result.error||'تعذر إرسال الرسالة','error');return}
 pendingAdminMessage={target,body,expected:Math.max(1,result.expected||1),acks:0,errors:0,rooms:result.rooms||[],sentAt:Date.now()};
 if(target!=='all')appendAdminPrivateThread(target,{id:`admin-${Date.now()}-${Math.random()}`,direction:'out',body,createdAt:Date.now(),name:'الإدارة'});
 if($('#adminDirectMessageText'))$('#adminDirectMessageText').value='';
 const button=$('#adminDirectMessageSend');if(button){button.disabled=true;button.textContent='جارٍ الإرسال...'}
 const copy=$('#adminDirectMessageSentCopy');if(copy){copy.classList.add('hidden');copy.textContent=''}
 setAdminMessageStatus('جارٍ إرسال الرسالة إلى المستخدم...','sending');
}

function renderCommunityPanel(){normalizeAdminData();
 const q=($('#communitySearchInput')?.value||'').trim();
 const users=sortAdminUsersByHierarchy(config.users.filter(u=>['online','muted'].includes(u.status)&&u.status!=='kicked'&&String(u.name||'').includes(q)));
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
   <button class="adminMessageIconBtn" data-admin-message-user="${u.id}" title="إرسال رسالة إلى المستخدم">💬</button>
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
   if(e.target.closest('[data-admin-badge-user]')||e.target.closest('[data-admin-message-user]')||e.target.closest('[data-community-visibility]'))return;
   const user=userById(row.dataset.communityUser);
   showSection('users');
   $('#userAdminSearch').value=user?.name||'';
   renderUsersAdmin();
 });
 $$('[data-admin-message-user]').forEach(button=>button.onclick=e=>{e.stopPropagation();openAdminMessagePanel(button.dataset.adminMessageUser)});
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
 if(!Array.isArray(config.users))config.users=[];config.users=cleanConfiguredUsers(config.users);
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
 $$('[data-room-edit]').forEach(b=>b.onclick=()=>{selectedRoomId=b.dataset.roomEdit;renderRoomsAdmin();loadRoomEditor();connectAdminSocket(true)});
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
    <button class="adminMessageIconBtn" data-table-message-user="${u.id}" title="إرسال رسالة">💬</button>
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
 $$('[data-table-message-user]').forEach(b=>b.onclick=()=>openAdminMessagePanel(b.dataset.tableMessageUser));
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
 if(action==='mute'){
  const blocked=u.status!=='muted';u.status=blocked?'muted':'online';u.micBlocked=blocked;
  sendAdminCommand('block-user-mic',{clientId:u.id,nickname:u.name,blocked});
  addLog(`${blocked?'كتم مايك':'إلغاء كتم مايك'} ${u.name}`)
 }
 if(action==='camera'){
  cameraRequests.forEach(r=>{if(r.userId===u.id&&r.status==='approved')r.status='denied'});
  saveCameraRequests();addLog('إغلاق كاميرا '+u.name);
 }
 if(action==='kick'){u.status='kicked';delete activeAdminSessionBadges[u.id];sendLiveMessage('rivo-free-badge-remove',{userId:u.id});sendAdminCommand('kick-user',{clientId:u.id,nickname:u.name});addLog('طرد '+u.name)}
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
  setEntryAvatarUploadStatus('تم تجهيز الصورة. جارٍ حفظها على الخادم ونشرها للجميع…','loading');
  const cloudSaved=await saveEntryAvatarConfigToCloud('رفع صورة جديدة لواجهة الدخول');
  if(!cloudSaved)throw new Error('cloud_save_failed');
  renderEntryAvatarsAdmin();
  renderOverview();
  const sizeKb=Math.max(1,Math.round(dataUrlApproxBytes(item.src)/1024));
  setEntryAvatarUploadStatus(`تم رفع الصورة وحفظها على الخادم بنجاح (${sizeKb} كيلوبايت). ستظهر للضيوف والمسجلين وفي بداية الدخول.`,'success');
  toast('تم نشر الصورة الجديدة لجميع المستخدمين');
  const frame=$('#chatPreview');
  try{frame?.contentWindow?.postMessage({type:'rivo-admin-config',payload:structuredClone(config),source:'admin',time:Date.now()},'*')}catch(_){}
  requestAnimationFrame(()=>{
   const card=document.querySelector(`[data-entry-avatar-id="${item.id}"]`);
   card?.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
 }catch(error){
  if(item){
   config.entryAvatars=config.entryAvatars.filter(entry=>entry.id!==item.id);
   persistAdminConfig();
   renderEntryAvatarsAdmin();
  }
  const message=error?.message==='storage_failed'
   ?'تعذر حفظ الصورة لأن مساحة المتصفح ممتلئة. احذف بعض صور الدخول القديمة ثم أعد المحاولة.'
   :error?.message==='cloud_save_failed'
    ?'تم تجهيز الصورة لكن تعذر حفظها على الخادم، لذلك لم تُنشر للمستخدمين. تأكد من ظهور «متصل بالخادم والدردشة» ثم أعد الرفع.'
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
   queueRemoteAdminSave(500);
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
 const remoteLoginForm=$('#remoteAdminLoginForm');
 if(remoteLoginForm)remoteLoginForm.onsubmit=async event=>{event.preventDefault();const code=$('#remoteAdminCode')?.value.trim();if(!code)return;const button=$('#remoteAdminLoginButton');if(button)button.disabled=true;try{await authenticateRemoteOwner(code);await loadRemoteAdminConfig();renderAdminDesignAll();connectAdminSocket(true)}catch(error){if($('#remoteAdminLoginStatus'))$('#remoteAdminLoginStatus').textContent=error.message||'تعذر تسجيل الدخول'}finally{if(button)button.disabled=false}};
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
 if($('#saveEntryAvatarManager'))$('#saveEntryAvatarManager').onclick=saveEntryAvatarManagerAndClose;
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
async function bootstrapAdminDesign(){
 normalizeAdminData();bind();renderAdminDesignAll();
 ownerSession=readOwnerSession();
 if(!ownerSession){setServerSyncState('يلزم دخول المالك','error');showRemoteAdminLogin();return}
 try{await loadRemoteAdminConfig();normalizeAdminData();renderAdminDesignAll();connectAdminSocket(true);syncPresenceSockets(true)}catch(error){console.error(error);setServerSyncState('تعذر ربط الخادم','error');toast(error.message||'تعذر ربط لوحة الإدارة')}
}
window.addEventListener('beforeunload',()=>{for(const key of [...presenceSockets.keys()])closePresenceSocket(key)});
bootstrapAdminDesign();
