/**
 * A link shared into the app (Instagram → Paylaş → this app). The share opens "Tarif ekle" right away;
 * this keeps the link in case the add screen cannot open yet (first launch: onboarding comes first),
 * so it opens as soon as the user is in the app. Lives for as long as the app process does.
 */
let pending: string | null = null;
let sharedThisSession = false;

export function setPendingShare(link: string) {
  pending = link;
  sharedThisSession = true;
}

/** Returns the waiting link once and forgets it. */
export function takePendingShare(): string | null {
  const link = pending;
  pending = null;
  return link;
}

/** True when the app was opened or brought forward by a share in this session. */
export function wasSharedThisSession(): boolean {
  return sharedThisSession;
}
