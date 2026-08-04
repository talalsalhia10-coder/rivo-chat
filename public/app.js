const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const isDirectAvatarSource=value=>typeof value==='string'&&/^(data:image\/|blob:|https?:\/\/|\/|assets\/|characters\/)/.test(value);
const RIVO_LIVE_AVATAR_MAP={
 entry1:'assets/entry-avatars/rivo-avatar-young-man-purple.jpg',
 entry2:'assets/entry-avatars/rivo-avatar-young-woman-purple.jpg',
 entry3:'assets/entry-avatars/rivo-avatar-man-blue-hoodie.jpg',
 entry4:'assets/entry-avatars/rivo-avatar-young-man-light.jpg',
 entry5:'assets/entry-avatars/rivo-avatar-woman-denim.jpg',
 entry6:'assets/entry-avatars/rivo-avatar-woman-purple-hoodie.jpg',
 lina:'characters/lina/portrait-small.webp',girl2:'characters/girl2/portrait-small.webp',girl3:'characters/girl3/portrait-small.webp',girl4:'characters/girl4/portrait-small.webp',man1:'characters/man1/portrait-small.webp',avatar6:'characters/avatar6/portrait-small.webp',avatar7:'characters/avatar7/portrait-small.webp',
 owner:'assets/avatars/owner.svg',guest:'assets/avatars/guest.svg'
};
const av=n=>{
 const raw=String(n||'');
 if(isDirectAvatarSource(raw))return raw;
 let managed=null;
 try{managed=(Array.isArray(state.entryAvatarOptions)?state.entryAvatarOptions:[]).find(item=>item&&(String(item.id)===raw||String(item.src)===raw))||null}catch(_){}
 if(managed?.src)return managed.src;
 return RIVO_LIVE_AVATAR_MAP[raw]||`assets/avatars/${raw||'guest'}.svg`;
};
const state={
 room:'general', user:null, target:null, color:'#111827', guestAvatar:'guest', localStream:null,
 inbox:{messages:0,alerts:0},
 activeNameGifts:{},
 privateMessagesEnabled:true,
 privateTarget:null,
 privateMedia:{mic:false,camera:false,paidOnly:true},
 economyConfig:{giftsEnabled:true,vipEnabled:true,verifyEnabled:true},
 adminFeatures:{guestEntry:true,googleForMedia:true,crownProtection:true,antiSpam:true,maxMessageLength:500},
 planConfig:{
  plus:{label:'Plus',icon:'➕',price:10,days:30,enabled:true,accessCode:'PLUS-4826'},
  vip:{label:'VIP',icon:'💎',price:20,days:30,enabled:true,accessCode:'VIP-7391'},
  primo:{label:'بريمو',icon:'🔷',price:30,days:30,enabled:true,accessCode:'PRIMO-9154'}
 },
 permissionConfig:{
  usage:{
   guest:{publicMessages:true,privateChat:false,gifts:false,roomMic:'off',roomCamera:'off',privateMic:'off',privateCamera:'off',priority:0},
   user:{publicMessages:true,privateChat:true,gifts:true,roomMic:'request',roomCamera:'request',privateMic:'off',privateCamera:'off',priority:0},
   plus:{publicMessages:true,privateChat:true,gifts:true,roomMic:'request',roomCamera:'request',privateMic:'request',privateCamera:'off',priority:1},
   vip:{publicMessages:true,privateChat:true,gifts:true,roomMic:'direct',roomCamera:'request',privateMic:'direct',privateCamera:'request',priority:2},
   primo:{publicMessages:true,privateChat:true,gifts:true,roomMic:'direct',roomCamera:'direct',privateMic:'direct',privateCamera:'direct',priority:3},
   moderator:{publicMessages:true,privateChat:true,gifts:true,roomMic:'direct',roomCamera:'direct',privateMic:'direct',privateCamera:'direct',priority:4},
   owner:{publicMessages:true,privateChat:true,gifts:true,roomMic:'direct',roomCamera:'direct',privateMic:'direct',privateCamera:'direct',priority:5}
  },
  admin:{}
 },
 privateWindow:{maximized:false,minimized:false,previous:null,z:400},
 radioBroadcast:{
   status:'stopped',
   scope:'all',
   roomId:'general',
   title:'راديو ريفو',
   sourceType:'audio',
   source:'',
   startedAt:0,
   listenerPlaying:false,
   loadedSource:'',
   userMuted:false,
   videoClosed:false,
   audioOnly:false
 },
 roomMic:{
   requests:[],
   approvals:{},
   requestSeq:0
 },
 roomCamera:{
   requests:[],
   approvals:{},
   activeUser:null,
   stream:null,
   requestSeq:0,
   window:{maximized:false,minimized:false,previous:null,z:420}
 },
 privateUnread:{},
 privateChats:{},
 rooms:[
  {id:'general',name:'العامة',icon:'🌐',count:128,cams:4,mics:6,camOn:true,micOn:true,music:true,avatars:false,lina:false,announcement:'أهلاً بكم في ريفو — الاحترام أساس الدردشة.',announcementOn:true},
  {id:'iraq',name:'العراق',icon:'🇮🇶',count:188,cams:2,mics:6,camOn:true,micOn:true,music:true,avatars:false,lina:false,announcement:'أهلاً بكم في غرفة العراق.',announcementOn:true},
  {id:'syria',name:'سوريا',icon:'🇸🇾',count:96,cams:2,mics:5,camOn:true,micOn:true,music:true,avatars:false,lina:false,announcement:'أهلاً بكم في غرفة سوريا.',announcementOn:true},
  {id:'lebanon',name:'لبنان',icon:'🇱🇧',count:74,cams:2,mics:5,camOn:true,micOn:true,music:true,avatars:false,lina:false,announcement:'أهلاً بكم في غرفة لبنان.',announcementOn:true},
  {id:'jordan',name:'الأردن',icon:'🇯🇴',count:121,cams:2,mics:5,camOn:true,micOn:true,music:true,avatars:false,lina:false,announcement:'أهلاً بكم في غرفة الأردن.',announcementOn:true},
  {id:'oman',name:'عُمان',icon:'🇴🇲',count:48,cams:1,mics:4,camOn:true,micOn:true,music:false,avatars:false,lina:false,announcement:'أهلاً بكم في غرفة عُمان.',announcementOn:true},
  {id:'saudi',name:'السعودية',icon:'🇸🇦',count:133,cams:2,mics:5,camOn:true,micOn:true,music:true,avatars:false,lina:false,announcement:'أهلاً بكم في غرفة السعودية.',announcementOn:true},
  {id:'kuwait',name:'الكويت',icon:'🇰🇼',count:61,cams:2,mics:4,camOn:true,micOn:true,music:true,avatars:false,lina:false,announcement:'أهلاً بكم في غرفة الكويت.',announcementOn:true},
  {id:'turkey',name:'تركيا',icon:'🇹🇷',count:83,cams:2,mics:5,camOn:true,micOn:true,music:true,avatars:false,lina:false,announcement:'أهلاً بكم في غرفة تركيا.',announcementOn:true},
  {id:'poets',name:'شعراء',icon:'✒️',count:39,cams:1,mics:6,camOn:true,micOn:true,music:false,avatars:false,lina:false,announcement:'أهلاً بأصحاب الشعر والكلمة الجميلة.',announcementOn:true}
 ],
 users:[
  {id:'owner',name:'الإدارة',avatar:'owner',room:'general',bio:'مالك ريفو',authType:'owner',coins:99999,role:'owner',plan:'owner',isHidden:false,vip:true,verified:false,giftValue:4200,friends:210,level:50},
  {id:'ahmed',name:'أحمد',avatar:'ahmed',room:'general',bio:'مسجل بحساب Google',authType:'google',coins:420,role:'user',plan:'user',vip:false,verified:true,giftValue:1380,friends:98,level:12},
  {id:'samar',name:'سمر',avatar:'samar',room:'general',bio:'مسجلة بحساب Google',authType:'google',coins:280,role:'user',plan:'user',vip:false,verified:true,giftValue:710,friends:64,level:9},
  {id:'ali',name:'علي',avatar:'ali',room:'general',bio:'مسجل بحساب Google',authType:'google',coins:150,role:'user',plan:'user',vip:false,verified:true,giftValue:250,friends:42,level:6},
  {id:'noor',name:'نور',avatar:'noor',room:'general',bio:'مسجلة بحساب Google',authType:'google',coins:520,role:'user',plan:'user',vip:false,verified:true,giftValue:2150,friends:121,level:16},
  {id:'mira',name:'ميرا',avatar:'mira',room:'iraq',bio:'مسجلة بحساب Google',authType:'google',coins:210,role:'user',plan:'user',vip:false,verified:true,giftValue:330,friends:37,level:7},
  {id:'guest1',name:'زائر بغداد',avatar:'guest',room:'general',bio:'ضيف',authType:'guest',coins:0,role:'guest',plan:'guest',vip:false,verified:false,giftValue:0,friends:0,level:1}
 ],
 freeAdminBadgeCatalog:[
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
 ],
 roleGiftCatalog:{
  plus:[
   {id:'plus_star',name:'نجمة بلس المضيئة',icon:'🌟',price:25,level:3},
   {id:'plus_blossom',name:'زهرة بلس',icon:'🌸',price:35,level:3},
   {id:'plus_music',name:'نغمة بلس',icon:'🎵',price:45,level:3},
   {id:'plus_balloon',name:'بالون بلس',icon:'🎈',price:55,level:3}
  ],
  vip:[
   {id:'vip_butterfly',name:'فراشة VIP',icon:'🦋',price:80,level:4},
   {id:'vip_heart',name:'قلب VIP البنفسجي',icon:'💜',price:100,level:4},
   {id:'vip_rose',name:'وردة VIP الفاخرة',icon:'🌹',price:130,level:5},
   {id:'vip_disco',name:'كرة VIP اللامعة',icon:'🪩',price:160,level:5}
  ],
  primo:[
   {id:'primo_wings',name:'أجنحة بريمو',icon:'🪽',price:250,level:6},
   {id:'primo_orb',name:'كرة بريمو السحرية',icon:'🔮',price:350,level:6},
   {id:'primo_dragon',name:'تنين بريمو',icon:'🐉',price:500,level:7},
   {id:'primo_galaxy',name:'مجرة بريمو',icon:'🌌',price:800,level:8}
  ],
  moderator:[
   {id:'mod_shield',name:'درع المراقب',icon:'🛡️',price:0,level:6},
   {id:'mod_lightning',name:'برق الحماية',icon:'⚡',price:0,level:6},
   {id:'mod_eagle',name:'نسر المراقبة',icon:'🦅',price:0,level:7},
   {id:'mod_medal',name:'وسام المراقب',icon:'🏅',price:0,level:7}
  ]
 },
 messages:[],
 stage:[],
 gifts:[
  ['kiss','قبلة','💋',5,1],['heart','قلب حب','❤️',10,1],['love','أحبك جداً','💞',20,1],['teddy','دبدوب فاخر','🧸',30,2],['hearts','غيمة قلوب','💗',50,2],['ring','خاتم حب','💍',80,2],['cake','كعكة احتفال','🎂',100,2],['fireworks','ألعاب نارية','🎆',150,3],['horse','حصان عربي','🐎',200,3],['car','سيارة فاخرة','🏎️',300,3],['tiger','نمر متحرك','🐅',500,4],['lion','أسد ملكي','🦁',750,4],['yacht','يخت فاخر','🛥️',1000,5],['plane','طائرة خاصة','✈️',1500,5],['palace','قصر ريفو','🏰',2500,6],['dragon','تنين ذهبي','🐉',4000,7],['galaxy','مجرة ريفو','🌌',7500,8]
 ].map(x=>({id:x[0],name:x[1],icon:x[2],price:x[3],level:x[4]}))
};

const RIVO_ADMIN_CONFIG_KEY='rivoAdminConfigV1';
const RIVO_CAMERA_REQUESTS_KEY='rivoCameraRequestsV1';
const RIVO_MIC_REQUESTS_KEY='rivoMicRequestsV1';
const RIVO_SYNC_CHANNEL='rivoAdminLiveSyncV1';
let rivoSyncChannel=null;
try{rivoSyncChannel=new BroadcastChannel(RIVO_SYNC_CHANNEL)}catch(_){}


const RIVO_SCHEMA_VERSION=39;
const RIVO_ROOM_MESSAGE_LIMIT=12; // آخر 6 رسائل + الست السابقة فقط
const RIVO_LOCAL_PROFILE_KEY='rivoLocalProfilesV1';
const defaultEntryAvatars=[
 {id:'entry_avatar_1',src:'assets/entry-avatars/rivo-avatar-young-man-purple.jpg',alt:'صورة شخصية لشاب بخلفية بنفسجية',title:'صورة شخصية لشاب بخلفية بنفسجية'},
 {id:'entry_avatar_2',src:'assets/entry-avatars/rivo-avatar-young-woman-purple.jpg',alt:'صورة شخصية لفتاة بخلفية بنفسجية',title:'صورة شخصية لفتاة بخلفية بنفسجية'},
 {id:'entry_avatar_3',src:'assets/entry-avatars/rivo-avatar-man-blue-hoodie.jpg',alt:'صورة شخصية لشاب يرتدي سترة زرقاء',title:'صورة شخصية لشاب يرتدي سترة زرقاء'},
 {id:'entry_avatar_4',src:'assets/entry-avatars/rivo-avatar-young-man-light.jpg',alt:'صورة شخصية لشاب بخلفية فاتحة',title:'صورة شخصية لشاب بخلفية فاتحة'},
 {id:'entry_avatar_5',src:'assets/entry-avatars/rivo-avatar-woman-denim.jpg',alt:'صورة شخصية لفتاة ترتدي سترة جينز',title:'صورة شخصية لفتاة ترتدي سترة جينز'},
 {id:'entry_avatar_6',src:'assets/entry-avatars/rivo-avatar-woman-purple-hoodie.jpg',alt:'صورة شخصية لفتاة ترتدي سترة بنفسجية',title:'صورة شخصية لفتاة ترتدي سترة بنفسجية'}
];
function normalizeEntryAvatarOptions(list){
 const fallback=structuredClone(defaultEntryAvatars);
 if(!Array.isArray(list)||!list.length)return fallback;
 const normalized=list.filter(Boolean).map((item,index)=>({
  id:String(item.id||`entry_avatar_${index+1}`).toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,40)||`entry_avatar_${index+1}`,
  src:item.src||item.path||'',
  alt:item.alt||item.title||`صورة شخصية ${index+1}`,
  title:item.title||item.alt||`صورة شخصية ${index+1}`
 })).filter(item=>isDirectAvatarSource(item.src));
 return normalized.length?normalized:fallback;
}
function findEntryAvatarOption(value,list=state.entryAvatarOptions){
 const raw=String(value||'');
 return(Array.isArray(list)?list:[]).find(item=>item&&(String(item.id)===raw||String(item.src)===raw))||null;
}
function normalizeEntryAvatarSelection(value,list=state.entryAvatarOptions){
 const options=Array.isArray(list)&&list.length?list:defaultEntryAvatars;
 return(findEntryAvatarOption(value,options)||options[0])?.id||defaultEntryAvatars[0].id;
}
const avatarEditor={image:null,scale:1,minScale:1,offsetX:0,offsetY:0,dragging:false,pointerId:null,startX:0,startY:0,originX:0,originY:0,size:320,padding:12,target:'profile'};
let avatarPickerMode='entry';
state.entryAvatar=defaultEntryAvatars[0].id;
state.entryAvatarOptions=structuredClone(defaultEntryAvatars);
function normalizeDemoAccountTypes(users){
 return(Array.isArray(users)?users:[]).map(user=>{
  const u={...user};
  if(u.id==='owner')return{...u,role:'owner',plan:'owner',vip:true,authType:'owner',isHidden:Boolean(u.isHidden)};
  if(u.id==='guest1')return{...u,role:'guest',plan:'guest',vip:false,verified:false,authType:'guest',bio:'ضيف'};
  if(['ahmed','samar','ali','noor','mira'].includes(u.id)){
   const female=['samar','noor','mira'].includes(u.id);
   return{
    ...u,
    role:'user',
    plan:'user',
    vip:false,
    verified:false,
    authType:'google',
    bio:female?'مسجلة بحساب Google':'مسجل بحساب Google'
   };
  }
  return u;
 });
}
function migrateCachedAccountsV32(){
 const cfg=readAdminConfig();
 if(!cfg||Number(cfg.schemaVersion||0)>=RIVO_SCHEMA_VERSION)return;
 cfg.schemaVersion=RIVO_SCHEMA_VERSION;
 cfg.users=normalizeDemoAccountTypes(cfg.users);
 localStorage.setItem(RIVO_ADMIN_CONFIG_KEY,JSON.stringify(cfg));
}

function readAdminConfig(){
 try{return JSON.parse(localStorage.getItem(RIVO_ADMIN_CONFIG_KEY)||'null')}catch(_){return null}
}
function readLocalProfiles(){
 try{return JSON.parse(localStorage.getItem(RIVO_LOCAL_PROFILE_KEY)||'{}')}catch(_){return{}}
}
function writeLocalProfiles(map){
 try{localStorage.setItem(RIVO_LOCAL_PROFILE_KEY,JSON.stringify(map||{}))}catch(_){toast('تعذر حفظ الصورة محلياً')}
}
function restoreLocalProfile(user){
 if(!user||!user.id)return user;
 const saved=readLocalProfiles()[user.id];
 if(saved&&saved.avatar)user.avatar=saved.avatar;
 if(saved&&userAccessRole(user)==='owner'&&Object.prototype.hasOwnProperty.call(saved,'name'))user.name=String(saved.name??'');
 return user;
}
function applyAvatarInstantly(userId,avatar){
 const id=String(userId||'');
 const next=String(avatar||'guest');
 if(state.user&&String(state.user.id)===id)state.user.avatar=next;
 state.users.forEach(u=>{if(String(u.id)===id)u.avatar=next});
 const directIds=['sideAvatar','composerAvatar','profileAvatar','roomCameraAvatar','entryAvatarPreview'];
 directIds.forEach(domId=>{const img=$('#'+domId);if(img&&(!id||String(state.user?.id||'')===id))img.src=av(next)});
 $$('img[data-user-id]').forEach(img=>{if(String(img.dataset.userId||'')===id)img.src=av(next)});
 try{renderAll()}catch(_){ }
 try{window.dispatchEvent(new CustomEvent('rivo-avatar-changed',{detail:{userId:id,avatar:next}}))}catch(_){ }
}
function persistCurrentUserProfile(){
 if(!state.user||!state.user.id)return;
 const profiles=readLocalProfiles();
 profiles[state.user.id]={...(profiles[state.user.id]||{}),avatar:state.user.avatar,...(userAccessRole(state.user)==='owner'?{name:String(state.user.name??'')}:{})};
 writeLocalProfiles(profiles);
 const listed=findUser(state.user.id);
 if(listed)listed.avatar=state.user.avatar;
 const cfg=readAdminConfig();
 if(cfg&&Array.isArray(cfg.users)){
  const saved=cfg.users.find(u=>u.id===state.user.id||u.moderatorTokenId===state.user.moderatorTokenId);
  if(saved){
   saved.avatar=state.user.avatar;
   try{localStorage.setItem(RIVO_ADMIN_CONFIG_KEY,JSON.stringify(cfg))}catch(_){}
   notifyAdminLive('rivo-admin-config',cfg);
  }
 }
 applyAvatarInstantly(state.user.id,state.user.avatar);
 try{window.RivoLive?.updateProfile?.({nickname:state.user.name,avatar:state.user.avatar})}catch(_){}
}
function cropDiameter(){return avatarEditor.size-avatarEditor.padding*2}
function clampAvatarEditorOffsets(){
 if(!avatarEditor.image)return;
 const crop=cropDiameter();
 const drawW=avatarEditor.image.width*avatarEditor.scale;
 const drawH=avatarEditor.image.height*avatarEditor.scale;
 const maxX=Math.max(0,(drawW-crop)/2);
 const maxY=Math.max(0,(drawH-crop)/2);
 avatarEditor.offsetX=Math.max(-maxX,Math.min(maxX,avatarEditor.offsetX));
 avatarEditor.offsetY=Math.max(-maxY,Math.min(maxY,avatarEditor.offsetY));
}
function drawAvatarEditor(){
 const canvas=$('#avatarCropCanvas');
 if(!canvas)return;
 const ctx=canvas.getContext('2d');
 const size=avatarEditor.size;
 const padding=avatarEditor.padding;
 const crop=size-padding*2;
 const cx=size/2, cy=size/2, r=crop/2;
 ctx.clearRect(0,0,size,size);
 ctx.fillStyle='#0f172a';
 ctx.fillRect(0,0,size,size);
 ctx.save();
 ctx.beginPath();
 ctx.arc(cx,cy,r,0,Math.PI*2);
 ctx.closePath();
 ctx.clip();
 ctx.fillStyle='#e2e8f0';
 ctx.fillRect(0,0,size,size);
 if(avatarEditor.image){
  const drawW=avatarEditor.image.width*avatarEditor.scale;
  const drawH=avatarEditor.image.height*avatarEditor.scale;
  const x=cx-drawW/2+avatarEditor.offsetX;
  const y=cy-drawH/2+avatarEditor.offsetY;
  ctx.drawImage(avatarEditor.image,x,y,drawW,drawH);
 }else{
  ctx.fillStyle='#cbd5e1';
  ctx.fillRect(padding,padding,crop,crop);
 }
 ctx.restore();
 ctx.strokeStyle='#ffffff';
 ctx.lineWidth=4;
 ctx.beginPath();
 ctx.arc(cx,cy,r,0,Math.PI*2);
 ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.88)';
 ctx.font='700 15px sans-serif';
 ctx.textAlign='center';
 ctx.textBaseline='middle';
 if(!avatarEditor.image){
  ctx.fillText('اختر صورة لمعاينة القص الدائري',cx,size-22);
 }else{
  ctx.fillText('اسحب الصورة لتحريك الوجه',cx,size-22);
 }
}
function resetAvatarEditor(keepCurrent=false){
 avatarEditor.image=null;
 avatarEditor.scale=1;
 avatarEditor.minScale=1;
 avatarEditor.offsetX=0;
 avatarEditor.offsetY=0;
 avatarEditor.dragging=false;
 const input=$('#avatarUploadInput');
 if(input&&!keepCurrent)input.value='';
 const slider=$('#avatarZoomRange');
 if(slider)slider.value=100;
 drawAvatarEditor();
}
function loadAvatarIntoEditor(src,keepInput=false){
 const img=new Image();
 img.onload=()=>{
  avatarEditor.image=img;
  avatarEditor.minScale=Math.max(cropDiameter()/img.width,cropDiameter()/img.height);
  avatarEditor.scale=avatarEditor.minScale;
  avatarEditor.offsetX=0;
  avatarEditor.offsetY=0;
  const slider=$('#avatarZoomRange');
  if(slider)slider.value=100;
  if(!keepInput){const input=$('#avatarUploadInput');if(input)input.value='';}
  drawAvatarEditor();
 };
 img.onerror=()=>toast('تعذر قراءة الصورة');
 img.src=src;
}
function openAvatarEditor(target='profile'){
 // رفع الصور من جهاز المستخدم معطّل. جميع الحسابات تختار فقط من صور الإدارة.
 openEntryAvatarPicker(target==='entry'?'entry':'profile');
}

