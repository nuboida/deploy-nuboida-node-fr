import { useEffect, useRef } from 'react';
import { updateLastActivity } from '../services/api';

interface UseTokenRefreshOptions {
  /** Whether token refresh is enabled (only for sessions WITHOUT Remember Me) */
  enabled: boolean;
  /** Callback when token refresh fails (user should be logged out) */
  onRefreshFailed?: () => void;
}

/**
 * Hook to handle automatic JWT token refresh
 *
 * For sessions WITHOUT "Remember Me":
 * - Tokens expire after ~15 minutes of inactivity
 * - This hook extends the session by updating last activity every 5 minutes
 * - If user is active, the idle timeout hook will also update activity
 *
 * For sessions WITH "Remember Me":
 * - 30-day expiration handled separately
 * - This hook is disabled
 *
 * @example
 * ```tsx
 * useTokenRefresh({
 *   enabled: isSignedIn && !hasRememberMe,
 *   onRefreshFailed: () => handleLogout(),
 * });
 * ```
 */
export function useTokenRefresh({
  enabled,
  onRefreshFailed,
}: UseTokenRefreshOptions): void {
  const onRefreshFailedRef = useRef(onRefreshFailed);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref updated
  useEffect(() => {
    onRefreshFailedRef.current = onRefreshFailed;
  }, [onRefreshFailed]);

  useEffect(() => {
    if (!enabled) {
      // Clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    console.log('[useTokenRefresh] Starting token refresh interval (every 5 minutes)');

    // Update activity immediately on mount
    updateLastActivity();

    // Set up interval to update last activity every 5 minutes
    // This keeps the session alive as long as the user has the app open
    refreshIntervalRef.current = setInterval(() => {
      console.log('[useTokenRefresh] Updating last activity timestamp');
      updateLastActivity();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        console.log('[useTokenRefresh] Clearing token refresh interval');
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [enabled]);
}
