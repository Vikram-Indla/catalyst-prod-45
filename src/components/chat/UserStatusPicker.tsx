/**
 * UserStatusPicker — Modal for setting custom status (emoji + message).
 *
 * Features:
 *   - Emoji selector grid (preset availability states + custom)
 *   - Text input (max 50 chars, with char count)
 *   - Optional expiration picker (1h / 4h / 8h / till EOD / custom date)
 *   - Save / Clear buttons
 *   - Realtime validation
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <UserStatusPicker open={open} onClose={() => setOpen(false)} userId={uid} />
 *   <button onClick={() => setOpen(true)}>Set status</button>
 */

import React, { useState, useEffect } from 'react';
import Button from '@atlaskit/button/new';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import { useUserStatus } from '@/hooks/chat/useUserStatus';

const PRESET_EMOJIS = [
  { emoji: '🟢', label: 'In office' },
  { emoji: '🔵', label: 'Remote' },
  { emoji: '🟡', label: 'Away' },
  { emoji: '🟣', label: 'On leave' },
  { emoji: '⚪️', label: 'Custom' },
];

const EXPIRATION_OPTIONS = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: '8 hours', minutes: 480 },
  { label: 'Until EOD', minutes: 510 }, // till 5pm (assume 9am start)
  { label: 'None', minutes: 0 },
];

export interface UserStatusPickerProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSave?: (emoji: string, message: string) => void;
}

export function UserStatusPicker({
  open,
  onClose,
  userId,
  onSave,
}: UserStatusPickerProps) {
  const { emoji: currentEmoji, message: currentMessage, setStatus, clearStatus } = useUserStatus(userId);
  const [emoji, setEmoji] = useState(currentEmoji);
  const [message, setMessage] = useState(currentMessage);
  const [expireAfterMinutes, setExpireAfterMinutes] = useState(0);
  const [saving, setSaving] = useState(false);

  // Sync with current status when modal opens
  useEffect(() => {
    if (open) {
      setEmoji(currentEmoji);
      setMessage(currentMessage);
      setExpireAfterMinutes(0);
    }
  }, [open, currentEmoji, currentMessage]);

  const handleSave = async () => {
    if (!emoji) return;

    setSaving(true);
    try {
      let expiresAt: Date | null = null;
      if (expireAfterMinutes > 0) {
        expiresAt = new Date(Date.now() + expireAfterMinutes * 60000);
      }

      await setStatus(emoji, message, expiresAt);
      onSave?.(emoji, message);
      onClose();
    } catch (err) {
      console.error('[UserStatusPicker] save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await clearStatus();
      onClose();
    } catch (err) {
      console.error('[UserStatusPicker] clear failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalTransition>
      {open && (
        <Modal onClose={onClose} width="small" heading="Set your status">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '16px 0',
            }}
          >
            {/* Emoji selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 600,
                  color: 'var(--ds-text-subtle, #42526E)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Status
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                }}
              >
                {PRESET_EMOJIS.map(({ emoji: e, label }) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    title={label}
                    style={{
                      padding: '12px',
                      fontSize: 'var(--ds-font-size-800)',
                      border: emoji === e ? '2px solid var(--ds-link, #0052CC)' : '1px solid var(--ds-border, #DFE1E6)',
                      borderRadius: '6px',
                      background: emoji === e ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Message input */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 600,
                  color: 'var(--ds-text-subtle, #42526E)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Message
              </label>
              <Textfield
                value={message}
                onChange={(e) => setMessage(e.currentTarget.value.slice(0, 50))}
                placeholder="e.g., In a meeting"
                maxLength={50}
              />
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-text-subtlest, #6B778C)',
                  marginTop: '4px',
                }}
              >
                {message.length} / 50
              </div>
            </div>

            {/* Expiration selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 600,
                  color: 'var(--ds-text-subtle, #42526E)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Clear status after
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setExpireAfterMinutes(opt.minutes)}
                    style={{
                      padding: '8px 12px',
                      fontSize: 'var(--ds-font-size-300)',
                      border: expireAfterMinutes === opt.minutes ? '2px solid var(--ds-link, #0052CC)' : '1px solid var(--ds-border, #DFE1E6)',
                      borderRadius: '4px',
                      background: expireAfterMinutes === opt.minutes ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
                marginTop: '8px',
              }}
            >
              <Button onClick={onClose} appearance="subtle">
                Cancel
              </Button>
              <Button
                onClick={handleClear}
                isLoading={saving}
                appearance="subtle"
              >
                Clear
              </Button>
              <Button
                onClick={handleSave}
                isLoading={saving}
                appearance="primary"
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ModalTransition>
  );
}
