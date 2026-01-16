/**
 * Test Repository Page
 * Hierarchical test case organization with folders and suites
 */

import { RepositorySidebar } from '@/components/test-repository/RepositorySidebar';
import { RepositoryMainContent } from '@/components/test-repository/RepositoryMainContent';
import { TestDetailDrawer } from '@/components/test-repository/TestDetailDrawer';
import { RepositoryContextMenu } from '@/components/test-repository/RepositoryContextMenu';
import { useRepositoryStore } from '@/stores/repositoryStore';
import {
  NewFolderModal,
  NewSuiteModal,
  NewTestModal,
  MoveModal,
  DeleteConfirmModal,
} from '@/components/test-repository/modals';

export default function TestRepositoryPage() {
  const { 
    contextMenuTarget, 
    closeContextMenu,
    newFolderModalOpen,
    newSuiteModalOpen,
    newTestModalOpen,
    moveModalOpen,
    deleteModalOpen,
    modalTarget,
    closeModals,
    currentSuite,
  } = useRepositoryStore();

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

      {/* Modals */}
      <NewFolderModal
        open={newFolderModalOpen}
        onOpenChange={(open) => !open && closeModals()}
        parentFolderId={modalTarget?.parentId}
        parentFolderName={modalTarget?.name}
      />

      <NewSuiteModal
        open={newSuiteModalOpen}
        onOpenChange={(open) => !open && closeModals()}
        parentFolderId={modalTarget?.parentId}
        parentFolderName={modalTarget?.name}
      />

      {newTestModalOpen && currentSuite && (
        <NewTestModal
          open={newTestModalOpen}
          onOpenChange={(open) => !open && closeModals()}
          suiteId={currentSuite.id}
          suiteName={currentSuite.name}
        />
      )}

      {moveModalOpen && modalTarget && (
        <MoveModal
          open={moveModalOpen}
          onOpenChange={(open) => !open && closeModals()}
          itemId={modalTarget.id}
          itemName={modalTarget.name}
          itemType={modalTarget.type}
          currentParentId={modalTarget.parentId}
        />
      )}

      {deleteModalOpen && modalTarget && (
        <DeleteConfirmModal
          open={deleteModalOpen}
          onOpenChange={(open) => !open && closeModals()}
          itemId={modalTarget.id}
          itemName={modalTarget.name}
          itemType={modalTarget.type}
          childCount={modalTarget.childCount}
        />
      )}
    </div>
  );
}