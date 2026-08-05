/* Rivo v196 — no mobile dimming + guaranteed return to entry page */
(() => {
  'use strict';

  const MOBILE_BREAKPOINT = 820;
  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
  let pendingEntryType = null;
  let entryBypass = false;
  let pageLockInstalled = false;
  let lastLockedScrollReset = 0;
  let avatarEntryFinishTimer = 0;
  let pendingAvatarId = '';
  let mobileLogoutBusy = false;
  let lastMobileLogoutAt = 0;

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
    pendingAvatarId = '';
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
    try {
      if (pendingAvatarId && typeof state === 'object' && state) {
        state.entryAvatar = pendingAvatarId;
        if (typeof window.updateEntryAvatarUI === 'function') window.updateEntryAvatarUI();
      }
    } catch (_) {}
    pendingAvatarId = '';
    window.clearTimeout(avatarEntryFinishTimer);
    avatarEntryFinishTimer = 0;
    document.body.classList.remove('mobileAvatarEntryPending');
    const modal = $('#entryAvatarPickerModal');
    modal?.classList.remove('mobileAvatarEntryFlow');
    modal?.classList.add('hidden');

    window.setTimeout(() => {
      entryBypass = true;
      try {
        if (typeof window.enterFromEntry === 'function') window.enterFromEntry(type);
      } finally {
        entryBypass = false;
      }
      // بعض متصفحات أندرويد القديمة تتأخر في إزالة شاشة الدخول؛ صحح الحالة بعد التنفيذ.
      window.setTimeout(() => {
        const screen = $('#entryScreen');
        if (screen?.classList.contains('hidden')) {
          document.body.classList.remove('entryLocked', 'mobileAvatarEntryPending', 'mobileSideOpen');
          closeMobileDrawer();
          setViewportVars();
        }
      }, 90);
    }, 90);
  }

  function scheduleEntryAfterAvatar() {
    if (!pendingEntryType || avatarEntryFinishTimer) return;
    avatarEntryFinishTimer = window.setTimeout(() => {
      avatarEntryFinishTimer = 0;
      finishEntryAfterAvatar();
    }, 120);
  }

  function cancelPendingEntry() {
    window.clearTimeout(avatarEntryFinishTimer);
    avatarEntryFinishTimer = 0;
    pendingEntryType = null;
    pendingAvatarId = '';
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

    // click هو المسار الأساسي، وpointerup احتياط للهواتف التي لا تطلق click بثبات بعد التمرير الخفيف.
    const handleAvatarChoice = (event) => {
      if (!isMobile() || !pendingEntryType) return;
      const target = event.target instanceof Element ? event.target : null;
      const avatar = target?.closest('[data-picker-avatar]');
      if (!avatar) return;
      pendingAvatarId = String(avatar.dataset.pickerAvatar || '');
      scheduleEntryAfterAvatar();
    };
    document.addEventListener('pointerup', handleAvatarChoice, true);
    document.addEventListener('touchend', handleAvatarChoice, { capture: true, passive: true });
    document.addEventListener('click', handleAvatarChoice, false);

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-close="entryAvatarPickerModal"]')) cancelPendingEntry();
    });
  }

  function activateSideTab(tabName) {
    const button = $(`[data-side-tab="${tabName}"]`);
    if (button && !button.classList.contains('active')) button.click();
  }

  function positionMobileBackdrop() {
    // v196: no dimming layer on phones. Keep the drawer fully clear and interactive.
    const backdrop = $('#mobileSideBackdrop');
    if (backdrop) {
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.tabIndex = -1;
      backdrop.style.display = 'none';
      backdrop.style.pointerEvents = 'none';
    }
  }

  function closeMobileDrawer() {
    document.body.classList.remove('mobileSideOpen');
    const side = $('.communitySide');
    side?.setAttribute('aria-hidden', 'true');
    const backdrop = $('#mobileSideBackdrop');
    if (backdrop) {
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.tabIndex = -1;
      backdrop.style.cssText = 'display:none!important;pointer-events:none!important;opacity:0!important;';
    }
  }


  function resetMobileUiForEntry() {
    closeMobileDrawer();
    document.body.classList.remove('rivoKeyboardOpen', 'mobileStageActive', 'mobileAvatarEntryPending');
    document.documentElement.classList.remove('rivoMobileChatLocked', 'rivoKeyboardViewport');
    const screen = $('#entryScreen');
    if (screen) screen.classList.remove('hidden');
    document.body.classList.add('entryLocked');
    window.scrollTo(0, 0);
    window.setTimeout(() => {
      setViewportVars();
      syncPageLock();
      $('#entryName')?.focus({ preventScroll: true });
    }, 80);
  }

  window.RivoMobileBeforeLogout = resetMobileUiForEntry;
  window.RivoMobileCloseDrawer = closeMobileDrawer;

  function openMobileDrawer(tabName) {
    if (!isMobile() || document.body.classList.contains('entryLocked')) return;
    const side = $('.communitySide');
    if (!side) return;
    activateSideTab(tabName);
    document.body.classList.add('mobileSideOpen');
    side.setAttribute('aria-hidden', 'false');
    // No dark overlay in v196; the X button closes the drawer.
    positionMobileBackdrop();
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

    // v196 removes the dimming backdrop completely because it blocked taps on some phones.
    $('#mobileSideBackdrop')?.remove();


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

  async function performMobileLogout(event) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
    }

    const now = Date.now();
    if (mobileLogoutBusy || now - lastMobileLogoutAt < 650) return;
    lastMobileLogoutAt = now;
    mobileLogoutBusy = true;

    const button = $('#logoutBtn');
    if (button) button.disabled = true;
    closeMobileDrawer();

    try {
      const handler = window.RivoLogoutChat || window.logoutChat ||
        (typeof logoutChat === 'function' ? logoutChat : null);
      if (typeof handler === 'function') {
        await Promise.resolve(handler());
      } else if (typeof button?.onclick === 'function') {
        await Promise.resolve(button.onclick.call(button, event || new Event('click')));
      }
    } catch (error) {
      console.error('Rivo mobile logout failed', error);
    } finally {
      // Always restore the main entry/settings page, even if a browser swallowed the original click.
      closeMobileDrawer();
      document.querySelectorAll('.modal:not(#entryAvatarPickerModal)').forEach((node) => node.classList.add('hidden'));
      document.body.classList.remove(
        'mobileSideOpen','mobileAvatarEntryPending','rivoKeyboardOpen','mobileStageActive',
        'radioVideoDragging','privateWindowDragging'
      );
      document.documentElement.classList.remove('rivoMobileChatLocked','rivoKeyboardViewport');
      const screen = $('#entryScreen');
      if (screen) {
        screen.classList.remove('hidden');
        screen.removeAttribute('aria-hidden');
        screen.style.removeProperty('display');
        screen.style.removeProperty('visibility');
        screen.style.removeProperty('opacity');
        screen.style.removeProperty('pointer-events');
      }
      document.body.classList.add('entryLocked');
      window.scrollTo(0, 0);
      window.setTimeout(() => {
        resetMobileUiForEntry();
        if (button) button.disabled = false;
        mobileLogoutBusy = false;
      }, 100);
    }
  }

  function bindDrawerAutoClose() {
    // نعالج تغيير الغرفة في مرحلة capture حتى لا تضيع اللمسة خلف الغطاء على بعض الهواتف.
    document.addEventListener('click', (event) => {
      if (!isMobile()) return;

      const roomButton = event.target.closest('#roomsList [data-room]');
      if (roomButton) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const roomId = String(roomButton.dataset.room || '');
        const roomName = String(roomButton.querySelector('b')?.textContent || 'الغرفة').trim();
        if (roomId && typeof window.switchRoom === 'function') {
          window.switchRoom(roomId);
          try { localStorage.setItem('rivoEntryRoomChoiceV1', roomId); } catch (_) {}
          window.setTimeout(() => {
            closeMobileDrawer();
            syncMobileLabels();
            const messages = $('#messages');
            if (messages) messages.scrollTop = messages.scrollHeight;
            if (typeof window.toast === 'function') window.toast(`تم الدخول إلى غرفة ${roomName}`);
          }, 60);
        }
        return;
      }

      // خروج موثوق: ننفذ تسجيل الخروج نفسه في مرحلة capture ثم نعيد صفحة الدخول.
      if (event.target.closest('#logoutBtn')) {
        performMobileLogout(event);
        return;
      }
    }, true);

    const logoutPointerFallback = (event) => {
      if (!isMobile() || !event.target?.closest?.('#logoutBtn')) return;
      performMobileLogout(event);
    };
    document.addEventListener('pointerup', logoutPointerFallback, true);
    document.addEventListener('touchend', logoutPointerFallback, { capture: true, passive: false });

    window.addEventListener('rivo-chat-logged-out', resetMobileUiForEntry);
    window.addEventListener('rivo-room-switched', () => {
      window.setTimeout(() => {
        closeMobileDrawer();
        syncMobileLabels();
      }, 30);
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

  function recoverMobileInteractionState() {
    if (!isMobile()) return;
    const entryVisible = !$('#entryScreen')?.classList.contains('hidden');
    if (entryVisible || document.body.classList.contains('entryLocked')) {
      closeMobileDrawer();
    }
    const side = $('.communitySide');
    if (document.body.classList.contains('mobileSideOpen') && (!side || side.getAttribute('aria-hidden') === 'true')) closeMobileDrawer();
    $('#mobileSideBackdrop')?.remove();
  }

  function applyMode() {
    document.body.classList.toggle('rivoMobileUI', isMobile());
    recoverMobileInteractionState();
    syncPageLock();
    if (!isMobile()) closeMobileDrawer();
    compactRoomButtons();
    restoreRoomButtons();
    setViewportVars();
    syncComposerHeight();
    syncMobileLabels();
    syncMobileStage();
    if (document.body.classList.contains('mobileSideOpen')) positionMobileBackdrop();
  }

  function init() {
    closeMobileDrawer();
    ensureMobileChrome();
    installHardPageLock();
    bindMobileEntryFlow();
    bindDrawerAutoClose();
    bindKeyboardComfort();
    installObservers();
    applyMode();

    window.addEventListener('pageshow', () => { closeMobileDrawer(); applyMode(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { recoverMobileInteractionState(); applyMode(); } });
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
