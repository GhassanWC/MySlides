/**
 * Minimal sanitization for AI-generated slide HTML. Allow only safe tags and strip scripts/events.
 */
const ALLOWED_TAGS = new Set([
  'div', 'span', 'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'section', 'strong', 'em', 'br', 'header', 'footer',
  'img', 'svg', 'path', 'circle', 'rect', 'polygon', 'g'
]);
const ALLOWED_ATTRS = new Set([
  'class', 'style', 'src', 'alt', 'viewbox', 'fill', 'xmlns', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'points'
]);

export function sanitizeSlideHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  const out = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
  const doc = new DOMParser().parseFromString(out, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return Array.from(node.childNodes).map(walk).join('');
    const attrs: string[] = [];
    for (const a of el.attributes) {
      const name = a.name.toLowerCase();
      if (ALLOWED_ATTRS.has(name) || name.startsWith('data-')) {
        attrs.push(`${a.name}="${a.value.replace(/"/g, '&quot;')}"`);
      }
    }
    const inner = Array.from(node.childNodes).map(walk).join('');
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${inner}</${tag}>`;
  };
  return walk(doc.body) || '';
}

export function sanitizeSlideCss(css: string): string {
  if (!css || typeof css !== 'string') return '';
  return css
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*["']?data\s*:/gi, 'url(blocked:')
    .slice(0, 8000);
}
