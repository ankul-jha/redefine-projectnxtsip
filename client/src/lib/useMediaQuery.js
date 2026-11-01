import { useCallback, useSyncExternalStore } from 'react';

// Whether a media query matches, kept up to date as the window changes.
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (callback) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
