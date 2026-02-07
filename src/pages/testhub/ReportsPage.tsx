/**
 * Reports Page — TestHub Module
 * Route: /testhub/reports
 */

import { Navigate } from 'react-router-dom';

export default function ReportsPage() {
  return <Navigate to="/releases/quality-gates" replace />;
}
