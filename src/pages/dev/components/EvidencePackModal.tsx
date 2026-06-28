/**
 * Prepare Evidence Pack Modal
 *
 * Allows user to select which evidence to include:
 * - Current item details
 * - Attachments
 * - Figma/design evidence
 * - Comments
 * - Linked items
 * - Processing options
 */

import React, { useState } from 'react';
import Modal, { ModalTransition } from '@atlaskit/modal-dialog';
import { Checkbox } from '@atlaskit/checkbox';
import Button from '@atlaskit/button';
import { Heading } from '@atlaskit/primitives';
import Tabs, { TabList, TabPanel, Tab } from '@atlaskit/tabs';
import Badge from '@atlaskit/badge';

interface EvidenceItem {
  id: string;
  name: string;
  type: string;
  source: string;
  descriptor: string;
  language: string;
  included: boolean;
}

interface EvidencePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemKey: string;
}

const DESCRIPTORS = [
  'Source of truth',
  'Supporting document',
  'Process flow',
  'UI design',
  'Existing implementation',
  'Requirement clarification',
  'Decision',
  'Scope change',
  'Reference only',
  'Outdated / do not use',
];

export function EvidencePackModal({
  isOpen,
  onClose,
  onConfirm,
  itemKey,
}: EvidencePackModalProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([
    {
      id: 'br-desc',
      name: 'Business Request Description',
      type: 'text',
      source: itemKey,
      descriptor: 'Source of truth',
      language: 'en',
      included: true,
    },
    {
      id: 'attach-ar-pdf',
      name: 'Industrial-License-BRD-Arabic.pdf',
      type: 'attachment',
      source: `${itemKey} > Attachments`,
      descriptor: 'Source of truth',
      language: 'ar',
      included: true,
    },
    {
      id: 'attach-en-pdf',
      name: 'Renewal-Process-English.pdf',
      type: 'attachment',
      source: `${itemKey} > Attachments`,
      descriptor: 'Supporting document',
      language: 'en',
      included: true,
    },
    {
      id: 'attach-screenshot',
      name: 'back-office-review-screen.png',
      type: 'screenshot',
      source: `${itemKey} > Attachments`,
      descriptor: 'UI design',
      language: 'en',
      included: true,
    },
    {
      id: 'figma-ref',
      name: 'Industrial License Renewal Flow',
      type: 'figma',
      source: 'Figma Design System',
      descriptor: 'Process flow',
      language: 'en',
      included: true,
    },
    {
      id: 'comment-decision',
      name: 'Decision: Arabic + English support mandatory',
      type: 'comment',
      source: `${itemKey} > Comments`,
      descriptor: 'Decision',
      language: 'en',
      included: true,
    },
    {
      id: 'comment-scope',
      name: 'Scope change: Add phone OTP verification',
      type: 'comment',
      source: `${itemKey} > Comments`,
      descriptor: 'Scope change',
      language: 'en',
      included: true,
    },
    {
      id: 'comment-clarify',
      name: 'Clarification: ما هي متطلبات التحقق من الهوية؟',
      type: 'comment',
      source: `${itemKey} > Comments`,
      descriptor: 'Requirement clarification',
      language: 'ar',
      included: true,
    },
    {
      id: 'comment-question',
      name: 'Unresolved: Who owns the renewal approval workflow?',
      type: 'comment',
      source: `${itemKey} > Comments`,
      descriptor: 'Reference only',
      language: 'en',
      included: true,
    },
    {
      id: 'epic-link',
      name: 'Epic: License Management Overhaul',
      type: 'linked',
      source: `${itemKey} > Links`,
      descriptor: 'Requirement clarification',
      language: 'en',
      included: true,
    },
    {
      id: 'feature-link',
      name: 'Feature: Renewal Submission Portal',
      type: 'linked',
      source: `${itemKey} > Links`,
      descriptor: 'Source of truth',
      language: 'en',
      included: true,
    },
  ]);

  const toggleEvidence = (id: string) => {
    setEvidenceItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, included: !item.included } : item
      )
    );
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: 'var(--ds-link, #0052CC)',
      attachment: 'var(--ds-text-warning, #974F0C)',
      screenshot: 'var(--ds-text-success, #216E4E)',
      figma: '#9F8FEF', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      comment: '#E2622D', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      linked: 'var(--ds-icon-subtle, #626F86)',
    };
    return colors[type] || 'var(--ds-icon-subtle, #626F86)';
  };

  const includeCount = evidenceItems.filter((e) => e.included).length;

  return (
    <ModalTransition>
      {isOpen && (
        <Modal
          onClose={onClose}
          width="large"
          shouldScrollInViewport
          header={{
            title: 'Prepare Evidence Pack',
            subtitle:
              'Select the evidence Catalyst should use before extraction, indexing, and generation.',
          }}
          actions={[
            { text: 'Cancel', onClick: onClose },
            {
              text: 'Prepare Evidence Pack',
              onClick: onConfirm,
              appearance: 'primary',
            },
          ]}
        >
          <div style={{ padding: '16px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <strong>
                {includeCount} of {evidenceItems.length} items selected
              </strong>
            </div>

            <Tabs id="evidence-tabs" onChange={setSelectedTab} selected={selectedTab}>
              <TabList>
                <Tab>Current Item</Tab>
                <Tab>Attachments</Tab>
                <Tab>Figma / Design</Tab>
                <Tab>Comments</Tab>
                <Tab>Linked Items</Tab>
                <Tab>Options</Tab>
              </TabList>

              <TabPanel>
                <div style={{ padding: '16px 0' }}>
                  <EvidenceRow
                    item={evidenceItems.find((e) => e.id === 'br-desc')!}
                    onToggle={toggleEvidence}
                    getTypeColor={getTypeColor}
                  />
                </div>
              </TabPanel>

              <TabPanel>
                <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {evidenceItems
                    .filter((e) => e.type === 'attachment' || e.type === 'screenshot')
                    .map((item) => (
                      <EvidenceRow
                        key={item.id}
                        item={item}
                        onToggle={toggleEvidence}
                        getTypeColor={getTypeColor}
                      />
                    ))}
                </div>
              </TabPanel>

              <TabPanel>
                <div style={{ padding: '16px 0' }}>
                  <EvidenceRow
                    item={evidenceItems.find((e) => e.id === 'figma-ref')!}
                    onToggle={toggleEvidence}
                    getTypeColor={getTypeColor}
                  />
                </div>
              </TabPanel>

              <TabPanel>
                <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {evidenceItems
                    .filter((e) => e.type === 'comment')
                    .map((item) => (
                      <EvidenceRow
                        key={item.id}
                        item={item}
                        onToggle={toggleEvidence}
                        getTypeColor={getTypeColor}
                      />
                    ))}
                </div>
              </TabPanel>

              <TabPanel>
                <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {evidenceItems
                    .filter((e) => e.type === 'linked')
                    .map((item) => (
                      <EvidenceRow
                        key={item.id}
                        item={item}
                        onToggle={toggleEvidence}
                        getTypeColor={getTypeColor}
                      />
                    ))}
                </div>
              </TabPanel>

              <TabPanel>
                <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox isChecked={true} onChange={() => {}} />
                    <span>Arabic + English extraction</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox isChecked={true} onChange={() => {}} />
                    <span>Include comments intelligence</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox isChecked={true} onChange={() => {}} />
                    <span>Include linked items</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox isChecked={true} onChange={() => {}} />
                    <span>Include Figma/design evidence</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox isChecked={false} onChange={() => {}} />
                    <span>Generate documentation health report</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Checkbox isChecked={true} onChange={() => {}} />
                    <span>Prepare for Epic / Feature / Story generation</span>
                  </label>
                </div>
              </TabPanel>
            </Tabs>
          </div>
        </Modal>
      )}
    </ModalTransition>
  );
}

function EvidenceRow({
  item,
  onToggle,
  getTypeColor,
}: {
  item: EvidenceItem;
  onToggle: (id: string) => void;
  getTypeColor: (type: string) => string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px',
        borderRadius: '4px',
        backgroundColor: 'var(--ds-surface-sunken, #F7F8F9)',
        border: '1px solid var(--ds-border, #DFE1E6)',
      }}
    >
      <Checkbox
        isChecked={item.included}
        onChange={() => onToggle(item.id)}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: getTypeColor(item.type),
            }}
          />
          <strong>{item.name}</strong>
          <Badge appearance="primary">
            {item.language === 'ar' ? 'AR' : 'EN'}
          </Badge>
        </div>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle, #626F86)' }}>
          <div>{item.source}</div>
          <div>{item.descriptor}</div>
        </div>
      </div>
    </div>
  );
}
