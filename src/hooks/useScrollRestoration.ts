import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook for scroll restoration that:
 * - Scrolls to top on forward navigation
 * - Restores scroll position on back/forward navigation
 */
export function useScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    // Check if this is a back/forward navigation
    const isBackForward = window.history.state?.idx !== undefined && 
                          window.history.state?.idx !== null;

    if (!isBackForward) {
      // New navigation - scroll to top
      window.scrollTo(0, 0);
    }
    // For back/forward navigation, browser handles scroll restoration automatically
  }, [location.pathname, location.search]);
}
