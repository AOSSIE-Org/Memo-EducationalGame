/**
 * Daily reminder, imported by the service worker.
 *
 * No push service and no server: when the app is installed and the reminder
 * is switched on, the app registers a Periodic Background Sync. The browser
 * then wakes this worker from time to time (at most about every 12 hours, as
 * it sees fit), and the worker decides locally, from the app's own IndexedDB
 * data, whether to show a notification:
 *   - the reminder is switched on (settings store, key "reminder", written by
 *     the app with the text in the app's language);
 *   - there is at least one player, and nobody has played today yet;
 *   - it is afternoon or later, so that the day's play isn't pre-empted;
 *   - no reminder has been shown today.
 * Tapping the notification opens (or focuses) the app.
 */
const REMINDER_TAG = 'memo-daily-reminder';
/** No reminder before this hour (local time). */
const REMINDER_EARLIEST_HOUR = 15;

/** YYYY-MM-DD in local time, as the app's play days. */
function reminderToday(now) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Opens the app's database without ever creating or upgrading it. */
function reminderOpenDb() {
  return new Promise((resolve) => {
    const request = indexedDB.open('memo');
    request.onupgradeneeded = () => request.transaction.abort(); // no database yet
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function reminderRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function reminderCheck(now = new Date()) {
  if (now.getHours() < REMINDER_EARLIEST_HOUR) return;
  const db = await reminderOpenDb();
  if (!db) return;
  try {
    const names = Array.from(db.objectStoreNames);
    if (!['settings', 'users', 'playDays'].every((n) => names.includes(n))) return;
    const tx = db.transaction(['settings', 'users', 'playDays'], 'readonly');
    const [config, userCount, days] = await Promise.all([
      reminderRequest(tx.objectStore('settings').get('reminder')),
      reminderRequest(tx.objectStore('users').count()),
      reminderRequest(tx.objectStore('playDays').getAll()),
    ]);
    const today = reminderToday(now);
    if (!config || !config.enabled || config.lastShown === today || userCount === 0) return;
    if (days.some((d) => d.date === today)) return;

    await self.registration.showNotification('Memo', {
      body: config.body,
      lang: config.lang,
      dir: config.dir === 'rtl' ? 'rtl' : 'ltr',
      icon: 'pwa-192x192.png',
      badge: 'pwa-64x64.png',
      tag: REMINDER_TAG,
    });
    await reminderRequest(
      db.transaction('settings', 'readwrite').objectStore('settings').put({ ...config, lastShown: today }, 'reminder'),
    );
  } finally {
    db.close();
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === REMINDER_TAG) event.waitUntil(reminderCheck());
});

self.addEventListener('notificationclick', (event) => {
  if (event.notification.tag !== REMINDER_TAG) return;
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => 'focus' in w);
      return open ? open.focus() : self.clients.openWindow(self.registration.scope);
    }),
  );
});
