/**
 * LinkTypeDropdown — Direction-aware link type selector.
 * Fetches ALL link types from wh_link_types and generates inward/outward options.
 * Jira-parity: shows full list, keyboard accessible, no truncation.
 *
 * FR-5: Loads from server
 * FR-6: No truncation
 * FR-7: Scroll + keyboard
 * FR-8: Full object preserved
 * FR-9: Direction label shown
 * FR-10: Error + retry on load failure
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { useLinkTypes } from '@/hooks/useLinkedWorkItems';
import type { LinkTypeOption } from '@/services/linkedWorkItemsService';

interface LinkTypeDropdownProps {
  value: LinkTypeOption | null;
  onChange: (option: LinkTypeOption) => void;
  disabled?: boolean;
}

export function LinkTypeDropdown({ value, onChange, disabled }: LinkTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { options, isLoading, isError, refetch } = useLinkTypes();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusIdx < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-option]');
    items[focusIdx]?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open && focusIdx >= 0 && options[focusIdx]) {
        onChange(options[focusIdx]);
        setOpen(false);
      } else {
        setOpen(true);
        setFocusIdx(0);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); setFocusIdx(0); return; }
      setFocusIdx(prev => Math.min(prev + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusIdx(options.length - 1);
    }
  };

  const displayLabel = value?.label || (isLoading ? 'Loading...' : isError ? 'Error loading' : 'Select link type');

  return (
    <div ref={ref} className="relative" style={{ flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Link type"
        className="flex items-center gap-1.5 rounded transition-colors"
        style={{
          height: 36,
          padding: '0 10px',
          border: open ? '2px solid #4C9AFF' : isError ? '1px solid #DE350B' : '1px solid #DFE1E6',
          borderRadius: 3,
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          background: 'var(--cp-float, #fff)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: isError ? '#DE350B' : disabled ? '#A5ADBA' : '#172B4D',
          minWidth: 160,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayLabel}
        </span>
        <ChevronDown size={14} color="#6B778C" />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Link types"
          className="absolute left-0 overflow-hidden"
          style={{
            top: 'calc(100% + 2px)',
            minWidth: 220,
            background: 'var(--cp-float, #fff)',
            border: '1px solid #DFE1E6',
            borderRadius: 4,
            boxShadow: '0 4px 8px rgba(9,30,66,0.25)',
            zIndex: 60,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>Loading link types...</div>
          ) : isError ? (
            /* FR-10: Error + retry */
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} color="#DE350B" />
              <span style={{ flex: 1, fontSize: 13, color: '#DE350B' }}>Failed to load link types</span>
              <button
                onClick={(e) => { e.stopPropagation(); refetch(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 500, color: '#0052CC',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '2px 6px', borderRadius: 3,
                }}
                className="hover:bg-[#F4F5F7]"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : options.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>No link types available</div>
          ) : (
            options.map((opt, i) => {
              const isSelected = value?.label === opt.label && value?.linkTypeId === opt.linkTypeId;
              const isFocused = focusIdx === i;
              return (
                <div
                  key={`${opt.linkTypeId}-${opt.direction}`}
                  data-option
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  onMouseEnter={() => setFocusIdx(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 36,
                    padding: '0 12px',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#172B4D',
                    background: isSelected ? '#DEEBFF' : isFocused ? '#F4F5F7' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <span>{opt.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
