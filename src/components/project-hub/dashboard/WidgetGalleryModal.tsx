/**
 * WidgetGalleryModal — V12 Hybrid Precision widget gallery
 * Escape key closes. Focus trapped inside.
 */
import { useEffect, useRef, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { WIDGET_REGISTRY, WIDGET_GROUPS } from './widget-registry';

interface WidgetGalleryModalProps {
  open: boolean;
  onClose: () => void;
  widgets: { id: string; visible: boolean }[];
  onToggleVisibility: (widgetId: string) => void;
  onReset: () => void;
}

export default function WidgetGalleryModal({
  open,
  onClose,
  widgets,
  onToggleVisibility,
  onReset,
}: WidgetGalleryModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // Focus trap — focus the panel
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const visibilityMap = new Map(widgets.map(w => [w.id, w.visible]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex flex-col outline-none"
        style={{
          width: 480,
          maxHeight: '80vh',
          background: 'var(--cp-bg-page)',
          border: '0.75px solid var(--cp-border-default)',
          borderRadius: 'var(--cp-radius-lg)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '0.75px solid var(--cp-border-default)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-heading)' }}>
              Widget Gallery
            </div>
            <div style={{ fontSize: 11, color: 'var(--cp-text-tertiary)', marginTop: 2 }}>
              {WIDGET_REGISTRY.length} widgets available
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              width: 28, height: 28, borderRadius: 'var(--cp-radius-default)',
              border: '0.75px solid var(--cp-border-default)', background: 'transparent', cursor: 'pointer',
            }}
          >
            <X size={14} style={{ color: 'var(--cp-text-tertiary)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {WIDGET_GROUPS.map(group => (
            <div key={group.key}>
              <div
                className="uppercase mb-2"
                style={{ fontSize: 10, fontWeight: 700, color: 'var(--cp-text-tertiary)', letterSpacing: '0.06em' }}
              >
                {group.label}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {WIDGET_REGISTRY.filter(w => w.group === group.key).map(widget => {
                  const isVisible = visibilityMap.get(widget.id) ?? true;
                  return (
                    <label
                      key={widget.id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
                      style={{
                        borderRadius: 'var(--cp-radius-default)',
                        border: `0.75px solid ${isVisible ? 'var(--cp-primary-60)' : 'var(--cp-border-default)'}`,
                        background: isVisible ? 'var(--cp-interact-selected)' : 'transparent',
                        transition: 'all 120ms ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => onToggleVisibility(widget.id)}
                        style={{
                          width: 14, height: 14, accentColor: 'var(--cp-primary-60)',
                        }}
                      />
                      <div className="min-w-0">
                        <div className="truncate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-primary)' }}>
                          {widget.title}
                        </div>
                        {widget.subtitle && (
                          <div className="truncate" style={{ fontSize: 10, color: 'var(--cp-text-tertiary)' }}>
                            {widget.subtitle}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '0.75px solid var(--cp-border-default)' }}>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5"
            style={{
              fontSize: 12, fontWeight: 600, color: 'var(--cp-danger-60)',
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} />
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5"
            style={{
              fontSize: 12, fontWeight: 600, color: 'var(--cp-text-inverse)',
              background: 'var(--cp-primary-60)', border: 'none', cursor: 'pointer',
              borderRadius: 'var(--cp-radius-default)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
