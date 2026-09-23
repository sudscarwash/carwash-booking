/**
 * Flashes browser tab title when an event occurs in the background
 */

let originalTitle = document.title || 'Autoshine BN';
let flashInterval: any = null;
let isFlashing = false;

// Track tab visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      stopFlashingTab();
    }
  });

  window.addEventListener('focus', () => {
    stopFlashingTab();
  });
}

export const flashTabTitle = (alertMessage: string) => {
  if (typeof document === 'undefined') return;

  // If user is already looking at the active tab, no need to flash
  if (!document.hidden && document.hasFocus()) {
    return;
  }

  // Save current title as base
  if (!isFlashing) {
    originalTitle = document.title.replace(/^🔔\s*\(\d+\)\s*/, '') || 'Autoshine BN';
  }

  stopFlashingTab();
  isFlashing = true;

  let toggle = false;
  flashInterval = setInterval(() => {
    if (!isFlashing) {
      clearInterval(flashInterval);
      return;
    }
    toggle = !toggle;
    document.title = toggle ? `🔔 ${alertMessage}` : originalTitle;
  }, 1000);
};

export const stopFlashingTab = () => {
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }
  if (isFlashing && typeof document !== 'undefined') {
    document.title = originalTitle;
    isFlashing = false;
  }
};
