import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';

/**
 * AppShell — 48px dark top nav, 220px sidebar, content fills remaining space.
 * Height: 100vh, overflow hidden. Content: calc(100vh - 48px).
 */
export function AppShell() {
  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <TopNav />
      <Sidebar />
      <main style={{
        marginLeft: 220,
        marginTop: 48,
        height: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
