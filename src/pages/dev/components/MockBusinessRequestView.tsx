/**
 * Mock Business Request View
 *
 * Mocked display of BR-104: Industrial License Renewal Enhancement
 * Shows typical Business Request fields + Evidence-to-Execution action
 */

import React from 'react';
import Button, { IconButton } from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import { Heading, Stack, Inline, Box } from '@atlaskit/primitives';
import Badge from '@atlaskit/badge';
import Tabs, { TabList, TabPanel, Tab } from '@atlaskit/tabs';

interface MockBusinessRequestViewProps {
  itemKey: string;
  onEvidenceAction: () => void;
}

export function MockBusinessRequestView({
  itemKey,
  onEvidenceAction,
}: MockBusinessRequestViewProps) {
  const [selectedTab, setSelectedTab] = React.useState(0);

  return (
    <div style={{ padding: 0 }}>
      {/* Header with title and action */}
      <div style={{ backgroundColor: 'var(--ds-surface, #FFFFFF)', borderBottom: '1px solid var(--ds-border, #DFE1E6)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Inline space="space.150" alignBlock="center">
            <Heading as="h1" level="h600">
              {itemKey}
            </Heading>
            <Badge appearance="primary">Active</Badge>
          </Inline>
          <Heading as="h2" level="h300" style={{ marginTop: 8 }}>
            Industrial License Renewal Enhancement
          </Heading>
        </div>

        {/* Evidence-to-Execution Action */}
        <Tooltip content="Prepare Evidence Pack">
          <Button
            appearance="primary"
            onClick={onEvidenceAction}
            aria-label="Prepare Evidence Pack"
          >
            ✨ Prepare
          </Button>
        </Tooltip>
      </div>

      {/* Content area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0 }}>
        {/* Main content */}
        <div style={{ padding: 32, borderRight: '1px solid var(--ds-border, #DFE1E6)' }}>
          <Tabs id="br-tabs" onChange={setSelectedTab} selected={selectedTab}>
            <TabList>
              <Tab>Description</Tab>
              <Tab>Attachments</Tab>
              <Tab>Comments</Tab>
              <Tab>Linked Items</Tab>
            </TabList>

            <TabPanel>
              <div style={{ paddingTop: 16 }}>
                <Heading as="h3" level="h500" style={{ marginBottom: 12 }}>
                  Business Objective
                </Heading>
                <p style={{ margin: '0 0 16px 0', color: 'var(--ds-text, #172B4D)', fontSize: 'var(--ds-font-size-400)' }}>
                  Enable citizens to renew their industrial licenses online in both Arabic and
                  English, reducing the burden on back-office staff and improving citizen
                  experience.
                </p>

                <Heading as="h3" level="h500" style={{ marginBottom: 12 }}>
                  Scope
                </Heading>
                <ul style={{ margin: '0 0 16px 0', paddingLeft: 20, color: 'var(--ds-text, #172B4D)', fontSize: 'var(--ds-font-size-400)' }}>
                  <li>Applicant submission portal (Arabic + English)</li>
                  <li>Back-office review dashboard</li>
                  <li>Decision notification system</li>
                  <li>Document upload and validation</li>
                  <li>Payment verification integration</li>
                </ul>

                <Heading as="h3" level="h500" style={{ marginBottom: 12 }}>
                  Acceptance Criteria
                </Heading>
                <ul style={{ margin: '0 0 16px 0', paddingLeft: 20, color: 'var(--ds-text, #172B4D)', fontSize: 'var(--ds-font-size-400)' }}>
                  <li>✓ Support for Arabic and English throughout the application</li>
                  <li>✓ Mobile-responsive design for citizen portal</li>
                  <li>✓ Real-time submission status tracking</li>
                  <li>✓ Automated notifications in preferred language</li>
                  <li>✓ Back-office dashboard with sortable/filterable submissions</li>
                </ul>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: 16 }}>
                <Stack space="space.150">
                  <AttachmentItem
                    name="Industrial-License-BRD-Arabic.pdf"
                    type="PDF"
                    language="AR"
                    size="2.3 MB"
                  />
                  <AttachmentItem
                    name="Renewal-Process-English.pdf"
                    type="PDF"
                    language="EN"
                    size="1.8 MB"
                  />
                  <AttachmentItem
                    name="back-office-review-screen.png"
                    type="Screenshot"
                    language="EN"
                    size="0.5 MB"
                  />
                  <AttachmentItem
                    name="Industrial License Renewal Flow"
                    type="Figma"
                    language="EN"
                    size="Design file"
                  />
                </Stack>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: 16 }}>
                <Stack space="space.150">
                  <CommentItem
                    author="Vikram Indla"
                    role="Product Owner"
                    text="Decision: Arabic + English support mandatory across all screens and communications."
                    type="decision"
                  />
                  <CommentItem
                    author="Abdullah Almetwally"
                    role="BA"
                    text="Scope change: Add phone OTP verification as additional security measure."
                    type="change"
                  />
                  <CommentItem
                    author="Aisha Mohammed"
                    role="Arabic Translator"
                    text="ما هي متطلبات التحقق من الهوية؟ (What are the identity verification requirements?)"
                    type="question"
                  />
                  <CommentItem
                    author="Marcus Chen"
                    role="Backend Lead"
                    text="Who owns the renewal approval workflow - back office or system?"
                    type="unresolved"
                  />
                  <CommentItem
                    author="Priya Patel"
                    role="QA Lead"
                    text="Contradiction: BRD says 'approval within 24 hours' but PDF process shows 3-5 business days."
                    type="conflict"
                  />
                  <CommentItem
                    author="James Smith"
                    role="QA Engineer"
                    text="Should test validation messages in both Arabic and English?"
                    type="test"
                  />
                </Stack>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: 16 }}>
                <Stack space="space.150">
                  <LinkedItemRow
                    key="epic"
                    type="epic"
                    name="License Management Overhaul"
                    id="EPIC-312"
                  />
                  <LinkedItemRow
                    key="feature"
                    type="feature"
                    name="Renewal Submission Portal"
                    id="FEAT-445"
                  />
                  <LinkedItemRow
                    key="story"
                    type="story"
                    name="Enable citizens to upload renewal documents"
                    id="STORY-1204"
                  />
                </Stack>
              </div>
            </TabPanel>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div style={{ padding: 16, backgroundColor: 'var(--ds-surface-sunken, #F7F8F9)' }}>
          <Stack space="space.150">
            <div>
              <Heading as="h4" level="h700" style={{ marginBottom: 8 }}>
                Status
              </Heading>
              <Badge appearance="primary">Active</Badge>
            </div>

            <div>
              <Heading as="h4" level="h700" style={{ marginBottom: 8 }}>
                Product
              </Heading>
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)' }}>
                Licensing Platform
              </div>
            </div>

            <div>
              <Heading as="h4" level="h700" style={{ marginBottom: 8 }}>
                Request Type
              </Heading>
              <Badge appearance="default">Feature</Badge>
            </div>

            <div>
              <Heading as="h4" level="h700" style={{ marginBottom: 8 }}>
                Created
              </Heading>
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)' }}>
                15 June 2026
              </div>
            </div>

            <div>
              <Heading as="h4" level="h700" style={{ marginBottom: 8 }}>
                Stakeholders
              </Heading>
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)' }}>
                Vikram Indla<br />
                Abdullah Almetwally
              </div>
            </div>
          </Stack>
        </div>
      </div>
    </div>
  );
}

