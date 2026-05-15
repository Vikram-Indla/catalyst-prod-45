import React, { useState, useEffect, useRef } from 'react';
import { Popup } from '@atlaskit/popup';
import { IconButton } from '@atlaskit/button';
import InfoIcon from '@atlaskit/icon/core/info';

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      trigger={(triggerProps) => (
        <IconButton
          {...triggerProps}
          ref={triggerRef}
          appearance="subtle"
          icon={InfoIcon}
          aria-label="Status information"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
        />
      )}
      content={() => (
        <div
          data-testid="br-status-popover"
          className="p-4 rounded-lg max-w-sm space-y-3"
          style={{ backgroundColor: 'var(--ds-surface)' }}
        >
          <h3 className="font-semibold text-base" style={{ color: 'var(--ds-text)' }}>
            {status.name}
          </h3>

          {status.owner_name && (
            <div className="text-sm">
              <div className="font-medium" style={{ color: 'var(--ds-text-subtlest)' }}>
                Owner
              </div>
              <div style={{ color: 'var(--ds-text)' }}>{status.owner_name}</div>
            </div>
          )}

          {status.entry_criteria && (
            <div className="text-sm">
              <div className="font-medium" style={{ color: 'var(--ds-text-subtlest)' }}>
                Entry Criteria
              </div>
              <div style={{ color: 'var(--ds-text)' }}>{status.entry_criteria}</div>
            </div>
          )}

          {status.exit_criteria && (
            <div className="text-sm">
              <div className="font-medium" style={{ color: 'var(--ds-text-subtlest)' }}>
                Exit Criteria
              </div>
              <div style={{ color: 'var(--ds-text)' }}>{status.exit_criteria}</div>
            </div>
          )}

          {status.expected_outputs && (
            <div className="text-sm">
              <div className="font-medium" style={{ color: 'var(--ds-text-subtlest)' }}>
                Expected Outputs
              </div>
              <div style={{ color: 'var(--ds-text)' }}>{status.expected_outputs}</div>
            </div>
          )}

          {status.impacted_roles && status.impacted_roles.length > 0 && (
            <div className="text-sm">
              <div className="font-medium" style={{ color: 'var(--ds-text-subtlest)' }}>
                Impacted Roles
              </div>
              <ul className="mt-1 space-y-1">
                {status.impacted_roles.map((role) => (
                  <li key={role} style={{ color: 'var(--ds-text)' }}>
                    • {role}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.activities && status.activities.length > 0 && (
            <div className="text-sm">
              <div className="font-medium" style={{ color: 'var(--ds-text-subtlest)' }}>
                Activities
              </div>
              <ul className="mt-1 space-y-1">
                {status.activities.map((activity) => (
                  <li key={activity} style={{ color: 'var(--ds-text)' }}>
                    • {activity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.risks && (
            <div className="text-sm">
              <div className="font-medium" style={{ color: 'var(--ds-text-subtlest)' }}>
                Risks
              </div>
              <div style={{ color: 'var(--ds-text)' }}>{status.risks}</div>
            </div>
          )}
        </div>
      )}
    />
  );
}
