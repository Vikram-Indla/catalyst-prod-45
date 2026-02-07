/**
 * Defects Page — TestHub Module
 * Route: /testhub/defects
 */

import { Navigate } from 'react-router-dom';

export default function DefectsPage() {
  return <Navigate to="/releases/defects" replace />;
}
