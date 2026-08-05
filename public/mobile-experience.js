/* Rivo v198 — mobile radio control + automatic audio preference */
(() => {
  'use strict';

  const BREAKPOINT = 820;
  const $ = (selector, root = document) => root.querySelector(selector);
  const isMobile = () => window.matchMedia(`(max-width:${BREAKPOINT}px)`).matches;

  let pendingEntryType = '';
  let entryBusy = false;
  let logoutBusy = false;
  let pageLockInstalled = false;
  let lastChatLocked = false;
  let mobileRadioPopupOpen = false;

  function entryVisible() {
    const screen = $('#entryScreen');
    return Boolean(screen && !screen.classList.contains('hidden'));
  }

  function chatVisible() {
    return isMobile() && !entryVisible() && !document.body.classList.contains('entryLocked');
  }

  function setViewport() {
    const vv = window.visualViewport;
    const height = Math.max(320, Math.round(vv?.height || window.innerHeight || 640));
    const top = Math.max(0, Math.round(vv?.offsetTop || 0));
    document.documentElement.style.setProperty('--rivo-app-height', `${height}px`);
    document.documentElement.style.setProperty('--rivo-visual-top', `${top}px`);
    const keyboardOpen = isMobile() && (window.innerHeight - height > 130);
    document.body.classList.toggle('rivoKeyboardOpen', keyboardOpen && chatVisible());
    syncShellMode();
  }

  function syncShellMode() {
    const locked = chatVisible();
    document.body.classList.toggle('rivoMobileUI', isMobile());
    document.documentElement.classList.toggle('rivoMobileChatLocked', locked);
    if (locked && (window.scrollX || window.scrollY)) window.scrollTo(0, 0);
    if (locked && !lastChatLocked) {
      window.setTimeout(() => {
        try { window.RivoRadio?.resume?.(); } catch {}
        syncMobileRadioDock();
      }, 120);
    }
    lastChatLocked = locked;
    if (!locked) closeMobileRadioPopup();
  }

  function installPageLock() {
    if (pageLockInstalled) return;
    pageLockInstalled = true;

    document.addEventListener('touchmove', (event) => {
      if (!document.documentElement.classList.contains('rivoMobileChatLocked')) return;
      const target = event.target instanceof Element ? event.target : null;
      const allowed = target?.closest('.messages,.scrollList,.entryScreen,.entryAvatarPickerGrid,.privateMessages,.radioVideoWindow,.card,input,textarea,select,button,a,[contenteditable="true"]');
      if (!allowed) event.preventDefault();
    }, { capture: true, passive: false });

    window.addEventListener('scroll', () => {
      if (document.documentElement.classList.contains('rivoMobileChatLocked') && (window.scrollX || window.scrollY)) {
        window.scrollTo(0, 0);
      }
    }, { passive: true });
  }

  function showEntryError(message) {
    if (typeof window.showEntryError === 'function') window.showEntryError(message);
    else {
      const box = $('#entryError');
      if (box) {
        box.textContent = message || '';
        box.classList.toggle('hidden', !message);
      }
    }
  }

  function validateEntry() {
    const name = String($('#entryName')?.value || '').trim();
    if (name.length < 2) {
      showEntryError('اكتب اسماً من حرفين على الأقل.');
      $('#entryName')?.focus({ preventScroll: true });
      return false;
    }
    const selectedRoom = $('#entryRoomList .entryRoomOption.selected,[data-entry-room][aria-checked="true"]');
    if (!selectedRoom && !(typeof state === 'object' && state?.room)) {
      showEntryError('اختر غرفة الدخول أولاً.');
      return false;
    }
    showEntryError('');
    return true;
  }

  function setEntryButtonsBusy(busy) {
    ['entryGuestBtn', 'entryGoogleBtn'].forEach((id) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.disabled = Boolean(busy);
      button.classList.toggle('isLoading', Boolean(busy));
    });
  }

  function openAvatarStep(type) {
    if (!isMobile() || entryBusy) return;
    if (!validateEntry()) return;
    try { window.RivoRadio?.primeFromGesture?.(); } catch {}
    pendingEntryType = type;
    document.body.classList.add('mobileAvatarEntryPending');
    const modal = $('#entryAvatarPickerModal');
    if (typeof window.openEntryAvatarPicker === 'function') window.openEntryAvatarPicker('entry');
    else modal?.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal?.classList.add('mobileAvatarEntryFlow');
      const title = modal?.querySelector('h2');
      const note = modal?.querySelector('p');
      if (title) title.textContent = type === 'google' ? 'اختر صورة حسابك' : 'اختر صورتك للدخول كضيف';
      if (note) note.textContent = type === 'google'
        ? 'بعد اختيار الصورة سيظهر تسجيل Google الآمن.'
        : 'اضغط على الصورة، ثم ستدخل الدردشة مباشرة.';
    });
  }

  function cancelAvatarStep() {
    pendingEntryType = '';
    entryBusy = false;
    setEntryButtonsBusy(false);
    document.body.classList.remove('mobileAvatarEntryPending');
    $('#entryAvatarPickerModal')?.classList.remove('mobileAvatarEntryFlow');
  }

  async function waitForEntryActions(timeout = 10000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (window.RivoEntryActions?.ready) return window.RivoEntryActions;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return null;
  }

  async function completeEntry(type) {
    if (!type || entryBusy) return;
    entryBusy = true;
    setEntryButtonsBusy(true);
    document.body.classList.remove('mobileAvatarEntryPending');
    $('#entryAvatarPickerModal')?.classList.add('hidden');
    $('#entryAvatarPickerModal')?.classList.remove('mobileAvatarEntryFlow');

    try {
      const actions = await waitForEntryActions();
      if (!actions) throw new Error('الدردشة لم تجهز بعد. انتظر لحظة ثم أعد المحاولة.');
      if (type === 'guest') {
        await actions.guest();
      } else {
        const opened = await Promise.resolve(actions.google());
        if (opened === false) throw new Error('تعذر فتح تسجيل Google. أعد المحاولة.');
      }
      window.setTimeout(() => {
        try { window.RivoRadio?.resume?.(); } catch {}
        syncMobileRadioDock();
      }, 140);
    } catch (error) {
      console.error('Rivo mobile entry failed', error);
      showEntryError(error?.message || 'تعذر الدخول الآن. أعد المحاولة.');
    } finally {
      pendingEntryType = '';
      entryBusy = false;
      setEntryButtonsBusy(false);
      window.setTimeout(() => {
        syncShellMode();
        setViewport();
      }, 100);
    }
  }

  function selectAvatarAndContinue(event) {
    if (!isMobile() || !pendingEntryType) return;
    const target = event.target instanceof Element ? event.target : null;
    const option = target?.closest('[data-picker-avatar]');
    if (!option) return;

    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();

    try { window.RivoRadio?.primeFromGesture?.(); } catch {}
    const avatarId = String(option.dataset.pickerAvatar || '').trim();
    if (avatarId && typeof state === 'object' && state) {
      state.entryAvatar = avatarId;
      try { window.updateEntryAvatarUI?.(); } catch {}
    }
    const type = pendingEntryType;
    window.setTimeout(() => completeEntry(type), 40);
  }

  function bindEntryFlow() {
    document.addEventListener('click', (event) => {
      if (!isMobile()) return;
      const button = event.target instanceof Element ? event.target.closest('#entryGuestBtn,#entryGoogleBtn') : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openAvatarStep(button.id === 'entryGoogleBtn' ? 'google' : 'guest');
    }, true);

    document.addEventListener('keydown', (event) => {
      if (!isMobile() || event.target?.id !== 'entryName' || event.key !== 'Enter') return;
      event.preventDefault();
      openAvatarStep('guest');
    }, true);

    document.addEventListener('pointerup', selectAvatarAndContinue, true);
    document.addEventListener('click', selectAvatarAndContinue, true);

    document.addEventListener('click', (event) => {
      const closeButton = event.target instanceof Element ? event.target.closest('[data-close="entryAvatarPickerModal"]') : null;
      if (closeButton) cancelAvatarStep();
    }, true);
  }

  function activateSideTab(name) {
    const tab = document.querySelector(`[data-side-tab="${name}"]`);
    if (tab && !tab.classList.contains('active')) tab.click();
  }

  function closeDrawer() {
    document.body.classList.remove('mobileSideOpen');
    $('.communitySide')?.setAttribute('aria-hidden', 'true');
  }

  function openDrawer(name) {
    if (!chatVisible()) return;
    const side = $('.communitySide');
    if (!side) return;
    activateSideTab(name);
    side.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mobileSideOpen');
  }

  function mobileRadioState(detail = null) {
    if (detail && typeof detail === 'object') return detail;
    try {
      const state = window.RivoRadio?.getState?.();
      if (state) return state;
    } catch {}
    const widget = $('#radioWidget');
    const volume = Number($('#musicVolume')?.value || 35);
    return {
      status: widget?.classList.contains('radioBroadcasting') ? 'playing' : 'stopped',
      available: !widget?.classList.contains('radioUnavailable'),
      playing: $('#radioBtn')?.textContent?.trim() === 'Ⅱ',
      muted: $('#radioMuteBtn')?.textContent?.includes('🔇') || volume <= 0,
      audible: widget?.classList.contains('radioSoundActive'),
      volume,
      title: String($('#radioTrack')?.textContent || 'راديو ريفو').trim(),
      blocked: false
    };
  }

  function closeMobileRadioPopup() {
    mobileRadioPopupOpen = false;
    $('#mobileRadioPopup')?.classList.add('hidden');
    $('#mobileRadioOpen')?.setAttribute('aria-expanded', 'false');
  }

  function toggleMobileRadioPopup(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try { window.RivoRadio?.primeFromGesture?.(); } catch {}
    mobileRadioPopupOpen = !mobileRadioPopupOpen;
    $('#mobileRadioPopup')?.classList.toggle('hidden', !mobileRadioPopupOpen);
    $('#mobileRadioOpen')?.setAttribute('aria-expanded', mobileRadioPopupOpen ? 'true' : 'false');
    syncMobileRadioDock();
  }

  function syncMobileRadioDock(detail = null) {
    const state = mobileRadioState(detail);
    const open = $('#mobileRadioOpen');
    const icon = $('#mobileRadioIcon');
    const title = $('#mobileRadioTitle');
    const status = $('#mobileRadioStatus');
    const mute = $('#mobileRadioMute');
    const play = $('#mobileRadioPlay');
    const range = $('#mobileRadioVolume');
    const waves = $('#mobileRadioWaves');
    if (!open) return;

    const available = Boolean(state.available && state.status !== 'stopped');
    const muted = Boolean(state.muted || Number(state.volume || 0) <= 0);
    const audible = Boolean(state.audible && !muted);
    const playing = Boolean(state.playing);

    open.classList.toggle('isLive', available);
    open.classList.toggle('isAudible', audible);
    open.classList.toggle('isMuted', muted);
    open.title = available ? (muted ? 'الراديو مكتوم' : 'التحكم بصوت الراديو') : 'لا يوجد بث الآن';
    if (icon) icon.textContent = muted ? '🔇' : '🔊';
    waves?.classList.toggle('active', audible);
    if (title) title.textContent = state.title || 'راديو ريفو';
    if (status) {
      status.textContent = !available ? 'لا يوجد بث الآن' :
        muted ? 'الصوت مكتوم عندك' :
        playing ? 'الصوت يعمل الآن' :
        state.blocked ? 'المتصفح ينتظر أول لمسة لتشغيل الصوت' : 'جاري تشغيل الصوت تلقائياً';
    }
    if (mute) {
      mute.textContent = muted ? '🔇 تشغيل الصوت' : '🔊 كتم الصوت';
      mute.disabled = !available;
    }
    if (play) {
      play.textContent = playing ? 'Ⅱ إيقاف عندي' : '▶ تشغيل عندي';
      play.disabled = !available;
    }
    if (range) {
      if (document.activeElement !== range) range.value = String(Math.max(0, Math.min(100, Number(state.volume ?? 35))));
      range.disabled = !available;
    }
  }

  function ensureMobileRadioControl() {
    const nav = $('#mobileChatNav');
    if (!nav) return;
    if (!$('#mobileRadioOpen')) {
      const button = document.createElement('button');
      button.id = 'mobileRadioOpen';
      button.type = 'button';
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span id="mobileRadioIcon">🔊</span><i id="mobileRadioWaves" class="mobileRadioWaves" aria-hidden="true"><em></em><em></em><em></em></i><b>الصوت</b>';
      nav.prepend(button);
      button.addEventListener('click', toggleMobileRadioPopup);
    }
    if (!$('#mobileRadioPopup')) {
      const popup = document.createElement('section');
      popup.id = 'mobileRadioPopup';
      popup.className = 'mobileRadioPopup hidden';
      popup.setAttribute('aria-label', 'التحكم بصوت راديو ريفو');
      popup.innerHTML = `
        <div class="mobileRadioPopupHead">
          <div><b id="mobileRadioTitle">راديو ريفو</b><small id="mobileRadioStatus">جاري تجهيز الصوت</small></div>
          <button id="mobileRadioPopupClose" type="button" aria-label="إغلاق">×</button>
        </div>
        <div class="mobileRadioPopupControls">
          <button id="mobileRadioMute" type="button">🔊 كتم الصوت</button>
          <button id="mobileRadioPlay" type="button">▶ تشغيل عندي</button>
        </div>
        <label class="mobileRadioVolumeLabel"><span>مستوى الصوت</span><input id="mobileRadioVolume" type="range" min="0" max="100" value="35"></label>`;
      document.body.appendChild(popup);
      $('#mobileRadioPopupClose')?.addEventListener('click', closeMobileRadioPopup);
      $('#mobileRadioMute')?.addEventListener('click', async (event) => {
        event.preventDefault();
        try { await window.RivoRadio?.toggleMute?.(); } catch {}
        syncMobileRadioDock();
      });
      $('#mobileRadioPlay')?.addEventListener('click', async (event) => {
        event.preventDefault();
        try { await window.RivoRadio?.toggle?.(); } catch {}
        syncMobileRadioDock();
      });
      $('#mobileRadioVolume')?.addEventListener('input', (event) => {
        try { window.RivoRadio?.setVolume?.(event.target.value); } catch {}
        syncMobileRadioDock();
      });
    }
    syncMobileRadioDock();
  }

  function ensureMobileChrome() {
    const topbar = $('.topbar');
    const side = $('.communitySide');
    if (!topbar || !side) return;

    if (!$('#mobileChatNav')) {
      const nav = document.createElement('div');
      nav.id = 'mobileChatNav';
      nav.className = 'mobileChatNav';
      nav.innerHTML = `
        <button id="mobileRoomsOpen" type="button"><span>🏠</span><b id="mobileRoomLabel">الغرفة</b></button>
        <button id="mobileUsersOpen" type="button"><span>👥</span><b id="mobileUsersLabel">0</b></button>`;
      topbar.appendChild(nav);
      $('#mobileRoomsOpen')?.addEventListener('click', () => openDrawer('rooms'));
      $('#mobileUsersOpen')?.addEventListener('click', () => openDrawer('users'));
    }
    ensureMobileRadioControl();

    if (!$('#mobileSideClose')) {
      const close = document.createElement('button');
      close.id = 'mobileSideClose';
      close.className = 'mobileSideClose';
      close.type = 'button';
      close.textContent = '×';
      close.setAttribute('aria-label', 'إغلاق القائمة');
      side.prepend(close);
      close.addEventListener('click', closeDrawer);
    }

    document.querySelectorAll('#mobileSideBackdrop,.mobileSideBackdrop').forEach((node) => node.remove());
    side.setAttribute('aria-hidden', isMobile() ? 'true' : 'false');
  }

  function syncLabels() {
    const room = String($('#roomTitle')?.textContent || 'الغرفة').trim();
    const count = String($('#userCount')?.textContent || $('#roomCount')?.textContent || '0').trim();
    if ($('#mobileRoomLabel')) $('#mobileRoomLabel').textContent = room;
    if ($('#mobileUsersLabel')) $('#mobileUsersLabel').textContent = count;
  }

  async function logoutMobile(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    if (logoutBusy) return;
    logoutBusy = true;
    closeDrawer();

    try {
      const handler = window.RivoLive?.logout || window.logoutChat;
      if (typeof handler === 'function') await Promise.resolve(handler(false));
    } catch (error) {
      console.error('Rivo logout failed', error);
    } finally {
      document.querySelectorAll('.modal').forEach((node) => node.classList.add('hidden'));
      const screen = $('#entryScreen');
      screen?.classList.remove('hidden');
      screen?.removeAttribute('aria-hidden');
      document.body.classList.add('entryLocked');
      document.body.classList.remove('mobileSideOpen', 'rivoKeyboardOpen');
      document.documentElement.classList.remove('rivoMobileChatLocked');
      window.scrollTo(0, 0);
      logoutBusy = false;
      setViewport();
    }
  }

  function bindDrawerAndLogout() {
    document.addEventListener('click', (event) => {
      if (!isMobile()) return;
      const target = event.target instanceof Element ? event.target : null;
      const roomButton = target?.closest('#roomsList [data-room]');
      if (roomButton) {
        const roomId = String(roomButton.dataset.room || '');
        if (roomId && typeof window.switchRoom === 'function') {
          event.preventDefault();
          window.switchRoom(roomId);
          try { localStorage.setItem('rivoEntryRoomChoiceV1', roomId); } catch {}
          window.setTimeout(() => { closeDrawer(); syncLabels(); }, 60);
        }
        return;
      }
      if (target?.closest('#logoutBtn')) logoutMobile(event);
    }, true);

    window.addEventListener('rivo-room-switched', () => window.setTimeout(() => { closeDrawer(); syncLabels(); }, 40));
    window.addEventListener('rivo-chat-logged-out', () => {
      closeDrawer();
      syncShellMode();
      setViewport();
    });
  }

  function observeUi() {
    const observer = new MutationObserver(() => {
      syncShellMode();
      syncLabels();
      window.setTimeout(setViewport, 20);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const entry = $('#entryScreen');
    if (entry) observer.observe(entry, { attributes: true, attributeFilter: ['class'] });
    ['roomTitle', 'userCount', 'roomCount'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node, { childList: true, subtree: true, characterData: true });
    });
  }

  function apply() {
    ensureMobileChrome();
    if (!isMobile()) closeDrawer();
    syncLabels();
    setViewport();
    syncShellMode();
  }

  function init() {
    installPageLock();
    ensureMobileChrome();
    bindEntryFlow();
    bindDrawerAndLogout();
    observeUi();
    apply();

    window.addEventListener('rivo-radio-ui', (event) => syncMobileRadioDock(event?.detail || null));
    document.addEventListener('click', (event) => {
      if (!mobileRadioPopupOpen) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('#mobileRadioPopup,#mobileRadioOpen')) closeMobileRadioPopup();
    }, true);

    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(apply, 120), { passive: true });
    window.addEventListener('pageshow', apply, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setViewport, { passive: true });
      window.visualViewport.addEventListener('scroll', setViewport, { passive: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

/* =========================================================
   Rivo v208 — mobile latest-message follow + room presence bar
   UI-only patch. Does not touch WebSocket, login, radio or admin logic.
   ========================================================= */
(() => {
  'use strict';

  const BREAKPOINT = 820;
  const isMobile = () => window.matchMedia(`(max-width:${BREAKPOINT}px)`).matches;
  const byId = (id) => document.getElementById(id);
  let presenceRenderQueued = false;
  let messageFollowEnabled = true;
  let messageObserver = null;
  let usersObserver = null;
  let lastObservedMessages = null;

  function accessRole(user = {}) {
    if (user.role === 'owner') return 'owner';
    if (user.role === 'moderator') return 'moderator';
    if (user.role === 'guest' || user.authType === 'guest') return 'guest';
    if (['primo', 'vip', 'plus'].includes(user.plan)) return user.plan;
    return user.vip ? 'vip' : 'user';
  }

  function roleRank(user = {}) {
    return ({ owner: 0, moderator: 1, primo: 2, vip: 3, plus: 4, user: 5, guest: 6 })[accessRole(user)] ?? 5;
  }

  function roleMark(user = {}) {
    return ({ owner: '👑', moderator: '⭐', primo: '🔷', vip: '💎', plus: '➕', guest: '•' })[accessRole(user)] || '';
  }

  function currentRoomUsers() {
    let users = [];
    try {
      if (typeof usersInRoom === 'function') users = usersInRoom() || [];
      else if (typeof state !== 'undefined' && state && Array.isArray(state.users)) {
        const roomId = state.room;
        users = state.users.filter((user) => user && user.room === roomId && !user.isHistoryOnly && !user.isHidden);
        const self = state.user;
        if (self && self.room === roomId && !users.some((user) => user.id === self.id)) users.unshift(self);
      }
    } catch {}

    const unique = [];
    const seen = new Set();
    users.forEach((user, index) => {
      if (!user) return;
      const key = String(user.id || `${user.name || 'user'}-${index}`);
      if (seen.has(key)) return;
      seen.add(key);
      unique.push({ user, index });
    });

    return unique.sort((a, b) => {
      const rank = roleRank(a.user) - roleRank(b.user);
      if (rank) return rank;
      const priority = (Number(b.user.priority) || 0) - (Number(a.user.priority) || 0);
      return priority || a.index - b.index;
    }).map((item) => item.user);
  }

  function avatarSource(user = {}) {
    try {
      if (typeof av === 'function') return av(user.avatar || 'guest');
    } catch {}
    return String(user.avatar || 'assets/avatars/guest.svg');
  }

  function ensurePresenceBar() {
    const header = document.querySelector('.roomTop');
    if (!header) return null;
    let bar = byId('mobileRoomPresence');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'mobileRoomPresence';
      bar.className = 'mobileRoomPresence';
      bar.setAttribute('aria-label', 'اسم الغرفة والمستخدمون المتصلون');
      header.appendChild(bar);
    }
    return bar;
  }

  function renderPresenceBar() {
    presenceRenderQueued = false;
    const bar = ensurePresenceBar();
    if (!bar) return;
    if (!isMobile()) {
      bar.replaceChildren();
      return;
    }

    const roomName = String(byId('roomTitle')?.textContent || 'الغرفة').trim();
    const users = currentRoomUsers();
    const fragment = document.createDocumentFragment();

    const roomButton = document.createElement('button');
    roomButton.type = 'button';
    roomButton.className = 'mobilePresenceRoom';
    roomButton.title = 'فتح قائمة الغرف';
    roomButton.innerHTML = `<span aria-hidden="true">🏠</span><b></b><small>${users.length}</small>`;
    roomButton.querySelector('b').textContent = roomName;
    roomButton.addEventListener('click', () => byId('mobileRoomsOpen')?.click());
    fragment.appendChild(roomButton);

    users.forEach((user) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mobilePresenceUser mobilePresenceRole-${accessRole(user)}`;
      button.dataset.mobilePresenceUser = String(user.id || '');
      button.title = String(user.name || (accessRole(user) === 'owner' ? 'الإدارة' : 'مستخدم'));

      const image = document.createElement('img');
      image.src = avatarSource(user);
      image.alt = '';
      image.loading = 'eager';

      const copy = document.createElement('span');
      const name = document.createElement('b');
      name.textContent = String(user.name || (accessRole(user) === 'owner' ? 'الإدارة' : 'مستخدم'));
      const mark = document.createElement('small');
      mark.textContent = roleMark(user);
      copy.append(name, mark);
      button.append(image, copy);

      button.addEventListener('click', () => {
        const id = String(user.id || '');
        try {
          if (id && typeof showProfile === 'function') {
            showProfile(id);
            return;
          }
        } catch {}
        byId('mobileUsersOpen')?.click();
      });
      fragment.appendChild(button);
    });

    if (!users.length) {
      const empty = document.createElement('span');
      empty.className = 'mobilePresenceEmpty';
      empty.textContent = 'بانتظار ظهور المستخدمين…';
      fragment.appendChild(empty);
    }

    bar.replaceChildren(fragment);
  }

  function queuePresenceRender() {
    if (presenceRenderQueued) return;
    presenceRenderQueued = true;
    requestAnimationFrame(renderPresenceBar);
  }

  function measureComposer() {
    const composer = document.querySelector('.composerDock');
    if (!composer || !isMobile()) return;
    const height = Math.max(82, Math.ceil(composer.getBoundingClientRect().height || composer.offsetHeight || 92));
    document.documentElement.style.setProperty('--rivo-composer-height', `${height}px`);
  }

  function nearMessagesBottom(messages) {
    if (!messages) return true;
    return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 150;
  }

  function scrollMessagesToBottom(force = false) {
    const messages = byId('messages');
    if (!messages || !isMobile()) return;
    if (!force && !messageFollowEnabled) return;
    const perform = () => {
      messages.scrollTop = messages.scrollHeight;
      const last = messages.lastElementChild;
      try { last?.scrollIntoView({ block: 'end', inline: 'nearest' }); } catch {}
      messages.scrollTop = messages.scrollHeight;
    };
    requestAnimationFrame(() => {
      perform();
      requestAnimationFrame(perform);
      setTimeout(perform, 90);
      setTimeout(perform, 260);
    });
  }

  function bindMessages() {
    const messages = byId('messages');
    if (!messages || messages === lastObservedMessages) return;
    lastObservedMessages = messages;
    messageObserver?.disconnect();
    messageFollowEnabled = true;

    messages.addEventListener('scroll', () => {
      messageFollowEnabled = nearMessagesBottom(messages);
    }, { passive: true });

    messageObserver = new MutationObserver(() => {
      if (messageFollowEnabled || nearMessagesBottom(messages)) scrollMessagesToBottom(false);
    });
    messageObserver.observe(messages, { childList: true, subtree: true });
    scrollMessagesToBottom(true);
  }

  function bindUserRefresh() {
    const usersList = byId('usersList');
    if (!usersList || usersObserver) return;
    usersObserver = new MutationObserver(queuePresenceRender);
    usersObserver.observe(usersList, { childList: true, subtree: true, characterData: true });
  }

  function applyMobileChatFixes(forceBottom = false) {
    ensurePresenceBar();
    bindMessages();
    bindUserRefresh();
    measureComposer();
    queuePresenceRender();
    if (forceBottom) scrollMessagesToBottom(true);
  }

  function init() {
    applyMobileChatFixes(true);

    window.addEventListener('rivo-room-switched', () => {
      messageFollowEnabled = true;
      setTimeout(() => applyMobileChatFixes(true), 40);
    });
    window.addEventListener('pageshow', () => setTimeout(() => applyMobileChatFixes(true), 30), { passive: true });
    window.addEventListener('resize', () => setTimeout(() => {
      measureComposer();
      if (messageFollowEnabled) scrollMessagesToBottom(false);
      queuePresenceRender();
    }, 40), { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(() => applyMobileChatFixes(true), 180), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) setTimeout(() => applyMobileChatFixes(true), 60);
    });
    byId('messageInput')?.addEventListener('focus', () => {
      messageFollowEnabled = true;
      setTimeout(() => scrollMessagesToBottom(true), 120);
    });
    byId('sendBtn')?.addEventListener('click', () => {
      messageFollowEnabled = true;
      setTimeout(() => scrollMessagesToBottom(true), 30);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => setTimeout(() => {
        measureComposer();
        if (messageFollowEnabled) scrollMessagesToBottom(false);
      }, 45), { passive: true });
    }

    const bodyObserver = new MutationObserver(() => applyMobileChatFixes(false));
    bodyObserver.observe(document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['class'] });
    setTimeout(() => applyMobileChatFixes(true), 350);
    setTimeout(() => applyMobileChatFixes(true), 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
