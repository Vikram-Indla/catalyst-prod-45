import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';

/**
 * ProdHub AppShell — Fixed layout wrapper with top nav, left sidebar, content area.
 * Uses CSS Grid: 56px top nav, 240px sidebar, remaining space for content.
 */
export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Sidebar />
      <main className="ml-60 mt-14 min-h-[calc(100vh-56px)]">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
