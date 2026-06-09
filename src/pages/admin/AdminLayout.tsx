import { Outlet } from 'react-router-dom';

const T = {
  border: 'var(--ds-border, #DCDFE4)',
  bgPage: 'var(--ds-background-accent-gray-subtlest, #F7F8F9)',
};

export function AdminLayout() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgPage }}>
      <Outlet />
    </div>
  );
}
