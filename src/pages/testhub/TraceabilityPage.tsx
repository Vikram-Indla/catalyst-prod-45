/**
 * Traceability Page — TestHub Module
 * Route: /testhub/traceability
 */

import { Navigate } from 'react-router-dom';

export default function TraceabilityPage() {
  return <Navigate to="/releases/coverage" replace />;
}
