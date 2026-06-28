/**
 * Evidence Pack Page
 *
 * Shows prepared evidence with tabs:
 * - Overview
 * - Detailed Summary
 * - Comments Intelligence
 * - Documentation Health
 * - Source Evidence
 * - Delta History
 * - Generate
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tabs, { TabList, TabPanel, Tab } from '@atlaskit/tabs';
import Button, { IconButton } from '@atlaskit/button';
import Badge from '@atlaskit/badge';
import { Heading, Inline, Stack, Box } from '@atlaskit/primitives';
import { GenerateEpicsModal } from './GenerateEpicsModal';

interface EvidencePackPageProps {
  itemKey: string;
}

export function EvidencePackPage({ itemKey }: EvidencePackPageProps) {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [showGenerateEpics, setShowGenerateEpics] = useState(false);

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Inline space="space.150" alignBlock="center">
          <Heading as="h1" level="h700">
            Evidence Pack — {itemKey}
          </Heading>
          <Badge appearance="success">Ready</Badge>
        </Inline>
        <div style={{ fontSize: '14px', color: 'var(--ds-icon-subtle, #626F86)', marginTop: 8 }}>
          All evidence has been processed and indexed. Ready for generation.
        </div>
      </div>

      <Tabs id="evidence-pack-tabs" onChange={setSelectedTab} selected={selectedTab}>
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Detailed Summary</Tab>
          <Tab>Comments Intelligence</Tab>
          <Tab>Documentation Health</Tab>
          <Tab>Source Evidence</Tab>
          <Tab>Delta History</Tab>
          <Tab>Generate</Tab>
        </TabList>

        {/* TAB 1: Overview */}
        <TabPanel>
          <div style={{ padding: '24px 0' }}>
            <Stack space="space.200">
              <OverviewSection />
            </Stack>
          </div>
        </TabPanel>

        {/* TAB 2: Detailed Summary */}
        <TabPanel>
          <div style={{ padding: '24px 0' }}>
            <DetailedSummarySection />
          </div>
        </TabPanel>

        {/* TAB 3: Comments Intelligence */}
        <TabPanel>
          <div style={{ padding: '24px 0' }}>
            <CommentsIntelligenceSection />
          </div>
        </TabPanel>

        {/* TAB 4: Documentation Health */}
        <TabPanel>
          <div style={{ padding: '24px 0' }}>
            <DocumentationHealthSection />
          </div>
        </TabPanel>

        {/* TAB 5: Source Evidence */}
        <TabPanel>
          <div style={{ padding: '24px 0' }}>
            <SourceEvidenceSection />
          </div>
        </TabPanel>

        {/* TAB 6: Delta History */}
        <TabPanel>
          <div style={{ padding: '24px 0' }}>
            <DeltaHistorySection />
          </div>
        </TabPanel>

        {/* TAB 7: Generate */}
        <TabPanel>
          <div style={{ padding: '24px 0' }}>
            <GenerateSection onGenerateEpics={() => setShowGenerateEpics(true)} />
          </div>
        </TabPanel>
      </Tabs>

      {/* Generate Epics Modal */}
      {showGenerateEpics && (
        <GenerateEpicsModal
          isOpen={showGenerateEpics}
          onClose={() => setShowGenerateEpics(false)}
          itemKey={itemKey}
        />
      )}
    </div>
  );
}

