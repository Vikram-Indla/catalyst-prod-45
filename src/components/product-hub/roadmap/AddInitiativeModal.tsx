/**
 * Product Roadmap — Add Initiative Modal (640px centered, backdrop blur)
 * Polish: focus trap, Escape closes, scale animation, success toast
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { INK, SURFACE, FONT, TYPE_COLORS } from './constants/roadmap.constants';
import { useBacklogItemsNotOnRoadmap, useAddToRoadmap } from './hooks/useRoadmapData';
import { toast } from 'sonner';

interface AddInitiativeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddInitiativeModal({ isOpen, onClose }: AddInitiativeModalProps) {
  const [search, setSearch] = useState('');
  const { data: backlogItems = [], isLoading, error } = useBacklogItemsNotOnRoadmap();
  const addMutation = useAddToRoadmap();
  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return backlogItems;
    const s = search.toLowerCase();
    return backlogItems.filter((i: any) =>
      i.title.toLowerCase().includes(s) || i.key.toLowerCase().includes(s) || (i.titleAr && i.titleAr.includes(s))
    );
  }, [backlogItems, search]);

  const handleAdd = async (id: string, title: string) => {
    await addMutation.mutateAsync(id);
    toast.success(`Added "${title}" to roadmap`, { duration: 3000 });
  };

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const modal = modalRef.current;
    // Auto-focus search
    setTimeout(() => searchRef.current?.focus(), 50);

    const trapHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trapHandler);
    return () => document.removeEventListener('keydown', trapHandler);
  }, [isOpen]);

  // Reset search on close
  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop — blur */}
      <div
        onClick={onClose}
        className="animate-fade-in"
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 300 }}
      />

      {/* Modal — scale entrance */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add initiative to roadmap"
        className="animate-scale-in"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 640, maxWidth: '90vw', maxHeight: '80vh',
          background: 'var(--bg-app, #FFFFFF)', borderRadius: 12, border: `1px solid ${SURFACE.border}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', zIndex: 301,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: FONT.body,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${SURFACE.borderLight}` }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: INK[1], margin: 0 }}>Add Initiative to Roadmap</h2>
            <p style={{ fontSize: 12, fontWeight: 500, color: INK[3], margin: 0, marginTop: 2 }}>Select from existing backlog initiatives</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', background: 'transparent', color: INK[4], transition: 'background-color 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.borderLight)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3" style={{ borderBottom: `1px solid ${SURFACE.borderLight}` }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: INK[4] }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search backlog initiatives..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
              style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, color: INK[1] }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto roadmap-scroll">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: INK[4] }} />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <AlertCircle size={32} style={{ color: '#EF4444', marginBottom: 8 }} />
              <span style={{ fontSize: 13, color: '#EF4444' }}>Failed to load backlog items</span>
            </div>
          )}

          {!isLoading && !error && filtered.map((item: any) => {
            const typeColor = TYPE_COLORS[item.type]?.solid || 'var(--fg-3, #94A3B8)';
            const isOnRoadmap = item.alreadyOnRoadmap;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-6 py-3 cursor-pointer"
                style={{ borderBottom: `1px solid ${SURFACE.borderLight}`, transition: 'background-color 0.15s ease', opacity: isOnRoadmap ? 0.6 : 1 }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = SURFACE.page)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div className="w-1 rounded" style={{ height: 32, background: typeColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, color: '#2563EB' }}>{item.key}</span>
                    <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: INK[1] }}>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
                    {item.status && (
                      <span style={{ fontSize: 10, fontWeight: 500, color: INK[3], background: SURFACE.borderLight, borderRadius: 4, padding: '1px 6px' }}>{item.status}</span>
                    )}
                    {item.owner && (
                      <span style={{ fontSize: 10, fontWeight: 500, color: INK[4] }}>{item.owner}</span>
                    )}
                    {item.titleAr && item.titleAr !== item.title && (
                      <span dir="rtl" style={{ fontSize: 10, color: INK[4] }}>{item.titleAr}</span>
                    )}
                  </div>
                </div>
                {isOnRoadmap ? (
                  <span
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md"
                    style={{ color: '#16A34A', border: '1px solid #BBF7D0', background: 'var(--tint-green, #F0FDF4)' }}
                  >
                    <CheckCircle2 size={12} /> On Roadmap
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(item.id, item.title)}
                    disabled={addMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
                    style={{ color: '#2563EB', border: '1px solid #BFDBFE', background: 'var(--tint-blue, #EFF6FF)', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={e => { if (!addMutation.isPending) e.currentTarget.style.backgroundColor = '#DBEAFE'; }}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--tint-blue, #EFF6FF)')}
                  >
                    {addMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
                  </button>
                )}
              </div>
            );
          })}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Search size={32} style={{ color: INK[4], marginBottom: 8 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: INK[3] }}>
                {backlogItems.length === 0 ? 'All initiatives are already on the roadmap' : 'No matching initiatives found'}
              </span>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
