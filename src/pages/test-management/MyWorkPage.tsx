/**
 * My Work Page
 * Route: /test-management/my-work
 */

import React from 'react';
import { MyWorkDashboard } from '@/modules/test-management/components';

export default function MyWorkPage() {
  return (
    <div className="h-full bg-background">
      <MyWorkDashboard />
    </div>
  );
}
