import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content for safe rendering (emails, documents, rich text).
 * Strips dangerous elements (scripts, event handlers, etc.) while preserving safe HTML.
 * Works in both browser and SSR environments via isomorphic-dompurify.
 */
export function sanitizeHtmlContent(html: string): string {
  return DOMPurify.sanitize(html);
}

/**
 * Sanitizes HTML output from syntax highlighters.
 * Only allows <span> with class attributes and <br> tags.
 * Works in both browser and SSR environments via isomorphic-dompurify.
 */
export function sanitizeCodeHighlight(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['span', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}
