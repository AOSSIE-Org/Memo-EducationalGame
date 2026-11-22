/**
 * Daily reminder for the installed app, without any push service or server.
 *
 * Switching it on asks for permission to show notifications and registers a
 * Periodic Background Sync; the browser then wakes the service worker
 * (public/sw-reminder.js) about every 12 hours, and the worker shows a
 * notification if nobody has played today. The text comes from the app, in
 * its language, through IndexedDB (settings store, key "reminder").
 *
 * Periodic Background Sync exists in Chromium-based browsers (Chrome, Edge,
 * Samsung Internet…) for installed apps only, so the menu item is shown only
 * there.
 */

export const REMINDER_TAG = 'memo-daily-reminder';
/** The browser may wake the worker less often, never more. */
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** What the service worker needs to show the reminder. */
export interface ReminderConfig {
  enabled: boolean;
  body: string;
  lang: string;
  dir: 'ltr' | 'rtl';
  /** Day (YYYY-MM-DD) of the last reminder shown, set by the service worker. */
  lastShown?: string;
}

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
}
type RegistrationWithSync = ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager };

export function remindersSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    typeof ServiceWorkerRegistration !== 'undefined' &&
    'periodicSync' in ServiceWorkerRegistration.prototype
  );
}

async function registration(): Promise<RegistrationWithSync | null> {
  if (!remindersSupported()) return null;
  return (await navigator.serviceWorker.ready) as RegistrationWithSync;
}

/**
 * Turns the reminder on. Must be called from a user gesture (it may ask for
 * permission). Returns false if notifications or background sync are not allowed.
 */
export async function enableReminders(): Promise<boolean> {
  const reg = await registration();
  if (!reg?.periodicSync) return false;
  if ((await Notification.requestPermission()) !== 'granted') return false;
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
    if (status.state !== 'granted') return false;
  } catch {
    // Permission name unknown to this browser: try to register anyway.
  }
  try {
    await reg.periodicSync.register(REMINDER_TAG, { minInterval: MIN_INTERVAL_MS });
    return true;
  } catch {
    return false;
  }
}

export async function disableReminders(): Promise<void> {
  const reg = await registration();
  await reg?.periodicSync?.unregister(REMINDER_TAG).catch(() => {});
}

/** Whether notifications are currently allowed (the reminder can work). */
export function notificationsAllowed(): boolean {
  return remindersSupported() && Notification.permission === 'granted';
}