function AttachmentItem({
  name,
  type,
  language,
  size,
}: {
  name: string;
  type: string;
  language: string;
  size: string;
}) {
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 'var(--ds-font-size-600)' }}>📄</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
          {name}
        </div>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle, #626F86)' }}>
          {type} • {size}
        </div>
      </div>
      <Badge appearance="default">{language}</Badge>
    </div>
  );
}

function CommentItem({
  author,
  role,
  text,
  type,
}: {
  author: string;
  role: string;
  text: string;
  type: string;
}) {
  const typeColor: Record<string, string> = {
    decision: 'var(--ds-link, #0052CC)',
    change: 'var(--ds-text-warning, #974F0C)',
    question: 'var(--ds-text-success, #216E4E)',
    unresolved: 'var(--ds-text-danger, #AE2A19)',
    conflict: 'var(--ds-text-warning, #974F0C)',
    test: 'var(--ds-background-discovery-bold, #6E5DC6)',
  };

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderLeft: `4px solid ${typeColor[type]}`,
        borderRadius: '4px',
      }}
    >
      <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle, #626F86)', marginBottom: 4 }}>
        <strong>{author}</strong> — {role}
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #172B4D)' }}>
        {text}
      </div>
    </div>
  );
}

function LinkedItemRow({
  type,
  name,
  id,
}: {
  type: string;
  name: string;
  id: string;
}) {
  const icons: Record<string, string> = {
    epic: '🔵',
    feature: '🟢',
    story: '◻️',
  };

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span>{icons[type]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
          {id}
        </div>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle, #626F86)' }}>
          {name}
        </div>
      </div>
    </div>
  );
}
