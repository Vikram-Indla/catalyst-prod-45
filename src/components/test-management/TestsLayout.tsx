import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { TabNavigation } from './TabNavigation';
import { Breadcrumbs } from './Breadcrumbs';
import { QuickCreateDropdown } from './QuickCreateDropdown';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';

export function TestsLayout() {
  const { programId } = useParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  
  useNavigationGuard();

  // Global keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Ctrl+/ for shortcuts modal
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header with breadcrumbs and actions */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <Breadcrumbs />
          <div className="flex items-center gap-3">
            <QuickCreateDropdown />
          </div>
        </div>
        
        {/* Tab Navigation */}
        <TabNavigation programId={programId!} />
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      {/* Modals */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
