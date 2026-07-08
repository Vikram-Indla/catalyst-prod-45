/**
 * TranslatePreviewDialog — AR→EN preview-before-send
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S4b). Shared by the MessageComposer
 * (Tiptap chat surfaces) and the chat-v2 Composer: nothing is ever
 * translated blind, translation failure never blocks sending the original.
 */
import React, { useEffect, useState } from 'react';
import Button from '@atlaskit/button/new';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  /** Original (Arabic) text pending send; null = dialog closed. */
  original: string | null;
  onClose: () => void;
  onSendOriginal: () => void;
  onSendTranslated: (translated: string) => void;
}

export function TranslatePreviewDialog({ original, onClose, onSendOriginal, onSendTranslated }: Props) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!original) return;
    let stale = false;
    setTranslated(null);
    setError(null);
    void supabase.functions
      .invoke('ai-translate-field', { body: { text: original, target: 'en' } })
      .then(({ data, error }) => {
        if (stale) return;
        const t = (data as { translated?: string } | null)?.translated;
        if (error || !t) setError(error?.message ?? 'Translation failed');
        else setTranslated(t);
      });
    return () => {
      stale = true;
    };
  }, [original]);

  return (
    <ModalTransition>
      {original && (
        <ModalDialog onClose={onClose} width="medium">
          <ModalHeader>
            <ModalTitle>Send as English?</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>
                  Original
                </div>
                <div
                  dir="auto"
                  style={{
                    font: 'var(--ds-font-body)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    unicodeBidi: 'plaintext',
                    borderInlineStart: '2px solid var(--ds-border)',
                    paddingInlineStart: 8,
                  }}
                >
                  {original}
                </div>
              </div>
              <div>
                <div style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>
                  English
                </div>
                {error ? (
                  <div style={{ font: 'var(--ds-font-body)', color: 'var(--ds-text-danger)' }}>
                    {error} — you can still send the original.
                  </div>
                ) : translated ? (
                  <div
                    dir="auto"
                    style={{
                      font: 'var(--ds-font-body)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      borderInlineStart: '2px solid var(--ds-border-accent-magenta)',
                      paddingInlineStart: 8,
                    }}
                  >
                    {translated}
                  </div>
                ) : (
                  <Spinner size="small" />
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>
              Keep editing
            </Button>
            <Button appearance="subtle" onClick={onSendOriginal}>
              Send original
            </Button>
            <Button
              appearance="primary"
              isDisabled={!translated}
              onClick={() => translated && onSendTranslated(translated)}
            >
              Send English
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}

export default TranslatePreviewDialog;
