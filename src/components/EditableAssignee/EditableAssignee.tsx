/**
 * EditableAssignee — Portal-based assignee picker (F0.1)
 *
 * Portal pattern: createPortal to document.body, position:fixed with getBoundingClientRect,
 * capture-phase Escape handler (prevents parent modal closure).
 */
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';

export interface AssigneeOption {
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface EditableAssigneeProps {
  currentAssignee: string | null;
  options: AssigneeOption[];
  onSelect: (name: string | null) => void;
}

export const EditableAssignee = memo(function EditableAssignee({
  currentAssignee,
  options,
  onSelect,
}: EditableAssigneeProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toggle open/close
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(o => !o);
    setSearch('');
  }, []);

  // Close on outside click (capture mousedown anywhere outside the portal/trigger)
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        portalRef.current && !portalRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  // Close on Escape at CAPTURE phase (prevents parent modal closure)
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        setOpen(false);
      }
    };

    // Capture phase: true as third argument
    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [open]);

  // Auto-focus search input on open
  useEffect(() => {
    if (open && searchInputRef.current) {
      // Next tick to ensure DOM is ready
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  // Filter options
  const q = search.toLowerCase();
  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(q) ||
    (o.email && o.email.toLowerCase().includes(q))
  );

  // Position calculation
  const triggerRect = triggerRef.current?.getBoundingClientRect();
  const portalStyle: React.CSSProperties = triggerRect
    ? {
        position: 'fixed',
        top: `${triggerRect.bottom + 8}px`,
        left: `${Math.max(8, triggerRect.left)}px`,
        zIndex: 9999,
        width: 280,
      }
    : { display: 'none' };

  // Handle selection
  const handleSelect = useCallback(
    (name: string | null) => {
      onSelect(name);
      setOpen(false);
      setSearch('');
    },
    [onSelect]
  );

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        aria-label="Change assignee"
        title={currentAssignee || 'Unassigned'}
        style={{
          background: 'none',
          border: 'none',
          padding: '4px 8px',
          cursor: 'pointer',
          borderRadius: '3px',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--ds-text, #172B4D)',
          textAlign: 'left',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        {currentAssignee || 'Unassigned'}
      </button>

      {open &&
        createPortal(
          <div
            ref={portalRef}
            data-testid="assignee-picker-portal"
            style={portalStyle}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                background: 'var(--ds-surface, #FFFFFF)',
                borderRadius: 8,
                border: '1px solid var(--ds-border, #EBECF0)',
                boxShadow: '0 8px 24px rgba(9,30,66,0.15)',
                overflow: 'hidden',
              }}
            >
              {/* Search header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--ds-border, #EBECF0)',
                  background: 'var(--ds-surface-sunken, #F4F5F7)',
                }}
              >
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search people..."
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    fontWeight: 400,
                    color: 'var(--ds-text, #172B4D)',
                    background: 'transparent',
                    fontFamily: 'var(--cp-font-body)',
                  }}
                />
              </div>

              {/* Options list */}
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {/* Unassigned option */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleSelect(null);
                  }}
                  style={{
                    width: '100%',
                    display: 'block',
                    padding: '10px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    background:
                      currentAssignee === null
                        ? 'var(--ds-surface-sunken, #F4F5F7)'
                        : 'var(--ds-surface, #FFFFFF)',
                    textAlign: 'left',
                    fontFamily: 'var(--cp-font-body)',
                    fontSize: 14,
                    fontWeight: 400,
                    color: 'var(--ds-text, #172B4D)',
                    transition: 'background 150ms',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background =
                      'var(--ds-surface-sunken, #F4F5F7)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background =
                      currentAssignee === null
                        ? 'var(--ds-surface-sunken, #F4F5F7)'
                        : 'var(--ds-surface, #FFFFFF)';
                  }}
                >
                  Unassigned
                </button>

                {/* Assignee options */}
                {filtered.map(person => {
                  const isActive =
                    currentAssignee?.toLowerCase() ===
                    person.name.toLowerCase();
                  return (
                    <button
                      key={person.name}
                      onClick={e => {
                        e.stopPropagation();
                        handleSelect(person.name);
                      }}
                      style={{
                        width: '100%',
                        display: 'block',
                        padding: '10px 12px',
                        border: 'none',
                        cursor: 'pointer',
                        background: isActive
                          ? 'var(--ds-surface-sunken, #F4F5F7)'
                          : 'var(--ds-surface, #FFFFFF)',
                        textAlign: 'left',
                        fontFamily: 'var(--cp-font-body)',
                        fontSize: 14,
                        fontWeight: 400,
                        color: 'var(--ds-text, #172B4D)',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background =
                          'var(--ds-surface-sunken, #F4F5F7)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = isActive
                          ? 'var(--ds-surface-sunken, #F4F5F7)'
                          : 'var(--ds-surface, #FFFFFF)';
                      }}
                    >
                      <div style={{ marginBottom: 2 }}>
                        {person.name}
                      </div>
                      {person.email && (
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--ds-text-subtlest, #5E6C84)',
                          }}
                        >
                          {person.email}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Empty state */}
                {filtered.length === 0 && search.length > 0 && (
                  <div
                    style={{
                      padding: '16px 12px',
                      textAlign: 'center',
                      color: 'var(--ds-text-subtlest, #5E6C84)',
                      fontSize: 13,
                    }}
                  >
                    No matches found
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});
