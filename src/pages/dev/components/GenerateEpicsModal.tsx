/**
 * Generate Epics Modal
 *
 * Shows:
 * 1. Project selector
 * 2. Generated Epic/Feature/Story hierarchy
 * 3. Approval/edit/reject controls for each item
 * 4. Success preview (mocked, no actual creation)
 */

import React, { useState } from 'react';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';
import Badge from '@atlaskit/badge';
import { Heading, Stack } from '@atlaskit/primitives';

interface GenerateEpicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemKey: string;
}

interface GeneratedItem {
  id: string;
  key?: string;
  title: string;
  type: 'epic' | 'feature' | 'story';
  parentId?: string;
  approved: boolean;
  confidence: number;
  sourceReferences: string[];
}

const MOCK_GENERATED_ITEMS: GeneratedItem[] = [
  {
    id: 'epic-1',
    title: 'Renew Industrial License Online',
    type: 'epic',
    approved: true,
    confidence: 98,
    sourceReferences: ['BR-104 description', 'PDF: BRD-Arabic.pdf', 'Figma: Renewal Flow'],
  },
  {
    id: 'feature-1',
    parentId: 'epic-1',
    title: 'Applicant Renewal Submission',
    type: 'feature',
    approved: true,
    confidence: 96,
    sourceReferences: ['BR-104 description', 'Comments: requirement clarification'],
  },
  {
    id: 'story-1',
    parentId: 'feature-1',
    title: 'Submit renewal request',
    type: 'story',
    approved: true,
    confidence: 94,
    sourceReferences: ['BRD-Arabic.pdf', 'Figma flow step 1'],
  },
  {
    id: 'story-2',
    parentId: 'feature-1',
    title: 'Upload required documents',
    type: 'story',
    approved: true,
    confidence: 92,
    sourceReferences: ['BRD-English.pdf', 'Comments: scope change'],
  },
  {
    id: 'story-3',
    parentId: 'feature-1',
    title: 'Save renewal draft',
    type: 'story',
    approved: true,
    confidence: 91,
    sourceReferences: ['BRD-Arabic.pdf'],
  },
  {
    id: 'story-4',
    parentId: 'feature-1',
    title: 'Validate Arabic and English applicant data',
    type: 'story',
    approved: true,
    confidence: 89,
    sourceReferences: ['Comment: Decision on Arabic+English', 'BRD'],
  },
  {
    id: 'feature-2',
    parentId: 'epic-1',
    title: 'Back Office Review',
    type: 'feature',
    approved: true,
    confidence: 95,
    sourceReferences: ['BR-104 description', 'back-office-review-screen.png'],
  },
  {
    id: 'story-5',
    parentId: 'feature-2',
    title: 'Review submitted renewal request',
    type: 'story',
    approved: true,
    confidence: 93,
    sourceReferences: ['Screenshot', 'BRD'],
  },
  {
    id: 'story-6',
    parentId: 'feature-2',
    title: 'Return request for correction',
    type: 'story',
    approved: true,
    confidence: 90,
    sourceReferences: ['BRD-English.pdf'],
  },
  {
    id: 'story-7',
    parentId: 'feature-2',
    title: 'Capture reviewer decision comments',
    type: 'story',
    approved: true,
    confidence: 88,
    sourceReferences: ['Comment: decision workflow'],
  },
  {
    id: 'feature-3',
    parentId: 'epic-1',
    title: 'Renewal Decision and Notification',
    type: 'feature',
    approved: true,
    confidence: 94,
    sourceReferences: ['BR-104 description', 'Comment: notification requirement'],
  },
  {
    id: 'story-8',
    parentId: 'feature-3',
    title: 'Approve renewal request',
    type: 'story',
    approved: true,
    confidence: 91,
    sourceReferences: ['BRD'],
  },
  {
    id: 'story-9',
    parentId: 'feature-3',
    title: 'Reject renewal request with reason',
    type: 'story',
    approved: true,
    confidence: 90,
    sourceReferences: ['BRD'],
  },
  {
    id: 'story-10',
    parentId: 'feature-3',
    title: 'Notify applicant in Arabic and English',
    type: 'story',
    approved: true,
    confidence: 89,
    sourceReferences: ['Comment: Arabic+English decision', 'BRD'],
  },
];

const PROJECT_OPTIONS = [
  { label: 'Product Modernization', value: 'prod-mod' },
  { label: 'Industrial Services', value: 'ind-svc' },
  { label: 'Licensing Platform', value: 'lic-plat' },
];

