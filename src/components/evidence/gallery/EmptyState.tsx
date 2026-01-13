// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

export const EmptyState: React.FC = () => (
  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
    <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
    <p className="text-muted-foreground mb-1">No evidence captured yet</p>
    <p className="text-sm text-muted-foreground/70">
      Use the upload zone above to add screenshots or files
    </p>
  </div>
);
