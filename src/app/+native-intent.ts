import { clearSharedPayloads, getSharedPayloads } from 'expo-sharing';

import { extractVideoLink } from '@/lib/instagram';
import { setPendingShare } from '@/store/pending-share';

/**
 * Rewrites deep links before Expo Router handles them. When a video is shared to the app from Instagram,
 * YouTube (or Safari), the share extension opens the app with an `expo-sharing` link; we pick the Instagram link
 * out of the shared text/URL: a reel is saved in the background (/import), anything else opens the add flow.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // A recipe someone shared: https://<server>/t/<token> (opened by the app as a universal link).
  const recipeToken = sharedToken(path);
  if (recipeToken) {
    // Kept aside too: on first launch onboarding comes first, and the recipe opens right after it.
    setPendingShare(`shared:${recipeToken}`);
    return `/shared/${recipeToken}`;
  }
  try {
    if (new URL(path).hostname !== 'expo-sharing') return path;
  } catch {
    return path; // relative paths like "/recipe/12" are not URLs
  }

  const payloads = getSharedPayloads();
  clearSharedPayloads();
  const shared = payloads
    .filter((p) => p.shareType === 'url' || p.shareType === 'text')
    .map((p) => p.value ?? '')
    .join(' ');
  const link = extractVideoLink(shared) ?? shared.trim();
  // Also kept aside: on first launch onboarding comes first, and the link opens right after it.
  if (link) setPendingShare(link);
  // A reel goes to the quick path (saved in the background, back to Instagram); anything else to "Tarif ekle".
  if (!link) return '/add';
  return extractVideoLink(link) ? `/import?url=${encodeURIComponent(link)}` : `/add?url=${encodeURIComponent(link)}&shared=1`;
}

/** The token of a shared recipe's web link ("https://<server>/t/<token>" or "/t/<token>"). */
function sharedToken(path: string): string | null {
  const match = path.match(/^(?:https?:\/\/[^/]+)?\/t\/([A-Za-z0-9]{6,40})\/?(?:[?#].*)?$/);
  return match ? match[1] : null;
}
