export async function copyText(text: string): Promise<void> {
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Try the browser's local selection fallback before reporting failure.
  }

  if (!globalThis.document) throw new Error('Clipboard permission was denied');
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  try {
    textArea.focus();
    textArea.select();
    if (!document.execCommand('copy')) throw new Error('Clipboard permission was denied');
  } finally {
    document.body.removeChild(textArea);
  }
}
