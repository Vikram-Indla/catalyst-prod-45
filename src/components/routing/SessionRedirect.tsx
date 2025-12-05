/**
 * Session Redirect Component
 * Redirects to the last visited route on initial load
 */
import { Navigate } from 'react-router-dom';
import { getLastRoute, clearLastRoute } from '@/hooks/useSessionPersistence';

export function SessionRedirect() {
  const lastRoute = getLastRoute();
  
  // Clear after reading to prevent redirect loops
  clearLastRoute();
  
  return <Navigate to={lastRoute} replace />;
}
