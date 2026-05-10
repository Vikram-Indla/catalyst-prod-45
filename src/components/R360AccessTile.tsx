import { Link } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyLeadProjects } from '@/hooks/useMyLeadProjects';

export function R360AccessTile() {
  const { canAccessEnterprise } = useUserRole();
  const { projects } = useMyLeadProjects();

  const { label, path } = canAccessEnterprise
    ? { label: 'Resource 360™', path: '/admin/resources' }
    : projects.length > 0
    ? { label: 'My Team', path: '/my-team' }
    : { label: 'My Resource 360°', path: '/me' };

  return (
    <Link
      to={path}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 4,
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        background: token('color.background.neutral.subtle', '#F4F5F7'),
        color: token('color.text', '#292A2E'),
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {label}
    </Link>
  );
}
