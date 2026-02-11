/**
 * WorkHubDrawer — Slide-in drawer for detail views
 * - 480px wide, slides in from right, z-index 500
 * - Backdrop click or ESC closes
 */

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface WorkHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function WorkHubDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 480,
}: WorkHubDrawerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--wh-z-drawer)] bg-black/30 transition-opacity"
        style={{ zIndex: 'calc(var(--wh-z-drawer) - 1)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-screen bg-white border-l flex flex-col shadow-xl animate-in slide-in-from-right duration-200"
        style={{
          width: `${width}px`,
          borderColor: 'var(--wh-border)',
          zIndex: 'var(--wh-z-drawer)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-6 border-b"
          style={{ borderColor: 'var(--wh-border)' }}
        >
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--wh-text-primary)' }}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm mt-1" style={{ color: 'var(--wh-text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--wh-text-secondary)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="p-6 border-t sticky bottom-0"
            style={{ borderColor: 'var(--wh-border)', backgroundColor: 'var(--wh-surface)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