function saveAvatarEditorImage(){
 if(!avatarEditor.image){toast('اختر صورة أولاً');return}
 const out=document.createElement('canvas');out.width=320;out.height=320;const ctx=out.getContext('2d'),cx=160,cy=160,r=160;
 ctx.clearRect(0,0,320,320);ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.closePath();ctx.clip();
 const drawW=avatarEditor.image.width*avatarEditor.scale,drawH=avatarEditor.image.height*avatarEditor.scale;
 ctx.drawImage(avatarEditor.image,cx-drawW/2+avatarEditor.offsetX,cy-drawH/2+avatarEditor.offsetY,drawW,drawH);ctx.restore();
 const circularImage=out.toDataURL('image/png');
 if(avatarEditor.target==='entry'){state.entryAvatar=circularImage;updateEntryAvatarUI();close('avatarEditorModal');toast('تم تجهيز الصورة الدائرية');return}
 if(!state.user){close('avatarEditorModal');showEntryScreen();return}
 state.user.avatar=circularImage;persistCurrentUserProfile();close('avatarEditorModal');if($('#profileAvatar'))$('#profileAvatar').src=av(state.user.avatar);renderAll();toast('تم حفظ الصورة الدائرية');
}
function startAvatarEditorDrag(clientX,clientY,pointerId=null){
 if(!avatarEditor.image)return;
 avatarEditor.dragging=true;
 avatarEditor.pointerId=pointerId;
 avatarEditor.startX=clientX;
 avatarEditor.startY=clientY;
 avatarEditor.originX=avatarEditor.offsetX;
 avatarEditor.originY=avatarEditor.offsetY;
 $('#avatarCropCanvas')?.classList.add('dragging');
}
function moveAvatarEditorDrag(clientX,clientY){
 if(!avatarEditor.dragging)return;
 avatarEditor.offsetX=avatarEditor.originX+(clientX-avatarEditor.startX);
 avatarEditor.offsetY=avatarEditor.originY+(clientY-avatarEditor.startY);
 clampAvatarEditorOffsets();
 drawAvatarEditor();
}
function stopAvatarEditorDrag(){
 avatarEditor.dragging=false;
 avatarEditor.pointerId=null;
 $('#avatarCropCanvas')?.classList.remove('dragging');
}
function readSharedMicRequests(){
 try{return JSON.parse(localStorage.getItem(RIVO_MIC_REQUESTS_KEY)||'[]')}catch(_){return[]}
}
function readSharedCameraRequests(){
 try{return JSON.parse(localStorage.getItem(RIVO_CAMERA_REQUESTS_KEY)||'[]')}catch(_){return []}
}
function notifyAdminLive(type,payload){
 const message={type,payload,source:'chat',time:Date.now()};
 try{if(window.parent&&window.parent!==window)window.parent.postMessage(message,'*')}catch(_){}
 try{if(window.opener)window.opener.postMessage(message,'*')}catch(_){}
 try{rivoSyncChannel?.postMessage(message)}catch(_){}
}
function writeSharedMicRequests(items){
 const clean=Array.isArray(items)?items:[];
 localStorage.setItem(RIVO_MIC_REQUESTS_KEY,JSON.stringify(clean));
 notifyAdminLive('rivo-mic-requests',clean);
}
function writeSharedCameraRequests(items){
 const clean=Array.isArray(items)?items:[];
 localStorage.setItem(RIVO_CAMERA_REQUESTS_KEY,JSON.stringify(clean));
 notifyAdminLive('rivo-camera-requests',clean);
}
function mergeAdminUsers(savedUsers){
 const currentById=new Map(state.users.map(u=>[u.id,u]));
 state.users=savedUsers
  .filter(u=>u.status!=='kicked')
  .map(saved=>({
    bio:'مستخدم في ريفو',giftValue:0,friends:0,level:1,status:'online',plan:'user',isHidden:false,
    ...(currentById.get(saved.id)||{}),
    ...saved
  }));
 state.stage=state.stage.filter(s=>state.users.some(u=>u.id===s.user));
 Object.keys(state.activeNameGifts).forEach(id=>{if(!state.users.some(u=>u.id===id)&&state.user?.id!==id)delete state.activeNameGifts[id]});
 if(state.user){
   const updated=state.users.find(u=>u.id===state.user.id);
   if(updated)state.user={...state.user,...updated};
   else if(state.user.id!=='demoUser'&&state.user.id!=='guestLocal')state.user=null;
 }
}
function mergeAdminGifts(savedGifts){
 const currentById=new Map(state.gifts.map(g=>[g.id,g]));
 state.gifts=savedGifts.map(saved=>({
   level:currentById.get(saved.id)?.level||1,
   ...(currentById.get(saved.id)||{}),
   ...saved
 }));
}
function applyExternalAdminConfig(showNotice=false,suppliedConfig=null){
 const cfg=suppliedConfig||readAdminConfig();
 if(!cfg)return;

 if(Array.isArray(cfg.rooms)&&cfg.rooms.length){
   const currentById=new Map(state.rooms.map(r=>[r.id,r]));
   state.rooms=cfg.rooms.map(saved=>({
     cams:0,mics:4,camOn:false,micOn:true,music:false,
     announcement:'',announcementOn:true,avatars:false,lina:false,count:0,
     ...(currentById.get(saved.id)||{}),
     ...saved,
     avatars:false,lina:false
   }));
   if(!state.rooms.some(r=>r.id===state.room))state.room=state.rooms[0].id;
 }
 if(Array.isArray(cfg.users))mergeAdminUsers(Number(cfg.schemaVersion||0)<RIVO_SCHEMA_VERSION?normalizeDemoAccountTypes(cfg.users):cfg.users);
 if(cfg.plans){
   for(const key of ['plus','vip','primo']){
    state.planConfig[key]={...state.planConfig[key],...(cfg.plans[key]||{})};
   }
 }
 if(cfg.permissions){
   for(const role of Object.keys(state.permissionConfig.usage)){
     state.permissionConfig.usage[role]={...state.permissionConfig.usage[role],...(cfg.permissions.usage?.[role]||{})};
   }
   state.permissionConfig.admin={...(cfg.permissions.admin||{})};
 }
 if(cfg.private){
   state.privateMessagesEnabled=cfg.private.enabled!==false;
   state.privateMedia.mic=Boolean(cfg.private.mic);
   state.privateMedia.camera=Boolean(cfg.private.camera);
   state.privateMedia.paidOnly=cfg.private.paidOnly!==false;
 }
 if(cfg.radio){
   const previousStatus=state.radioBroadcast.status;
   const nextSource=String(cfg.radio.source||'').trim();
   const requestedType=['audio','youtube','video'].includes(cfg.radio.sourceType)?cfg.radio.sourceType:'audio';
   const nextType=radioType(requestedType,nextSource);
   const nextStatus=['playing','paused','stopped'].includes(cfg.radio.status)?cfg.radio.status:'stopped';
   const changedSource=state.radioBroadcast.source!==nextSource||state.radioBroadcast.sourceType!==nextType;
   state.radioBroadcast.status=nextStatus;
   state.radioBroadcast.scope=cfg.radio.scope||'all';
   state.radioBroadcast.roomId=cfg.radio.roomId||state.rooms[0]?.id||'general';
   state.radioBroadcast.title=cfg.radio.title||'راديو ريفو';
   state.radioBroadcast.sourceType=nextType;
   state.radioBroadcast.source=nextSource;
   state.radioBroadcast.startedAt=Number(cfg.radio.startedAt||0);
   if(changedSource){state.radioBroadcast.loadedSource='';state.radioBroadcast.videoClosed=false;state.radioBroadcast.listenerPlaying=false;state.radioBroadcast.audioOnly=false}
   // روابط MP3 والصوت المباشر تعمل من بطاقة الراديو فقط ولا تفتح نافذة سوداء.
   if(nextType==='audio')hideRadioVideoWindow(true);
   // أمر الإيقاف من الإدارة يجب أن يوقف الصوت نفسه، لا أن يخفي نافذة الفيديو فقط.
   if(nextStatus==='stopped')hardStopRadioMedia(true);
   else if(nextStatus==='paused')forcePauseRadioMedia();
   else if(previousStatus!=='playing'&&nextStatus==='playing')state.radioBroadcast.listenerPlaying=false;
   if(nextStatus==='playing'&&radioAutoPlayEnabled()&&!radioIsMuted())scheduleSavedRadioResume();
 }
 if(cfg.economy){
   state.economyConfig.giftsEnabled=cfg.economy.giftsEnabled!==false;
   state.economyConfig.vipEnabled=cfg.economy.vipEnabled!==false;
   state.economyConfig.verifyEnabled=cfg.economy.verifyEnabled!==false;
   if(Array.isArray(cfg.economy.gifts))mergeAdminGifts(cfg.economy.gifts);
 }
 if(cfg.features){
   state.adminFeatures={...state.adminFeatures,...cfg.features};
   const guestButton=$('#guestOpen');
   if(guestButton){
     guestButton.disabled=state.adminFeatures.guestEntry===false;
     guestButton.textContent=state.adminFeatures.guestEntry===false?'دخول الضيف مغلق من الإدارة':'الدخول كضيف';
   }
 }
 state.entryAvatarOptions=normalizeEntryAvatarOptions(cfg.entryAvatars||state.entryAvatarOptions);
 state.entryAvatar=normalizeEntryAvatarSelection(state.entryAvatar,state.entryAvatarOptions);
 renderEntryAvatarChoices();
 updateEntryAvatarUI();
 syncSharedMicRequests();syncSharedCameraRequests();
 // تحديثات الإدارة تُطبّق بصمت؛ لا يظهر أي تنبيه للزوار أو المستخدمين.
}
function refreshChatFromAdmin(cfg=null,showNotice=false){
 applyExternalAdminConfig(showNotice,cfg);
 renderAll();
 renderPrivateInbox();
 updatePrivateMediaControls();
 syncRadioForRoom();
 renderRadioUI();
 updatePrivateBadge();
 const viewport=document.querySelector('.messages');
 if(viewport)viewport.scrollTop=viewport.scrollHeight;
 notifyAdminLive('rivo-chat-state',{
   room:state.room,
   users:usersInRoom().length,
   radio:state.radioBroadcast.status,
   cameraRequests:state.roomCamera.requests.length,
   micRequests:state.roomMic.requests.length
 });
}

function syncSharedMicRequests(supplied=null){
 const shared=supplied||readSharedMicRequests();
 if(!Array.isArray(shared))return;
 state.roomMic.requests=shared;
 state.roomMic.approvals={};
 shared.forEach(req=>{
  if(req.status==='approved')state.roomMic.approvals[`${req.roomId}:${req.userId}`]=true;
 });
}

function syncSharedCameraRequests(supplied=null){
 const shared=supplied||readSharedCameraRequests();
 if(!Array.isArray(shared))return;
 state.roomCamera.requests=shared;
 state.roomCamera.approvals={};
 shared.forEach(req=>{
   if(req.status==='approved')state.roomCamera.approvals[roomCameraApprovalKey(req.userId,req.roomId)]=true;
 });
 renderRoomCameraRequests();
}
function handleAdminLiveMessage(message){
 if(!message||typeof message!=='object')return;
 if(message.type==='rivo-free-badge-grant'){
   const user=findUser(message.payload?.userId),badge=message.payload?.badge;
   if(user&&badge){
    setActiveNameGift(user.id,{...badge,price:0},'adminBadge');
    renderAll();createGiftParticles(3,badge.icon||'⭐');
    toast(`الإدارة منحت ${user.name} ${badge.name||'شارة مجانية'}`);
   }
 }
 if(message.type==='rivo-free-badge-remove'){
   const userId=message.payload?.userId;
   if(userId){clearActiveNameGift(userId);renderAll()}
 }

 if(message.type==='rivo-admin-config'){
   try{localStorage.setItem(RIVO_ADMIN_CONFIG_KEY,JSON.stringify(message.payload))}catch(_){}
   refreshChatFromAdmin(message.payload,false);
 }
 if(message.type==='rivo-mic-requests'){
   try{localStorage.setItem(RIVO_MIC_REQUESTS_KEY,JSON.stringify(message.payload||[]))}catch(_){}
   syncSharedMicRequests(message.payload||[]);
   const me=state.user?.id;
   if(me){
    const approved=state.roomMic.requests.find(r=>r.userId===me&&r.roomId===state.room&&r.status==='approved');
    if(approved)toast('وافقت الإدارة على المايك؛ اضغط زر المايك للصعود');
   }
 }
 if(message.type==='rivo-camera-requests'){
   try{localStorage.setItem(RIVO_CAMERA_REQUESTS_KEY,JSON.stringify(message.payload||[]))}catch(_){}
   syncSharedCameraRequests(message.payload||[]);
   const me=state.user?.id;
   if(me){
     const approved=state.roomCamera.requests.find(r=>r.userId===me&&r.roomId===state.room&&r.status==='approved');
     if(approved)toast('وافقت الإدارة على الكاميرا؛ اضغط زر الكاميرا للتشغيل');
   }
 }
}

