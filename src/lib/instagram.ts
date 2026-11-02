const IG_URL = /https?:\/\/(?:www\.|m\.)?instagram\.com\/[^\s"'<>]+/i;
const SHORTCODE = /^[A-Za-z0-9_-]{10,64}$/; // same rule as the backend

/**
 * Finds an Instagram link (or a bare shortcode) in pasted text. The iOS share sheet sends text like
 * "Bu tarife bak! https://www.instagram.com/reel/... çok kolay", so we search instead of matching the whole string.
 */
export function extractInstagramLink(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(IG_URL);
  if (match) return match[0];
  return SHORTCODE.test(trimmed) ? trimmed : null;
}

/** Short label for a link, e.g. "instagram.com/reel/Cxsli_pqWSS". */
export function shortLinkLabel(link: string): string {
  return link.replace(/^https?:\/\/(www\.|m\.)?/, '').replace(/\?.*$/, '').replace(/\/$/, '');
}
