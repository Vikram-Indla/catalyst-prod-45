/**
 * TestHub Dashboard Page
 * Route: /testhub/dashboard
 */

import { Navigate } from 'react-router-dom';

export default function TestHubDashboardPage() {
  return <Navigate to="/releases/command-center" replace />;
}
