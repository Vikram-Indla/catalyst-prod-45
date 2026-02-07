/**
 * Shared Steps Page — TestHub Module
 * Route: /testhub/shared-steps
 */

import { FolderTree } from 'lucide-react';

export default function SharedStepsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 p-8">
      <FolderTree className="w-16 h-16 mb-4 opacity-30" />
      <h2 className="text-lg font-semibold mb-2 text-foreground">Shared Steps Library</h2>
      <p className="text-sm text-center max-w-md">
        Create reusable test steps that can be included in multiple test cases. Coming soon.
      </p>
    </div>
  );
}
