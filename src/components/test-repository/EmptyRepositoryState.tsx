/**
 * Empty Repository State
 * Shown when nothing is selected
 */

import { FolderTree } from 'lucide-react';

export function EmptyRepositoryState() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
      <FolderTree className="w-16 h-16 mb-4 opacity-30" />
      <p className="text-sm font-medium mb-1">Select a folder or test suite</p>
      <p className="text-xs">Choose an item from the sidebar to view its contents</p>
    </main>
  );
}
