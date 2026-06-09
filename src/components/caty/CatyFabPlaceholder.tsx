/**
 * Caty FAB — placeholder.
 *
 * 2026-06-07: The `CatyWidget` component file was removed from
 * `src/components/caty-ai/` (only `CatyWidget.css` remains in the
 * folder), but this file's import wasn't cleaned up — causing a build
 * error after pulling from main. Stubbed the widget render here so the
 * dev server builds; the FAB button itself still renders. Restore the
 * widget mount once whatever component replaces `CatyWidget` is wired
 * back into `caty-ai/index.ts`.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { HubIcon } from '@/components/caty-ai/constants';
import '@/styles/caty.css';

export function CatyFabPlaceholder() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <button
        className={cn('caty-fab', isOpen && 'caty-fab-hidden')}
        aria-label="Open Caty AI Assistant"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="w-10 h-10">
          <HubIcon />
        </div>
      </button>
      {/* Widget render intentionally removed — see file header. */}
    </>
  );
}
