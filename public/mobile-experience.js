/* Rivo v192 — mobile-first entry, fixed chat, draggable/fullscreen video */
(() => {
  'use strict';

  const MOBILE_BREAKPOINT = 820;
  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
  let pendingEntryType = null;
  let entryBypass = false;
  let pageLockInstalled = false;
  let lastLockedScrollReset = 0;

  const $ = (selector, root = document) => root.querySelector(selector);

  function chatIsVisible() {
    const screen = $('#entryScreen');
    return isMobile() && !document.body.classList.contains('entryLocked') && Boolean(screen?.classList.contains('hidden'));
  }

  function setViewportVars() {
    const viewport = window.visualViewport;
    const height = Math.max(320, viewport ? viewport.height : window.innerHeight);
    const top = viewport ? viewport.offsetTop : 0;
    document.documentElement.style.setProperty('--rivo-app-height', `${Math.round(height)}px`);
    document.documentElement.style.setProperty('--rivo-visual-top', `${Math.round(top)}px`);

    const keyboardOpen = isMobile() && window.innerHeight - height > 140;
    document.body.classList.toggle('rivoKeyboardOpen', keyboardOpen);
    document.documentElement.classList.toggle('rivoKeyboardViewport', keyboardOpen && chatIsVisible());
    syncPageLock();
  }

  function syncPageLock() {
    const locked = chatIsVisible();
    document.documentElement.classList.toggle('rivoMobileChatLocked', locked);
    if (!locked) {
      document.documentElement.classList.remove('rivoKeyboardViewport');
      return;
    }
    if (window.scrollX !== 0 || window.scrollY !== 0) {
      const now = Date.now();
      if (now - lastLockedScrollReset > 80) {
        lastLockedScrollReset = now;
        window.scrollTo(0, 0);
      }
    }
  }

  function isAllowedMobileScroller(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest([
      '.messages', '.scrollList', '.composerToolbar', '.cameraGrid', '.micSeats',
      '.privateMessages', '.privateInboxPanel', '.card', '.picker', '.colorPicker',
      '.userMenu', '.entryScreen', '.entryAvatarPickerGrid', '.radioVideoWindow',
      '.radioVideoHeader', 'input', 'textarea', 'select', 'button', 'a',
      '[contenteditable="true"]'
    ].join(',')));
  }

  function installHardPageLock() {
    if (pageLockInstalled) return;
    pageLockInstalled = true;

    document.addEventListener('touchmove', (event) => {
      if (!document.documentElement.classList.contains('rivoMobileChatLocked')) return;
      if (isAllowedMobileScroller(event.target)) return;
      event.preventDefault();
    }, { passive: false, capture: true });

    window.addEventListener('scroll', () => {
      if (!document.documentElement.classList.contains('rivoMobileChatLocked')) return;
      if (window.scrollX === 0 && window.scrollY === 0) return;
      window.scrollTo(0, 0);
    }, { passive: true });

    document.addEventListener('focusin', (event) => {
      if (!chatIsVisible() || !event.target?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
      window.setTimeout(() => {
        syncPageLock();
        syncComposerHeight();
      }, 70);
    });
  }

  function validateEntryBeforeAvatar() {
    if (typeof window.validateEntryProfile === 'function') {
      return Boolean(window.validateEntryProfile());
    }
    const name = String($('#entryName')?.value || '').trim();
    if (name.length < 2) {
      if (typeof window.showEntryError === 'function') window.showEntryError('اكتب اسماً من حرفين على الأقل.');
      $('#entryName')?.focus();
      return false;
    }
    return true;
  }

  function updateAvatarEntryCopy(type) {
    const modal = $('#entryAvatarPickerModal');
    if (!modal) return;
    modal.classList.add('mobileAvatarEntryFlow');
    const title = modal.querySelector('h2');
    const note = modal.querySelector('p');
    if (title) title.textContent = type === 'google' ? 'اختر صورتك ثم سجّل بحساب Google' : 'اختر صورتك وادخل كضيف';
    if (note) note.textContent = 'اضغط على الصورة التي تعجبك، وسيتم نقلك مباشرة إلى الدردشة.';
  }

  function beginEntryAvatarStep(type) {
    if (!isMobile() || entryBypass) return false;
    if (!validateEntryBeforeAvatar()) return true;
    pendingEntryType = type;
    document.body.classList.add('mobileAvatarEntryPending');
    if (typeof window.openEntryAvatarPicker === 'function') {
      window.openEntryAvatarPicker('entry');
      requestAnimationFrame(() => updateAvatarEntryCopy(type));
    }
    return true;
  }

  function finishEntryAfterAvatar() {
    if (!pendingEntryType) return;
    const type = pendingEntryType;
    pendingEntryType = null;
    document.body.classList.remove('mobileAvatarEntryPending');
    $('#entryAvatarPickerModal')?.classList.remove('mobileAvatarEntryFlow');

    window.setTimeout(() => {
      entryBypass = true;
      try {
        if (typeof window.enterFromEntry === 'function') window.enterFromEntry(type);
      } finally {
        entryBypass = false;
      }
    }, 70);
  }

  function cancelPendingEntry() {
    pendingEntryType = null;
    document.body.classList.remove('mobileAvatarEntryPending');
    $('#entryAvatarPickerModal')?.classList.remove('mobileAvatarEntryFlow');
  }

  function bindMobileEntryFlow() {
    document.addEventListener('click', (event) => {
      if (!isMobile() || entryBypass) return;
      const button = event.target.closest('#entryGuestBtn, #entryGoogleBtn');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      beginEntryAvatarStep(button.id === 'entryGoogleBtn' ? 'google' : 'guest');
    }, true);

    document.addEventListener('keydown', (event) => {
      if (!isMobile() || event.target?.id !== 'entryName' || event.key !== 'Enter') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      beginEntryAvatarStep('guest');
    }, true);

    document.addEventListener('click', (event) => {
      if (!isMobile() || !pendingEntryType) return;
      const avatar = event.target.closest('[data-picker-avatar]');
      if (avatar) finishEntryAfterAvatar();
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-close="entryAvatarPickerModal"]')) cancelPendingEntry();
    });
  }

  function activateSideTab(tabName) {
    const button = $(`[data-side-tab="${tabName}"]`);
    if (button && !button.classList.contains('active')) button.click();
  }

  function closeMobileDrawer() {
    document.body.classList.remove('mobileSideOpen');
    $('.communitySide')?.setAttribute('aria-hidden', 'true');
  }

  function openMobileDrawer(tabName) {
    if (!isMobile()) return;
    activateSideTab(tabName);
    document.body.classList.add('mobileSideOpen');
    $('.communitySide')?.setAttribute('aria-hidden', 'false');
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
        <button id="mobileRoomsOpen" type="button" aria-label="فتح الغرف"><span>🏠</span><b id="mobileRoomLabel">الغرفة</b></button>
        <button id="mobileUsersOpen" type="button" aria-label="فتح المستخدمين"><span>👥</span><b id="mobileUsersLabel">0</b></button>`;
      topbar.appendChild(nav);
      $('#mobileRoomsOpen').addEventListener('click', () => openMobileDrawer('rooms'));
      $('#mobileUsersOpen').addEventListener('click', () => openMobileDrawer('users'));
    }

    if (!$('#mobileSideClose')) {
      const close = document.createElement('button');
      close.id = 'mobileSideClose';
      close.className = 'mobileSideClose';
      close.type = 'button';
      close.setAttribute('aria-label', 'إغلاق القائمة');
      close.textContent = '×';
      side.prepend(close);
      close.addEventListener('click', closeMobileDrawer);
    }

    if (!$('#mobileSideBackdrop')) {
      const backdrop = document.createElement('button');
      backdrop.id = 'mobileSideBackdrop';
      backdrop.className = 'mobileSideBackdrop';
      backdrop.type = 'button';
      backdrop.setAttribute('aria-label', 'إغلاق القائمة');
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', closeMobileDrawer);
    }

    side.setAttribute('aria-hidden', isMobile() ? 'true' : 'false');
  }

  function syncMobileLabels() {
    const room = String($('#roomTitle')?.textContent || 'الغرفة').trim();
    const count = String($('#userCount')?.textContent || $('#roomCount')?.textContent || '0').trim();
    const roomLabel = $('#mobileRoomLabel');
    const usersLabel = $('#mobileUsersLabel');
    if (roomLabel) roomLabel.textContent = room;
    if (usersLabel) usersLabel.textContent = count;
  }

  function syncMobileStage() {
    const cameraGrid = $('#cameraGrid');
    const micSeats = $('#micSeats');
    const cameraActive = Boolean(cameraGrid?.querySelector('.cameraSlot:not(.empty)'));
    const micActive = Boolean(micSeats?.children.length);
    document.body.classList.toggle('mobileStageActive', cameraActive || micActive);
  }

  function syncComposerHeight() {
    const composer = $('.composerDock');
    if (!composer) return;
    const height = Math.ceil(composer.getBoundingClientRect().height || 92);
    document.documentElement.style.setProperty('--rivo-composer-height', `${height}px`);
  }

  function compactRoomButtons() {
    if (!isMobile()) return;
    const labels = [
      ['soundBtn', '🔊', 'صوت الغرفة'],
      ['cameraBtn', '📹', 'الكاميرا'],
      ['micBtn', '🎙️', 'المايك']
    ];
    labels.forEach(([id, shortText, title]) => {
      const button = document.getElementById(id);
      if (!button || button.dataset.mobileCompacted === '1') return;
      button.dataset.desktopText = button.textContent;
      button.dataset.mobileCompacted = '1';
      button.textContent = shortText;
      button.title = title;
      button.setAttribute('aria-label', title);
    });
  }

  function restoreRoomButtons() {
    if (isMobile()) return;
    ['soundBtn', 'cameraBtn', 'micBtn'].forEach((id) => {
      const button = document.getElementById(id);
      if (!button || button.dataset.mobileCompacted !== '1') return;
      button.textContent = button.dataset.desktopText || button.textContent;
      delete button.dataset.mobileCompacted;
    });
  }

  function bindDrawerAutoClose() {
    document.addEventListener('click', (event) => {
      if (!isMobile() || !document.body.classList.contains('mobileSideOpen')) return;
      if (event.target.closest('#roomsList .roomItem')) window.setTimeout(closeMobileDrawer, 120);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMobileDrawer();
    });
  }

  function bindKeyboardComfort() {
    const input = $('#messageInput');
    if (!input) return;
    input.addEventListener('focus', () => {
      setViewportVars();
      window.setTimeout(() => {
        const messages = $('#messages');
        if (messages) messages.scrollTop = messages.scrollHeight;
      }, 180);
    });
    input.addEventListener('blur', () => window.setTimeout(setViewportVars, 80));
  }

  function installObservers() {
    const bodyObserver = new MutationObserver(() => {
      syncPageLock();
      window.setTimeout(() => {
        setViewportVars();
        syncComposerHeight();
      }, 30);
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const entryScreen = $('#entryScreen');
    if (entryScreen) bodyObserver.observe(entryScreen, { attributes: true, attributeFilter: ['class'] });

    const labelObserver = new MutationObserver(() => {
      syncMobileLabels();
      syncMobileStage();
      syncComposerHeight();
    });
    ['roomTitle', 'userCount', 'roomCount', 'cameraGrid', 'micSeats'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) labelObserver.observe(node, { childList: true, subtree: true, characterData: true, attributes: true });
    });

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(syncComposerHeight);
      const composer = $('.composerDock');
      if (composer) observer.observe(composer);
    }
  }

  function applyMode() {
    document.body.classList.toggle('rivoMobileUI', isMobile());
    syncPageLock();
    if (!isMobile()) closeMobileDrawer();
    compactRoomButtons();
    restoreRoomButtons();
    setViewportVars();
    syncComposerHeight();
    syncMobileLabels();
    syncMobileStage();
  }

  function init() {
    ensureMobileChrome();
    installHardPageLock();
    bindMobileEntryFlow();
    bindDrawerAutoClose();
    bindKeyboardComfort();
    installObservers();
    applyMode();

    window.addEventListener('resize', applyMode, { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(applyMode, 120), { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setViewportVars, { passive: true });
      window.visualViewport.addEventListener('scroll', setViewportVars, { passive: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
