import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content for safe rendering (emails, documents, rich text).
 * Strips dangerous elements (scripts, event handlers, etc.) while preserving safe HTML.
 * Returns the input unchanged during SSR (no window available).
 */
export function sanitizeHtmlContent(html: string): string {
  if (typeof window === 'undefined') {
    // Fail-closed: DOMPurify needs a DOM. On the server we cannot sanitize,
    // so never emit raw HTML (would be an XSS sink in SSR output). The client
    // re-runs sanitization on hydration and renders the real content.
    return '';
  }
  return DOMPurify.sanitize(html);
}

/**
 * Sanitizes HTML output from syntax highlighters.
 * Only allows <span> with class attributes and <br> tags.
 * Returns the input unchanged during SSR (no window available).
 */
export function sanitizeCodeHighlight(html: string): string {
  if (typeof window === 'undefined') {
    // Fail-closed: DOMPurify needs a DOM. On the server we cannot sanitize,
    // so never emit raw HTML (would be an XSS sink in SSR output). The client
    // re-runs sanitization on hydration and renders the real content.
    return '';
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}
