/**
 * WorkHubLayout — Main layout wrapper for all /projecthub/* routes
 * - Fixed sidebar (240px left)
 * - Top nav already provided by Catalyst shell
 * - Main content area with padding
 * - Responsive: sidebar collapses on mobile with hamburger
 * - Caty AI panel (380px right, toggle via sidebar or FAB)
 */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { WorkHubSidebar } from './WorkHubSidebar';
import { CatyPanel } from '../caty/CatyPanel';
import { CatyFAB } from '../caty/CatyFAB';
import '@/styles/workhub.module.css';

export function WorkHubLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [catyOpen, setCatyOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="workhub-module flex h-screen flex-col">
      {/* Sidebar (fixed, always at top after nav) */}
      <WorkHubSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        onNavigate={() => setIsMobileMenuOpen(false)}
        catyOpen={catyOpen}
        onCatyToggle={() => setCatyOpen(!catyOpen)}
      />

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          marginLeft: isMobile ? '0' : 'var(--wh-sidebar-width)',
          backgroundColor: 'var(--wh-bg)',
          paddingTop: '24px',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingBottom: '24px',
        }}
      >
        {/* Mobile Hamburger */}
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="absolute top-5 left-5 z-[var(--wh-z-sticky)] p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--wh-surface)',
              border: '1px solid var(--wh-border)',
            }}
          >
            <Menu className="w-5 h-5" style={{ color: 'var(--wh-text-primary)' }} />
          </button>
        )}

        {/* Child Routes */}
        <Outlet />
      </main>

      {/* Caty AI Panel */}
      <CatyPanel isOpen={catyOpen} onClose={() => setCatyOpen(false)} />

      {/* Caty FAB */}
      <CatyFAB isOpen={catyOpen} onClick={() => setCatyOpen(!catyOpen)} />
    </div>
  );
}
