import { Outlet, Navigate, useLocation } from 'react-router-dom';
import '../../shared/tokens/workhub-tokens.css';

export function WorkHubSettingsLayout() {
  const location = useLocation();
  const isRoot = location.pathname === '/admin/workhub' || location.pathname === '/admin/workhub/';

  if (isRoot) {
    return <Navigate to="jira-connection" replace />;
  }

  return <Outlet />;
}

export default WorkHubSettingsLayout;
