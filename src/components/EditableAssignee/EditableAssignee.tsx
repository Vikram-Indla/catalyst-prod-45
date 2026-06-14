/**
 * EditableAssignee — Portal-based assignee picker (F0.1)
 *
 * Portal pattern: createPortal to document.body, position:fixed with getBoundingClientRect,
 * capture-phase Escape handler (prevents parent modal closure).
 */
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { PresenceRing } from '@/components/shared/PresenceRing';
import type { PresenceState } from '@/lib/presence';

export interface AssigneeOption {
  name: string;
  email?: string;
  avatarUrl?: string;
  /** Supabase auth user id — used to look up realtime presence ring. */
  userId?: string;
  /** Effective presence state from v_user_effective_status. */
  presenceState?: PresenceState | null;
  /** ISO date string (ends_at + 1 day) shown when presenceState === 'on_leave'. */
  backOn?: string | null;
  /** Caty-suggested backup when presenceState is on_leave (from user_availability.backup_user_id). */
  backupSuggestion?: { name: string; avatarUrl?: string | null } | null;
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
  const [leaveWarning, setLeaveWarning] = useState<{ name: string; backOn?: string | null } | null>(null);
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

  // Caty backup suggestion — show when current assignee is on_leave and has a backup
  const currentOption = options.find(o => o.name.toLowerCase() === currentAssignee?.toLowerCase());
  const catySuggestion = currentOption?.presenceState === 'on_leave'
    ? (currentOption?.backupSuggestion ?? null)
    : null;
  // Look up the backup person in options to get their actual presenceState
  const backupOption = catySuggestion
    ? options.find(o => o.name.toLowerCase() === catySuggestion.name.toLowerCase())
    : null;

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

  // Handle selection — shows a brief on-leave flash warning if the selected person is on leave
  const handleSelect = useCallback(
    (name: string | null) => {
      onSelect(name);
      if (name) {
        const person = options.find(o => o.name.toLowerCase() === name.toLowerCase());
        if (person?.presenceState === 'on_leave') {
          setLeaveWarning({ name, backOn: person.backOn ?? null });
          setTimeout(() => {
            setLeaveWarning(null);
            setOpen(false);
            setSearch('');
          }, 2000);
          return;
        }
      }
      setOpen(false);
      setSearch('');
    },
    [onSelect, options]
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
                background: 'var(--ds-surface, #ffffff)',
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

              {/* On-leave assignment warning flash */}
              {leaveWarning && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    padding: '8px 12px',
                    background: 'var(--ds-background-warning, #FFF7D6)',
                    borderBottom: `1px solid var(--ds-border-warning, #F8E6A0)`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <span style={{ color: 'var(--ds-icon-warning, #D97008)', flexShrink: 0, fontSize: 16, lineHeight: '20px' }}>⚠</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
                      {leaveWarning.name} is on leave
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)' }}>
                      {leaveWarning.backOn ? `Back ${leaveWarning.backOn}. ` : ''}You can still assign.
                    </div>
                  </div>
                </div>
              )}

              {/* Options list */}
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>

                {/* Caty backup suggestion — only when current assignee is on leave */}
                {catySuggestion && (
                  <div style={{ padding: '4px 12px' }}>
                    {/* AI section label */}
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--ds-text-subtlest, #6B778C)',
                      marginBottom: 4,
                      letterSpacing: '0.04em',
                    }}>
                      ✦ Caty suggests
                    </div>
                    {/* Rainbow-bordered suggestion button — CLAUDE.md AI CTA carve-out */}
                    <div style={{
                      background: `conic-gradient(from 0deg, #FF3CAC 0deg, #784BA0 60deg, #2B86C5 120deg, #00C9FF 180deg, #92FE9D 240deg, #FFD700 300deg, #FF3CAC 360deg)`,
                      animation: 'none',
                      padding: 1.8,
                      borderRadius: 20,
                    }}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleSelect(catySuggestion.name);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: 8,
                          border: 'none',
                          borderRadius: 17,
                          cursor: 'pointer',
                          background: '#FFFFFF',
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--ds-text, #172B4D)',
                          textAlign: 'left',
                        }}
                      >
                        <PresenceRing
                          name={catySuggestion.name}
                          src={catySuggestion.avatarUrl ?? null}
                          size="small"
                          state={backupOption?.presenceState ?? null}
                        />
                        <span>{catySuggestion.name}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Unassigned option */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleSelect(null);
                  }}
                  style={{
                    width: '100%',
                    display: 'block',
                    padding: '8px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    background:
                      currentAssignee === null
                        ? 'var(--ds-surface-sunken, #F4F5F7)'
                        : 'var(--ds-surface, #ffffff)',
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
                        : 'var(--ds-surface, #ffffff)';
                  }}
                >
                  Unassigned
                </button>

                {/* Assignee options */}
                {filtered.map(person => {
                  const isActive =
                    currentAssignee?.toLowerCase() ===
                    person.name.toLowerCase();
                  const isOnLeave = person.presenceState === 'on_leave';
                  return (
                    <button
                      key={person.name}
                      onClick={e => {
                        e.stopPropagation();
                        handleSelect(person.name);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        border: 'none',
                        cursor: 'pointer',
                        background: isActive
                          ? 'var(--ds-surface-sunken, #F4F5F7)'
                          : 'var(--ds-surface, #ffffff)',
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
                          : 'var(--ds-surface, #ffffff)';
                      }}
                    >
                      <PresenceRing
                        name={person.name}
                        src={person.avatarUrl ?? null}
                        size="small"
                        state={person.presenceState ?? null}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 400 }}>{person.name}</span>
                          {isOnLeave && person.backOn && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'var(--ds-background-danger, #FFECEB)',
                              color: 'var(--ds-icon-danger, #C9372C)',
                              padding: '0 8px',
                              borderRadius: 3,
                              fontSize: 11,
                              fontWeight: 600,
                            }}>
                              Back {person.backOn}
                            </span>
                          )}
                        </div>
                        {person.email && (
                          <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #5E6C84)' }}>
                            {person.email}
                          </div>
                        )}
                      </div>
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
