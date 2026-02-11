/**
 * InlineThemeEditor — Floating dropdown for theme assignment
 */

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useWHThemes } from '@/hooks/workhub/useThemes';
import { useUpdateWorkItem } from '@/hooks/workhub/useWorkItems';
import { toast } from 'sonner';

interface InlineThemeEditorProps {
  itemId: string;
  currentThemeId: string | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function InlineThemeEditor({ itemId, currentThemeId, anchorEl, onClose }: InlineThemeEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: themes } = useWHThemes();
  const updateItem = useUpdateWorkItem();

  // Position below anchor
  const rect = anchorEl?.getBoundingClientRect();
  const top = rect ? rect.bottom + 4 : 0;
  const left = rect ? rect.left : 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSelect = (themeId: string | null) => {
    updateItem.mutate(
      { id: itemId, field: 'theme_id', value: themeId },
      {
        onSuccess: () => {
          toast.success(themeId ? 'Theme assigned' : 'Theme removed');
          onClose();
        },
      }
    );
  };

  return (
    <div
      ref={ref}
      className="fixed bg-white rounded-lg border overflow-y-auto"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        minWidth: '200px',
        maxHeight: '240px',
        zIndex: 'var(--wh-z-dropdown)',
        boxShadow: 'var(--wh-shadow-lg)',
        borderColor: 'var(--wh-border)',
      }}
    >
      {/* None option */}
      <button
        onClick={() => handleSelect(null)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
        style={{ color: 'var(--wh-text-secondary)' }}
      >
        <span className="italic">None</span>
        {!currentThemeId && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary)' }} />}
      </button>

      {(themes ?? []).map(t => (
        <button
          key={t.id}
          onClick={() => handleSelect(t.id)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
          style={{ color: 'var(--wh-text-primary)' }}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
            {t.name}
          </span>
          {currentThemeId === t.id && <Check className="w-3.5 h-3.5" style={{ color: 'var(--wh-primary)' }} />}
        </button>
      ))}
    </div>
  );
}
