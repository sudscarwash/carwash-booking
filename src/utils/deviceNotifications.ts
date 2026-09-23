/**
 * Native Device Notifications & Service Worker Integration
 * Provides push pop-ups on mobile (Android/iOS 16.4+) and desktop.
 */

import { playNotificationChime } from './audioNotification.js';

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register Service Worker for PWA & Notification handling
 */
export async function registerDeviceNotificationWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = registration;
    return registration;
  } catch (err) {
    console.debug('Service Worker registration skipped or failed:', err);
    return null;
  }
}

/**
 * Check whether device notifications are supported in this browser
 */
export function isDeviceNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getDeviceNotificationPermission(): NotificationPermission {
  if (!isDeviceNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Request user permission to display pop-up notifications on phone / desktop
 */
export async function requestDeviceNotificationPermission(): Promise<NotificationPermission> {
  if (!isDeviceNotificationSupported()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerDeviceNotificationWorker();
      // Show confirmation test notification
      showDeviceNotification({
        title: '🔔 Autoshine Alerts Enabled',
        body: 'You will now receive instant pop-up alerts on your device for incoming bookings and status updates!',
        tag: 'autoshine-welcome',
      });
    }
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

export interface DeviceNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  sound?: 'booking' | 'status' | 'info';
}

/**
 * Trigger a native device pop-up banner (with sound and vibration)
 */
export async function showDeviceNotification(options: DeviceNotificationOptions): Promise<void> {
  if (!isDeviceNotificationSupported()) return;

  // Play audio chime
  playNotificationChime(options.sound || 'booking');

  // Trigger device vibration if supported (e.g. Android phones)
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 80, 150]);
    } catch {
      // Ignore vibration errors
    }
  }

  if (Notification.permission !== 'granted') return;

  const title = options.title;
  const notifOptions: NotificationOptions & { renotify?: boolean } = {
    body: options.body,
    icon: options.icon || '/autoshine_logo.jpg',
    badge: options.badge || '/autoshine_logo.jpg',
    tag: options.tag || `autoshine-${Date.now()}`,
    data: { url: options.url || '/' },
    renotify: true,
  };

  try {
    // Try via active service worker registration first (preferred on mobile)
    if (!swRegistration && 'serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.getRegistration();
    }

    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(title, notifOptions);
      return;
    }

    // Standard Desktop fallback
    const notification = new Notification(title, notifOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.url && options.url !== window.location.pathname) {
        try {
          window.location.href = options.url;
        } catch {
          // ignore navigation errors
        }
      }
    };
  } catch (err) {
    console.debug('Could not show native notification:', err);
  }
}
