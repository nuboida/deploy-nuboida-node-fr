import { useEffect, useRef, useCallback, useState } from 'react';

interface UseIdleTimeoutOptions {
  /** Timeout in milliseconds before logout (default: 10 minutes) */
  timeout?: number;
  /** Time before timeout to show warning in milliseconds (default: 1 minute) */
  warningTime?: number;
  /** Callback when user is logged out due to inactivity */
  onTimeout: () => void;
  /** Callback when warning should be shown (optional) */
  onWarning?: () => void;
  /** Whether the timeout is enabled (default: true) */
  enabled?: boolean;
}

interface UseIdleTimeoutReturn {
  /** Whether the warning is currently showing */
  isWarning: boolean;
  /** Warning countdown duration in seconds (passed to modal) */
  warningSeconds: number;
  /** Reset the idle timer and restart from beginning */
  resetTimer: () => void;
  /** Clear the warning flag without restarting timers (user chose to stay) */
  clearWarning: () => void;
}

/**
 * Hook to handle auto-logout after user inactivity
 *
 * Tracks: mouse movement, clicks, keypresses, scroll, touch events
 *
 * @example
 * ```tsx
 * const { isWarning, warningSeconds } = useIdleTimeout({
 *   timeout: 10 * 60 * 1000, // 10 minutes
 *   warningTime: 60 * 1000,   // 1 minute warning
 *   onTimeout: () => handleLogout(),
 *   onWarning: () => showWarningToast(),
 *   enabled: isSignedIn,
 * });
 * ```
 */
export function useIdleTimeout({
  timeout = 10 * 60 * 1000, // 10 minutes default
  warningTime = 60 * 1000,  // 1 minute warning default
  onTimeout,
  onWarning,
  enabled = true,
}: UseIdleTimeoutOptions): UseIdleTimeoutReturn {
  const [isWarning, setIsWarning] = useState(false);

  // Use refs for callbacks and config to avoid re-creating timers
  const onTimeoutRef = useRef(onTimeout);
  const onWarningRef = useRef(onWarning);
  const timeoutRef = useRef(timeout);
  const warningTimeRef = useRef(warningTime);

  // Keep refs updated with latest values
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  useEffect(() => {
    timeoutRef.current = timeout;
  }, [timeout]);

  useEffect(() => {
    warningTimeRef.current = warningTime;
  }, [warningTime]);

  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningCalledRef = useRef(false);
  const isWarningRef = useRef(false);

  // Track warning state in ref for event handlers
  useEffect(() => {
    isWarningRef.current = isWarning;
  }, [isWarning]);

  // Store startTimers in a ref so it can be called from event handlers without causing re-renders
  const startTimersRef = useRef<() => void>(() => {});

  const clearAllTimers = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  // Update the startTimers function ref
  useEffect(() => {
    startTimersRef.current = () => {
      clearAllTimers();
      setIsWarning(false);
      warningCalledRef.current = false;

      const currentTimeout = timeoutRef.current;
      const currentWarningTime = warningTimeRef.current;

      // Set warning timer (fires when idle time reaches timeout - warningTime)
      if (currentWarningTime > 0 && currentWarningTime < currentTimeout) {
        warningTimerRef.current = setTimeout(() => {
          setIsWarning(true);
          if (onWarningRef.current && !warningCalledRef.current) {
            warningCalledRef.current = true;
            onWarningRef.current();
          }
        }, currentTimeout - currentWarningTime);
      }

      // Set logout timer (fires after full timeout)
      idleTimeoutRef.current = setTimeout(() => {
        clearAllTimers();
        onTimeoutRef.current();
      }, currentTimeout);
    };
  }, [clearAllTimers]);

  // Stable resetTimer function for external use
  const resetTimer = useCallback(() => {
    // Clear warning state and restart timers from beginning
    setIsWarning(false);
    warningCalledRef.current = false;
    startTimersRef.current();
  }, []);

  // Clear warning without restarting timers (user chose to stay signed in)
  const clearWarning = useCallback(() => {
    setIsWarning(false);
    warningCalledRef.current = false;
    // Don't restart timers - they continue from where they were
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setIsWarning(false);
      return;
    }

    // Events that indicate user activity
    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    // Track last activity time to throttle resets
    let lastActivityTime = Date.now();
    const throttleMs = 1000; // Only reset once per second max

    const handleActivity = () => {
      // Don't reset timer if warning is already showing
      // User must explicitly choose to stay or sign out
      if (isWarningRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastActivityTime >= throttleMs) {
        lastActivityTime = now;
        startTimersRef.current();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    startTimersRef.current();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [enabled, clearAllTimers]);

  return {
    isWarning,
    warningSeconds: Math.floor(warningTime / 1000),
    resetTimer,
    clearWarning,
  };
}
