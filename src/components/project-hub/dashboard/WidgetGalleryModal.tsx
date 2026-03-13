/**
 * WidgetGalleryModal — Add/remove widgets from dashboard
 */
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
  if (!open) return null;

  const visibilityMap = new Map(widgets.map(w => [w.id, w.visible]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="relative flex flex-col"
        style={{
          width: 480,
          maxHeight: '80vh',
          background: 'var(--cp-float)',
          border: '1px solid var(--cp-bd)',
          borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--cp-bd)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cp-t1)', fontFamily: "'Sora', sans-serif" }}>
              Widget Gallery
            </div>
            <div style={{ fontSize: 11, color: 'var(--cp-t3)', marginTop: 2 }}>
              {WIDGET_REGISTRY.length} widgets available
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid var(--cp-bd)', background: 'transparent', cursor: 'pointer',
            }}
          >
            <X size={14} style={{ color: 'var(--cp-t3)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {WIDGET_GROUPS.map(group => (
            <div key={group.key}>
              <div
                className="uppercase tracking-wider mb-2"
                style={{ fontSize: 10, fontWeight: 700, color: 'var(--cp-t3)', letterSpacing: '0.06em' }}
              >
                {group.label}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {WIDGET_REGISTRY.filter(w => w.group === group.key).map(widget => {
                  const isVisible = visibilityMap.get(widget.id) ?? true;
                  return (
                    <label
                      key={widget.id}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 cursor-pointer transition-colors"
                      style={{
                        border: '1px solid var(--cp-bd)',
                        background: isVisible ? 'var(--cp-blue-wash)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => onToggleVisibility(widget.id)}
                        className="accent-blue-500"
                        style={{ width: 14, height: 14 }}
                      />
                      <div className="min-w-0">
                        <div className="truncate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-t1)' }}>
                          {widget.title}
                        </div>
                        {widget.subtitle && (
                          <div className="truncate" style={{ fontSize: 10, color: 'var(--cp-t3)' }}>
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
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--cp-bd)' }}>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5"
            style={{
              fontSize: 12, fontWeight: 600, color: 'var(--cp-err-text)',
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} />
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md"
            style={{
              fontSize: 12, fontWeight: 600, color: '#FFFFFF',
              background: 'var(--cp-blue)', border: 'none', cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
