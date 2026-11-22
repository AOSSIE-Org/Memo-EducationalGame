/**
 * Asks the browser to keep the app's data even when the device runs low on
 * space, or when the site hasn't been used for a while (Safari otherwise
 * deletes data of websites not added to the home screen after 7 days without
 * use). Browsers decide by themselves (e.g. Chrome grants it to installed or
 * often-used apps); Firefox asks the user. Returns whether storage is persistent.
 */
export async function persistStorage(): Promise<boolean> {
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!storage?.persist) return false;
    if (await storage.persisted()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}
