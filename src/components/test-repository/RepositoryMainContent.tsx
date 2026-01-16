/**
 * Repository Main Content
 * Shows folder summary or suite details with test list
 */

import { useRepositoryStore } from '@/stores/repositoryStore';
import { SuiteContentView } from './SuiteContentView';
import { FolderContentView } from './FolderContentView';
import { EmptyRepositoryState } from './EmptyRepositoryState';

export function RepositoryMainContent() {
  const { selectedId, selectedType, currentSuite } = useRepositoryStore();

  if (!selectedId) {
    return <EmptyRepositoryState />;
  }

  if (selectedType === 'suite' && currentSuite) {
    return <SuiteContentView suite={currentSuite} />;
  }

  if (selectedType === 'folder') {
    return <FolderContentView folderId={selectedId} />;
  }

  return <EmptyRepositoryState />;
}
