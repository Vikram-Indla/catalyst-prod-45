/**
 * Test Repository Page
 * Hierarchical test case organization with folders and suites
 */

import { RepositorySidebar } from '@/components/test-repository/RepositorySidebar';
import { RepositoryMainContent } from '@/components/test-repository/RepositoryMainContent';
import { TestDetailDrawer } from '@/components/test-repository/TestDetailDrawer';
import { RepositoryContextMenu } from '@/components/test-repository/RepositoryContextMenu';
import { useRepositoryStore } from '@/stores/repositoryStore';

export default function TestRepositoryPage() {
  const { contextMenuTarget, closeContextMenu } = useRepositoryStore();

  return (
    <div className="flex h-[calc(100vh-48px)] bg-background">
      {/* Sidebar - 300px */}
      <RepositorySidebar />

      {/* Main Content */}
      <RepositoryMainContent />

      {/* Test Detail Drawer */}
      <TestDetailDrawer />

      {/* Context Menu */}
      {contextMenuTarget && (
        <RepositoryContextMenu
          target={contextMenuTarget}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
