import { useLocation } from 'react-router-dom';
import '../../shared/tokens/workhub-tokens.css';

const titleMap: Record<string, string> = {
  'hierarchy-mapping': 'Hierarchy Mapping',
  'scheduling-rules': 'Scheduling Rules',
  'status-mapping': 'Status Mapping',
  'user-mapping': 'User Mapping',
  'data-scope': 'Data Scope',
  'sync-logs': 'Sync & Logs',
};

export function WorkHubComingSoon() {
  const location = useLocation();
  const segment = location.pathname.split('/').pop() || '';
  const title = titleMap[segment] || 'Settings';

  return (
    <div className="wh-page">
      <h1 className="wh-page-title">{title}</h1>
      <p className="wh-page-subtitle">This section is under development and will be available in an upcoming release.</p>
      <div className="wh-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--wh-tx3)' }}>
          🚧 Coming soon
        </div>
      </div>
    </div>
  );
}

export default WorkHubComingSoon;
