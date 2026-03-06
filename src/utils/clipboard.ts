/**
 * Copy text to clipboard with fallback for environments where Clipboard API is blocked
 * @param text The text to copy
 * @returns Promise that resolves when copy is successful
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Try modern Clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch (err) {
    // Fallback for environments where Clipboard API is blocked
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (!successful) {
        throw new Error('Copy command failed');
      }
    } finally {
      textArea.remove();
    }
  }
}
