import React, { useState, useRef } from 'react';
import { X, Flag, Trash2, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onSetStatus: (statusId: string) => void;
  onSetPriority: (priority: string) => void;
  onFlag: () => void;
  onDelete: () => void;
  statuses: { id: string; name: string; category: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748B', in_progress: '#2563EB', done: '#16A34A', terminal: '#DC2626',
};

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export function BulkActionsBar({
  selectedCount, onClear, onSetStatus, onSetPriority, onFlag, onDelete, statuses,
}: BulkActionsBarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const statusRef = useRef<HTMLButtonElement>(null);
  const priorityRef = useRef<HTMLButtonElement>(null);

  if (selectedCount === 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-4"
      style={{
        height: 40, background: '#2563EB', borderRadius: '6px 6px 0 0',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <span className="text-[12px] font-semibold text-white mr-2">{selectedCount} selected</span>

      {/* Status */}
      <div className="relative">
        <button
          ref={statusRef}
          onClick={() => { setStatusOpen(!statusOpen); setPriorityOpen(false); }}
          className="h-[28px] px-2.5 text-[11px] font-medium rounded text-white hover:bg-white/20 transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.3)' }}
        >
          Set Status
        </button>
        {statusOpen && (
          <div
            className="absolute left-0 top-full mt-1 rounded-md py-1"
            style={{ width: 160, background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', zIndex: 9999 }}
          >
            {statuses.map(s => (
              <button
                key={s.id}
                onClick={() => { onSetStatus(s.id); setStatusOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#F8FAFC] text-left"
                style={{ color: '#0F172A' }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.category] || '#94A3B8' }} />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority */}
      <div className="relative">
        <button
          ref={priorityRef}
          onClick={() => { setPriorityOpen(!priorityOpen); setStatusOpen(false); }}
          className="h-[28px] px-2.5 text-[11px] font-medium rounded text-white hover:bg-white/20 transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.3)' }}
        >
          Set Priority
        </button>
        {priorityOpen && (
          <div
            className="absolute left-0 top-full mt-1 rounded-md py-1"
            style={{ width: 140, background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', zIndex: 9999 }}
          >
            {PRIORITIES.map(p => (
              <button
                key={p}
                onClick={() => { onSetPriority(p); setPriorityOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F8FAFC]"
                style={{ color: '#0F172A' }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Flag */}
      <button
        onClick={onFlag}
        className="h-[28px] px-2.5 text-[11px] font-medium rounded text-white hover:bg-white/20 transition-colors flex items-center gap-1"
        style={{ border: '1px solid rgba(255,255,255,0.3)' }}
      >
        <Flag size={11} /> Flag
      </button>

      {/* Delete */}
      <div className="relative">
        {deleteConfirm ? (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-white/80">Confirm?</span>
            <button
              onClick={() => { onDelete(); setDeleteConfirm(false); }}
              className="h-[28px] px-2 text-[11px] font-semibold rounded bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="h-[28px] px-2 text-[11px] rounded text-white/70 hover:text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="h-[28px] px-2.5 text-[11px] font-medium rounded text-white hover:bg-white/20 transition-colors flex items-center gap-1"
            style={{ border: '1px solid rgba(255,255,255,0.3)' }}
          >
            <Trash2 size={11} /> Delete
          </button>
        )}
      </div>

      <div className="flex-1" />

      {/* Clear */}
      <button
        onClick={onClear}
        className="h-[28px] px-2 text-[11px] font-medium rounded text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1"
      >
        <X size={12} /> Clear
      </button>
    </div>
  );
}
