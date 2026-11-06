const IG_URL = /https?:\/\/(?:www\.|m\.)?instagram\.com\/[^\s"'<>]+/i;
// youtube.com/shorts/…, youtube.com/watch?v=…, youtu.be/…, m.youtube.com, live and embed links.
const YT_URL = /(?:https?:\/\/)?(?:(?:www|m)\.)?(?:youtube\.com\/(?:shorts\/|watch\?\S*?v=|live\/|embed\/)|youtu\.be\/)[\w-]{11}[^\s"'<>]*/i;
const SHORTCODE = /^[A-Za-z0-9_-]{10,64}$/; // same rule as the backend

/**
 * Finds a video link the app can turn into a recipe (Instagram or YouTube, or a bare Instagram
 * shortcode) in pasted text. The share sheet sends text like "Bu tarife bak! https://… çok kolay",
 * so we search instead of matching the whole string.
 */
export function extractVideoLink(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const ig = trimmed.match(IG_URL);
  if (ig) return ig[0];
  const yt = trimmed.match(YT_URL);
  if (yt) return yt[0].includes('://') ? yt[0] : `https://${yt[0]}`;
  return SHORTCODE.test(trimmed) ? trimmed : null;
}

/** A YouTube link, or the "yt_" shortcode the server gives YouTube videos. */
export function isYouTube(linkOrShortcode: string | undefined): boolean {
  if (!linkOrShortcode) return false;
  return linkOrShortcode.startsWith('yt_') || YT_URL.test(linkOrShortcode);
}

/** "YouTube" or "Instagram", for labels such as "YouTube’da izle". */
export function sourceName(linkOrShortcode: string | undefined): 'YouTube' | 'Instagram' {
  return isYouTube(linkOrShortcode) ? 'YouTube' : 'Instagram';
}

/** Short label for a link, e.g. "instagram.com/reel/Cxsli_pqWSS". */
export function shortLinkLabel(link: string): string {
  return link.replace(/^https?:\/\/(www\.|m\.)?/, '').replace(/\?.*$/, '').replace(/\/$/, '');
}
