/**
 * My Test Scope Page
 * Route: /releases/my-scope
 */

import React from 'react';
import { MyTestScopeDashboard } from '@/features/my-test-scope';
import { useAuth } from '@/lib/auth';

export default function MyTestScopePage() {
  const { user } = useAuth();
  
  // Get display name from email
  const userName = user?.email?.split('@')[0] || 'Tester';

  return (
    <div className="h-full">
      <MyTestScopeDashboard userName={userName} />
    </div>
  );
}
