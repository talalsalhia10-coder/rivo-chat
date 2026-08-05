/* Rivo v197 — stable app-like mobile shell + reliable guest/Google entry */
(() => {
  'use strict';

  const BREAKPOINT = 820;
  const $ = (selector, root = document) => root.querySelector(selector);
  const isMobile = () => window.matchMedia(`(max-width:${BREAKPOINT}px)`).matches;

  let pendingEntryType = '';
  let entryBusy = false;
  let logoutBusy = false;
  let pageLockInstalled = false;

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