const emojis=['😱','😂','😍','🥰','😘','😊','😎','🤩','🥳','😭','🥺','😔','😡','🤬','🤔','🤭','🫢','🙄','😴','🤒','😀','😃','😄','😁','😆','😉','😋','😛','😜','🤪','🥸','🤓','🧐','😮','😯','😲','🥹','😢','😥','😰','❤️','💖','💕','💞','💓','💗','💙','💚','💜','🖤','🤍','💔','💋','🌹','🌸','🌺','🌷','💐','🔥','✨','⭐','🌟','💫','🎉','🎊','🎂','🎁','🎈','🧸','🦋','🐝','🐱','🐶','🦁','🐯','🐼','🐵','🦄','🐉','👻','👍','👎','👏','🙌','🫶','🤝','💪','✌️','🤞','👋','🫡','🙏','🤷‍♂️','🤦‍♂️','👑','💎','🏅','🪙','☕','🍰','🍕','🍔','🍓','🍉','🥤','🎵','🎤','📷','🎬','⚽','🚗','🏎️','✈️','🚀','🛥️','🏠','🌙','☀️','🌈','🌌','🎆','💯','✅','❌','🎯','🥇','🕊️','🫂'];
const emojiCatalog=emojis.map((emoji,index)=>({emoji,code:`ص${index+1}`}));
const emojiShortcutMap=new Map(emojiCatalog.map(item=>[item.code,item.emoji]));
const oldEmojiCatalog=Array.from({length:70},(_,index)=>{
 const number=index+1;
 return {
  number,
  code:`ق${number}`,
  token:`[[rivo-old-${number}]]`,
  src:`assets/old-emojis/e${String(number).padStart(2,'0')}.png`
 };
});
const oldEmojiShortcutMap=new Map(oldEmojiCatalog.map(item=>[item.code,item.token]));
const textShortcutMap=new Map([
 ['س1','السلام عليكم'],
 ['س2','عليكم السلام'],
 ['و1','ولكمو'],
 ['ي2','يسلمو']
]);
function normalizeShortcutCode(value=''){
 const arabicDigits='٠١٢٣٤٥٦٧٨٩';
 const persianDigits='۰۱۲۳۴۵۶۷۸۹';
 return String(value)
  .replace(/[٠-٩]/g,d=>String(arabicDigits.indexOf(d)))
  .replace(/[۰-۹]/g,d=>String(persianDigits.indexOf(d)))
  .replace(/[ىی]/g,'ي');
}
function replaceMessageShortcuts(value=''){
 const text=String(value??'').replace(/[\u200e\u200f\u061c]/g,'');
 return text.replace(/(^|[^\p{L}\p{N}_])(ص[0-9٠-٩۰-۹]{1,3}|ق[0-9٠-٩۰-۹]{1,3}|س[12١٢۱۲]|و[1١۱]|[يىی][2٢۲])(?=$|[^\p{L}\p{N}_])/gu,(whole,prefix,rawCode)=>{
  const code=normalizeShortcutCode(rawCode);
  const replacement=oldEmojiShortcutMap.get(code)||emojiShortcutMap.get(code)||textShortcutMap.get(code);
  return replacement?`${prefix}${replacement}`:whole;
 });
}
function replaceEmojiShortcuts(value=''){
 return replaceMessageShortcuts(value);
}
function replaceTextShortcuts(value=''){
 return replaceMessageShortcuts(value);
}
function insertEmojiAtCursor(emoji){
 const input=$('#messageInput');if(!input)return;
 const start=Number.isInteger(input.selectionStart)?input.selectionStart:input.value.length;
 const end=Number.isInteger(input.selectionEnd)?input.selectionEnd:start;
 input.value=input.value.slice(0,start)+emoji+input.value.slice(end);
 const next=start+emoji.length;
 input.focus();
 try{input.setSelectionRange(next,next)}catch(_){ }
}
function installEmojiPickerStyles(){
 if(document.getElementById('rivoEmojiShortcutStyles'))return;
 const style=document.createElement('style');style.id='rivoEmojiShortcutStyles';
 style.textContent=`
  #emojiGrid{grid-template-columns:repeat(7,minmax(42px,1fr));gap:7px}
  #emojiGrid .emojiShortcutHint{grid-column:1/-1;background:#eef4ff;border:1px solid #d5e2ff;color:#36507a;border-radius:11px;padding:8px 10px;font-size:12px;line-height:1.5;text-align:center;position:sticky;top:0;z-index:2}
  #emojiGrid .emojiChoice{height:58px!important;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:3px!important;overflow:visible}
  #emojiGrid .emojiGlyph{font-size:27px;line-height:1;display:inline-block;transform-origin:center;will-change:transform}
  #emojiGrid .emojiSectionTitle{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff7df;border:1px solid #f5d98a;color:#7c5710;border-radius:11px;padding:8px 10px;font-size:13px;font-weight:900;position:sticky;top:58px;z-index:1}
  #emojiGrid .emojiSectionTitle.modern{background:#eef4ff;border-color:#d5e2ff;color:#36507a;position:static}
  #emojiGrid .oldEmojiChoice .oldEmojiGlyph{width:33px;height:33px;object-fit:contain;display:block;transform-origin:center;will-change:transform}
  #emojiGrid .emojiShortcutCode{font-size:10px;line-height:1;color:#64748b;font-weight:800;direction:rtl}
  .rivoOldEmoji{width:30px;height:30px;object-fit:contain;vertical-align:middle;display:inline-block;margin-inline:3px;transform-origin:center;will-change:transform}
  #emojiGrid .emojiMotion0 .emojiGlyph,.rivoEmojiMotion0{animation:rivoEmojiBounce 1.25s ease-in-out infinite}
  #emojiGrid .emojiMotion1 .emojiGlyph,.rivoEmojiMotion1{animation:rivoEmojiSwing 1.55s ease-in-out infinite}
  #emojiGrid .emojiMotion2 .emojiGlyph,.rivoEmojiMotion2{animation:rivoEmojiPulse 1.1s ease-in-out infinite}
  #emojiGrid .emojiMotion3 .emojiGlyph,.rivoEmojiMotion3{animation:rivoEmojiFloat 1.7s ease-in-out infinite}
  .rivoAnimatedEmoji{display:inline-block;transform-origin:center;will-change:transform;margin-inline:1px}
  .emojiOnlyBubble .rivoAnimatedEmoji{font-size:1.08em;margin-inline:3px}
  .emojiOnlyBubble .rivoOldEmoji{width:42px;height:42px;margin-inline:5px}
  @keyframes rivoEmojiBounce{0%,100%{transform:translateY(0) scale(1)}45%{transform:translateY(-6px) scale(1.08)}65%{transform:translateY(1px) scale(.98)}}
  @keyframes rivoEmojiSwing{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-11deg) scale(1.05)}75%{transform:rotate(11deg) scale(1.05)}}
  @keyframes rivoEmojiPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
  @keyframes rivoEmojiFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-5px) rotate(6deg)}}
  @media(max-width:520px){#emojiGrid{grid-template-columns:repeat(6,minmax(40px,1fr))}#emojiGrid .emojiChoice{height:56px!important}}
  @media(prefers-reduced-motion:reduce){#emojiGrid .emojiGlyph,.rivoAnimatedEmoji{animation:none!important}}
 `;
 document.head.appendChild(style);
}
const rivoEmojiSegmenter=(typeof Intl!=='undefined'&&Intl.Segmenter)?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
function rivoEmojiMotionIndex(value=''){
 let total=0;
 for(const char of String(value))total=(total+(char.codePointAt(0)||0))%4;
 return total;
}
function renderStandardAnimatedEmojiText(text=''){
 const parts=rivoEmojiSegmenter?[...rivoEmojiSegmenter.segment(String(text))].map(item=>item.segment):Array.from(String(text));
 return parts.map(part=>/\p{Extended_Pictographic}/u.test(part)
  ?`<span class="rivoAnimatedEmoji rivoEmojiMotion${rivoEmojiMotionIndex(part)}">${esc(part)}</span>`
  :esc(part)).join('');
}
function oldEmojiFromToken(token=''){
 const match=/^\[\[rivo-old-(\d{1,3})\]\]$/.exec(String(token));
 if(!match)return null;
 const number=Number(match[1]);
 return oldEmojiCatalog.find(item=>item.number===number)||null;
}
function renderAnimatedEmojiText(value=''){
 const text=String(value??'');
 return text.split(/(\[\[rivo-old-\d{1,3}\]\])/g).map(part=>{
  const item=oldEmojiFromToken(part);
  if(item)return`<img class="rivoOldEmoji rivoEmojiMotion${item.number%4}" src="${esc(item.src)}" alt="${esc(item.code)}" title="${esc(item.code)}" loading="eager" decoding="async">`;
  return renderStandardAnimatedEmojiText(part);
 }).join('');
}
function isEmojiOnlyMessage(value=''){
 const text=String(value??'');
 const hasOld=/\[\[rivo-old-\d{1,3}\]\]/.test(text);
 const remaining=text.replace(/\[\[rivo-old-\d{1,3}\]\]/g,'');
 if(hasOld&&!remaining.trim())return true;
 return /^(?:[\p{Extended_Pictographic}\u200d\ufe0f\s])+$/u.test(remaining);
}
function renderEmojiPicker(){
 installEmojiPickerStyles();
 const grid=$('#emojiGrid');if(!grid)return;
 const oldButtons=oldEmojiCatalog.map((item,index)=>`<button type="button" class="emojiChoice oldEmojiChoice emojiMotion${index%4}" data-old-emoji-code="${item.code}" title="${item.code}" aria-label="رمز قديم ${item.code}"><img class="oldEmojiGlyph emojiGlyph" src="${item.src}" alt="${item.code}" loading="lazy" decoding="async"><small class="emojiShortcutCode">${item.code}</small></button>`).join('');
 const modernButtons=emojiCatalog.map((item,index)=>`<button type="button" class="emojiChoice emojiMotion${index%4}" data-emoji="${item.emoji}" title="${item.code}" aria-label="${item.code} ${item.emoji}"><span class="emojiGlyph">${item.emoji}</span><small class="emojiShortcutCode">${item.code}</small></button>`).join('');
 grid.innerHTML=`<div class="emojiShortcutHint">اضغط على الرمز وسيُغلق المربع تلقائياً. الرموز القديمة اختصارها <b>ق1</b> إلى <b>ق70</b>، والحديثة <b>ص1</b> وما بعدها. اختصارات الكلمات: <b>س1</b> السلام عليكم، <b>س2</b> عليكم السلام، <b>و1</b> ولكمو، <b>ي2</b> يسلمو.</div><div class="emojiSectionTitle"><span>الرموز القديمة المحبوبة</span><small>ق1 — ق70</small></div>${oldButtons}<div class="emojiSectionTitle modern"><span>الرموز الحديثة</span><small>ص1 وما بعدها</small></div>${modernButtons}`;
 $$('[data-old-emoji-code]',grid).forEach(button=>button.onclick=()=>{
  insertEmojiAtCursor(button.dataset.oldEmojiCode||'');
  $('#emojiPicker')?.classList.add('hidden');
 });
 $$('[data-emoji]',grid).forEach(button=>button.onclick=()=>{
  insertEmojiAtCursor(button.dataset.emoji||'');
  $('#emojiPicker')?.classList.add('hidden');
 });
}
const colors=['#111827','#dc2626','#ef4444','#f97316','#eab308','#16a34a','#059669','#0891b2','#2563eb','#4f46e5','#7c3aed','#9333ea','#db2777','#be123c','#6b7280','#000000','#8b4513','#0f766e'];
function room(){return state.rooms.find(r=>r.id===state.room)||state.rooms[0]||{id:"lobby",name:"العامة",count:0,cams:0,mics:0,camOn:false,micOn:false,music:false,announcement:"",announcementOn:false}} function findUser(id){return state.users.find(u=>u.id===id)||(state.user?.id===id?state.user:null)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function userAccessRole(u=state.user||{}){
 if(u.role==='owner')return'owner';
 if(u.role==='moderator')return'moderator';
 if(u.role==='guest')return'guest';
 if(['plus','vip','primo'].includes(u.plan))return u.plan;
 return u.vip?'vip':'user';
}
// ترتيب ثابت لقائمة المتصلين: الإدارة، المراقبون، الرتب المدفوعة، المسجلون، ثم الضيوف.
function userListRank(u={}){
 const key=userAccessRole(u);
 return ({owner:0,moderator:1,primo:2,vip:3,plus:4,user:5,guest:6})[key]??5;
}
function sortUsersByHierarchy(users=[]){
 return users.map((u,index)=>({u,index})).sort((a,b)=>{
  const rankDiff=userListRank(a.u)-userListRank(b.u);
  if(rankDiff)return rankDiff;
  const priorityDiff=(Number(b.u.priority)||0)-(Number(a.u.priority)||0);
  return priorityDiff||a.index-b.index;
 }).map(item=>item.u);
}
function permissionValue(key,u=state.user){
 const role=userAccessRole(u);
 return state.permissionConfig.usage[role]?.[key];
}
function role(u={}){
 let s='';
 const key=userAccessRole(u);
 if(key==='owner')s+='👑';
 else if(key==='moderator')s+='⭐';
 else if(key==='primo')s+='🔷';
 else if(key==='vip')s+='💎';
 else if(key==='plus')s+='➕';
 if(key==='guest')s+=' ضيف';
 return s
}

function activeNameGift(userId){
 return state.activeNameGifts[userId]||null;
}
function setActiveNameGift(userId,gift,source='received'){
 if(!userId||!gift)return;
 const target=findUser(userId);
 state.activeNameGifts[userId]={
  id:gift.id||`gift_${Date.now()}`,
  name:gift.name||gift.gift||'هدية',
  icon:gift.icon||'🎁',
  source,
  // الشارة مرتبطة بجلسة دخول المستخدم إلى الموقع، وليست مرتبطة بغرفة محددة.
  grantedAt:Date.now()
 };
}
function clearActiveNameGift(userId){
 if(userId)delete state.activeNameGifts[userId];
}
function giftBadgeHtml(u,scope='chat'){
 if(!u)return '';
 const g=activeNameGift(u.id);
 if(!g)return '';
 // تبقى الشارة ظاهرة أثناء تنقّل المستخدم بين الغرف، وتختفي فقط عند خروجه من الموقع.
 const tier=userAccessRole(u);
 const special=(tier==='moderator'||tier==='vip'||tier==='primo'||tier==='plus')?` ${tier}GiftBadge`:'';
 const cls=scope==='list'?' listGiftBadge':' chatGiftBadge';
 const adminClass=g.source==='adminBadge'?' adminGrantedBadge':'';return `<span class="nameGiftBadge${special}${adminClass}${cls}" title="${esc(g.name||'هدية')}"><span class="giftBadgeInner">${g.icon||'🎁'}</span></span>`;
}

function isRegisteredAccount(u){
 if(!u)return false;
 const key=userAccessRole(u);
 if(['owner','moderator','guest'].includes(key))return false;
 return !u.isHidden&&u.authType==='google';
}
function verifiedBadgeHtml(u,scope='list'){
 // عندما تمنح الإدارة أو المراقب شارة للمستخدم، تحل الشارة محل علامة التوثيق الزرقاء.
 if(activeNameGift(u?.id))return '';
 if(!state.economyConfig.verifyEnabled||!isRegisteredAccount(u))return '';
 const scopeClass=scope==='chat'?' verifiedBadgeChat':' verifiedBadgeList';
 return `<span class="verifiedBadge${scopeClass}" title="مستخدم مسجل" aria-label="مستخدم مسجل">
  <svg viewBox="0 0 24 24" aria-hidden="true">
   <path class="verifiedBadgeShape" d="M12 1.7l2.15 1.77 2.75-.3 1.06 2.56 2.55 1.07-.29 2.75L22 12l-1.78 2.15.29 2.75-2.55 1.07-1.06 2.56-2.75-.3L12 22.3l-2.15-1.77-2.75.3-1.06-2.56-2.55-1.07.29-2.75L2 12l1.78-2.15-.29-2.75 2.55-1.07L7.1 3.17l2.75.3L12 1.7z"/>
   <path class="verifiedBadgeCheck" d="M8.1 12.2l2.35 2.35 5.45-5.45"/>
  </svg>
 </span>`;
}
function roleBadgeHtml(u,scope='chat'){
 const key=userAccessRole(u||{});
 if(key==='owner'){
  return `<span class="ownerRoyalCrown ${scope==='list'?'ownerCrownList':'ownerCrownChat'}" title="تاج الإدارة الملكي" aria-label="الإدارة">
   <span class="ownerCrownAura" aria-hidden="true"></span>
   <svg viewBox="0 0 76 58" aria-hidden="true">
    <path class="ownerCrownShadow" d="M10 20 24 33 37 8 50 33 66 19 59 46H16Z"/>
    <path class="ownerCrownBody" d="M10 18 24 31 37 6 50 31 67 17 59 44H16Z"/>
    <path class="ownerCrownInner" d="M18 37h40l-2 8H20Z"/>
    <path class="ownerCrownBand" d="M16 43h43v8H16Z"/>
    <path class="ownerCrownHighlight" d="M19 39h37"/>
    <circle class="ownerGem ownerGemBlue" cx="22" cy="45" r="3.4"/>
    <path class="ownerGem ownerGemPink" d="m37 40 4 5-4 5-4-5Z"/>
    <circle class="ownerGem ownerGemCyan" cx="53" cy="45" r="3.4"/>
    <circle class="ownerTipGem ownerTipGemLeft" cx="10" cy="17" r="3"/>
    <circle class="ownerTipGem ownerTipGemTop" cx="37" cy="6" r="3.2"/>
    <circle class="ownerTipGem ownerTipGemRight" cx="67" cy="16" r="3"/>
   </svg>
   <i class="ownerCrownSpark ownerCrownSparkOne">✦</i><i class="ownerCrownSpark ownerCrownSparkTwo">✦</i>
  </span>`;
 }
 const roleBadges=role(u);
 return roleBadges?`<span class="nameRoleBadges">${roleBadges}</span>`:'';
}

function displayNameHtml(u,scope='chat'){
 const owner=userAccessRole(u||{})==='owner';
 const raw=String(u?.name??'').trim();
 const visibleName=raw||(!owner?'مستخدم':'');
 const nameHtml=visibleName?`<b class="displayName ${scope==='list'?'displayNameList':'displayNameChat'}">${esc(visibleName)}</b>`:'';
 return `<span class="nameLine ${scope==='list'?'listNameLine':'chatNameLine'} ${owner&&!visibleName?'ownerCrownOnlyLine':''}">${nameHtml}${verifiedBadgeHtml(u,scope)}${giftBadgeHtml(u,scope)}${roleBadgeHtml(u,scope)}</span>`;
}
function readableUserName(u){
 const name=String(u?.name??'').trim();
 return name||(userAccessRole(u||{})==='owner'?'الإدارة':'مستخدم');
}

function canManageFreeBadges(){
 return ['owner','moderator'].includes(userAccessRole(state.user));
}

function requestFreeBadgeFor(userId){
 const target=findUser(userId);
 if(!target){toast('المستخدم غير موجود');return}
 if(state.user?.id===target.id){toast('اختر مستخدماً آخر لمنحه الشارة');return}
 state.target=target.id;
 if(canManageFreeBadges()){
  openFreeBadgePanel(target.id);
  return;
 }
 state.pendingFreeBadgeTarget=target.id;
 toast('سجّل دخول الإدارة أو المراقب، وستفتح الشارات لهذا المستخدم مباشرة');
 open('loginModal');
}

function freeBadgeById(id){
 return state.freeAdminBadgeCatalog.find(b=>b.id===id);
}
function openFreeBadgePanel(userId=state.target){
 if(!canManageFreeBadges()){toast('الشارات المجانية للإدارة والمراقب فقط');return}
 const target=findUser(userId);
 if(!target){toast('المستخدم غير موجود');return}
 state.target=target.id;
 $('#freeBadgeTarget').textContent=target.name;
 $('#freeBadgeChoices').innerHTML=state.freeAdminBadgeCatalog.map(b=>`<button class="freeBadgeChoice ${b.style}" data-free-badge="${b.id}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>منح مجاناً</small></button>`).join('');
 $$('[data-free-badge]').forEach(button=>button.onclick=()=>grantFreeBadge(button.dataset.freeBadge));
 const active=activeNameGift(target.id);
 $('#activeFreeBadge').innerHTML=active?`<span>${active.icon}</span><div><b>الشارة الظاهرة الآن</b><small>${esc(active.name)}</small></div>`:'<div><b>لا توجد شارة قرب الاسم</b><small>اختر شارة متحركة مجانية.</small></div>';
 open('freeBadgeModal');
}
function grantFreeBadge(badgeId){
 if(!canManageFreeBadges()){toast('هذه الصلاحية للإدارة أو المراقب فقط');return}
 const badge=freeBadgeById(badgeId),target=findUser(state.target);
 if(!badge||!target)return;
 setActiveNameGift(target.id,{...badge,price:0},'adminBadge');
 renderAll();
 openFreeBadgePanel(target.id);
 createGiftParticles(4,badge.icon);
 toast(`تم وضع ${badge.name} قرب اسم ${target.name}`);
}
function removeFreeBadge(){
 if(!canManageFreeBadges())return;
 const target=findUser(state.target);if(!target)return;
 clearActiveNameGift(target.id);
 renderAll();
 openFreeBadgePanel(target.id);
 toast(`تمت إزالة الشارة من ${target.name}`);
}

function roleGiftKey(u=state.user){
 const key=userAccessRole(u||{});
 return ['plus','vip','primo','moderator'].includes(key)?key:null;
}
function roleGiftLabel(key){
 return ({plus:'Plus ➕',vip:'VIP 💎',primo:'بريمو 🔷',moderator:'المراقب ⭐'})[key]||'';
}
function exclusiveRoleGifts(u=state.user){
 const key=roleGiftKey(u);
 return key?(state.roleGiftCatalog[key]||[]):[];
}
function availableGiftCatalogForSender(){
 const exclusive=exclusiveRoleGifts(state.user).map(g=>({...g,exclusive:true,exclusiveRole:roleGiftKey(state.user)}));
 return [...exclusive,...state.gifts];
}
function openRoleGiftPanel(){
 const key=roleGiftKey(state.user);
 if(!key){toast('هذه اللوحة مخصصة لـ Plus وVIP وبريمو والمراقب');return}
 const gifts=exclusiveRoleGifts(state.user);
 $('#roleGiftRole').textContent=roleGiftLabel(key);
 $('#roleGiftHint').textContent='اختر هدية واحدة فقط تظهر قرب اسمك أثناء تنقلك بين الغرف، وتختفي عند خروجك من الموقع.';
 $('#roleGiftChoices').innerHTML=gifts.map(g=>`<button class="roleGiftChoice ${key}" data-role-gift="${g.id}"><span>${g.icon}</span><b>${esc(g.name)}</b><small>استخدمها قرب اسمي</small></button>`).join('');
 $$('[data-role-gift]').forEach(b=>b.onclick=()=>{
  const gift=gifts.find(g=>g.id===b.dataset.roleGift);
  setActiveNameGift(state.user.id,gift,'role');
  renderAll();
  openRoleGiftPanel();
  toast(`تم اختيار ${gift.name} قرب اسمك`);
 });
 const active=activeNameGift(state.user.id);
 $('#activeRoleGift').innerHTML=active?`<span>${active.icon}</span><div><b>الهدية الظاهرة الآن</b><small>${esc(active.name)}</small></div>`:'<div><b>لا توجد هدية قرب اسمك الآن</b><small>اختر واحدة من الهدايا الحصرية.</small></div>';
 open('roleGiftModal');
}
function open(id){$('#'+id).classList.remove('hidden')} function close(id){$('#'+id).classList.add('hidden')}
function toast(t){const d=document.createElement('div');d.className='toastMsg';d.textContent=t;$('#toast').appendChild(d);setTimeout(()=>d.remove(),3200)}
function clearInbox(kind){
 if(kind==='messages') state.inbox.messages=0;
 if(kind==='alerts') state.inbox.alerts=0;
 renderHeader();
}




const RIVO_RADIO_VOLUME_KEY='rivo_radio_volume_v1';
const RIVO_RADIO_MUTED_KEY='rivo_radio_muted_v1';
const RIVO_RADIO_AUTOPLAY_KEY='rivo_radio_autoplay_v1';
let radioYoutubePlayer=null;
let radioYoutubeReadyPromise=null;
let radioVideoDragState=null;
let radioAutoplayBlocked=false;
let radioResumeTimers=[];
let radioUnlockArmed=false;
function radioAudio(){return $('#globalRadioAudio')}
function radioDirectVideo(){return $('#radioExternalVideo')}
function looksLikeDirectAudioUrl(value){
 const raw=String(value||'').trim();
 if(!raw)return false;
 try{
  const url=new URL(raw,location.href);
  const path=(url.pathname||'').toLowerCase();
  if(/\.(mp3|aac|m4a|ogg|oga|opus|wav|flac)(?:$|\?)/i.test(path))return true;
  const format=String(url.searchParams.get('format')||url.searchParams.get('type')||'').toLowerCase();
  if(/^(mp3|aac|m4a|ogg|opus|wav|flac)$/.test(format))return true;
 }catch(_){ }
 return false;
}
function radioType(value=state.radioBroadcast.sourceType,source=state.radioBroadcast.source){
 const requested=['audio','youtube','video'].includes(String(value||''))?String(value):'audio';
 if(youtubeIdFromRadioUrl(source))return 'youtube';
 if(looksLikeDirectAudioUrl(source))return 'audio';
 return requested;
}
function radioAutoPlayEnabled(){try{return localStorage.getItem(RIVO_RADIO_AUTOPLAY_KEY)==='1'}catch(_){return false}}
function setRadioAutoPlayEnabled(enabled){try{localStorage.setItem(RIVO_RADIO_AUTOPLAY_KEY,enabled?'1':'0')}catch(_){ }}
function radioTargetRoom(){return state.rooms.find(r=>r.id===state.radioBroadcast.roomId)}
function radioIsInCurrentRoom(){
 const broadcast=state.radioBroadcast;
 if(broadcast.status==='stopped'||!String(broadcast.source||'').trim())return false;
 if(!room().music)return false;
 return broadcast.scope==='all'||broadcast.roomId===state.room;
}
function radioScopeText(){return state.radioBroadcast.scope==='all'?'جميع الغرف':(radioTargetRoom()?.name||'غرفة محددة')}
function youtubeIdFromRadioUrl(value){
 const raw=String(value||'').trim();if(/^[A-Za-z0-9_-]{11}$/.test(raw))return raw;
 try{const url=new URL(raw);if(url.hostname==='youtu.be')return url.pathname.split('/').filter(Boolean)[0]||'';if(url.hostname.includes('youtube.com')){if(url.pathname==='/watch')return url.searchParams.get('v')||'';const parts=url.pathname.split('/').filter(Boolean);if(['embed','shorts','live'].includes(parts[0]))return parts[1]||''}}catch(_){ }
 return '';
}
function loadRadioPreferences(){
 const slider=$('#musicVolume');let volume=30;try{volume=Math.max(0,Math.min(100,Number(localStorage.getItem(RIVO_RADIO_VOLUME_KEY)||30)))}catch(_){ }
 if(slider)slider.value=String(volume);
 try{state.radioBroadcast.userMuted=localStorage.getItem(RIVO_RADIO_MUTED_KEY)==='1'}catch(_){state.radioBroadcast.userMuted=false}
 applyRadioVolume();
}
function radioVolume(){return Math.max(0,Math.min(100,Number($('#musicVolume')?.value||0)))}
function radioIsMuted(){return Boolean(state.radioBroadcast.userMuted)||radioVolume()<=0}
function ensureYouTubeApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(radioYoutubeReadyPromise)return radioYoutubeReadyPromise;
 radioYoutubeReadyPromise=new Promise((resolve,reject)=>{
  const previous=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{try{if(typeof previous==='function')previous()}catch(_){ }resolve(window.YT)};
  if(!document.querySelector('script[data-rivo-youtube-api]')){const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.dataset.rivoYoutubeApi='1';script.onerror=()=>reject(new Error('youtube-api'));document.head.appendChild(script)}
  setTimeout(()=>{if(!window.YT?.Player)reject(new Error('youtube-timeout'))},15000);
 }).catch(error=>{radioYoutubeReadyPromise=null;throw error});
 return radioYoutubeReadyPromise;
}
async function ensureRadioYoutubePlayer(videoId){
 if(!videoId)return false;
 await ensureYouTubeApi();
 if(radioYoutubePlayer?.loadVideoById){
  if(state.radioBroadcast.loadedSource!==`youtube:${videoId}`)radioYoutubePlayer.cueVideoById(videoId);
  state.radioBroadcast.loadedSource=`youtube:${videoId}`;applyRadioVolume();return true;
 }
 return await new Promise((resolve,reject)=>{
  let settled=false;
  radioYoutubePlayer=new YT.Player('radioYoutubePlayer',{videoId,playerVars:{controls:1,playsinline:1,rel:0,modestbranding:1,autoplay:0,enablejsapi:1,origin:location.origin},events:{
   onReady:event=>{state.radioBroadcast.loadedSource=`youtube:${videoId}`;applyRadioVolume();settled=true;resolve(true)},
   onStateChange:event=>{if(window.YT){state.radioBroadcast.listenerPlaying=event.data===YT.PlayerState.PLAYING}renderRadioUI()},
   onError:()=>{state.radioBroadcast.listenerPlaying=false;renderRadioUI();toast('تعذر تشغيل فيديو YouTube')}
  }});
  setTimeout(()=>{if(!settled)reject(new Error('youtube-player-timeout'))},12000);
 }).catch(()=>false);
}
function ensureRadioYoutubeMount(){
 const body=$('#radioVideoBody');
 let mount=$('#radioYoutubePlayer');
 if(!mount&&body){mount=document.createElement('div');mount.id='radioYoutubePlayer';mount.className='radioYoutubePlayer hidden';body.prepend(mount)}
 return mount;
}
function forcePauseRadioMedia(){
 const audio=radioAudio(),video=radioDirectVideo();
 try{audio?.pause()}catch(_){ }
 try{video?.pause()}catch(_){ }
 try{radioYoutubePlayer?.pauseVideo?.()}catch(_){ }
 // بعض هواتف Android تستمر بصوت YouTube بعد إخفاء النافذة؛ نتحقق ونوقفه قسراً.
 setTimeout(()=>{try{if(window.YT&&radioYoutubePlayer?.getPlayerState?.()===YT.PlayerState.PLAYING)radioYoutubePlayer.stopVideo?.()}catch(_){ }},160);
 state.radioBroadcast.listenerPlaying=false;
 renderRadioUI();
}
function hardStopRadioMedia(resetSources=false){
 const audio=radioAudio(),video=radioDirectVideo();
 try{if(audio){audio.pause();audio.currentTime=0;if(resetSources){audio.removeAttribute('src');audio.load()}}}catch(_){ }
 try{if(video){video.pause();video.currentTime=0;if(resetSources){video.removeAttribute('src');video.load()}}}catch(_){ }
 try{radioYoutubePlayer?.stopVideo?.()}catch(_){ }
 try{radioYoutubePlayer?.destroy?.()}catch(_){ }
 radioYoutubePlayer=null;
 const mount=ensureRadioYoutubeMount();
 if(mount){mount.innerHTML='';mount.classList.add('hidden')}
 state.radioBroadcast.listenerPlaying=false;
 state.radioBroadcast.loadedSource='';
 state.radioBroadcast.audioOnly=false;
 $('#radioVideoWindow')?.classList.remove('audioOnlyMode');
 renderRadioUI();
}
function pauseOtherRadioMedia(activeType=''){
 const audio=radioAudio(),video=radioDirectVideo();
 if(activeType!=='audio')try{audio?.pause()}catch(_){ }
 if(activeType!=='video')try{video?.pause()}catch(_){ }
 if(activeType!=='youtube'){try{radioYoutubePlayer?.pauseVideo?.()}catch(_){ }}
}
async function prepareRadioSource(){
 const broadcast=state.radioBroadcast,source=String(broadcast.source||'').trim(),type=radioType();
 if(!source)return false;
 if(type==='audio'){
  hideRadioVideoWindow(true);
  const audio=radioAudio();if(!audio)return false;pauseOtherRadioMedia('audio');
  const key=`audio:${source}`;if(broadcast.loadedSource!==key){audio.pause();audio.removeAttribute('src');audio.src=source;audio.load();broadcast.loadedSource=key}
  applyRadioVolume();return true;
 }
 showRadioVideoWindow(false);
 if(type==='video'){
  const video=radioDirectVideo();if(!video)return false;pauseOtherRadioMedia('video');
  $('#radioYoutubePlayer')?.classList.add('hidden');video.classList.remove('hidden');
  const key=`video:${source}`;if(broadcast.loadedSource!==key){video.pause();video.removeAttribute('src');video.src=source;video.load();broadcast.loadedSource=key}
  applyRadioVolume();return true;
 }
 const id=youtubeIdFromRadioUrl(source);if(!id)return false;pauseOtherRadioMedia('youtube');
 radioDirectVideo()?.classList.add('hidden');ensureRadioYoutubeMount()?.classList.remove('hidden');
 return await ensureRadioYoutubePlayer(id);
}
function applyRadioVolume(){
 const value=radioVolume(),muted=radioIsMuted(),fraction=value/100;
 const audio=radioAudio(),video=radioDirectVideo();
 if(audio){audio.volume=fraction;audio.muted=muted}
 if(video){video.volume=fraction;video.muted=muted}
 try{if(radioYoutubePlayer?.setVolume)radioYoutubePlayer.setVolume(value);if(muted)radioYoutubePlayer?.mute?.();else radioYoutubePlayer?.unMute?.()}catch(_){ }
 renderRadioUI();
}
async function toggleRadioMute(){
 const wasMuted=radioIsMuted();
 if(wasMuted&&radioVolume()<=0){const slider=$('#musicVolume');if(slider)slider.value='30'}
 state.radioBroadcast.userMuted=!wasMuted;
 try{localStorage.setItem(RIVO_RADIO_VOLUME_KEY,String(radioVolume()));localStorage.setItem(RIVO_RADIO_MUTED_KEY,state.radioBroadcast.userMuted?'1':'0')}catch(_){ }
 applyRadioVolume();
 if(wasMuted){setRadioAutoPlayEnabled(true);if(state.radioBroadcast.status==='playing'&&!radioMediaPlaying())await startRadioListener(false,true)}
}
function radioMediaPlaying(){
 const type=radioType();
 if(type==='audio')return Boolean(radioAudio()&&!radioAudio().paused&&!radioAudio().ended);
 if(type==='video')return Boolean(radioDirectVideo()&&!radioDirectVideo().paused&&!radioDirectVideo().ended);
 try{return Boolean(window.YT&&radioYoutubePlayer?.getPlayerState?.()===YT.PlayerState.PLAYING)}catch(_){return Boolean(state.radioBroadcast.listenerPlaying)}
}
function renderRadioUI(){
 const broadcast=state.radioBroadcast,available=radioIsInCurrentRoom(),type=radioType();
 const title=$('#radioTrack'),stateText=$('#radioState'),badge=$('#radioLiveBadge'),button=$('#radioBtn'),widget=$('#radioWidget'),mute=$('#radioMuteBtn'),videoOpen=$('#radioVideoOpenBtn');
 const localPlaying=radioMediaPlaying(),audible=Boolean(localPlaying&&available&&broadcast.status==='playing'&&!radioIsMuted());
 if(title)title.textContent=broadcast.status==='stopped'?'لا توجد أغنية':broadcast.title;
 if(badge)badge.classList.toggle('hidden',broadcast.status!=='playing'||!available);
 if(widget){widget.classList.toggle('radioBroadcasting',broadcast.status==='playing'&&available);widget.classList.toggle('radioUnavailable',!available);widget.classList.toggle('radioSoundActive',audible)}
 if(stateText){
  if(broadcast.status==='stopped')stateText.textContent='لا يوجد بث الآن';
  else if(broadcast.status==='paused')stateText.textContent=`البث متوقف مؤقتاً · ${radioScopeText()}`;
  else if(!available)stateText.textContent=`البث يعمل في ${radioScopeText()}`;
  else if(type==='youtube')stateText.textContent=localPlaying?'فيديو YouTube يعمل الآن':'فيديو جاهز · اضغط تشغيل';
  else if(type==='video')stateText.textContent=localPlaying?'الفيديو يعمل الآن':'فيديو جاهز · اضغط تشغيل';
  else stateText.textContent=localPlaying?'يعمل الآن':radioAutoPlayEnabled()?(radioAutoplayBlocked?'محفوظ التشغيل · سيبدأ عند أول لمسة':'محفوظ التشغيل · جاري الاستئناف تلقائياً'):'اضغط تشغيل للاستماع';
 }
 if(button){button.textContent=localPlaying?'Ⅱ':'▶';button.disabled=broadcast.status!=='playing'||!available;button.title=localPlaying?'إيقاف الصوت عندي':'تشغيل البث عندي';button.setAttribute('aria-label',button.title)}
 if(mute){mute.textContent=radioIsMuted()?'🔇':'🔊';mute.title=radioIsMuted()?'تشغيل الصوت':'كتم الصوت';mute.setAttribute('aria-label',mute.title);mute.disabled=broadcast.status==='stopped'}
 if(videoOpen)videoOpen.classList.toggle('hidden',!['youtube','video'].includes(type)||broadcast.status==='stopped'||!available);
 const audioOnlyBtn=$('#radioVideoAudioOnlyBtn'),videoWin=$('#radioVideoWindow');
 if(audioOnlyBtn){audioOnlyBtn.classList.toggle('hidden',!['youtube','video'].includes(type)||broadcast.status==='stopped');audioOnlyBtn.textContent=broadcast.audioOnly?'🎬 إظهار الفيديو':'🎧 صوت فقط';audioOnlyBtn.title=broadcast.audioOnly?'إظهار صورة الفيديو':'إخفاء الصورة والاستماع فقط'}
 videoWin?.classList.toggle('audioOnlyMode',Boolean(broadcast.audioOnly));
 const videoTitle=$('#radioVideoTitle'),videoStatus=$('#radioVideoStatus');if(videoTitle)videoTitle.textContent=broadcast.title||'فيديو ريفو';if(videoStatus)videoStatus.textContent=broadcast.status==='paused'?'متوقف مؤقتاً':broadcast.audioOnly&&localPlaying?'الصوت يعمل الآن':localPlaying?'يعمل الآن':'جاهز للتشغيل';
}
async function startRadioListener(showError=true,rememberChoice=showError){
 const broadcast=state.radioBroadcast;
 if(broadcast.status!=='playing'){if(showError)toast(broadcast.status==='paused'?'البث متوقف مؤقتاً':'لا يوجد بث الآن');renderRadioUI();return false}
 if(!radioIsInCurrentRoom()){if(showError)toast(`البث مخصص إلى ${radioScopeText()}`);renderRadioUI();return false}
 if(!(await prepareRadioSource())){if(showError)toast('الرابط غير صالح أو تعذر تجهيز المشغل');return false}
 try{
  const type=radioType();
  if(type==='audio')await radioAudio().play();
  else if(type==='video'){showRadioVideoWindow(true);await radioDirectVideo().play()}
  else{showRadioVideoWindow(true);radioYoutubePlayer?.playVideo?.()}
  broadcast.listenerPlaying=true;
  radioAutoplayBlocked=false;
  if(rememberChoice)setRadioAutoPlayEnabled(true);
  updateStaffVisibilityUI();renderRadioUI();
  return true;
 }catch(error){
  broadcast.listenerPlaying=false;
  radioAutoplayBlocked=Boolean(error?.name==='NotAllowedError'||/notallowed|gesture|autoplay/i.test(String(error?.message||error||'')));
  if(showError)toast(radioAutoplayBlocked?'المتصفح منع الصوت التلقائي. المس الشاشة مرة واحدة وسيبدأ البث':'تعذر التشغيل. تحقق من رابط البث');
  updateStaffVisibilityUI();renderRadioUI();
  return false;
 }
}
function pauseRadioListener(rememberChoice=true){
 const type=radioType();if(type==='audio')radioAudio()?.pause();else if(type==='video')radioDirectVideo()?.pause();else{try{radioYoutubePlayer?.pauseVideo?.()}catch(_){ }}
 state.radioBroadcast.listenerPlaying=false;if(rememberChoice)setRadioAutoPlayEnabled(false);renderRadioUI();
}
async function toggleRadioAudioOnly(){
 if(!['youtube','video'].includes(radioType())||state.radioBroadcast.status==='stopped')return;
 state.radioBroadcast.audioOnly=!state.radioBroadcast.audioOnly;
 if(state.radioBroadcast.audioOnly&&!radioMediaPlaying()&&state.radioBroadcast.status==='playing')await startRadioListener(false);
 showRadioVideoWindow(true);renderRadioUI();
}
function toggleRadioListener(){radioMediaPlaying()?pauseRadioListener(true):startRadioListener(true,true)}
function clearRadioResumeTimers(){
 radioResumeTimers.forEach(timer=>clearTimeout(timer));
 radioResumeTimers=[];
}
function scheduleSavedRadioResume(){
 clearRadioResumeTimers();
 if(!radioAutoPlayEnabled()||radioIsMuted()||state.radioBroadcast.status!=='playing'||!radioIsInCurrentRoom()||radioMediaPlaying())return;
 [0,180,650,1600,3500].forEach(delay=>{
  radioResumeTimers.push(setTimeout(()=>{
   if(!radioAutoPlayEnabled()||radioIsMuted()||state.radioBroadcast.status!=='playing'||!radioIsInCurrentRoom()||radioMediaPlaying())return;
   startRadioListener(false,false).catch(()=>{});
  },delay));
 });
}
function startSavedRadioFromGesture(){
 if(!radioAutoPlayEnabled()||radioIsMuted()||state.radioBroadcast.status!=='playing'||!radioIsInCurrentRoom()||radioMediaPlaying())return;
 const type=radioType(),source=String(state.radioBroadcast.source||'').trim();
 try{
  if(type==='audio'){
   const audio=radioAudio();if(!audio||!source)return;
   pauseOtherRadioMedia('audio');
   const key=`audio:${source}`;
   if(state.radioBroadcast.loadedSource!==key){audio.pause();audio.removeAttribute('src');audio.src=source;audio.load();state.radioBroadcast.loadedSource=key}
   applyRadioVolume();
   const attempt=audio.play();
   Promise.resolve(attempt).then(()=>{state.radioBroadcast.listenerPlaying=true;radioAutoplayBlocked=false;clearRadioResumeTimers();renderRadioUI()}).catch(()=>{});
   return;
  }
  // للفيديو وYouTube نستخدم المسار العادي بعد أول تفاعل من المستخدم.
  startRadioListener(false,false).catch(()=>{});
 }catch(_){ }
}
function armRadioAutoplayUnlock(){
 if(radioUnlockArmed)return;
 radioUnlockArmed=true;
 const tryStart=()=>startSavedRadioFromGesture();
 ['pointerdown','touchend','click','keydown'].forEach(type=>document.addEventListener(type,tryStart,{passive:true,capture:true}));
 window.addEventListener('pageshow',scheduleSavedRadioResume);
 window.addEventListener('focus',scheduleSavedRadioResume);
 window.addEventListener('online',scheduleSavedRadioResume);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSavedRadioResume()});
}
async function syncRadioForRoom(){
 const broadcast=state.radioBroadcast;
 if(broadcast.status==='stopped'){
  hardStopRadioMedia(true);hideRadioVideoWindow(true);renderRadioUI();return;
 }
 if(!radioIsInCurrentRoom()||broadcast.status==='paused'){
  forcePauseRadioMedia();broadcast.listenerPlaying=false;
  renderRadioUI();return;
 }
 const videoMode=['youtube','video'].includes(radioType());
 // أظهر النافذة فور وصول أمر الإدارة، حتى قبل اكتمال تحميل YouTube.
 if(videoMode&&!broadcast.videoClosed){
  showRadioVideoWindow(false);
  const videoStatus=$('#radioVideoStatus');if(videoStatus)videoStatus.textContent='جاري تحميل الفيديو…';
 }
 if(!(await prepareRadioSource())){
  const videoStatus=$('#radioVideoStatus');if(videoStatus&&videoMode)videoStatus.textContent='تعذر تحميل الرابط';
  renderRadioUI();return;
 }
 if(videoMode&&!broadcast.videoClosed)showRadioVideoWindow(false);
 if(broadcast.listenerPlaying||radioAutoPlayEnabled())scheduleSavedRadioResume()
 renderRadioUI();
}
function showRadioVideoWindow(userAction=false){
 if(!['youtube','video'].includes(radioType()))return;
 const win=$('#radioVideoWindow'),restore=$('#radioVideoRestoreBtn');if(!win)return;
 state.radioBroadcast.videoClosed=false;win.classList.remove('hidden');restore?.classList.add('hidden');
 if(userAction)win.style.zIndex=String(520+Date.now()%100);
}
function hideRadioVideoWindow(stopped=false){
 const win=$('#radioVideoWindow'),restore=$('#radioVideoRestoreBtn');if(!win)return;
 win.classList.add('hidden');win.classList.remove('minimized','maximized');
 if(stopped){state.radioBroadcast.videoClosed=false;restore?.classList.add('hidden')}else{state.radioBroadcast.videoClosed=true;restore?.classList.remove('hidden')}
}
function initRadioVideoWindow(){
 const win=$('#radioVideoWindow'),handle=$('#radioVideoDragHandle');if(!win||!handle)return;
 $('#radioVideoCloseBtn')?.addEventListener('click',()=>{pauseRadioListener();hideRadioVideoWindow(false)});
 $('#radioVideoRestoreBtn')?.addEventListener('click',()=>showRadioVideoWindow(true));
 $('#radioVideoOpenBtn')?.addEventListener('click',()=>showRadioVideoWindow(true));
 $('#radioVideoAudioOnlyBtn')?.addEventListener('click',toggleRadioAudioOnly);
 $('#radioVideoMinimizeBtn')?.addEventListener('click',()=>{win.classList.toggle('minimized');win.classList.remove('maximized')});
 $('#radioVideoMaximizeBtn')?.addEventListener('click',()=>{win.classList.toggle('maximized');win.classList.remove('minimized');win.style.left='';win.style.top='';win.style.right='';win.style.bottom=''});
 handle.addEventListener('pointerdown',event=>{if(event.target.closest('button')||win.classList.contains('maximized'))return;const rect=win.getBoundingClientRect();radioVideoDragState={id:event.pointerId,x:event.clientX-rect.left,y:event.clientY-rect.top};handle.setPointerCapture?.(event.pointerId);win.style.left=`${rect.left}px`;win.style.top=`${rect.top}px`;win.style.right='auto';win.style.bottom='auto'});
 handle.addEventListener('pointermove',event=>{if(!radioVideoDragState||event.pointerId!==radioVideoDragState.id)return;const maxX=Math.max(0,innerWidth-win.offsetWidth),maxY=Math.max(0,innerHeight-win.offsetHeight);win.style.left=`${Math.max(0,Math.min(maxX,event.clientX-radioVideoDragState.x))}px`;win.style.top=`${Math.max(0,Math.min(maxY,event.clientY-radioVideoDragState.y))}px`});
 const stop=event=>{if(radioVideoDragState&&(!event||event.pointerId===radioVideoDragState.id))radioVideoDragState=null};handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
}
function populateRadioRoomSelect(){const select=$('#adminRadioRoom');if(!select)return;select.innerHTML=state.rooms.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');select.value=state.radioBroadcast.roomId||state.room}
function updateRadioScopeAdmin(){const scope=$('#adminRadioScope')?.value||state.radioBroadcast.scope,hidden=scope!=='room';$('#adminRadioRoomWrap')?.classList.toggle('hidden',hidden);$('#adminRadioRoom')?.classList.toggle('hidden',hidden)}
function updateInlineRadioTypeUi(){
 const type=radioType($('#adminRadioType')?.value),label=$('#adminRadioSourceLabel'),input=$('#adminRadioSource');if(label)label.textContent=type==='youtube'?'رابط فيديو YouTube أو البث المباشر':type==='video'?'رابط فيديو خارجي مباشر':'رابط راديو أو صوت مباشر';if(input)input.placeholder=type==='youtube'?'https://www.youtube.com/watch?v=...':type==='video'?'https://.../video.mp4':'https://.../stream.mp3';
}
function renderRadioAdminStatus(){const box=$('#adminRadioStatus');if(!box)return;const broadcast=state.radioBroadcast;if(broadcast.status==='stopped'){box.textContent='لا يوجد بث الآن.';box.className='adminRadioStatus stopped';return}const status=broadcast.status==='playing'?'يبث الآن':'متوقف مؤقتاً';box.textContent=`${status}: ${broadcast.title} — ${radioScopeText()}`;box.className=`adminRadioStatus ${broadcast.status}`}
function initRadioAdmin(){const broadcast=state.radioBroadcast;populateRadioRoomSelect();if($('#adminRadioTitle'))$('#adminRadioTitle').value=broadcast.title||'';if($('#adminRadioType'))$('#adminRadioType').value=radioType();if($('#adminRadioSource'))$('#adminRadioSource').value=broadcast.source||'';if($('#adminRadioScope'))$('#adminRadioScope').value=broadcast.scope||'all';if($('#adminRadioRoom'))$('#adminRadioRoom').value=broadcast.roomId||state.room;updateInlineRadioTypeUi();updateRadioScopeAdmin();renderRadioAdminStatus()}
async function startRadioBroadcast(){
 const title=$('#adminRadioTitle').value.trim()||'راديو ريفو',source=$('#adminRadioSource').value.trim(),sourceType=radioType($('#adminRadioType')?.value),scope=$('#adminRadioScope').value,roomId=$('#adminRadioRoom').value||state.room;
 if(!source){toast('ضع رابط البث الخارجي أولاً');return}if(sourceType==='youtube'&&!youtubeIdFromRadioUrl(source)){toast('رابط YouTube غير صحيح');return}if(sourceType!=='youtube'&&!/^https:\/\//i.test(source)){toast('يجب أن يبدأ الرابط الخارجي بـ https://');return}
 Object.assign(state.radioBroadcast,{title,source,sourceType,scope,roomId,status:'playing',startedAt:Date.now(),listenerPlaying:false,loadedSource:'',videoClosed:false});if(scope==='all')state.rooms.forEach(r=>r.music=true);else{const target=state.rooms.find(r=>r.id===roomId);if(target)target.music=true}
 await prepareRadioSource();renderHeader();renderRadioAdminStatus();renderRadioUI();toast(scope==='all'?'بدأ البث في جميع الغرف':`بدأ البث في غرفة ${radioTargetRoom()?.name||''}`);
}
function pauseRadioBroadcast(){if(state.radioBroadcast.status==='stopped'){toast('لا يوجد بث لإيقافه');return}state.radioBroadcast.status='paused';forcePauseRadioMedia();renderHeader();renderRadioAdminStatus();toast('تم إيقاف البث مؤقتاً')}
function stopRadioBroadcast(){state.radioBroadcast.status='stopped';hardStopRadioMedia(true);hideRadioVideoWindow(true);renderHeader();renderRadioAdminStatus();renderRadioUI();toast('تم إيقاف بث الراديو')}


function roomMicApprovalKey(userId,roomId=state.room){return`${roomId}:${userId}`}
function requestRoomMic(){
 if(!member('المايك'))return;
 const r=room();
 if(!r.micOn||r.mics===0){toast('المايك مغلق في هذه الغرفة');return}
 const access=permissionValue('roomMic');
 if(access==='direct'){startRoomMic(true);return}
 const key=roomMicApprovalKey(state.user.id);
 if(state.roomMic.approvals[key]){startRoomMic();return}
 const existing=state.roomMic.requests.find(x=>x.userId===state.user.id&&x.roomId===state.room&&x.status==='pending');
 if(existing){toast('طلب المايك بانتظار موافقة الإدارة');return}
 const req={
  id:`micreq_${++state.roomMic.requestSeq}`,
  userId:state.user.id,userName:state.user.name,avatar:state.user.avatar,
  roomId:state.room,roomName:r.name,status:'pending',time:privateTime(),
  priority:Number(permissionValue('priority'))||0
 };
 state.roomMic.requests.unshift(req);
 state.roomMic.requests.sort((a,b)=>(b.priority||0)-(a.priority||0));
 writeSharedMicRequests(state.roomMic.requests);
 toast('تم إرسال طلب المايك إلى الإدارة');
}
function startRoomMic(force=false){
 const r=room();if(!state.user||!r.micOn||r.mics===0)return;
 const key=roomMicApprovalKey(state.user.id);
 if(!force&&permissionValue('roomMic')!=='direct'&&!state.roomMic.approvals[key]){requestRoomMic();return}
 state.stage=state.stage.filter(s=>s.user!==state.user.id);
 state.stage.unshift({user:state.user.id,mode:'audio',speaking:true});
 renderStage();toast('صعدت إلى المايك');
}

function roomCameraApprovalKey(userId,roomId=state.room){
 return `${roomId}:${userId}`;
}
function roomCameraCurrentUser(){
 return state.user?.id||'';
}
function requestRoomCamera(){
 if(!member('الكاميرا'))return;
 const access=permissionValue('roomCamera');
 if(access==='direct'){startRoomCamera(true);return}
 const r=room();
 if(!r.camOn||r.cams===0){
   toast('الكاميرا مغلقة في هذه الغرفة');
   return;
 }
 const userId=roomCameraCurrentUser();
 const key=roomCameraApprovalKey(userId);
 if(state.roomCamera.approvals[key]){
   startRoomCamera();
   return;
 }
 const existing=state.roomCamera.requests.find(x=>x.userId===userId&&x.roomId===state.room&&x.status==='pending');
 if(existing){
   toast('طلب الكاميرا بانتظار موافقة الإدارة');
   return;
 }
 const req={
   id:`camreq_${++state.roomCamera.requestSeq}`,
   userId,
   userName:state.user.name,
   avatar:state.user.avatar,
   roomId:state.room,
   roomName:r.name,
   status:'pending',
   time:privateTime()
 };
 state.roomCamera.requests.unshift(req);writeSharedCameraRequests(state.roomCamera.requests);
 renderRoomCameraRequests();
 toast('تم إرسال طلب تشغيل الكاميرا إلى الإدارة');
}
function renderRoomCameraRequests(){
 const box=$('#roomCameraRequestList');
 if(!box) return;
 const items=state.roomCamera.requests.filter(x=>x.roomId===state.room);
 box.innerHTML=items.length?items.map(req=>{
   const statusText=req.status==='pending'?'بانتظار القرار':req.status==='approved'?'تمت الموافقة':'مرفوض';
   return `<div class="roomCameraRequest ${req.status}">
     <img src="${av(req.avatar||'guest')}" alt="">
     <div>
       <b>${esc(req.userName)}</b>
       <small>${esc(req.roomName)} · ${esc(req.time)} · ${statusText}</small>
     </div>
     <div class="roomCameraRequestActions">
       ${req.status==='pending'?`
         <button data-camera-approve="${req.id}">موافقة</button>
         <button data-camera-deny="${req.id}">رفض</button>
       `:req.status==='approved'?`
         <button data-camera-revoke="${req.id}">سحب الإذن</button>
       `:''}
     </div>
   </div>`;
 }).join(''):'<small>لا توجد طلبات كاميرا حالياً.</small>';

 $$('[data-camera-approve]').forEach(b=>b.onclick=()=>approveRoomCamera(b.dataset.cameraApprove));
 $$('[data-camera-deny]').forEach(b=>b.onclick=()=>denyRoomCamera(b.dataset.cameraDeny));
 $$('[data-camera-revoke]').forEach(b=>b.onclick=()=>revokeRoomCamera(b.dataset.cameraRevoke));
}
function approveRoomCamera(requestId){
 const req=state.roomCamera.requests.find(x=>x.id===requestId);
 if(!req) return;
 req.status='approved';
 state.roomCamera.approvals[roomCameraApprovalKey(req.userId,req.roomId)]=true;
 writeSharedCameraRequests(state.roomCamera.requests);renderRoomCameraRequests();
 toast(`تمت الموافقة على كاميرا ${req.userName}`);
 if(state.user?.id===req.userId&&state.room===req.roomId) startRoomCamera();
}
function denyRoomCamera(requestId){
 const req=state.roomCamera.requests.find(x=>x.id===requestId);
 if(!req) return;
 req.status='denied';
 delete state.roomCamera.approvals[roomCameraApprovalKey(req.userId,req.roomId)];
 writeSharedCameraRequests(state.roomCamera.requests);renderRoomCameraRequests();
 toast(`تم رفض طلب كاميرا ${req.userName}`);
}
function revokeRoomCamera(requestId){
 const req=state.roomCamera.requests.find(x=>x.id===requestId);
 if(!req) return;
 req.status='denied';
 delete state.roomCamera.approvals[roomCameraApprovalKey(req.userId,req.roomId)];
 if(state.roomCamera.activeUser===req.userId) stopRoomCamera(true);
 writeSharedCameraRequests(state.roomCamera.requests);renderRoomCameraRequests();
 toast(`تم سحب إذن كاميرا ${req.userName}`);
}
async function startRoomCamera(force=false){
 if(!state.user) return;
 const key=roomCameraApprovalKey(state.user.id);
 if(!force&&!state.roomCamera.approvals[key]){
   requestRoomCamera();
   return;
 }
 if(state.roomCamera.stream){
   showRoomCameraWindow();
   return;
 }
 try{
   if(!navigator.mediaDevices?.getUserMedia){
     toast('شغّل النسخة عبر ملف التشغيل حتى تعمل الكاميرا');
     return;
   }
   const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
   state.roomCamera.stream=stream;
   state.roomCamera.activeUser=state.user.id;
   state.localStream=stream;
   state.stage=state.stage.filter(s=>s.user!==state.user.id);
   state.stage.unshift({user:state.user.id,mode:'camera',speaking:false});
   showRoomCameraWindow();
   renderStage();
   toast('تم تشغيل الكاميرا بعد موافقة الإدارة');
 }catch(e){
   toast('اسمح للمتصفح باستخدام الكاميرا');
 }
}
function showRoomCameraWindow(){
 const win=$('#roomCameraWindow');
 const video=$('#roomCameraVideo');
 const placeholder=$('#roomCameraPlaceholder');
 if(!win) return;
 $('#roomCameraName').textContent=state.user?.name||'مستخدم';
 $('#roomCameraAvatar').src=av(state.user?.avatar||'guest');
 win.classList.remove('hidden','minimized');
 state.roomCamera.window.minimized=false;
 if(video&&state.roomCamera.stream){
   video.srcObject=state.roomCamera.stream;
   placeholder?.classList.add('hidden');
 }else{
   placeholder?.classList.remove('hidden');
 }
 if(!win.style.left){
   win.style.left=Math.max(20,window.innerWidth-500)+'px';
   win.style.top=Math.max(90,window.innerHeight-500)+'px';
 }
 bringRoomCameraFront();
}
function stopRoomCamera(fromAdmin=false){
 const stream=state.roomCamera.stream;
 if(stream) stream.getTracks().forEach(t=>t.stop());
 state.roomCamera.stream=null;
 state.roomCamera.activeUser=null;
 if(state.localStream===stream) state.localStream=null;
 const video=$('#roomCameraVideo');
 if(video) video.srcObject=null;
 $('#roomCameraWindow')?.classList.add('hidden');
 state.stage=state.stage.filter(s=>s.user!==state.user?.id);
 renderStage();
 if(fromAdmin) toast('أغلقت الإدارة الكاميرا');
}
function closeAllRoomCameras(){
 Object.keys(state.roomCamera.approvals).forEach(k=>{
   if(k.startsWith(state.room+':')) delete state.roomCamera.approvals[k];
 });
 state.roomCamera.requests.forEach(req=>{
   if(req.roomId===state.room&&req.status==='approved') req.status='denied';
 });
 stopRoomCamera(true);writeSharedCameraRequests(state.roomCamera.requests);
 renderRoomCameraRequests();
}
function bringRoomCameraFront(){
 const win=$('#roomCameraWindow');
 if(!win) return;
 state.roomCamera.window.z+=1;
 win.style.zIndex=state.roomCamera.window.z;
}
function toggleRoomCameraMinimize(){
 const win=$('#roomCameraWindow');
 if(!win) return;
 state.roomCamera.window.minimized=!state.roomCamera.window.minimized;
 win.classList.toggle('minimized',state.roomCamera.window.minimized);
 $('#roomCameraMinimizeBtn').textContent=state.roomCamera.window.minimized?'▢':'—';
 bringRoomCameraFront();
}
function toggleRoomCameraMaximize(){
 const win=$('#roomCameraWindow');
 if(!win) return;
 if(!state.roomCamera.window.maximized){
   state.roomCamera.window.previous={
     left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height
   };
   win.classList.add('maximized');
   state.roomCamera.window.maximized=true;
   $('#roomCameraMaximizeBtn').textContent='❐';
 }else{
   win.classList.remove('maximized');
   const p=state.roomCamera.window.previous||{};
   win.style.left=p.left||'';
   win.style.top=p.top||'';
   win.style.width=p.width||'';
   win.style.height=p.height||'';
   state.roomCamera.window.maximized=false;
   $('#roomCameraMaximizeBtn').textContent='□';
 }
 bringRoomCameraFront();
}
function initRoomCameraDrag(){
 const win=$('#roomCameraWindow');
 const handle=$('#roomCameraDragHandle');
 if(!win||!handle) return;

 let dragging=false,startX=0,startY=0,startLeft=0,startTop=0;

 handle.addEventListener('pointerdown',e=>{
   if(e.target.closest('button')||state.roomCamera.window.maximized) return;
   dragging=true;
   bringRoomCameraFront();
   const rect=win.getBoundingClientRect();
   startX=e.clientX;startY=e.clientY;
   startLeft=rect.left;startTop=rect.top;
   handle.setPointerCapture(e.pointerId);
   win.classList.add('dragging');
   e.preventDefault();
 });
 handle.addEventListener('pointermove',e=>{
   if(!dragging) return;
   const maxLeft=Math.max(0,window.innerWidth-win.offsetWidth);
   const maxTop=Math.max(0,window.innerHeight-win.offsetHeight);
   win.style.left=Math.min(maxLeft,Math.max(0,startLeft+e.clientX-startX))+'px';
   win.style.top=Math.min(maxTop,Math.max(0,startTop+e.clientY-startY))+'px';
   win.style.right='auto';
   win.style.bottom='auto';
 });
 const stop=e=>{
   if(!dragging) return;
   dragging=false;
   win.classList.remove('dragging');
   try{handle.releasePointerCapture(e.pointerId)}catch(_){}
 };
 handle.addEventListener('pointerup',stop);
 handle.addEventListener('pointercancel',stop);
 win.addEventListener('pointerdown',bringRoomCameraFront);
}

function privateTime(){
 return new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'});
}
function totalPrivateUnread(){
 return Object.values(state.privateUnread||{}).reduce((sum,n)=>sum+(Number(n)||0),0);
}
function updatePrivateBadge(){
 const total=totalPrivateUnread();
 state.inbox.messages=total;
 const badge=$('#dmBadge');
 if(badge){
   badge.textContent=total;
   badge.classList.toggle('hidden',total<1);
   badge.parentElement?.classList.toggle('hasUnread',total>0);
 }
}
function privateChatUsers(){
 return state.users.filter(u=>u.id!=='owner' && u.role!=='ai' && u.id!==state.user?.id);
}
function renderPrivateInbox(){
 const list=$('#privateConversationList');
 if(!list) return;
 const privatePermission=state.user?permissionValue('privateChat'):false;
 const canUseRegularPrivate=Boolean(state.user)&&privatePermission!==false&&privatePermission!=='off'&&state.privateMessagesEnabled;
 const users=canUseRegularPrivate?privateChatUsers():[];
 const adminMessages=Array.isArray(state.adminMessages)?state.adminMessages:[];
 const adminUnread=Number(state.privateUnread?.['rivo-admin']||0);
 const adminLast=adminMessages.at(-1);
 const adminConversation=adminMessages.length?`<button class="privateConversation adminConversation" data-admin-message-inbox="1">
   <span class="privateAdminAvatar">👑</span>
   <span class="privateConversationCopy">
     <b>الإدارة</b>
     <small>${adminLast?esc(adminLast.body||adminLast.text||'رسالة من الإدارة'):'رسائل الإدارة'}</small>
   </span>
   ${adminUnread?`<i>${adminUnread}</i>`:''}
 </button>`:'';
 list.innerHTML=adminConversation+users.map(u=>{
   const chat=state.privateChats[u.id]||[];
   const last=chat.at(-1);
   const unread=state.privateUnread[u.id]||0;
   return `<button class="privateConversation" data-private-user="${u.id}">
     <img src="${av(u.avatar)}" alt="">
     <span class="privateConversationCopy">
       <b>${esc(u.name)}</b>
       <small>${last?esc(last.text):'ابدأ محادثة جديدة'}</small>
     </span>
     ${unread?`<i>${unread}</i>`:''}
   </button>`;
 }).join('');
 $$('[data-private-user]').forEach(b=>b.onclick=()=>openPrivateChat(b.dataset.privateUser));
 $$('[data-admin-message-inbox]').forEach(b=>b.onclick=()=>window.openAdminPrivateChat?.());
 const toggle=$('#privateMessagesToggle');
 if(toggle) toggle.checked=state.privateMessagesEnabled;
 const label=$('#privateReceiveState');
 if(label) label.textContent=state.privateMessagesEnabled?'مفتوح':'مغلق';
}
function openPrivateInbox(){
 const hasAdminMessages=Array.isArray(state.adminMessages)&&state.adminMessages.length>0;
 if(!hasAdminMessages&&!member('الرسائل الخاصة')) return;
 renderPrivateInbox();
 $('#privateInboxPanel')?.classList.remove('hidden');
 updatePrivateBadge();
}
function closePrivateInbox(){
 $('#privateInboxPanel')?.classList.add('hidden');
}
function renderPrivateMessages(){
 const isAdminTarget=state.privateTarget==='rivo-admin';
 const target=isAdminTarget?{id:'rivo-admin',name:'الإدارة',avatar:'owner'}:findUser(state.privateTarget);
 const box=$('#privateMessages');
 if(!target||!box) return;
 const messages=state.privateChats[target.id]||[];
 box.innerHTML=messages.length?messages.map(m=>{
   const mine=m.from==='me'||m.from===state.user?.id;
   return `<div class="privateMessage ${mine?'mine':'theirs'}">
     <div>${esc(m.text)}</div><time>${esc(m.time||'')}</time>
   </div>`;
 }).join(''):'<div class="privateEmpty">ابدأ المحادثة الخاصة</div>';
 requestAnimationFrame(()=>box.scrollTop=box.scrollHeight);
}
function updatePrivateMediaControls(){
 const mic=$('#privateMicBtn'),cam=$('#privateCameraBtn');
 if(state.privateTarget==='rivo-admin'){
  [mic,cam].forEach(button=>{if(!button)return;button.dataset.locked='1';button.classList.remove('unlocked');button.classList.add('privateLockedControl');const lock=button.querySelector('i');if(lock)lock.textContent='🔒';const small=button.querySelector('small');if(small)small.textContent='غير متاح في محادثة الإدارة'});
  return;
 }
 const paidOnly=state.privateMedia.paidOnly;
 const tier=userAccessRole(state.user||{});
 const paidTier=['plus','vip','primo','moderator','owner'].includes(tier);
 const allowedByPlan=!paidOnly||paidTier;

 const apply=(button,enabled,lockedText,availableText)=>{
   if(!button) return;
   const locked=!enabled||!allowedByPlan;
   button.classList.toggle('unlocked',!locked);
   button.classList.toggle('privateLockedControl',locked);
   const lock=button.querySelector('i');
   if(lock) lock.textContent=locked?'🔒':'';
   const small=button.querySelector('small');
   if(small){
     small.textContent=!enabled?lockedText:(!allowedByPlan?'للمشتركين فقط':availableText);
   }
   button.dataset.locked=locked?'1':'0';
 };
 const micPermission=permissionValue('privateMic');
 const cameraPermission=permissionValue('privateCamera');
 apply(mic,state.privateMedia.mic&&micPermission==='direct',micPermission==='request'?'يحتاج موافقة الإدارة':'مغلق لرتبتك','المايك متاح');
 apply(cam,state.privateMedia.camera&&cameraPermission==='direct',cameraPermission==='request'?'تحتاج موافقة الإدارة':'مغلقة لرتبتك','الكاميرا متاحة');
}
function openPrivateChat(userId){
 if(userId==='rivo-admin'){window.openAdminPrivateChat?.();return}
 if(!member('الرسائل الخاصة')) return;
 const target=findUser(userId);
 if(!target) return;
 state.privateTarget=userId;
 state.privateChats[userId] ||= [];
 state.privateUnread[userId]=0;
 updatePrivateBadge();
 renderPrivateInbox();

 $('#privateChatName').textContent=target.name;
 $('#privateChatAvatar').src=av(target.avatar);
 $('#privateChatStatus').textContent='متصل الآن';
 renderPrivateMessages();
 updatePrivateMediaControls();

 const win=$('#privateChatWindow');
 win.classList.remove('hidden','minimized');
 state.privateWindow.minimized=false;
 bringPrivateWindowFront();
 closePrivateInbox();

 if(!win.style.left){
   win.style.left=Math.max(18,window.innerWidth-455)+'px';
   win.style.top=Math.max(90,window.innerHeight-570)+'px';
 }
}
function closePrivateChat(){
 $('#privateChatWindow')?.classList.add('hidden');
}
function bringPrivateWindowFront(){
 const win=$('#privateChatWindow');
 if(!win) return;
 state.privateWindow.z+=1;
 win.style.zIndex=state.privateWindow.z;
}
function togglePrivateMinimize(){
 const win=$('#privateChatWindow');
 if(!win) return;
 state.privateWindow.minimized=!state.privateWindow.minimized;
 win.classList.toggle('minimized',state.privateWindow.minimized);
 $('#privateMinimizeBtn').textContent=state.privateWindow.minimized?'▢':'—';
 bringPrivateWindowFront();
}
function togglePrivateMaximize(){
 const win=$('#privateChatWindow');
 if(!win) return;
 if(!state.privateWindow.maximized){
   state.privateWindow.previous={
     left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height
   };
   win.classList.add('maximized');
   state.privateWindow.maximized=true;
   $('#privateMaximizeBtn').textContent='❐';
 }else{
   win.classList.remove('maximized');
   const p=state.privateWindow.previous||{};
   win.style.left=p.left||'';
   win.style.top=p.top||'';
   win.style.width=p.width||'';
   win.style.height=p.height||'';
   state.privateWindow.maximized=false;
   $('#privateMaximizeBtn').textContent='□';
 }
 bringPrivateWindowFront();
}
function sendPrivateMessage(){
 if(!state.privateTarget) return;
 const input=$('#privateMessageInput');
 const text=input.value.trim();
 if(!text) return;
 state.privateChats[state.privateTarget] ||= [];
 state.privateChats[state.privateTarget].push({from:'me',text,time:privateTime()});
 input.value='';
 renderPrivateMessages();
 renderPrivateInbox();
}
function setPrivateMessagesEnabled(enabled){
 state.privateMessagesEnabled=Boolean(enabled);
 renderPrivateInbox();
 toast(state.privateMessagesEnabled?'تم فتح استقبال الرسائل الخاصة':'تم إغلاق استقبال الرسائل الخاصة');
}
function simulatePrivateIncoming(userId,text){
 if(!state.privateMessagesEnabled) return;
 state.privateChats[userId] ||= [];
 state.privateChats[userId].push({from:userId,text,time:privateTime()});
 if(state.privateTarget!==userId||$('#privateChatWindow').classList.contains('hidden')){
   state.privateUnread[userId]=(state.privateUnread[userId]||0)+1;
 }
 updatePrivateBadge();
 renderPrivateInbox();
 if(state.privateTarget===userId) renderPrivateMessages();
}
function initPrivateWindowDrag(){
 const win=$('#privateChatWindow');
 const handle=$('#privateChatDragHandle');
 if(!win||!handle) return;

 let dragging=false,startX=0,startY=0,startLeft=0,startTop=0;

 handle.addEventListener('pointerdown',e=>{
   if(e.target.closest('button')||state.privateWindow.maximized) return;
   dragging=true;
   bringPrivateWindowFront();
   const rect=win.getBoundingClientRect();
   startX=e.clientX;startY=e.clientY;
   startLeft=rect.left;startTop=rect.top;
   handle.setPointerCapture(e.pointerId);
   win.classList.add('dragging');
   e.preventDefault();
 });
 handle.addEventListener('pointermove',e=>{
   if(!dragging) return;
   const maxLeft=Math.max(0,window.innerWidth-win.offsetWidth);
   const maxTop=Math.max(0,window.innerHeight-win.offsetHeight);
   const left=Math.min(maxLeft,Math.max(0,startLeft+e.clientX-startX));
   const top=Math.min(maxTop,Math.max(0,startTop+e.clientY-startY));
   win.style.left=left+'px';
   win.style.top=top+'px';
   win.style.right='auto';
   win.style.bottom='auto';
 });
 const stop=e=>{
   if(!dragging) return;
   dragging=false;
   win.classList.remove('dragging');
   try{handle.releasePointerCapture(e.pointerId)}catch(_){}
 };
 handle.addEventListener('pointerup',stop);
 handle.addEventListener('pointercancel',stop);
 win.addEventListener('pointerdown',bringPrivateWindowFront);
}

function member(action){
 const map={'إرسال الهدايا':'gifts','الرسائل الخاصة':'privateChat','المايك':'roomMic','الكاميرا':'roomCamera'};
 const key=map[action];
 if(!state.user){toast(action+' تحتاج تسجيل الدخول بحساب Google');open('loginModal');return false}
 if(key){
   const value=permissionValue(key);
   if(value===false||value==='off'){toast(action+' غير مسموحة لرتبتك');return false}
 }
 if(action==='إرسال الهدايا'&&!state.economyConfig.giftsEnabled){toast('الهدايا مغلقة من الإدارة');return false}
 if(action==='الرسائل الخاصة'&&!state.privateMessagesEnabled){toast('الرسائل الخاصة مغلقة من الإدارة');return false}
 return true
}
function setSideTab(tab){$$('.sideTabs button').forEach(b=>b.classList.toggle('active',b.dataset.sideTab===tab));$('#usersPanel').classList.toggle('hidden',tab!=='users');$('#roomsPanel').classList.toggle('hidden',tab!=='rooms')}
function renderRooms(){const q=$('#roomSearch').value.trim();$('#roomsList').innerHTML=state.rooms.filter(r=>r.name.includes(q)).map(r=>`<button class="roomItem ${r.id===state.room?'active':''}" data-room="${r.id}"><span class="roomIcon">${r.icon}</span><span><b>${esc(r.name)}</b><small>${'غرفة '+esc(r.name)}</small></span><span class="roomCount">${r.count}</span></button>`).join('');$$('[data-room]').forEach(b=>b.onclick=()=>switchRoom(b.dataset.room))}

function roomWelcomeMessage(roomId){
 const r=state.rooms.find(x=>x.id===roomId);
 return{
  type:'system',
  room:roomId,
  isRoomWelcome:true,
  text:`أهلاً بك في غرفة ${r?.name||'الدردشة'}. تبدأ الرسائل من لحظة دخولك ولا تظهر لك التعليقات القديمة.`,
  createdAt:Date.now()
 };
}
function clearRoomConversation(roomId){
 state.messages=state.messages.filter(m=>m.room!==roomId);
}
function pruneRoomConversation(roomId=state.room){
 const live=state.messages.filter(m=>m.room===roomId&&!m.isRoomWelcome);
 const overflow=live.length-RIVO_ROOM_MESSAGE_LIMIT;
 if(overflow<=0)return;
 const remove=new Set(live.slice(0,overflow));
 state.messages=state.messages.filter(m=>!remove.has(m));
}
function appendRoomMessage(message){
 const entry={...message,room:message.room||state.room,createdAt:message.createdAt||Date.now()};
 state.messages.push(entry);
 pruneRoomConversation(entry.room);
 try{window.RivoPersistRoomMessages?.(entry.room)}catch(_){}
 return entry;
}
function startFreshRoomConversation(roomId=state.room){
 clearRoomConversation(roomId);
 state.messages.push(roomWelcomeMessage(roomId));
 const input=$('#messageInput');
 if(input)input.value='';
}
function startFreshChatSession(){
 state.messages=[];
 state.activeNameGifts={};
 state.privateTarget=null;
 startFreshRoomConversation(state.room);
}
function logoutChat(){
 if(state.localStream){
  state.localStream.getTracks().forEach(track=>track.stop());
  state.localStream=null;
 }
 state.user=null;
 state.stage=[];
 state.messages=[];
 state.activeNameGifts={};
 state.privateTarget=null;
 state.target=null;
 state.inbox={messages:0,alerts:0};
 const input=$('#messageInput');
 if(input)input.value='';
 close('profileModal');
 close('roleGiftModal');
 close('freeBadgeModal');
 renderAll();
 renderPrivateInbox();
 updatePrivateBadge();
 showEntryScreen();
 toast('تم تسجيل الخروج ومسح رسائل الجلسة');
}

function switchRoom(id){
 const r=state.rooms.find(x=>x.id===id);
 if(!r)return;
 if(r.vipOnly&&(!state.user||!['vip','primo','moderator','owner'].includes(userAccessRole(state.user)))){
  toast('هذه الغرفة لأعضاء VIP فقط');
  showStore('vip');
  open('storeModal');
  return;
 }
 clearRoomConversation(state.room);
 // الانتقال بين الغرف لا يزيل الشارة؛ تبقى حتى تسجيل الخروج أو إغلاق الموقع.
 state.room=id;
 if(state.user)state.user.room=id;
 startFreshRoomConversation(id);
 renderAll();
 syncRadioForRoom();
 setSideTab('users');
 $('#messages').scrollTop=$('#messages').scrollHeight;
}

function isHiddenStaff(u){return Boolean(u?.isHidden)&&['owner','moderator'].includes(userAccessRole(u))}
function publicMessageUser(u){
 // وضع التخفي يزيل الإدارة أو المراقب من قائمة المتصلين فقط؛ الرسائل تبقى بهويته المختارة.
 return u;
}
function updateStaffVisibilityUI(){
 const button=$('#visibilityBtn');
 const identityButton=$('#ownerIdentityBtn');
 const staff=state.user&&['owner','moderator'].includes(userAccessRole(state.user));
 if(button){
  button.classList.toggle('hidden',!staff);
  if(staff){
   button.textContent=state.user.isHidden?'👁️ إظهار':'🫥 مخفي';
   button.title=state.user.isHidden?'إظهار الحساب في قائمة المستخدمين':'الاختفاء من قائمة المستخدمين مع استمرار الكتابة';
   button.classList.toggle('hiddenState',Boolean(state.user.isHidden));
  }
 }
 if(identityButton)identityButton.classList.toggle('hidden',userAccessRole(state.user||{})!=='owner');
}
function ownerIdentityCrownPreview(){
 return roleBadgeHtml({role:'owner',plan:'owner',authType:'owner'},'list');
}
function openOwnerIdentitySettings(){
 if(userAccessRole(state.user||{})!=='owner')return;
 const input=$('#ownerDisplayName'),only=$('#ownerCrownOnly'),preview=$('#ownerIdentityPreview');
 const current=String(state.user?.name??'');
 if(input)input.value=current;
 if(only)only.checked=!current.trim();
 if(input)input.disabled=Boolean(only?.checked);
 if(preview)preview.innerHTML=ownerIdentityCrownPreview();
 open('ownerIdentityModal');
 setTimeout(()=>{if(!only?.checked)input?.focus()},60);
}
function updateOwnerIdentityChoice(){
 const input=$('#ownerDisplayName'),only=$('#ownerCrownOnly');
 if(input)input.disabled=Boolean(only?.checked);
 if(!only?.checked)input?.focus();
}
function saveOwnerIdentity(){
 if(userAccessRole(state.user||{})!=='owner')return;
 const only=Boolean($('#ownerCrownOnly')?.checked);
 const typed=String($('#ownerDisplayName')?.value??'').trim().slice(0,20);
 state.user.name=only?'':(typed||'الإدارة');
 const listed=findUser(state.user.id);if(listed)listed.name=state.user.name;
 persistCurrentUserProfile();
 close('ownerIdentityModal');
 renderAll();
 toast(only?'تم اعتماد التاج وحده من دون اسم':'تم تغيير اسم الإدارة إلى '+state.user.name);
}
function toggleMyVisibility(){
 if(!state.user||!['owner','moderator'].includes(userAccessRole(state.user)))return;
 state.user.isHidden=!state.user.isHidden;const listed=findUser(state.user.id);if(listed)listed.isHidden=state.user.isHidden;
 const cfg=readAdminConfig();if(cfg&&Array.isArray(cfg.users)){const saved=cfg.users.find(u=>u.id===state.user.id||u.moderatorTokenId===state.user.moderatorTokenId);if(saved)saved.isHidden=state.user.isHidden;if(state.user.moderatorTokenId&&Array.isArray(cfg.moderatorTokens)){const token=cfg.moderatorTokens.find(t=>t.id===state.user.moderatorTokenId);if(token)token.isHidden=state.user.isHidden}localStorage.setItem(RIVO_ADMIN_CONFIG_KEY,JSON.stringify(cfg))}
 notifyAdminLive('rivo-staff-visibility',{userId:state.user.id,hidden:state.user.isHidden});renderAll();toast(state.user.isHidden?'أنت الآن مخفي عن الزوار':'أنت الآن ظاهر للزوار');
}
function moderatorLogin(){
 const code=String($('#moderatorCodeInput')?.value||'').trim().toUpperCase();if(!code){toast('اكتب رمز المراقب');return}
 const cfg=readAdminConfig();const token=cfg?.moderatorTokens?.find(t=>String(t.code||'').toUpperCase()===code);if(!token){toast('رمز المراقب غير صحيح');return}
 if(!token.enabled){toast('هذا الرمز معطّل من الإدارة');return}if(Number(token.expiresAt||0)<=Date.now()){toast('انتهت مدة رمز المراقب');return}
 const savedUser=cfg.users?.find(u=>u.id===token.userId||u.moderatorTokenId===token.id)||{};
 state.user={id:token.userId,name:token.name,avatar:savedUser.avatar||'guest',room:savedUser.room||state.room,bio:'مراقب ريفو',authType:'moderator',moderatorTokenId:token.id,isHidden:Boolean(token.isHidden),coins:savedUser.coins||0,role:'moderator',plan:'moderator',vip:false,verified:false,giftValue:0,friends:0,level:1,status:'online'};
 restoreLocalProfile(state.user);
 const existing=state.users.find(u=>u.id===state.user.id);if(existing)Object.assign(existing,state.user);else state.users.unshift(state.user);
 startFreshChatSession();close('moderatorLoginModal');close('loginModal');hideEntryScreen();$('#moderatorCodeInput').value='';renderAll();notifyAdminLive('rivo-moderator-token-used',{tokenId:token.id,time:Date.now()});toast('تم الدخول كمراقب: '+token.name);
}

function usersInRoom(){let a=state.users.filter(u=>u.room===state.room&&!isHiddenStaff(u)&&!u.isHistoryOnly);if(state.user&&!isHiddenStaff(state.user)&&!a.some(u=>u.id===state.user.id))a=[state.user,...a];return a}
function renderUsers(){
 const q=$('#userSearch').value.trim();
 const a=sortUsersByHierarchy(usersInRoom().filter(u=>String(u.name||'').includes(q)));
 $('#userCount').textContent=a.length;
 $('#usersList').innerHTML=a.map(u=>`
  <div class="userItem highlightedUserItem" data-user="${u.id}">
   <div class="userMain">
    <img src="${av(u.avatar)}">
    <div class="userText userTextProminent">
     ${displayNameHtml(u,'list')}
     <small>${esc(u.bio)}</small>
    </div>
   </div>
  </div>`).join('');
 $$('[data-user]').forEach(x=>x.onclick=e=>{
  if(e.target.closest('.userMain img')){showProfile(x.dataset.user);return}
  showMenu(x.dataset.user,e);
 });
}
function renderMessages(){const a=state.messages.filter(m=>m.room===state.room);$('#messages').innerHTML=a.map(m=>{if(m.type==='system')return`<div class="msg system"><div class="msgStack"><div class="bubble"><span class="rivoAnimatedEmoji rivoEmojiMotion2">🔊</span> ${renderAnimatedEmojiText(m.text)}</div></div></div>`;if(m.type==='gift'){const realSender=findUser(m.sender),s=publicMessageUser(realSender),r=findUser(m.receiver);return`<div class="msg polishedMsg"><img src="${av(s?.avatar||'guest')}"><div class="msgStack"><div class="meta polishedMeta giftMeta">${displayNameHtml(s,'chat')}<time>${m.time||''}</time></div><div class="giftCard premiumGiftCard"><div class="giftGlow"></div><div class="miniGift">${m.icon}</div><div class="giftCardCopy"><b>${esc(readableUserName(s))} أرسل «${esc(m.gift)}» إلى ${esc(readableUserName(r))}</b><span class="giftCardSubline"><strong>${esc(readableUserName(r))}</strong> حصل على هدية تظهر قرب اسمه طوال وجوده</span></div></div></div></div>`}const realUser=findUser(m.user)||m.author,u=publicMessageUser(realUser);const safeText=renderAnimatedEmojiText(m.text);const emojiOnly=isEmojiOnlyMessage(m.text||'');return`<div class="msg polishedMsg"><img src="${av(u?.avatar||'guest')}"><div class="msgStack"><div class="meta polishedMeta prominentMeta">${displayNameHtml(u,'chat')}<time>${m.time||''}</time></div><div class="bubble polishedBubble ${emojiOnly?'emojiOnlyBubble':''}" style="color:${m.color||'#111827'}">${safeText}</div></div></div>`}).join('')}
function renderHeader(){
 const r=room(),u=state.user;
 const setText=(id,value)=>{const el=$(id);if(el)el.textContent=value};
 const setSrc=(id,value)=>{const el=$(id);if(el)el.src=value};
 setText('#roomTitle',r.name);
 setText('#roomCount',r.count);
 setText('#stageSummary',`${r.cams} كاميرات · ${r.mics} مايكات`);
 setText('#announcementText',r.announcement);
 const announcement=$('#announcement');
 if(announcement) announcement.classList.toggle('hidden',!r.announcementOn);
 setText('#headerName',isHiddenStaff(u)?'متخفي':u?.name||'زائر');
 setText('#headerStatus',u?(u.authType==='guest'?'ضيف':u.authType==='google'?'مسجل بحساب Google':'الإدارة'):'غير مسجل');const logoutBtn=$('#logoutBtn');if(logoutBtn)logoutBtn.classList.toggle('hidden',!u);
 setSrc('#headerAvatar',av(u?.avatar||'guest'));
 setSrc('#composerAvatar',av(u?.avatar||'guest'));
 setText('#walletCoins',u?.coins||0);
 setText('#giftCoins',u?.coins||0);
 const sideName=$('#sideName');
 if(sideName){
  if(userAccessRole(u||{})==='owner')sideName.innerHTML=displayNameHtml(u,'list');
  else sideName.textContent=isHiddenStaff(u)?'مخفي':u?.name||'زائر';
 }
 setText('#sideCoins',u?.coins||0);
 setSrc('#sideAvatar',av(u?.avatar||'guest'));
 const dmCount = state.inbox?.messages || 0;
 const notifCount = state.inbox?.alerts || 0;
 const dmBadge = $('#dmBadge');
 const notifBadge = $('#notifBadge');
 if(dmBadge){
   dmBadge.textContent = dmCount;
   dmBadge.classList.toggle('hidden', dmCount < 1);
   dmBadge.parentElement?.classList.toggle('hasUnread', dmCount > 0);
 }
 if(notifBadge){
   notifBadge.textContent = notifCount;
   notifBadge.classList.toggle('hidden', notifCount < 1);
   notifBadge.parentElement?.classList.toggle('hasUnread', notifCount > 0);
 }
 const cameraBtn=$('#cameraBtn'),micBtn=$('#micBtn');
 if(cameraBtn) cameraBtn.disabled=!r.camOn||r.cams===0;
 if(micBtn) micBtn.disabled=!r.micOn||r.mics===0;
 renderRadioUI();
}
function renderStage(){const r=room(),active=state.stage.filter(s=>findUser(s.user)?.room===state.room);let h='';for(let i=0;i<r.cams;i++){const s=active[i];if(!s){h+=`<div class="cameraSlot empty">خانة كاميرا ${i+1}</div>`;continue}const u=findUser(s.user);if(s.mode==='camera'&&s.user===state.user?.id&&state.localStream)h+=`<div class="cameraSlot"><video class="localFeed" autoplay muted playsinline></video><div class="caption"><b>${esc(u.name)}</b><span>📹 مباشر</span></div></div>`;else h+=`<div class="cameraSlot"><img class="avatarStage" src="${av(u.avatar)}"><div class="caption"><b>${esc(u.name)}</b><span>${s.mode==='avatar'?'شخصية متحركة':'🎙️ صوت فقط'}</span></div></div>`}if(r.cams===0)h='<div class="cameraSlot empty" style="grid-column:1/-1">الكاميرات مغلقة في هذه الغرفة</div>';$('#cameraGrid').style.gridTemplateColumns=`repeat(${Math.max(1,Math.min(4,r.cams||1))},minmax(0,1fr))`;$('#cameraGrid').innerHTML=h;const v=$('.localFeed');if(v&&state.localStream)v.srcObject=state.localStream;$('#micSeats').innerHTML=active.slice(0,r.mics).map(s=>{const u=findUser(s.user);return`<div class="micSeat ${s.speaking?'speaking':''}"><img src="${av(u.avatar)}"><b>${esc(u.name)}</b><span>${s.speaking?'🔊':'🎙️'}</span></div>`}).join('');renderStageAdmin();
 if($('#privateMicEnabled')) $('#privateMicEnabled').checked=state.privateMedia.mic;
 if($('#privateCameraEnabled')) $('#privateCameraEnabled').checked=state.privateMedia.camera;
 if($('#privateMediaPaidOnly')) $('#privateMediaPaidOnly').checked=state.privateMedia.paidOnly;
}
function renderStageAdmin(){const a=state.stage.filter(s=>findUser(s.user)?.room===state.room);$('#stageAdmin').innerHTML=a.length?a.map(s=>{const u=findUser(s.user);return`<div class="stageUser"><span>${esc(u.name)} — ${s.mode}</span><button data-kick="${u.id}">إنزال</button></div>`}).join(''):'<small>لا يوجد مستخدمون على المنصة.</small>';$$('[data-kick]').forEach(b=>b.onclick=()=>{state.stage=state.stage.filter(s=>s.user!==b.dataset.kick);renderStage();toast('تم إنزال المستخدم')})}
function renderAll(){renderRooms();renderUsers();renderMessages();renderHeader();renderStage();updateStaffVisibilityUI()}
function showMenu(id,e){state.target=id;const target=findUser(id);$('#menuName').textContent=readableUserName(target);const m=$('#userMenu');m.style.top=Math.min(innerHeight-300,e.clientY)+'px';m.style.left=Math.max(10,e.clientX-235)+'px';m.classList.remove('hidden')}
function showProfile(id){
 const u=findUser(id);if(!u)return;
 state.target=id;
 $('#profileAvatar').src=av(u.avatar);$('#profileName').textContent=readableUserName(u);$('#profileBadges').innerHTML=`${verifiedBadgeHtml(u,'list')}${giftBadgeHtml(u,'list')}${roleBadgeHtml(u,'list')}`;$('#profileBio').textContent=u.bio;$('#profileGiftValue').textContent=u.giftValue;$('#profileFriends').textContent=u.friends;$('#profileLevel').textContent=u.level;
 const mine=Boolean(state.user&&state.user.id===id);
 const editBtn=$('#profileAvatarEdit');if(editBtn)editBtn.classList.toggle('hidden',!mine);
 const coinBtn=$('#profileCoins');if(coinBtn)coinBtn.classList.toggle('hidden',mine);
 open('profileModal');
}
function openCoinTransferFor(userId=state.target){
 if(!member('تحويل العملات'))return;
 const u=findUser(userId);
 if(!u||u.id===state.user?.id){toast('اختر مستخدماً آخر');return}
 state.target=u.id;
 $('#coinTarget').textContent=readableUserName(u);
 $('#coinAmount').value='10';
 close('profileModal');
 open('coinModal');
}
function openGifts(id){if(!member('إرسال الهدايا'))return;state.target=id;const u=findUser(id),catalog=availableGiftCatalogForSender();$('#giftTarget').textContent=u.name;$('#giftCoins').textContent=state.user.coins;$('#giftCatalog').innerHTML=catalog.map(g=>`<div class="giftItem ${g.exclusive?'exclusiveGiftItem '+g.exclusiveRole:''}"><span class="giftIcon">${g.icon}</span><b>${g.name}</b>${g.exclusive?`<em>حصري ${roleGiftLabel(g.exclusiveRole)}</em>`:''}<small>${g.price>0?g.price+' 🪙':'مجانية للمراقب'}</small><button data-gift="${g.id}">إرسال</button></div>`).join('');$$('[data-gift]').forEach(b=>b.onclick=()=>sendGift(b.dataset.gift));open('giftModal')}
function findSendableGift(id){
 return availableGiftCatalogForSender().find(x=>x.id===id)||null;
}
function sendGift(id){const g=findSendableGift(id),r=findUser(state.target),s=state.user;if(!g||!r||!s)return;if(g.exclusive&&g.exclusiveRole!==roleGiftKey(s)){toast('هذه الهدية غير متاحة لرتبتك');return}if(s.coins<g.price){toast('رصيدك غير كافٍ');return}s.coins-=g.price;r.giftValue+=g.price;setActiveNameGift(r.id,g,'received');appendRoomMessage({type:'gift',room:state.room,sender:s.id,receiver:r.id,gift:g.name,icon:g.icon,price:g.price,time:new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})});
 if(state.user&&r.id===state.user.id){state.inbox.alerts+=1}
 close('giftModal');renderAll();$('#giftVisual').textContent=g.icon;$('#giftSender').textContent=s.name;$('#giftReceiver').textContent=r.name;$('#giftName').textContent=g.name;$('#giftOverlay').classList.remove('hidden');createGiftParticles(g.level,g.icon);giftSound(g.level);setTimeout(()=>{$('#giftOverlay').classList.add('hidden');$('#giftOverlay .giftParticles')?.remove()},5000)}

