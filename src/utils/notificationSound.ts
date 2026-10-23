// Audio and Desktop Notification Utility
// Uses Web Audio API for synthetic chimes (no external audio files required)
// Uses HTML5 Notification API for off-screen / background desktop notifications
// Uses Document Title alternation for background tab visual alerts

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export type ChimeTone = 'MELODIC' | 'PROXIMITY' | 'ALERT' | 'URGENT' | 'CASH';

/**
 * Plays a synthesized audio chime via Web Audio API.
 * Guaranteed to work offline and without external mp3 network requests.
 */
export function playNotificationSound(tone: ChimeTone = 'MELODIC') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (tone === 'PROXIMITY') {
      // 3-tone cheerful ascending chime (E5 -> G#5 -> B5) - Courier Nearby
      [
        { freq: 659.25, time: now, dur: 0.12 },
        { freq: 830.61, time: now + 0.12, dur: 0.12 },
        { freq: 987.77, time: now + 0.24, dur: 0.28 },
      ].forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur);
      });
    } else if (tone === 'URGENT') {
      // Urgent double high pulse - Cancellation, Emergency call
      [
        { freq: 880, time: now, dur: 0.15 },
        { freq: 698.46, time: now + 0.16, dur: 0.25 },
      ].forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur);
      });
    } else if (tone === 'ALERT') {
      // Crisp 2-tone alert - New order, ready for pickup
      [
        { freq: 523.25, time: now, dur: 0.1 },
        { freq: 783.99, time: now + 0.1, dur: 0.22 },
      ].forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.22, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur);
      });
    } else if (tone === 'CASH') {
      // Cash/Payment ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Gentle melodic chime
      [
        { freq: 587.33, time: now, dur: 0.12 },
        { freq: 880.00, time: now + 0.12, dur: 0.25 },
      ].forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur);
      });
    }
  } catch (err) {
    // Non-blocking fallback
    console.debug('Audio chime playback omitted:', err);
  }
}

/**
 * Requests desktop Notification permission from browser.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission', err);
    return 'denied';
  }
}

/**
 * Dispatches a native desktop/browser notification if granted,
 * especially useful when user is off-screen (different tab or window minimized).
 */
export function sendDesktopNotification(options: {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(options.title, {
        body: options.body,
        tag: options.tag || 'foodfindr_alert',
        icon: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=128&auto=format&fit=crop&q=80',
      });

      notif.onclick = () => {
        window.focus();
        if (options.onClick) {
          options.onClick();
        }
        notif.close();
      };
    } catch (e) {
      console.debug('Desktop notification error:', e);
    }
  }
}

// Tab Title Flasher for background tabs
let titleBlinkerInterval: NodeJS.Timeout | null = null;
let originalDocumentTitle = typeof document !== 'undefined' ? document.title : 'FoodFindr';

export function startBackgroundTitleAlert(alertText: string) {
  if (typeof document === 'undefined') return;

  // If already blinking, clear previous
  stopBackgroundTitleAlert();

  originalDocumentTitle = document.title.replace(/^\(\d+\)\s*(\S+)?\s*/, '');
  let toggle = false;

  titleBlinkerInterval = setInterval(() => {
    // If user returned to the tab, stop blinking
    if (!document.hidden) {
      stopBackgroundTitleAlert();
      return;
    }
    document.title = toggle ? alertText : originalDocumentTitle;
    toggle = !toggle;
  }, 1200);

  // Stop once window gets focus
  const handleFocus = () => {
    stopBackgroundTitleAlert();
    window.removeEventListener('focus', handleFocus);
  };
  window.addEventListener('focus', handleFocus);
}

export function stopBackgroundTitleAlert() {
  if (titleBlinkerInterval) {
    clearInterval(titleBlinkerInterval);
    titleBlinkerInterval = null;
  }
  if (typeof document !== 'undefined') {
    document.title = originalDocumentTitle || 'FoodFindr - Brunei Food Directory & Delivery';
  }
}
