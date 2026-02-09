import { useLocation, Link } from 'react-router-dom';
import { FileText, List, Clock, Folder } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  count?: number;
}

interface TestHubSidebarProps {
  testCaseCount?: number;
  sharedStepCount?: number;
  testCycleCount?: number;
  releaseCount?: number;
}

export function TestHubSidebar({
  testCaseCount = 0,
  sharedStepCount = 0,
  testCycleCount = 0,
  releaseCount = 0,
}: TestHubSidebarProps) {
  const location = useLocation();

  const testManagementItems: NavItem[] = [
    {
      label: 'Test Cases',
      href: '/testhub/repository',
      icon: <FileText style={{ width: 16, height: 16 }} />,
      count: testCaseCount,
    },
    {
      label: 'Shared Steps',
      href: '/testhub/shared-steps',
      icon: <List style={{ width: 16, height: 16 }} />,
      count: sharedStepCount,
    },
    {
      label: 'Test Cycles',
      href: '/testhub/cycles',
      icon: <Clock style={{ width: 16, height: 16 }} />,
      count: testCycleCount,
    },
  ];

  const releaseItems: NavItem[] = [
    {
      label: 'All Releases',
      href: '/testhub/releases',
      icon: <Folder style={{ width: 16, height: 16 }} />,
      count: releaseCount,
    },
  ];

  const isActive = (href: string) => location.pathname === href;

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        padding: '0 16px',
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#64748B',
        }}>
          {title}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 36,
                padding: '0 16px',
                textDecoration: 'none',
                backgroundColor: active ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: active ? '#2563EB' : '#334155',
                borderRadius: 0,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{
                color: active ? '#2563EB' : '#64748B',
                marginRight: 12,
              }}>
                {item.icon}
              </span>
              <span style={{
                flex: 1,
                fontSize: 14,
                fontWeight: active ? 600 : 500,
              }}>
                {item.label}
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span style={{
                  minWidth: 24,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: 10,
                  backgroundColor: active ? '#2563EB' : '#E2E8F0',
                  color: active ? '#FFFFFF' : '#64748B',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{
      width: 220,
      backgroundColor: '#FFFFFF',
      borderRight: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      paddingTop: 16,
    }}>
      <NavSection title="Test Management" items={testManagementItems} />
      <NavSection title="Releases" items={releaseItems} />
    </div>
  );
}

export default TestHubSidebar;
