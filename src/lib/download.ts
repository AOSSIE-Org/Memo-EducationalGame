/** Saves a file through the browser's download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Saves JSON text as a file. */
export function download(text: string, fileName: string): void {
  downloadBlob(new Blob([text], { type: 'application/json' }), fileName);
}