function createGiftParticles(level=1,icon='❤️'){
 const overlay=$('#giftOverlay');
 overlay.querySelector('.giftParticles')?.remove();
 const wrap=document.createElement('div');wrap.className='giftParticles';
 const symbols=[icon,icon,'✨','💫','💖','💜'];
 const amount=Math.min(42,16+level*4);
 for(let i=0;i<amount;i++){
  const p=document.createElement('i');
  p.textContent=symbols[i%symbols.length];
  p.style.setProperty('--x',(Math.random()*100)+'vw');
  p.style.setProperty('--d',(1.9+Math.random()*2.4)+'s');
  p.style.setProperty('--delay',(Math.random()*.8)+'s');
  p.style.setProperty('--size',(18+Math.random()*28)+'px');
  wrap.appendChild(p);
 }
 overlay.appendChild(wrap);
}

function giftSound(level){
  try{
    const c=new(window.AudioContext||window.webkitAudioContext)(), n=c.currentTime;
    const notes=[523.25,659.25,783.99,1046.5,1318.5];
    notes.forEach((f,i)=>{
      const o=c.createOscillator(), g=c.createGain();
      o.type=i<2?'triangle':'sine';
      o.frequency.value=f*(1+level*0.01);
      g.gain.setValueAtTime(0.0001,n+i*0.11);
      g.gain.exponentialRampToValueAtTime(0.16,n+i*0.11+0.025);
      g.gain.exponentialRampToValueAtTime(0.0001,n+i*0.11+0.35);
      o.connect(g).connect(c.destination);
      o.start(n+i*0.11);
      o.stop(n+i*0.11+0.38);
    });
  }catch(e){}
}
function sendMessage(){
 updateColorUI();
 const input=$('#messageInput');
 const t=replaceMessageShortcuts(input?.value||'').trim();
 if(!t)return;
 if(permissionValue('publicMessages')===false){toast('الكتابة غير مسموحة لرتبتك');return}
 if(state.user?.status==='muted'){toast('الإدارة قامت بكتم حسابك');return}
 if(t.length>state.adminFeatures.maxMessageLength){toast('الرسالة أطول من الحد الذي حددته الإدارة');return}
if(!state.user){open('loginModal');return}appendRoomMessage({room:state.room,user:state.user.id,text:t,color:state.color,time:new Date().toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'}),createdAt:Date.now()});if(input)input.value='';$('#emojiPicker')?.classList.add('hidden');renderMessages();$('#messages').scrollTop=$('#messages').scrollHeight}

function entryAvatarNames(){return['guest','ahmed','samar','ali','noor','mira']}
function currentEntryAvatarOptions(){return normalizeEntryAvatarOptions(state.entryAvatarOptions)}
function renderEntryAvatarChoices(){
 const wrap=$('#entryAvatarPickerGrid');
 state.entryAvatarOptions=currentEntryAvatarOptions();
 state.entryAvatar=normalizeEntryAvatarSelection(state.entryAvatar,state.entryAvatarOptions);
 if(wrap){
  wrap.innerHTML=state.entryAvatarOptions.map(item=>`<button type="button" class="entryAvatarPickerOption" data-picker-avatar="${item.id}" aria-label="${esc(item.alt)}"><img src="${av(item.src)}" alt="${esc(item.alt)}" title="${esc(item.title||item.alt)}" loading="lazy" decoding="async"><span>${esc(item.title||item.alt)}</span></button>`).join('');
  $$('[data-picker-avatar]',wrap).forEach(button=>button.onclick=()=>{
   const selected=button.dataset.pickerAvatar;
   if(avatarPickerMode==='profile'&&state.user){
    state.user.avatar=selected;
    const listed=findUser(state.user.id);if(listed)listed.avatar=selected;
    applyAvatarInstantly(state.user.id,selected);
    persistCurrentUserProfile();
    renderAll();
    close('entryAvatarPickerModal');
    toast('تم تغيير الصورة من صور الدردشة المعتمدة');
    return;
   }
   state.entryAvatar=selected;
   updateEntryAvatarUI();
   close('entryAvatarPickerModal');
   toast('تم اختيار الصورة الشخصية');
  });
 }
 updateEntryAvatarUI();
}
function openEntryAvatarPicker(mode='entry'){
 avatarPickerMode=mode==='profile'?'profile':'entry';
 const modal=$('#entryAvatarPickerModal');
 const title=modal?.querySelector('h2');
 const note=modal?.querySelector('p');
 if(title)title.textContent=avatarPickerMode==='profile'?'تغيير الصورة الشخصية':'اختيار صورة شخصية';
 if(note)note.textContent='اختر صورة من الصور التي أضافتها الإدارة. لا يمكن رفع صور من الجهاز.';
 renderEntryAvatarChoices();
 open('entryAvatarPickerModal');
}

function updateEntryAvatarUI(){const preview=$('#entryAvatarPreview');const selected=findEntryAvatarOption(state.entryAvatar,state.entryAvatarOptions)||state.entryAvatarOptions?.[0]||defaultEntryAvatars[0];state.entryAvatar=selected?.id||defaultEntryAvatars[0].id;if(preview){preview.src=av(selected?.src||'guest');preview.alt=selected?.alt||'معاينة الصورة الشخصية المختارة'}$$('[data-picker-avatar]').forEach(b=>b.classList.toggle('selected',b.dataset.pickerAvatar===state.entryAvatar))}
function showEntryError(message=''){const box=$('#entryError');if(!box)return;box.textContent=message;box.classList.toggle('hidden',!message)}
function showEntryScreen(){const screen=$('#entryScreen');if(screen)screen.classList.remove('hidden');document.body.classList.add('entryLocked');showEntryError('');setTimeout(()=>$('#entryName')?.focus(),80)}
function hideEntryScreen(){const screen=$('#entryScreen');if(screen)screen.classList.add('hidden');document.body.classList.remove('entryLocked');showEntryError('')}
function initEntryScreen(){if(new URLSearchParams(location.search).has('adminPreview')){hideEntryScreen();return}renderEntryAvatarChoices();showEntryScreen()}
function validateEntryProfile(){const name=String($('#entryName')?.value||'').trim();if(name.length<2){showEntryError('اكتب اسماً من حرفين على الأقل.');$('#entryName')?.focus();return null}return{name,avatar:normalizeEntryAvatarSelection(state.entryAvatar,currentEntryAvatarOptions())}}
function enterFromEntry(type){const profile=validateEntryProfile();if(!profile)return;if(type==='guest'&&state.adminFeatures.guestEntry===false){showEntryError('دخول الضيف مغلق من الإدارة.');return}updateColorUI();if(type==='google'){state.user={id:'googleLocal',name:profile.name,avatar:profile.avatar,room:state.room,bio:'مسجل بحساب Google',authType:'google',coins:50,role:'user',plan:'user',vip:false,verified:true,giftValue:0,friends:0,level:1};restoreLocalMembership(state.user);persistCurrentUserProfile()}else state.user={id:'guestLocal',name:profile.name,avatar:profile.avatar,room:state.room,bio:'ضيف',authType:'guest',coins:0,role:'guest',plan:'guest',vip:false,verified:false,giftValue:0,friends:0,level:1};startFreshChatSession();hideEntryScreen();renderAll();toast(type==='google'?'تم التسجيل والدخول بحساب Google التجريبي':'تم الدخول كضيف')}
function googleLogin(){
 updateColorUI();
 state.user={
  id:'googleLocal',
  name:'مستخدم Google',
  avatar:'ahmed',
  room:state.room,
  bio:'مسجل بحساب Google',
  authType:'google',
  coins:50,
  role:'user',
  plan:'user',
  vip:false,
  verified:true,
  giftValue:0,
  friends:0,
  level:1
 };
 restoreLocalProfile(state.user);
 restoreLocalMembership(state.user);
 startFreshChatSession();
 close('loginModal');hideEntryScreen();
 renderAll();
 toast('تم الدخول كمستخدم مسجل بحساب Google');
}
function ownerLogin(){
 updateColorUI();
 state.user={
  id:'demoUser',
  name:'الإدارة',
  avatar:'owner',
  room:state.room,
  bio:'مالك ريفو',
  authType:'owner',
  coins:1200,
  role:'owner',
  plan:'owner',
  isHidden:Boolean(readAdminConfig()?.users?.find(u=>u.id==='owner')?.isHidden),
  vip:true,
  verified:false,
  giftValue:350,
  friends:73,
  level:15
 };
 restoreLocalProfile(state.user);
 startFreshChatSession();
 close('loginModal');hideEntryScreen();
 renderAll();
 const pending=state.pendingFreeBadgeTarget;
 state.pendingFreeBadgeTarget=null;
 if(pending){
  toast('تم دخول الإدارة — اختر الشارة الآن');
  setTimeout(()=>openFreeBadgePanel(pending),60);
 }else{
  toast('تم دخول الإدارة التجريبي');
 }
}
function guestLogin(){
 if(state.adminFeatures.guestEntry===false){
  toast('دخول الضيف مغلق من الإدارة');
  return;
 }
 updateColorUI();
 const n=$('#guestName').value.trim();
 if(n.length<2){
  toast('اكتب اسماً من حرفين على الأقل');
  return;
 }
 state.user={
  id:'guestLocal',
  name:n,
  avatar:state.guestAvatar,
  room:state.room,
  bio:'ضيف',
  authType:'guest',
  coins:0,
  role:'guest',
  plan:'guest',
  vip:false,
  verified:false,
  giftValue:0,
  friends:0,
  level:1
 };
 restoreLocalProfile(state.user);
 startFreshChatSession();
 close('guestModal');hideEntryScreen();
 renderAll();
 toast('دخلت كضيف — تبدأ الدردشة من جديد');
}
async function joinCamera(){requestRoomCamera()}
function joinMic(){requestRoomMic()}
function leaveStage(){if(state.localStream){state.localStream.getTracks().forEach(t=>t.stop());state.localStream=null}state.stage=state.stage.filter(s=>s.user!==state.user?.id);renderStage()}
function toggleAvatar(){if(!member('الشخصية المتحركة'))return;const s=state.stage.find(x=>x.user===state.user.id);if(!s){joinMic();return}s.mode=s.mode==='avatar'?'audio':'avatar';renderStage();toast(s.mode==='avatar'?'تم إظهار الشخصية':'تم إخفاء الشخصية')}

const RIVO_LOCAL_MEMBERSHIP_KEY='rivoLocalMembershipV1';
function membershipExpiryText(value){
 if(!value)return'';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return'';
 return date.toLocaleDateString('ar-IQ',{year:'numeric',month:'long',day:'numeric'});
}
function saveLocalMembership(){
 if(!state.user)return;
 localStorage.setItem(RIVO_LOCAL_MEMBERSHIP_KEY,JSON.stringify({
  userId:state.user.id,
  plan:state.user.plan,
  expiresAt:state.user.membershipExpires||null
 }));
}
function restoreLocalMembership(user){
 if(!user||user.role==='owner'||user.role==='moderator')return user;
 try{
  const saved=JSON.parse(localStorage.getItem(RIVO_LOCAL_MEMBERSHIP_KEY)||'null');
  if(!saved||saved.userId!==user.id)return user;
  const expiry=Number(saved.expiresAt||0);
  if(!['plus','vip','primo'].includes(saved.plan)||!expiry||expiry<=Date.now()){
   localStorage.removeItem(RIVO_LOCAL_MEMBERSHIP_KEY);
   return user;
  }
  user.role='user';
  user.plan=saved.plan;
  user.vip=['vip','primo'].includes(saved.plan);
  user.membershipExpires=expiry;
 }catch(_){}
 return user;
}
function currentMembershipHtml(){
 if(!state.user)return'<div class="membershipCurrent none">سجّل الدخول أو ادخل كضيف لتجربة رمز العضوية.</div>';
 const role=userAccessRole(state.user);
 if(!['plus','vip','primo'].includes(role))return'<div class="membershipCurrent none">حسابك لا يملك عضوية مدفوعة حالياً.</div>';
 const plan=state.planConfig[role];
 return`<div class="membershipCurrent active">
  <span>${plan?.icon||'💎'}</span>
  <div><b>عضويتك الحالية: ${esc(plan?.label||role)}</b><small>${state.user.membershipExpires?'تنتهي في '+membershipExpiryText(state.user.membershipExpires):'مفعّلة'}</small></div>
 </div>`;
}
function normalizeAccessCode(value){return String(value||'').trim().toUpperCase()}
function activateMembershipCode(){
 if(!state.user){close('storeModal');open('loginModal');toast('سجّل الدخول أولاً');return}
 if(state.user.role==='owner'||state.user.role==='moderator'){toast('الإدارة والمراقب لا يحتاجان رمز اشتراك');return}
 const input=$('#membershipCodeInput');
 const code=normalizeAccessCode(input?.value);
 if(!code){toast('اكتب كلمة سر الاشتراك');input?.focus();return}
 const planKey=['plus','vip','primo'].find(key=>{
  const plan=state.planConfig[key];
  return plan?.enabled&&normalizeAccessCode(plan.accessCode)===code;
 });
 if(!planKey){toast('كلمة السر غير صحيحة أو الخطة مغلقة');return}
 const plan=state.planConfig[planKey];
 const expiresAt=Date.now()+Math.max(1,+plan.days||30)*86400000;
 state.user.role='user';
 state.user.plan=planKey;
 state.user.vip=['vip','primo'].includes(planKey);
 state.user.membershipExpires=expiresAt;
 const listed=findUser(state.user.id);
 if(listed){
  listed.role='user';listed.plan=planKey;listed.vip=state.user.vip;listed.membershipExpires=expiresAt;
 }
 saveLocalMembership();
 renderAll();
 showStore('vip');
 toast(`تم تفعيل ${plan.label} لمدة ${plan.days} يوم`);
}

function showStore(tab='coins'){
 $$('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 let h='';
 if(tab==='coins'){
  h=`<div class="storeGrid">${[100,250,600,1500,3500,8000].map((n,i)=>`<div class="package"><strong>${n} 🪙</strong><span>${i>1?'باقة مع مكافأة':'باقة ذهب'}</span></div>`).join('')}</div>`;
 }
 if(tab==='vip'){
  const plans=['plus','vip','primo'].filter(k=>state.planConfig[k]?.enabled);
  h=`${currentMembershipHtml()}
   <div class="storeGrid membershipStore">${plans.map(k=>{
    const p=state.planConfig[k];
    return`<div class="package membershipPackage ${k}">
      <strong>${p.icon} ${p.label}</strong>
      <span>${p.price} 🪙 / ${p.days} يوم</span>
      <small>تُحدد المزايا من لوحة الإدارة.</small>
    </div>`;
   }).join('')}</div>
   <div class="membershipCodeRedeem">
    <b>تفعيل العضوية بكلمة السر</b>
    <small>أدخل كلمة السر التي يمنحها لك مالك الدردشة.</small>
    <div>
      <input id="membershipCodeInput" autocomplete="off" placeholder="مثلاً: VIP-XXXXXX">
      <button id="membershipActivateBtn">تفعيل</button>
    </div>
   </div>`;
 }
 if(tab==='verify'){
  h='<div class="package" style="margin:16px 0"><strong>التوثيق الأزرق</strong><span>شارة توثيق خاصة بـRivo قرب الاسم والصورة.</span></div>';
 }
 $('#storeContent').innerHTML=h;
 if($('#membershipActivateBtn'))$('#membershipActivateBtn').onclick=activateMembershipCode;
 if($('#membershipCodeInput'))$('#membershipCodeInput').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();activateMembershipCode()}
 });
}
function initAdmin(){const r=room();$('#adminAnnouncement').value=r.announcement;$('#announcementEnabled').checked=r.announcementOn;$('#cameraLimit').value=r.cams;$('#cameraLimitText').textContent=r.cams;$('#micLimit').value=r.mics;$('#micLimitText').textContent=r.mics;$('#cameraEnabled').checked=r.camOn;$('#micEnabled').checked=r.micOn;$('#musicEnabled').checked=r.music;$('#avatarsEnabled').checked=r.avatars;$('#linaEnabled').checked=r.lina;renderStageAdmin();renderRoomCameraRequests();initRadioAdmin()}
function saveAnnouncement(){const txt=$('#adminAnnouncement').value.trim(),on=$('#announcementEnabled').checked;if($('#announcementScope').value==='all')state.rooms.forEach(r=>{r.announcement=txt;r.announcementOn=on});else{room().announcement=txt;room().announcementOn=on}renderHeader();toast('تم حفظ الإعلان')}
function applySettings(){const r=room();r.cams=+$(' #cameraLimit'.trim()).value;r.mics=+$('#micLimit').value;r.camOn=$('#cameraEnabled').checked;r.micOn=$('#micEnabled').checked;r.music=$('#musicEnabled').checked;r.avatars=$('#avatarsEnabled').checked;r.lina=$('#linaEnabled').checked;state.stage=state.stage.slice(0,Math.max(r.cams,r.mics));
 if($('#privateMicEnabled')) state.privateMedia.mic=$('#privateMicEnabled').checked;
 if($('#privateCameraEnabled')) state.privateMedia.camera=$('#privateCameraEnabled').checked;
 if($('#privateMediaPaidOnly')) state.privateMedia.paidOnly=$('#privateMediaPaidOnly').checked;
 if(!r.camOn||r.cams===0) closeAllRoomCameras();
 renderAll();updatePrivateMediaControls();renderRoomCameraRequests();toast('تم تطبيق إعدادات الغرفة والدردشة الخاصة')}

function normalizeColor(value){
 const v=String(value||'').trim();
 return /^#[0-9a-f]{6}$/i.test(v)?v:'#111827';
}
function updateColorUI(){
 state.color=normalizeColor(state.color);
 const input=$('#messageInput');
 const dot=$('#activeColorDot');
 if(input){
   input.style.color=state.color;
   input.style.caretColor=state.color;
 }
 if(dot) dot.style.background=state.color;
 $$('#colorGrid [data-color]').forEach(btn=>{
   btn.classList.toggle('selected',normalizeColor(btn.dataset.color)===state.color);
   btn.setAttribute('aria-pressed',normalizeColor(btn.dataset.color)===state.color?'true':'false');
 });
}
function chooseTextColor(color){
 state.color=normalizeColor(color);
 updateColorUI();
 $('#colorPicker')?.classList.add('hidden');
 $('#messageInput')?.focus();
 toast('تم تفعيل لون الخط');
}
function positionColorPicker(){
 const picker=$('#colorPicker'), button=$('#colorBtn');
 if(!picker||!button) return;
 const r=button.getBoundingClientRect();
 picker.style.left=Math.max(12,Math.min(window.innerWidth-picker.offsetWidth-12,r.left))+'px';
 picker.style.bottom=Math.max(74,window.innerHeight-r.top+8)+'px';
}

function initUI(){
 renderEmojiPicker();
 $('#colorGrid').innerHTML=colors.map(c=>`<button type="button" class="colorChoice" style="--choice-color:${c};background:${c}" data-color="${c}" title="اختيار هذا اللون" aria-label="لون ${c}"></button>`).join('');
 $$('#colorGrid [data-color]').forEach(b=>b.onclick=()=>chooseTextColor(b.dataset.color));
 updateColorUI();
 $('#avatarChoices').innerHTML=['guest','ahmed','samar','ali','noor','mira','lina','owner'].map(a=>`<button class="${a==='guest'?'selected':''}" data-avatar="${a}"><img src="${av(a)}"></button>`).join('');$$('[data-avatar]').forEach(b=>b.onclick=()=>{$$('[data-avatar]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.guestAvatar=b.dataset.avatar});
}
function bind(){
 $$('.sideTabs button').forEach(b=>b.onclick=()=>setSideTab(b.dataset.sideTab));
 if($('#logoutBtn'))$('#logoutBtn').onclick=e=>{e.stopPropagation();logoutChat()};
 if($('#accountBtn')) $('#accountBtn').onclick=()=>{if(!state.user){open('loginModal');return}if(roleGiftKey(state.user)){openRoleGiftPanel();return}showProfile(state.user.id)};
 if($('#dmMiniBtn')) $('#dmMiniBtn').onclick=(e)=>{e.stopPropagation();openPrivateInbox()};
 if($('#notifMiniBtn')) $('#notifMiniBtn').onclick=(e)=>{e.stopPropagation();toast('هذه أيقونة التنبيهات');clearInbox('alerts')};
 if($('#googleDemo')) $('#googleDemo').onclick=googleLogin;if($('#ownerDemo')) $('#ownerDemo').onclick=ownerLogin;if($('#ownerIdentityBtn'))$('#ownerIdentityBtn').onclick=e=>{e.stopPropagation();openOwnerIdentitySettings()};if($('#ownerIdentitySave'))$('#ownerIdentitySave').onclick=saveOwnerIdentity;if($('#ownerIdentityCancel'))$('#ownerIdentityCancel').onclick=()=>close('ownerIdentityModal');if($('#ownerCrownOnly'))$('#ownerCrownOnly').onchange=updateOwnerIdentityChoice;if($('#ownerDisplayName'))$('#ownerDisplayName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveOwnerIdentity()}});if($('#moderatorOpen'))$('#moderatorOpen').onclick=()=>{close('loginModal');open('moderatorLoginModal')};if($('#moderatorEnterBtn'))$('#moderatorEnterBtn').onclick=moderatorLogin;if($('#moderatorCodeInput'))$('#moderatorCodeInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();moderatorLogin()}});if($('#visibilityBtn'))$('#visibilityBtn').onclick=e=>{e.stopPropagation();toggleMyVisibility()};if($('#guestOpen')) $('#guestOpen').onclick=()=>{close('loginModal');open('guestModal')};if($('#guestEnter')) $('#guestEnter').onclick=guestLogin;
 $('#sendBtn').onclick=sendMessage;$('#messageInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});$('#emojiBtn').onclick=()=>$('#emojiPicker').classList.toggle('hidden');
 $('#colorBtn').onclick=()=>{
   const picker=$('#colorPicker');
   const opening=picker.classList.contains('hidden');
   picker.classList.toggle('hidden');
   if(opening){requestAnimationFrame(()=>{positionColorPicker();updateColorUI()})}
 };
 if($('#giftBtn')) $('#giftBtn').onclick=()=>{const u=usersInRoom().find(x=>x.id!==state.user?.id);if(u)openGifts(u.id)};
 $('#coinSend').onclick=()=>{if(!member('تحويل العملات'))return;const n=+$('#coinAmount').value,u=findUser(state.target);if(n<1||n>state.user.coins){toast('تحقق من الكمية والرصيد');return}state.user.coins-=n;u.coins+=n;appendRoomMessage({type:'system',room:state.room,text:`${state.user.name} أرسل ${n} عملة ذهبية إلى ${u.name}`});close('coinModal');renderAll();toast('تم تحويل الذهب')};
 $('#storeBtn').onclick=()=>{showStore('coins');open('storeModal')};$$('[data-tab]').forEach(b=>b.onclick=()=>showStore(b.dataset.tab)); if($('#cameraBtn')) $('#cameraBtn').onclick=joinCamera; if($('#micBtn')) $('#micBtn').onclick=joinMic; if($('#composerCameraBtn')) $('#composerCameraBtn').onclick=joinCamera; if($('#composerMicBtn')) $('#composerMicBtn').onclick=joinMic; if($('#leaveStage')) $('#leaveStage').onclick=leaveStage; if($('#avatarToggle')) $('#avatarToggle').onclick=toggleAvatar;
 if($('#soundBtn')) $('#soundBtn').onclick=()=>{document.body.classList.toggle('muted');$('#soundBtn').textContent=document.body.classList.contains('muted')?'🔇 صوت الغرفة':'🔊 صوت الغرفة';toast('تحكم صوت تجريبي')}; $('#radioBtn').onclick=toggleRadioListener;
 if($('#adminBtn')) $('#adminBtn').onclick=(e)=>{e.stopPropagation();if(!state.user){open('loginModal');return}showProfile(state.user.id)};$('#cameraLimit').oninput=e=>$('#cameraLimitText').textContent=e.target.value;$('#micLimit').oninput=e=>$('#micLimitText').textContent=e.target.value;$('#saveAnnouncement').onclick=saveAnnouncement;$('#applySettings').onclick=applySettings;

 loadRadioPreferences();armRadioAutoplayUnlock();initRadioVideoWindow();scheduleSavedRadioResume();
 if($('#musicVolume')) $('#musicVolume').oninput=async e=>{state.radioBroadcast.userMuted=Number(e.target.value)<=0;try{localStorage.setItem(RIVO_RADIO_VOLUME_KEY,String(e.target.value));localStorage.setItem(RIVO_RADIO_MUTED_KEY,state.radioBroadcast.userMuted?'1':'0')}catch(_){ }applyRadioVolume();if(Number(e.target.value)>0&&state.radioBroadcast.status==='playing'&&!radioMediaPlaying())await startRadioListener(false)};
 if($('#radioMuteBtn'))$('#radioMuteBtn').onclick=toggleRadioMute;
 if($('#adminRadioScope')) $('#adminRadioScope').onchange=updateRadioScopeAdmin;
 if($('#adminRadioType'))$('#adminRadioType').onchange=updateInlineRadioTypeUi;
 if($('#startRadioBroadcast')) $('#startRadioBroadcast').onclick=startRadioBroadcast;
 if($('#pauseRadioBroadcast')) $('#pauseRadioBroadcast').onclick=pauseRadioBroadcast;
 if($('#stopRadioBroadcast')) $('#stopRadioBroadcast').onclick=stopRadioBroadcast;
 if($('#globalRadioAudio')){$('#globalRadioAudio').autoplay=radioAutoPlayEnabled();$('#globalRadioAudio').onplay=()=>{state.radioBroadcast.listenerPlaying=true;radioAutoplayBlocked=false;renderRadioUI()};$('#globalRadioAudio').onpause=renderRadioUI;$('#globalRadioAudio').onvolumechange=renderRadioUI;$('#globalRadioAudio').onerror=()=>{state.radioBroadcast.listenerPlaying=false;renderRadioUI();toast('تعذر تشغيل رابط الصوت')}}
 if($('#radioExternalVideo')){$('#radioExternalVideo').onplay=()=>{state.radioBroadcast.listenerPlaying=true;renderRadioUI()};$('#radioExternalVideo').onpause=renderRadioUI;$('#radioExternalVideo').onvolumechange=renderRadioUI;$('#radioExternalVideo').onerror=()=>{state.radioBroadcast.listenerPlaying=false;renderRadioUI();toast('تعذر تشغيل رابط الفيديو')}}

 $('#roomSearch').oninput=renderRooms;$('#userSearch').oninput=renderUsers; if($('#hideAnnouncement')) $('#hideAnnouncement').onclick=()=>$('#announcement').classList.add('hidden');
 $('#userMenu').onclick=e=>{
 const actionButton=e.target.closest('[data-act]');
 const a=actionButton?.dataset.act;
 if(!a)return;
 if(a==='cancel'){ $('#userMenu').classList.add('hidden'); return; }
 $('#userMenu').classList.add('hidden');
 if(a==='profile') showProfile(state.target);
 if(a==='gift') openGifts(state.target);
 if(a==='dm') openPrivateChat(state.target);
 if(a==='report') toast('تم فتح نموذج إبلاغ تجريبي');
};

 if($('#entryAvatarPickerBtn'))$('#entryAvatarPickerBtn').onclick=()=>openEntryAvatarPicker('entry');
 if($('#entryGuestBtn'))$('#entryGuestBtn').onclick=()=>enterFromEntry('guest');
 if($('#entryGoogleBtn'))$('#entryGoogleBtn').onclick=()=>enterFromEntry('google');
 if($('#entryOwnerBtn'))$('#entryOwnerBtn').onclick=()=>ownerLogin();
 if($('#entryModeratorBtn'))$('#entryModeratorBtn').onclick=()=>open('moderatorLoginModal');
 if($('#entryName'))$('#entryName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();enterFromEntry('guest')}});

 $('#profileGift').onclick=()=>{close('profileModal');openGifts(state.target)};$('#profileDm').onclick=()=>{close('profileModal');openPrivateChat(state.target)};if($('#profileCoins'))$('#profileCoins').onclick=()=>openCoinTransferFor(state.target);if($('#profileAvatarEdit'))$('#profileAvatarEdit').onclick=()=>{close('profileModal');openEntryAvatarPicker('profile')};
 if($('#avatarEditorCancel'))$('#avatarEditorCancel').onclick=()=>{close('avatarEditorModal');resetAvatarEditor()};
 if($('#avatarEditorSave'))$('#avatarEditorSave').onclick=saveAvatarEditorImage;
 if($('#avatarUploadInput')){$('#avatarUploadInput').disabled=true;$('#avatarUploadInput').value='';}
 if($('#avatarZoomRange'))$('#avatarZoomRange').oninput=e=>{if(!avatarEditor.image)return;avatarEditor.scale=avatarEditor.minScale*((+e.target.value||100)/100);clampAvatarEditorOffsets();drawAvatarEditor()};
 const avatarCanvas=$('#avatarCropCanvas');
 if(avatarCanvas){
  avatarCanvas.addEventListener('mousedown',e=>{e.preventDefault();startAvatarEditorDrag(e.clientX,e.clientY)});
  avatarCanvas.addEventListener('touchstart',e=>{const t=e.touches?.[0];if(!t)return;startAvatarEditorDrag(t.clientX,t.clientY,t.identifier)},{passive:true});
 }
 window.addEventListener('mousemove',e=>moveAvatarEditorDrag(e.clientX,e.clientY));
 window.addEventListener('mouseup',stopAvatarEditorDrag);
 window.addEventListener('touchmove',e=>{if(!avatarEditor.dragging)return;const touch=[...e.touches].find(t=>avatarEditor.pointerId==null||t.identifier===avatarEditor.pointerId)||e.touches?.[0];if(!touch)return;moveAvatarEditorDrag(touch.clientX,touch.clientY)},{passive:true});
 window.addEventListener('touchend',stopAvatarEditorDrag);
 if($('#clearRoleGiftBtn'))$('#clearRoleGiftBtn').onclick=()=>{if(!state.user)return;clearActiveNameGift(state.user.id);renderAll();openRoleGiftPanel();toast('تمت إزالة الهدية من قرب اسمك')};
 if($('#removeFreeBadgeBtn'))$('#removeFreeBadgeBtn').onclick=removeFreeBadge;


 if($('#roomCameraCloseBtn')) $('#roomCameraCloseBtn').onclick=()=>stopRoomCamera(false);
 if($('#roomCameraMinimizeBtn')) $('#roomCameraMinimizeBtn').onclick=toggleRoomCameraMinimize;
 if($('#roomCameraMaximizeBtn')) $('#roomCameraMaximizeBtn').onclick=toggleRoomCameraMaximize;
 if($('#closeAllRoomCameras')) $('#closeAllRoomCameras').onclick=closeAllRoomCameras;

 if($('#closePrivateInbox')) $('#closePrivateInbox').onclick=closePrivateInbox;
 if($('#privateMessagesToggle')) $('#privateMessagesToggle').onchange=e=>setPrivateMessagesEnabled(e.target.checked);
 if($('#privateCloseBtn')) $('#privateCloseBtn').onclick=closePrivateChat;
 if($('#privateMinimizeBtn')) $('#privateMinimizeBtn').onclick=togglePrivateMinimize;
 if($('#privateMaximizeBtn')) $('#privateMaximizeBtn').onclick=togglePrivateMaximize;
 if($('#privateSendBtn')) $('#privateSendBtn').onclick=sendPrivateMessage;
 if($('#privateMessageInput')) $('#privateMessageInput').addEventListener('keydown',e=>{
   if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendPrivateMessage()}
 });
 if($('#privateMicBtn')) $('#privateMicBtn').onclick=()=>{
   if($('#privateMicBtn').dataset.locked==='1') toast($('#privateMicLabel').textContent);
   else toast('تشغيل المايك الخاص — نموذج تجريبي');
 };
 if($('#privateCameraBtn')) $('#privateCameraBtn').onclick=()=>{
   if($('#privateCameraBtn').dataset.locked==='1') toast($('#privateCameraLabel').textContent);
   else toast('تشغيل الكاميرا الخاصة — نموذج تجريبي');
 };

 $$('[data-close]').forEach(b=>b.onclick=()=>close(b.dataset.close));document.addEventListener('click',e=>{if(!e.target.closest('.userItem')&&!e.target.closest('#userMenu'))$('#userMenu').classList.add('hidden')});
}
migrateCachedAccountsV32();applyExternalAdminConfig(false);initUI();bind();renderAll();updateColorUI();drawAvatarEditor();initEntryScreen();renderPrivateInbox();updatePrivateBadge();initPrivateWindowDrag();initRoomCameraDrag();renderRoomCameraRequests();renderRadioUI();setSideTab('users');$('#messages').scrollTop=$('#messages').scrollHeight;

window.addEventListener('message',e=>handleAdminLiveMessage(e.data));
if(rivoSyncChannel)rivoSyncChannel.onmessage=e=>handleAdminLiveMessage(e.data);
window.addEventListener('storage',e=>{
 if(e.key===RIVO_ADMIN_CONFIG_KEY)refreshChatFromAdmin(null,false);
 if(e.key===RIVO_MIC_REQUESTS_KEY)handleAdminLiveMessage({type:'rivo-mic-requests',payload:readSharedMicRequests()});
 if(e.key===RIVO_CAMERA_REQUESTS_KEY)handleAdminLiveMessage({type:'rivo-camera-requests',payload:readSharedCameraRequests()});
});
notifyAdminLive('rivo-chat-ready',{room:state.room,preview:new URLSearchParams(location.search).has('adminPreview')});

// لا نمسح حالة الجلسة عند تحديث الصفحة؛ يعاد ربطها تلقائياً بعد الاتصال.

(function installAdminConversationStyle(){
 if(document.getElementById('rivoAdminConversationStyle'))return;
 const style=document.createElement('style');
 style.id='rivoAdminConversationStyle';
 style.textContent='.privateAdminAvatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#4f46e5,#2563eb);color:#fff;font-size:22px;box-shadow:0 6px 14px rgba(37,99,235,.22)}.adminConversation{border:1px solid #dbe5ff;background:#f6f8ff}';
 document.head.appendChild(style);
})();