export function GenerateEpicsModal({
  isOpen,
  onClose,
  itemKey,
}: GenerateEpicsModalProps) {
  const [stage, setStage] = useState<'project-select' | 'preview' | 'success'>(
    'project-select'
  );
  const [selectedProject, setSelectedProject] = useState<typeof PROJECT_OPTIONS[0] | null>(null);
  const [items, setItems] = useState(MOCK_GENERATED_ITEMS);
  const approvedCount = items.filter((i) => i.approved).length;

  const handleProjectSelect = () => {
    if (selectedProject) {
      setStage('preview');
    }
  };

  const toggleApproval = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, approved: !item.approved } : item
      )
    );
  };

  const handleCreateAll = () => {
    setStage('success');
  };

  const getIndent = (type: string) => {
    return type === 'epic' ? 0 : type === 'feature' ? 20 : 40;
  };

  const typeIcon: Record<string, string> = {
    epic: '🔵',
    feature: '🟢',
    story: '◻️',
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal
          onClose={onClose}
          width="xlarge"
          shouldScrollInViewport
          header={{
            title: 'Generate Epics from Evidence',
          }}
          actions={
            stage === 'project-select'
              ? [
                  { text: 'Cancel', onClick: onClose },
                  {
                    text: 'Next',
                    onClick: handleProjectSelect,
                    appearance: 'primary',
                    isDisabled: !selectedProject,
                  },
                ]
              : stage === 'preview'
              ? [
                  { text: 'Back', onClick: () => setStage('project-select') },
                  {
                    text: `Create All (${approvedCount} items)`,
                    onClick: handleCreateAll,
                    appearance: 'primary',
                  },
                ]
              : [
                  { text: 'Close', onClick: onClose, appearance: 'primary' },
                ]
          }
        >
          {stage === 'project-select' && (
            <div style={{ padding: '24px 0' }}>
              <Heading as="h3" level="h500" style={{ marginBottom: 16 }}>
                Select Destination Project
              </Heading>
              <Select
                options={PROJECT_OPTIONS}
                value={selectedProject}
                onChange={(option) => setSelectedProject(option as typeof PROJECT_OPTIONS[0])}
                placeholder="Choose a project..."
              />
              <div style={{ marginTop: 16, padding: '12px', backgroundColor: 'var(--ds-background-success, #DFFCF0)', borderRadius: '4px' }}>
                <strong>Evidence Summary:</strong>
                <div style={{ fontSize: 'var(--ds-font-size-300)', marginTop: 8, color: 'var(--ds-text, #172B4D)' }}>
                  Expected output: <strong>12 draft work items</strong> (1 Epic + 3 Features + 8 Stories)
                </div>
              </div>
            </div>
          )}

          {stage === 'preview' && (
            <div style={{ padding: '24px 0' }}>
              <div style={{ marginBottom: 16 }}>
                <Heading as="h3" level="h500">
                  Generated Hierarchy — {selectedProject?.label}
                </Heading>
                <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-icon-subtle, #626F86)', marginTop: 4 }}>
                  {approvedCount} of {items.length} items approved for creation
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '400px', overflowY: 'auto' }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px',
                      backgroundColor: item.approved ? 'var(--ds-background-success, #DFFCF0)' : 'var(--ds-surface-sunken, #F7F8F9)',
                      borderRadius: '4px',
                      border: `1px solid ${item.approved ? 'var(--ds-background-success-bold, #1F845A)' : 'var(--ds-border, #DFE1E6)'}`,
                      marginLeft: `${getIndent(item.type)}px`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <input
                        type="checkbox"
                        checked={item.approved}
                        onChange={() => toggleApproval(item.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 'var(--ds-font-size-600)' }}>{typeIcon[item.type]}</span>
                      <strong style={{ flex: 1 }}>{item.title}</strong>
                      <Badge appearance="default">{item.confidence}%</Badge>
                    </div>
                    <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle, #626F86)', marginLeft: 30 }}>
                      <strong>Source:</strong> {item.sourceReferences.join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === 'success' && (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>✨</div>
              <Heading as="h3" level="h500" style={{ marginBottom: 8 }}>
                Ready to Create
              </Heading>
              <p style={{ color: 'var(--ds-icon-subtle, #626F86)', marginBottom: 20 }}>
                {approvedCount} draft work items would be created in {selectedProject?.label}.
              </p>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--ds-background-success, #DFFCF0)',
                  borderRadius: '4px',
                  border: '1px solid #4CE97', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--ds-font-size-700)' }}>✅</span>
                  <span style={{ color: 'var(--ds-text-success, #216E4E)', fontWeight: 500 }}>
                    In production, these items would now be created as drafts in your project.
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle, #626F86)' }}>
                This is a prototype. Actual creation is mocked.
              </p>
            </div>
          )}
        </Modal>
      )}
    </ModalTransition>
  );
}