function OverviewSection() {
  const stats = [
    { label: 'Files Included', value: '5' },
    { label: 'Pages Processed', value: '47' },
    { label: 'Comments Indexed', value: '8' },
    { label: 'Linked Items Scanned', value: '3' },
    { label: 'Arabic Detected', value: '✓' },
    { label: 'English Detected', value: '✓' },
    { label: 'Figma Frames Included', value: '2' },
    { label: 'OCR Confidence', value: '94%' },
  ];

  return (
    <div>
      <Heading as="h2" level="h500" style={{ marginBottom: 16 }}>
        Evidence Pack Overview
      </Heading>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '12px',
              backgroundColor: 'var(--ds-surface-sunken, #F7F8F9)',
              borderRadius: '4px',
              border: '1px solid var(--ds-border, #DFE1E6)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--ds-icon-subtle, #626F86)', marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailedSummarySection() {
  const sections = [
    {
      title: 'Business Objective',
      content:
        'Enable citizens to renew their industrial licenses online in both Arabic and English, reducing the burden on back-office staff.',
    },
    {
      title: 'Process Summary',
      content:
        'Applicants submit renewal requests with required documents via web portal. Back-office staff review submissions and make decisions. Applicants are notified of approval/rejection in their preferred language.',
    },
    {
      title: 'Actors',
      items: [
        'Applicant (citizen)',
        'Back-office reviewer',
        'System administrator',
      ],
    },
    {
      title: 'Functional Requirements',
      items: [
        'Support Arabic and English throughout the process',
        'Accept document uploads (PDF, images)',
        'Validate required fields before submission',
        'Display submission status to applicant',
        'Provide reviewer dashboard with pending submissions',
        'Send notifications in applicant\'s preferred language',
      ],
    },
    {
      title: 'Business Rules',
      items: [
        'All applicants must provide proof of payment',
        'License must be in good standing',
        'Renewals valid for 2 years',
      ],
    },
  ];

  return (
    <div>
      <Heading as="h2" level="h500" style={{ marginBottom: 16 }}>
        Detailed Summary
      </Heading>
      <Stack space="space.200">
        {sections.map((section) => (
          <div key={section.title}>
            <Heading as="h3" level="h600" style={{ marginBottom: 8 }}>
              {section.title}
            </Heading>
            {section.content && (
              <p style={{ margin: 0, color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                {section.content}
              </p>
            )}
            {section.items && (
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ds-text, #172B4D)', fontSize: '14px' }}>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </Stack>
    </div>
  );
}

function CommentsIntelligenceSection() {
  const comments = [
    {
      type: 'Decision',
      text: 'Arabic + English support mandatory across all screens and communications',
      author: 'Vikram Indla',
    },
    {
      type: 'Scope Change',
      text: 'Add phone OTP verification as additional security measure',
      author: 'Abdullah Almetwally',
    },
    {
      type: 'Clarification',
      text: 'ما هي متطلبات التحقق من الهوية؟ (What are the identity verification requirements?)',
      author: 'Aisha Mohammed',
    },
    {
      type: 'Unresolved Question',
      text: 'Who owns the renewal approval workflow - back office or system?',
      author: 'Marcus Chen',
    },
    {
      type: 'Contradiction',
      text: 'BRD says "approval within 24 hours" but PDF process shows 3-5 business days',
      author: 'Priya Patel',
    },
    {
      type: 'Test Clarification',
      text: 'Should test validation messages in both Arabic and English?',
      author: 'James Smith',
    },
  ];

  const typeColor: Record<string, string> = {
    Decision: 'var(--ds-link, #0052CC)',
    'Scope Change': 'var(--ds-text-warning, #974F0C)',
    Clarification: 'var(--ds-text-success, #216E4E)',
    'Unresolved Question': 'var(--ds-text-warning, #974F0C)',
    Contradiction: 'var(--ds-text-danger, #AE2A19)',
    'Test Clarification': 'var(--ds-background-discovery-bold, #6E5DC6)',
  };

  return (
    <div>
      <Heading as="h2" level="h500" style={{ marginBottom: 16 }}>
        Comments Intelligence
      </Heading>
      <Stack space="space.150">
        {comments.map((comment, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              backgroundColor: 'var(--ds-surface-sunken, #F7F8F9)',
              borderRadius: '4px',
              border: `1px solid ${typeColor[comment.type]}33`,
              borderLeft: `4px solid ${typeColor[comment.type]}`,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <Badge appearance="default">{comment.type}</Badge>
              <span style={{ fontSize: '12px', color: 'var(--ds-icon-subtle, #626F86)' }}>{comment.author}</span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--ds-text, #172B4D)' }}>{comment.text}</div>
          </div>
        ))}
      </Stack>
    </div>
  );
}

function DocumentationHealthSection() {
  const issues = [
    { severity: 'P0', issue: 'Missing acceptance criteria for renewal approval' },
    { severity: 'P1', issue: 'Conflicting timeline: 24 hours vs 3-5 business days' },
    { severity: 'P1', issue: 'Missing exception flow for rejected renewals' },
    {
      severity: 'P2',
      issue: 'Figma flow shows 4 steps but BRD describes 5 steps',
    },
    { severity: 'P2', issue: 'Unclear who assigns reviewer roles' },
  ];

  return (
    <div>
      <Heading as="h2" level="h500" style={{ marginBottom: 16 }}>
        Documentation Health
      </Heading>
      <Stack space="space.150">
        {issues.map((issue, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              backgroundColor: 'var(--ds-surface-sunken, #F7F8F9)',
              borderRadius: '4px',
              border: '1px solid var(--ds-border, #DFE1E6)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Badge
              appearance={issue.severity === 'P0' ? 'default' : 'default'}
              bgColor={
                issue.severity === 'P0' ? 'var(--ds-text-danger, #AE2A19)' : issue.severity === 'P1' ? 'var(--ds-text-warning, #974F0C)' : 'var(--ds-background-discovery-bold, #6E5DC6)'
              }
            >
              {issue.severity}
            </Badge>
            <span style={{ fontSize: '14px', color: 'var(--ds-text, #172B4D)' }}>{issue.issue}</span>
          </div>
        ))}
      </Stack>
    </div>
  );
}

function SourceEvidenceSection() {
  const sources = [
    { name: 'Business Request Description', type: 'text', included: true },
    { name: 'Industrial-License-BRD-Arabic.pdf', type: 'pdf', included: true, lang: 'AR' },
    { name: 'Renewal-Process-English.pdf', type: 'pdf', included: true, lang: 'EN' },
    { name: 'back-office-review-screen.png', type: 'screenshot', included: true },
    { name: 'Industrial License Renewal Flow', type: 'figma', included: true },
    { name: '8 comments', type: 'comments', included: true },
    { name: '3 linked items', type: 'links', included: true },
  ];

  return (
    <div>
      <Heading as="h2" level="h500" style={{ marginBottom: 16 }}>
        Source Evidence
      </Heading>
      <Stack space="space.150">
        {sources.map((source, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              backgroundColor: source.included ? 'var(--ds-background-success, #DFFCF0)' : 'var(--ds-surface-sunken, #F7F8F9)',
              borderRadius: '4px',
              border: `1px solid ${source.included ? 'var(--ds-background-success-bold, #1F845A)' : 'var(--ds-border, #DFE1E6)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {source.included && (
              <span>✓</span>
            )}
            <span style={{ flex: 1, fontSize: '14px', color: 'var(--ds-text, #172B4D)' }}>
              {source.name}
            </span>
            {source.lang && <Badge appearance="default">{source.lang}</Badge>}
            <span style={{ fontSize: '12px', color: 'var(--ds-icon-subtle, #626F86)' }}>{source.type}</span>
          </div>
        ))}
      </Stack>
    </div>
  );
}

function DeltaHistorySection() {
  return (
    <div>
      <Heading as="h2" level="h500" style={{ marginBottom: 16 }}>
        Delta History
      </Heading>
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--ds-surface-sunken, #F7F8F9)',
          borderRadius: '4px',
          border: '1px solid var(--ds-border, #DFE1E6)',
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <strong>Evidence Pack v1</strong>
          <span style={{ fontSize: '12px', color: 'var(--ds-icon-subtle, #626F86)', marginLeft: 8 }}>
            (current)
          </span>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--ds-icon-subtle, #626F86)' }}>
          No previous version found. All sources processed for the first time.
        </div>
      </div>
    </div>
  );
}

function GenerateSection({ onGenerateEpics }: { onGenerateEpics: () => void }) {
  const generateOptions = [
    {
      title: 'Generate Epics',
      description: 'Create Epic, Feature, and Story structure based on evidence',
      icon: '📋',
    },
    {
      title: 'Generate Features',
      description: 'Create Feature structure from evidence',
      icon: '🎯',
    },
    {
      title: 'Generate Stories',
      description: 'Create Story structure from evidence',
      icon: '📖',
    },
    {
      title: 'Generate Test Cases',
      description: 'Create Test Case structure for QA',
      icon: '✅',
    },
    {
      title: 'Generate BRD',
      description: 'Create Business Requirements Document',
      icon: '📄',
    },
  ];

  return (
    <div>
      <Heading as="h2" level="h500" style={{ marginBottom: 16 }}>
        Generate Work Items
      </Heading>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {generateOptions.map((option) => (
          <div
            key={option.title}
            style={{
              padding: '16px',
              backgroundColor: 'var(--ds-surface-sunken, #F7F8F9)',
              borderRadius: '6px',
              border: '1px solid var(--ds-border, #DFE1E6)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--ds-link, var(--ds-link, #0C66E4))';
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ds-background-success, #DFFCF0)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--ds-border, #DFE1E6)';
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--ds-surface-sunken, var(--ds-background-neutral-subtle, #F7F8F9))';
            }}
            onClick={option.title === 'Generate Epics' ? onGenerateEpics : () => {}}
          >
            <div style={{ fontSize: '28px', marginBottom: 8 }}>{option.icon}</div>
            <Heading as="h3" level="h600" style={{ marginBottom: 4 }}>
              {option.title}
            </Heading>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ds-icon-subtle, #626F86)' }}>
              {option.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
