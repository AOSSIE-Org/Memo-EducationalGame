/**
 * Saving a card set (zip file) to the player's own Google Drive, from the
 * browser alone, following Google's recommendations for apps without a
 * server:
 * - Google Identity Services, token model (`initTokenClient`): a popup where
 *   the person signs in and agrees; no client secret in the app, no
 *   redirect, no refresh token;
 * - the narrowest scope, `drive.file`: the app can only see the files it
 *   creates, nothing else in the Drive (a non-sensitive scope, no review);
 * - the short-lived access token is kept in memory only (never stored) and
 *   revoked after the upload;
 * - Google's script is loaded only when the card set editor opens and Drive
 *   is set up, so the app makes no request to Google otherwise.
 *
 * Setup: create an OAuth client ID of type "Web application" in Google Cloud
 * Console, add the app's origin(s) to "Authorized JavaScript origins", enable
 * the Google Drive API, and build with VITE_GOOGLE_CLIENT_ID=<client id>.
 * Without it, the Drive button says that it isn't set up.
 */
const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCRIPT = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';

interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}
interface GoogleOAuth {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (r: TokenResponse) => void;
    error_callback?: (e: unknown) => void;
  }): TokenClient;
  revoke(token: string, done?: () => void): void;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth } };
  }
}

export const driveConfigured = (): boolean => CLIENT_ID.length > 0;

let loading: Promise<void> | null = null;

/** Loads Google's sign-in script ahead of time, so the tap on "save" can open the popup at once. */
export function preloadDrive(): Promise<void> {
  if (!driveConfigured()) return Promise.reject(new Error('Not set up'));
  loading ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.append(s);
  });
  return loading;
}

/** Asks for a token (popup); must be called from a tap. */
function getToken(): Promise<string> {
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) return Promise.reject(new Error('Google sign-in not loaded'));
  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error ?? 'No token'))),
      error_callback: (e) => reject(e instanceof Error ? e : new Error('Sign-in cancelled')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

/** Uploads a zip file to the person's Google Drive; returns its link. Call from a tap. */
export async function saveToDrive(zip: Blob, fileName: string): Promise<string | undefined> {
  await preloadDrive();
  const token = await getToken();
  try {
    const metadata = { name: fileName, mimeType: 'application/zip', description: 'Memo card set' };
    const boundary = 'memo' + Math.random().toString(36).slice(2);
    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: application/zip\r\n\r\n`,
      zip,
      `\r\n--${boundary}--`,
    ]);
    const res = await fetch(UPLOAD, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!res.ok) throw new Error(`Drive: HTTP ${res.status}`);
    const file = (await res.json()) as { webViewLink?: string };
    return file.webViewLink;
  } finally {
    window.google?.accounts.oauth2.revoke(token);
  }
}
