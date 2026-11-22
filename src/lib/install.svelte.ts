/**
 * Installing the app as a PWA on mobile devices.
 *
 * - Android (Chrome, Edge, Samsung Internet, …): the browser fires
 *   `beforeinstallprompt`; we keep the event and show the browser's own
 *   install dialog when the player taps "Install app".
 * - iOS / iPadOS (Safari): there is no install API; we show how to use
 *   Share → "Add to Home Screen".
 * - Other mobile browsers without the event: we show how to use the browser
 *   menu.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'other';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac with touch.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

class InstallState {
  platform: Platform = detectPlatform();
  /** Whether the app is already running as an installed app. */
  standalone = $state(detectStandalone());
  /** Android: the deferred browser install prompt, when available. */
  prompt = $state<BeforeInstallPromptEvent | null>(null);
  /** Whether the "how to install" instructions are shown. */
  helpOpen = $state(false);

  /** The install button is only offered on phones and tablets, in the browser. */
  get available(): boolean {
    const mobile = this.platform !== 'other' || matchMedia('(pointer: coarse)').matches;
    return mobile && !this.standalone;
  }

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // keep the browser's mini-infobar from appearing
      this.prompt = e as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
      this.prompt = null;
      this.standalone = true;
    });
    matchMedia('(display-mode: standalone)').addEventListener('change', () => (this.standalone = detectStandalone()));
  }

  async install(): Promise<void> {
    if (this.prompt) {
      const prompt = this.prompt;
      this.prompt = null; // a prompt can only be used once
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') this.standalone = true;
      return;
    }
    this.helpOpen = true;
  }
}

export const install = new InstallState();
