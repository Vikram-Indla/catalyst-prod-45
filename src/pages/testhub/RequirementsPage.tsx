/**
 * Requirements Page — TestHub Module
 * Route: /testhub/requirements
 */

import { Navigate } from 'react-router-dom';

export default function RequirementsPage() {
  return <Navigate to="/releases/rtm" replace />;
}
