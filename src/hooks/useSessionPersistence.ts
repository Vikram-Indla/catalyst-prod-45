/**
 * Session Persistence Hook
 * Tracks and stores the last visited route for session continuity
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LAST_ROUTE_KEY = 'catalyst_last_route';
const EXCLUDED_ROUTES = ['/auth', '/submit-request', '/'];
const LAST_LOGIN_KEY = 'catalyst_last_login';
const LAST_LOGIN_DISPLAY_KEY = 'catalyst_last_login_display';

/**
 * Sanitizes a URL path to prevent encoding issues
 * - Decodes any double-encoded characters
 * - Ensures query params are properly separated
 */
function sanitizeRoutePath(path: string): string {
  try {
    // Decode any URL-encoded characters that shouldn't be in the path
    let sanitized = decodeURIComponent(path);
    
    // Ensure we don't have encoded question marks in the path portion
    const questionMarkIndex = sanitized.indexOf('?');
    if (questionMarkIndex === -1) {
      // No query string - check for encoded ? in path
      sanitized = sanitized.replace(/%3F/gi, '?');
    }
    
    // Remove any invalid characters that could cause routing issues
    sanitized = sanitized.replace(/[<>'"]/g, '');
    
    return sanitized;
  } catch {
    // If decoding fails, return original path
    return path;
  }
}

/**
 * Saves the current route to localStorage (excludes auth pages)
 */
export function useTrackLastRoute() {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    
    // Don't save auth-related routes
    if (!EXCLUDED_ROUTES.some(route => location.pathname === route || location.pathname.startsWith('/auth'))) {
      // Sanitize before storing
      const sanitizedPath = sanitizeRoutePath(currentPath);
      localStorage.setItem(LAST_ROUTE_KEY, sanitizedPath);
    }
  }, [location]);
}

/**
 * Gets the default home route after login.
 * Returns /for-you — the canonical landing route inside CatalystShell.
 * /home redirects to / which causes a double-hop blank-page race on first load.
 */
export function getLastRoute(): string {
  return '/for-you';
}

/**
 * Clears the last route from localStorage (call after successful redirect)
 */
export function clearLastRoute() {
  localStorage.removeItem(LAST_ROUTE_KEY);
}

/**
 * Called just before sign-in. Captures the previous login timestamp so it
 * can be displayed as a "You last signed in on…" Flag after redirect.
 */
export function captureLastLoginForDisplay() {
  const prev = localStorage.getItem(LAST_LOGIN_KEY);
  if (prev) {
    localStorage.setItem(LAST_LOGIN_DISPLAY_KEY, prev);
  }
}

/**
 * Called after successful sign-in. Records current time as the new last-login
 * baseline for the next session.
 */
export function storeCurrentLoginTime() {
  localStorage.setItem(LAST_LOGIN_KEY, new Date().toISOString());
}

/**
 * Reads and clears the pending last-login display value. Returns null if
 * this is the user's first ever sign-in (no baseline to show).
 */
export function consumeLastLoginDisplay(): string | null {
  const val = localStorage.getItem(LAST_LOGIN_DISPLAY_KEY);
  if (val) localStorage.removeItem(LAST_LOGIN_DISPLAY_KEY);
  return val;
}
