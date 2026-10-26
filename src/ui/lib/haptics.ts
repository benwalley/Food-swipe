/**
 * Short vibration where supported (Android). iOS Safari has no vibration API,
 * and browsers block it until the user has interacted with the page.
 */
export function tick(ms = 8): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // Only polish; never let it break a gesture.
  }
}
