/**
 * Strips HTML tags from a string and returns plain text
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Create a temporary DOM element to parse HTML
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  
  // Fallback for server-side: simple regex approach
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Strips HTML and truncates text to a max length with ellipsis
 */
export function stripHtmlAndTruncate(html: string | null | undefined, maxLength = 60): string {
  const text = stripHtml(html);
  if (!text) return 'Untitled Generation';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Extracts a meaningful title from input text
 */
export function extractTitleFromInput(inputText: string): string {
  const stripped = stripHtml(inputText);
  if (!stripped) return 'Untitled Generation';
  
  // Get first line
  const firstLine = stripped.split('\n')[0].trim();
  
  // Get first sentence (up to . ! or ?)
  const firstSentence = firstLine.split(/[.!?]/)[0].trim();
  
  if (!firstSentence) return 'Untitled Generation';
  if (firstSentence.length <= 60) return firstSentence;
  return firstSentence.substring(0, 57).trim() + '...';
}
