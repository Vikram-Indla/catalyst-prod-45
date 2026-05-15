import React, { useState, useEffect, useRef } from 'react';

interface WorkflowStatus {
  id: string;
  scheme_id: string;
  name: string;
  slug: string;
  category: 'todo' | 'in_progress' | 'done';
  color: string;
  position: number;
  is_initial: boolean;
  is_final: boolean;
  is_active: boolean;
  wip_limit: number | null;
  slug_aliases: string[];
  owner_name?: string;
  entry_criteria?: string;
  exit_criteria?: string;
  expected_outputs?: string;
  impacted_roles?: string[];
  activities?: string[];
  risks?: string;
  backward_routes?: string[];
  next_movements?: string[];
}

interface BRStatusEducationalPopoverProps {
  status: WorkflowStatus;
}

export function BRStatusEducationalPopover({ status }: BRStatusEducationalPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        aria-label="Status information"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        style={{
          appearance: 'none',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          borderRadius: '3px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ds-text-subtlest, #6B778C)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </button>

      {/* Always in DOM so data-testid is queryable; content conditionally rendered so text is absent when closed */}
      <div
        ref={popoverRef}
        data-testid="br-status-popover"
        role="tooltip"
        style={{
          display: isOpen ? 'block' : 'none',
          position: 'absolute',
          zIndex: 400,
          top: '100%',
          left: 0,
          marginTop: '4px',
          backgroundColor: 'var(--ds-surface)',
          borderRadius: '4px',
          boxShadow: 'var(--ds-shadow-overlay, 0 4px 8px rgba(9,30,66,0.25))',
          padding: '16px',
          width: '320px',
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {isOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--ds-text)',
              }}
            >
              {status.name}
            </h3>

            {status.owner_name && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 500, color: 'var(--ds-text-subtlest)' }}>Owner</div>
                <div style={{ color: 'var(--ds-text)' }}>{status.owner_name}</div>
              </div>
            )}

            {status.entry_criteria && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 500, color: 'var(--ds-text-subtlest)' }}>
                  Entry Criteria
                </div>
                <div style={{ color: 'var(--ds-text)' }}>{status.entry_criteria}</div>
              </div>
            )}

            {status.exit_criteria && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 500, color: 'var(--ds-text-subtlest)' }}>
                  Exit Criteria
                </div>
                <div style={{ color: 'var(--ds-text)' }}>{status.exit_criteria}</div>
              </div>
            )}

            {status.expected_outputs && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 500, color: 'var(--ds-text-subtlest)' }}>
                  Expected Outputs
                </div>
                <div style={{ color: 'var(--ds-text)' }}>{status.expected_outputs}</div>
              </div>
            )}

            {status.impacted_roles && status.impacted_roles.length > 0 && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 500, color: 'var(--ds-text-subtlest)' }}>
                  Impacted Roles
                </div>
                <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none' }}>
                  {status.impacted_roles.map((role) => (
                    <li key={role} style={{ color: 'var(--ds-text)' }}>
                      • {role}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {status.activities && status.activities.length > 0 && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 500, color: 'var(--ds-text-subtlest)' }}>
                  Activities
                </div>
                <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none' }}>
                  {status.activities.map((activity) => (
                    <li key={activity} style={{ color: 'var(--ds-text)' }}>
                      • {activity}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {status.risks && (
              <div style={{ fontSize: '13px' }}>
                <div style={{ fontWeight: 500, color: 'var(--ds-text-subtlest)' }}>Risks</div>
                <div style={{ color: 'var(--ds-text)' }}>{status.risks}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
