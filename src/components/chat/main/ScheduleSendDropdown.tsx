/**
 * ScheduleSendDropdown — triggers beside the Send button to schedule message delivery.
 *
 * UI: DropdownMenu with preset times (Send now, 1h, Tomorrow 9am) + Custom option
 * opens a modal with date + time picker. Returns a timestamp via onSchedule callback.
 *
 * Design: ADS DropdownMenu pattern + @atlaskit/modal-dialog for custom picker.
 */
import React, { useState, useCallback } from 'react';
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from '@atlaskit/dropdown-menu';
import ModalDialog, {
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { DatePicker } from '@atlaskit/datetime-picker';

export interface ScheduleSendDropdownProps {
  onSchedule: (scheduledFor: string | null) => void | Promise<void>;
  disabled?: boolean;
}

export function ScheduleSendDropdown({
  onSchedule,
  disabled = false,
}: ScheduleSendDropdownProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [customTime, setCustomTime] = useState('09:00');

  const now = new Date();

  const handleSendNow = useCallback(async () => {
    await onSchedule(null);
  }, [onSchedule]);

  const handleSend1h = useCallback(async () => {
    const scheduled = new Date(now.getTime() + 60 * 60 * 1000);
    await onSchedule(scheduled.toISOString());
  }, [now, onSchedule]);

  const handleSendTomorrow = useCallback(async () => {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    await onSchedule(tomorrow.toISOString());
  }, [now, onSchedule]);

  const handleCustomSubmit = useCallback(async () => {
    if (!customDate) return;
    const [hours, minutes] = customTime.split(':').map(Number);
    const scheduled = new Date(customDate);
    scheduled.setHours(hours, minutes, 0, 0);
    await onSchedule(scheduled.toISOString());
    setShowCustomModal(false);
    setCustomDate(null);
    setCustomTime('09:00');
  }, [customDate, customTime, onSchedule]);

  return (
    <>
      <DropdownMenu
        trigger={({ triggerRef, isSelected, testId, ...providedProps }: any) => (
          // Render-prop trigger: passing a <button> element directly makes
          // DropdownMenu wrap it in its own button → invalid nested <button>.
          // isSelected/testId are Atlaskit-internal, not DOM attributes.
          <button
            {...providedProps}
            data-testid={testId}
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
              border: 'none',
              borderRadius: '3px',
              background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
              color: 'var(--ds-text, #172B4D)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 500,
              opacity: disabled ? 0.5 : 1,
            }}
            disabled={disabled}
            aria-label="Schedule send options"
            title="Schedule send"
          >
            <span aria-hidden>▾</span>
          </button>
        )}
        placement="bottom-end"
        spacing="compact"
      >
        <DropdownItemGroup>
          <DropdownItem onClick={handleSendNow}>Send now</DropdownItem>
          <DropdownItem onClick={handleSend1h}>Send in 1 hour</DropdownItem>
          <DropdownItem onClick={handleSendTomorrow}>Send tomorrow at 9 AM</DropdownItem>
        </DropdownItemGroup>
        <DropdownItemGroup>
          <DropdownItem onClick={() => setShowCustomModal(true)}>
            Send at custom time
          </DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>

      {showCustomModal && (
        <ModalDialog
          onClose={() => setShowCustomModal(false)}
          width="small"
        >
          <ModalHeader>
            <ModalTitle>Schedule message</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                Date
              </label>
              <DatePicker
                value={customDate}
                onChange={(date) => setCustomDate(date)}
                locale="en-US"
                minDate={new Date()}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 600,
                  marginBottom: '4px',
                  color: 'var(--ds-text, #172B4D)',
                }}
              >
                Time (24h format)
              </label>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                style={{
                  padding: '8px',
                  fontSize: 'var(--ds-font-size-400)',
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  borderRadius: '3px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              appearance="subtle"
              onClick={() => setShowCustomModal(false)}
            >
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleCustomSubmit}
              isDisabled={!customDate}
            >
              Schedule
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </>
  );
}

export default ScheduleSendDropdown;
