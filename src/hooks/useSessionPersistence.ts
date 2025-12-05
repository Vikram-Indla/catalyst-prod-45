/**
 * Session Persistence Hook
 * Tracks and stores the last visited route for session continuity
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LAST_ROUTE_KEY = 'catalyst_last_route';
const EXCLUDED_ROUTES = ['/auth', '/request-access', '/'];

/**
 * Saves the current route to localStorage (excludes auth pages)
 */
export function useTrackLastRoute() {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    
    // Don't save auth-related routes
    if (!EXCLUDED_ROUTES.some(route => location.pathname === route || location.pathname.startsWith('/auth'))) {
      localStorage.setItem(LAST_ROUTE_KEY, currentPath);
    }
  }, [location]);
}

/**
 * Gets the last visited route from localStorage
 */
export function getLastRoute(): string {
  return localStorage.getItem(LAST_ROUTE_KEY) || '/home';
}

/**
 * Clears the last route from localStorage (call after successful redirect)
 */
export function clearLastRoute() {
  localStorage.removeItem(LAST_ROUTE_KEY);
}
