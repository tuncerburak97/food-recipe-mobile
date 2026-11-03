import { clearSharedPayloads, getSharedPayloads } from 'expo-sharing';

import { extractInstagramLink } from '@/lib/instagram';
import { setPendingShare } from '@/store/pending-share';

/**
 * Rewrites deep links before Expo Router handles them. When a Reel is shared to the app from Instagram
 * (or Safari), the share extension opens the app with an `expo-sharing` link; we pick the Instagram link
 * out of the shared text/URL and open the add flow with it, which fetches the reel right away.
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
  const link = extractInstagramLink(shared) ?? shared.trim();
  // Also kept aside: on first launch onboarding comes first, and the link opens right after it.
  if (link) setPendingShare(link);
  return link ? `/add?url=${encodeURIComponent(link)}&shared=1` : '/add';
}
