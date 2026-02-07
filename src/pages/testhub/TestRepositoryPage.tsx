/**
 * Test Repository Page — TestHub Module
 * Route: /testhub/repository
 * 
 * Temporary placeholder that redirects to the mature releases test cases page.
 * This allows the TestHub navigation structure to exist while reusing existing functionality.
 */

import { Navigate } from 'react-router-dom';

export default function TestRepositoryPage() {
  // Redirect to existing test cases page in releases module
  return <Navigate to="/releases/test-cases" replace />;
}
