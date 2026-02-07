/**
 * Test Sets Page — TestHub Module
 * Route: /testhub/test-sets
 */

import { Navigate } from 'react-router-dom';

export default function TestSetsPage() {
  return <Navigate to="/releases/test-plans" replace />;
}
