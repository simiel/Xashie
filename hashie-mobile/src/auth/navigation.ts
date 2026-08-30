import { router, type Href } from 'expo-router';

/**
 * Back buttons also need to work when a screen was opened directly or after a
 * redirect, when the navigation stack has no previous entry.
 */
export function goBackOrReplace(fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
