import React, { useState, useEffect } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';

interface LinkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, text?: string) => void;
  /** If true, shows a second field for link display text */
  withText?: boolean;
  initialUrl?: string;
  initialText?: string;
  title?: string;
}

export function LinkInputModal({
  isOpen,
  onClose,
  onConfirm,
  withText = false,
  initialUrl = 'https://',
  initialText = '',
  title = 'Insert link',
}: LinkInputModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setText(initialText);
    }
  }, [isOpen, initialUrl, initialText]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onConfirm(trimmed, withText ? text.trim() || undefined : undefined);
    onClose();
  };

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader hasCloseButton>
        <ModalTitle>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: 4,
              fontSize: 'var(--ds-font-size-300)',
              fontWeight: 600,
              color: 'var(--ds-text)',
            }}>
              URL
            </label>
            <Textfield
              value={url}
              onChange={(e) => setUrl((e.target as HTMLInputElement).value)}
              placeholder="https://"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            />
          </div>
          {withText && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: 4,
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 600,
                color: 'var(--ds-text)',
              }}>
                Display text
              </label>
              <Textfield
                value={text}
                onChange={(e) => setText((e.target as HTMLInputElement).value)}
                placeholder="Link text (optional)"
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              />
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>Cancel</Button>
        <Button appearance="primary" onClick={handleConfirm} isDisabled={!url.trim()}>
          Insert
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
