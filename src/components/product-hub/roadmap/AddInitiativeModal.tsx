/**
 * Product Roadmap — Add Initiative Modal (640px centered, backdrop blur)
 */
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus } from 'lucide-react';
import { INK, SURFACE, FONT, TYPE_COLORS } from './constants/roadmap.constants';

interface AddInitiativeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock backlog items not yet on roadmap
const BACKLOG_ITEMS = [
  { id: 'b1', key: 'MIM-020', title: 'Mobile App Development', titleAr: 'تطوير تطبيق الجوال', type: 'project' as const },
  { id: 'b2', key: 'MIM-021', title: 'API Gateway Upgrade', titleAr: 'ترقية بوابة API', type: 'enhancement' as const },
  { id: 'b3', key: 'MIM-022', title: 'Log Aggregation System', titleAr: 'نظام تجميع السجلات', type: 'improvement' as const },
  { id: 'b4', key: 'MIM-023', title: 'SSO Integration', titleAr: 'تكامل تسجيل الدخول الموحد', type: 'enhancement' as const },
  { id: 'b5', key: 'MIM-024', title: 'Disaster Recovery Plan', titleAr: 'خطة التعافي من الكوارث', type: 'project' as const },
];

export function AddInitiativeModal({ isOpen, onClose }: AddInitiativeModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return BACKLOG_ITEMS;
    const s = search.toLowerCase();
    return BACKLOG_ITEMS.filter(i => i.title.toLowerCase().includes(s) || i.key.toLowerCase().includes(s));
  }, [search]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 300 }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 640, maxWidth: '90vw', maxHeight: '80vh',
          background: '#FFFFFF', borderRadius: 12, border: `1px solid ${SURFACE.border}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', zIndex: 301,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: FONT.body,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${SURFACE.borderLight}` }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: INK[1], margin: 0 }}>Add Initiative to Roadmap</h2>
            <p style={{ fontSize: 12, color: INK[3], margin: 0, marginTop: 2 }}>Select from existing backlog initiatives</p>
          </div>
          <button onClick={onClose} className="flex items-center justify-center rounded-md hover:bg-gray-100" style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', background: 'transparent', color: INK[4] }}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3" style={{ borderBottom: `1px solid ${SURFACE.borderLight}` }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: INK[4] }} />
            <input
              type="text"
              placeholder="Search backlog initiatives..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full h-9 pl-10 pr-3 text-sm"
              style={{ border: `1px solid ${SURFACE.border}`, borderRadius: 6, outline: 'none', color: INK[1] }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(item => {
            const typeColor = TYPE_COLORS[item.type]?.solid || '#94A3B8';
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderBottom: `1px solid ${SURFACE.borderLight}` }}
              >
                <div className="w-1 rounded" style={{ height: 32, background: typeColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 600, color: typeColor }}>{item.key}</span>
                    <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: INK[1] }}>{item.title}</span>
                  </div>
                  <div dir="rtl" style={{ fontSize: 11, color: INK[4], marginTop: 1 }}>{item.titleAr}</div>
                </div>
                <button
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors hover:bg-blue-50"
                  style={{ color: '#2563EB', border: '1px solid #BFDBFE', background: '#EFF6FF' }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Search size={32} style={{ color: INK[4], marginBottom: 8 }} />
              <span style={{ fontSize: 13, color: INK[3] }}>No matching initiatives found</span>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
