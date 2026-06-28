/**
 * ArtefactPickerModal — lets the user select which epic artefacts
 * to use for story generation (description, PDF attachments).
 *
 * Shows checkboxes for each available source. Disables "Generate"
 * if nothing is selected. Shows "not enough details" if no artefacts exist.
 */
import React, { useEffect, useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Checkbox from '@atlaskit/checkbox';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PdfAttachment {
  id: string;
  file_name: string;
  file_size: number | null;
  jira_attachment_id: string | null;
}

interface ArtefactPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  epicId: string | null | undefined;
  epicKey: string | null | undefined;
  hasDescription: boolean;
  onGenerate: (selectedSources: string[], attachmentIds: string[]) => void;
  isGenerating: boolean;
}

export function ArtefactPickerModal({
  isOpen,
  onClose,
  epicId,
  epicKey,
  hasDescription,
  onGenerate,
  isGenerating,
}: ArtefactPickerModalProps) {
  const [useDescription, setUseDescription] = useState(true);
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(new Set());

  // Fetch PDF attachments for this epic
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['epic-pdf-attachments', epicId],
    enabled: !!epicId && isOpen,
    staleTime: 30_000,
    queryFn: async (): Promise<PdfAttachment[]> => {
      const { data } = await (supabase as any)
        .from('ph_attachments')
        .select('id, file_name, file_size, jira_attachment_id')
        .eq('work_item_id', epicId!)
        .like('mime_type', '%pdf%')
        .order('created_at', { ascending: false });
      return (data ?? []) as PdfAttachment[];
    },
  });

  // Auto-select all attachments when they load
  useEffect(() => {
    if (attachments.length > 0) {
      setSelectedAttachments(new Set(attachments.map((a) => a.id)));
    }
  }, [attachments]);

  const hasAnySource = hasDescription || attachments.length > 0;
  const hasSelection = (useDescription && hasDescription) || selectedAttachments.size > 0;

  const toggleAttachment = (id: string) => {
    const next = new Set(selectedAttachments);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAttachments(next);
  };

  const handleGenerate = () => {
    const sources: string[] = [];
    if (useDescription && hasDescription) sources.push('description');
    if (selectedAttachments.size > 0) sources.push('attachments');
    onGenerate(sources, [...selectedAttachments]);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Generate stories from epic documentation</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {!hasAnySource ? (
          <div style={{
            padding: 24,
            textAlign: 'center',
            color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
          }}>
            <p style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, margin: '0 0 8px' }}>
              Not enough details
            </p>
            <p style={{ fontSize: 'var(--ds-font-size-400)', margin: 0 }}>
              Add a description or attach PDF documentation to this epic before generating stories.
            </p>
          </div>
        ) : (
          <>
            <p style={{
              fontSize: 'var(--ds-font-size-400)',
              color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
              margin: '0 0 16px',
            }}>
              Select which artefacts to analyze for story generation:
            </p>

            {/* Description checkbox */}
            <div style={{
              padding: '8px 0',
              borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
            }}>
              <Checkbox
                isChecked={useDescription && hasDescription}
                isDisabled={!hasDescription}
                onChange={() => setUseDescription(!useDescription)}
                label={
                  <span style={{ fontSize: 'var(--ds-font-size-400)' }}>
                    Epic description
                    {!hasDescription && (
                      <span style={{
                        color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                        marginLeft: 8,
                        fontSize: 'var(--ds-font-size-200)',
                      }}>
                        (empty)
                      </span>
                    )}
                  </span>
                }
              />
            </div>

            {/* PDF attachments */}
            {isLoading ? (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <Spinner size="small" />
              </div>
            ) : attachments.length > 0 ? (
              <div style={{ padding: '8px 0' }}>
                <div style={{
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: 600,
                  color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                  textTransform: 'uppercase' as const,
                  letterSpacing: 0.5,
                  padding: '8px 0 4px',
                }}>
                  PDF Attachments ({attachments.length})
                </div>
                {attachments.map((att) => (
                  <div key={att.id} style={{
                    padding: '4px 0',
                    borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
                  }}>
                    <Checkbox
                      isChecked={selectedAttachments.has(att.id)}
                      onChange={() => toggleAttachment(att.id)}
                      label={
                        <span style={{ fontSize: 'var(--ds-font-size-400)' }}>
                          {att.file_name}
                          {att.file_size != null && (
                            <span style={{
                              color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                              marginLeft: 8,
                              fontSize: 'var(--ds-font-size-200)',
                            }}>
                              ({formatSize(att.file_size)})
                            </span>
                          )}
                        </span>
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '8px 0',
                color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                fontSize: 'var(--ds-font-size-400)',
              }}>
                No PDF attachments on this epic.
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={isGenerating}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={handleGenerate}
          isDisabled={!hasSelection || isGenerating || !hasAnySource}
          isLoading={isGenerating}
        >
          {isGenerating ? 'Generating…' : 'Generate stories'}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
