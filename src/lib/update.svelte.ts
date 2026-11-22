/**
 * App updates.
 *
 * The service worker keeps the app on the device so that it works offline.
 * A new version is downloaded in the background (checked at start, every
 * hour, and whenever the app comes back to the foreground) and then waits:
 * a ↻ button appears, and the new version starts when it is tapped. Nothing
 * reloads by itself in the middle of a game, and player data is never touched.
 *
 * An outdated copy that finds data saved by a newer version (or that a newer
 * version asks to step aside) can't continue: it shows only the ↻ button.
 */
import { registerSW } from 'virtual:pwa-register';

const CHECK_EVERY_MS = 60 * 60 * 1000;

class UpdateState {
  /** A new version is ready to start. */
  available = $state(false);
  /** This copy is older than the saved data or another open copy. */
  outdated = $state(false);
  /** Another open copy of an older version prevents this one from opening its data. */
  blocked = $state(false);
}

export const update = new UpdateState();

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | undefined;

/** Asks the browser to look for a new version. */
export function checkForUpdate(): void {
  if (!registration || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  registration.update().catch(() => {
    // Offline or server unavailable: try again later.
  });
}

export function initUpdates(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      update.available = true;
    },
    onRegisteredSW(_url, r) {
      registration = r;
      setInterval(checkForUpdate, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
    },
  });
}

/** Starts the new version (the ↻ button). */
export async function applyUpdate(): Promise<void> {
  if (update.available && updateSW) {
    await updateSW(true);
    return;
  }
  // No new version downloaded yet (e.g. an outdated copy): look for one first.
  if (registration) {
    try {
      await registration.update();
      const waiting = registration.waiting ?? registration.installing;
      if (waiting && updateSW) {
        await updateSW(true);
        return;
      }
    } catch {
      // Fall back to a plain reload.
    }
  }
  location.reload();
}

/** This copy is too old for the saved data: show only the update button and look for the new version. */
export function markOutdated(): void {
  update.outdated = true;
  checkForUpdate();
}
