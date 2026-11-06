import { clearSharedPayloads, getSharedPayloads } from 'expo-sharing';

import { extractVideoLink } from '@/lib/instagram';
import { setPendingShare } from '@/store/pending-share';

/**
 * Rewrites deep links before Expo Router handles them. When a video is shared to the app from Instagram,
 * YouTube (or Safari), the share extension opens the app with an `expo-sharing` link; we pick the Instagram link
 * out of the shared text/URL: a reel is saved in the background (/import), anything else opens the add flow.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
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
