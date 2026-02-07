/**
 * Execution Hub Page — TestHub Module
 * Route: /testhub/execution
 */

import { Navigate } from 'react-router-dom';

export default function ExecutionHubPage() {
  return <Navigate to="/releases/execution" replace />;
}
