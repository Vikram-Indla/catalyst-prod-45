/**
 * Session Persistence Hook
 * Tracks and stores the last visited route for session continuity
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LAST_ROUTE_KEY = 'catalyst_last_route';
const EXCLUDED_ROUTES = ['/auth', '/request-access', '/'];

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
 * Gets the last visited route from localStorage (sanitized)
 */
export function getLastRoute(): string {
  const stored = localStorage.getItem(LAST_ROUTE_KEY);
  if (!stored) return '/home';
  
  // Sanitize the stored route before returning
  return sanitizeRoutePath(stored);
}

/**
 * Clears the last route from localStorage (call after successful redirect)
 */
export function clearLastRoute() {
  localStorage.removeItem(LAST_ROUTE_KEY);
}
