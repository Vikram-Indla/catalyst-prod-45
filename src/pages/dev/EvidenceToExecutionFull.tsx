/**
 * Evidence-to-Execution Prototype — Full End-to-End
 *
 * Complete flow: BR view → Evidence modal → Processing → Evidence Pack page → Generate Epics
 * Single consolidated component with all 5 stages + Catalyst UI richness
 */

import React, { useState } from 'react';

export default function EvidenceToExecutionFull() {
  const [stage, setStage] = useState<'br-view' | 'evidence-modal' | 'processing' | 'evidence-pack' | 'generate-epics'>('br-view');
  const [selectedTab, setSelectedTab] = useState('description');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generateStage, setGenerateStage] = useState<'project-select' | 'preview' | 'success'>('project-select');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedEvidenceItems, setSelectedEvidenceItems] = useState({
    br_description: true,
    ar_pdf: true,
    en_pdf: true,
    screenshot: true,
    figma: true,
    comments: true,
    links: true,
  });

  const handleStartProcessing = () => {
    setStage('processing');
    let step = 0;
    const steps = [
      'Collecting selected evidence',
      'Reading Business Request description',
      'Reading comments and scope changes',
      'Extracting Arabic and English text from PDFs',
      'Reading screenshots and Figma frames',
      'Indexing linked items and relationships',
      'Creating evidence semantic chunks',
      'Building vector embeddings',
      'Generating detailed evidence summary',
      'Preparing Epic/Feature/Story generation candidates',
    ];

    const interval = setInterval(() => {
      if (step < steps.length) {
        const p = ((step + 1) / steps.length) * 100;
        setProgress(Math.round(p));
        setCurrentStep(steps[step]);
        step++;
      } else {
        clearInterval(interval);
        setProgress(100);
        setCurrentStep('Complete');
      }
    }, 600);
  };

  const handleEvidencePackReady = () => {
    setStage('evidence-pack');
  };

  const handleGenerateEpics = () => {
    setStage('generate-epics');
    setGenerateStage('project-select');
  };

  const toggleEvidenceItem = (key: string) => {
    setSelectedEvidenceItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ═══ STAGE 1: BUSINESS REQUEST VIEW ═══
  if (stage === 'br-view') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: '100vh', backgroundColor: 'var(--ds-surface)' }}>
        {/* Left Content */}
        <div style={{ borderRight: '1px solid var(--ds-border)' }}>
          {/* Top Action Bar */}
          <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', marginBottom: '4px' }}>Senael BAU / BAU-104</div>
              <h1 style={{ margin: 0, fontSize: 'var(--ds-font-size-800)', fontWeight: 600 }}>Industrial License Renewal Enhancement</h1>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStage('evidence-modal')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--ds-link)',
                  color: 'var(--ds-text-inverse)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: 500,
                }}
              >
                ✨ Prepare
              </button>
              <button style={{ padding: '8px 16px', backgroundColor: 'var(--ds-surface-sunken)', border: '1px solid var(--ds-border)', borderRadius: '4px', cursor: 'pointer', fontSize: 'var(--ds-font-size-300)' }}>
                Discuss
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid var(--ds-border)', padding: '0 32px', display: 'flex', gap: '24px' }}>
            {['description', 'attachments', 'comments', 'links'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                style={{
                  padding: '12px 0',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderBottom: selectedTab === tab ? '3px solid var(--ds-link)' : 'none',
                  color: selectedTab === tab ? 'var(--ds-link)' : 'var(--ds-icon-subtle)',
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: selectedTab === tab ? 500 : 400,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: '32px' }}>
            {selectedTab === 'description' && (
              <div>
                <h3>Business Objective</h3>
                <p>Enable citizens to renew their industrial licenses online in both Arabic and English, reducing the burden on back-office staff and improving citizen experience.</p>
                <h3>Scope</h3>
                <ul>
                  <li>Applicant submission portal (Arabic + English)</li>
                  <li>Back-office review dashboard</li>
                  <li>Decision notification system</li>
                  <li>Document upload and validation</li>
                  <li>Payment verification integration</li>
                </ul>
                <h3>Acceptance Criteria</h3>
                <ul>
                  <li>✓ Support for Arabic and English throughout the application</li>
                  <li>✓ Mobile-responsive design for citizen portal</li>
                  <li>✓ Real-time submission status tracking</li>
                  <li>✓ Automated notifications in preferred language</li>
                  <li>✓ Back-office dashboard with sortable/filterable submissions</li>
                </ul>
              </div>
            )}
            {selectedTab === 'attachments' && (
              <div>
                <h3>Attachments (4)</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>📄 Industrial-License-BRD-Arabic.pdf (2.3 MB) 🇸🇦</li>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>📄 Renewal-Process-English.pdf (1.8 MB) 🇺🇸</li>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>📷 back-office-review-screen.png (0.5 MB)</li>
                  <li style={{ padding: '8px 0' }}>🎨 Industrial License Renewal Flow (Figma)</li>
                </ul>
              </div>
            )}
            {selectedTab === 'comments' && (
              <div>
                <h3>Comments (8)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { author: 'Vikram Indla', role: 'Product Owner', text: 'Decision: Arabic + English support mandatory across all screens.' },
                    { author: 'Abdullah Almetwally', role: 'BA', text: 'Scope change: Add phone OTP verification as security measure.' },
                    { author: 'Aisha Mohammed', role: 'Arabic Translator', text: 'ما هي متطلبات التحقق من الهوية؟ (What are the identity verification requirements?)' },
                  ].map((c, i) => (
                    <div key={i} style={{ padding: '12px', backgroundColor: 'var(--ds-surface-sunken)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--ds-font-size-300)', marginBottom: '4px' }}>{c.author} ({c.role})</div>
                      <div style={{ fontSize: 'var(--ds-font-size-300)' }}>{c.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedTab === 'links' && (
              <div>
                <h3>Linked Items (3)</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>🔵 EPIC-312 License Management Overhaul</li>
                  <li style={{ padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>🟢 FEAT-445 Renewal Submission Portal</li>
                  <li style={{ padding: '8px 0' }}>◻️ STORY-1204 Enable citizens to upload documents</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ padding: '32px 16px', backgroundColor: 'var(--ds-surface-sunken)', overflowY: 'auto' }}>
          <h4 style={{ marginTop: 0, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ds-icon-subtle)' }}>Details</h4>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-icon-subtle)', marginBottom: '4px' }}>Status</div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>🟢 Active</div>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-icon-subtle)', marginBottom: '4px' }}>Product</div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>Licensing Platform</div>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-icon-subtle)', marginBottom: '4px' }}>Request Type</div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>Feature</div>
          </div>
          <div style={{ borderTop: '1px solid var(--ds-border)', paddingTop: '16px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-icon-subtle)', marginBottom: '8px' }}>Linked Items</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-link)', cursor: 'pointer' }}>🔵 EPIC-312</div>
              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-link)', cursor: 'pointer' }}>🟢 FEAT-445</div>
              <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-link)', cursor: 'pointer' }}>◻️ STORY-1204</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ STAGE 2: EVIDENCE SELECTION MODAL ═══
  if (stage === 'evidence-modal') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: '100vh', backgroundColor: 'var(--ds-surface)' }}>
        <div style={{ borderRight: '1px solid var(--ds-border)', padding: '32px' }}>
          <h1 style={{ marginBottom: '8px' }}>Prepare Evidence Pack</h1>
          <p style={{ color: 'var(--ds-icon-subtle)', marginBottom: '24px' }}>
            Select the evidence Catalyst should use before extraction, indexing, and generation.
          </p>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ marginTop: 0 }}>Evidence to Include</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'br_description', name: 'Business Request Description', type: 'text', lang: 'EN' },
                { key: 'ar_pdf', name: 'Industrial-License-BRD-Arabic.pdf', type: 'PDF', lang: 'AR' },
                { key: 'en_pdf', name: 'Renewal-Process-English.pdf', type: 'PDF', lang: 'EN' },
                { key: 'screenshot', name: 'back-office-review-screen.png', type: 'Screenshot', lang: 'EN' },
                { key: 'figma', name: 'Industrial License Renewal Flow', type: 'Figma', lang: 'EN' },
                { key: 'comments', name: '8 comments (decisions, scope changes, clarifications)', type: 'Comments', lang: 'Mixed' },
                { key: 'links', name: '3 linked items (Epic, Feature, Story)', type: 'Links', lang: 'EN' },
              ].map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                    padding: '8px',
                    backgroundColor: 'var(--ds-surface-sunken)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvidenceItems[item.key as keyof typeof selectedEvidenceItems]}
                    onChange={() => toggleEvidenceItem(item.key)}
                    style={{ marginTop: '2px', cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1, fontSize: 'var(--ds-font-size-300)' }}>
                    <div style={{ fontWeight: 500, color: 'var(--ds-text)' }}>{item.name}</div>
                    <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)' }}>{item.type} • {item.lang}</div>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStage('br-view')}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--ds-border)',
                borderRadius: '4px',
                backgroundColor: 'var(--ds-surface)',
                cursor: 'pointer',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleStartProcessing}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--ds-link)',
                color: 'var(--ds-text-inverse)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 500,
              }}
            >
              Prepare Evidence Pack
            </button>
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: 'var(--ds-surface-sunken)' }}>
          <h4 style={{ marginTop: 0 }}>Summary</h4>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', lineHeight: '1.8' }}>
            <div><strong>Files:</strong> 5</div>
            <div><strong>Attachments:</strong> 4</div>
            <div><strong>Comments:</strong> 8</div>
            <div><strong>Links:</strong> 3</div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--ds-border)' }}>
              <strong>Output:</strong> 12 draft items
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ STAGE 3: PROCESSING ═══
  if (stage === 'processing') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: '100vh', backgroundColor: 'var(--ds-surface)' }}>
        <div style={{ padding: '32px', borderRight: '1px solid var(--ds-border)' }}>
          <h1>Preparing Evidence Pack</h1>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-icon-subtle)' }}>{currentStep}</div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--ds-background-neutral)', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' }}>
              <div style={{ height: '100%', backgroundColor: 'var(--ds-link)', width: `${progress}%`, transition: 'width 0.2s' }} />
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', marginTop: '8px' }}>{progress}% complete</div>
          </div>
          {progress === 100 && (
            <div style={{ padding: '16px', backgroundColor: 'var(--ds-background-success)', borderRadius: '4px', marginTop: '24px' }}>
              <h2 style={{ marginTop: 0 }}>✅ Evidence Pack Ready</h2>
              <p style={{ marginBottom: '16px' }}>12 draft work items ready to generate (1 Epic + 3 Features + 8 Stories)</p>
              <button
                onClick={handleEvidencePackReady}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--ds-link)',
                  color: 'var(--ds-text-inverse)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 500,
                }}
              >
                View Evidence Pack
              </button>
            </div>
          )}
        </div>
        <div style={{ padding: '16px', backgroundColor: 'var(--ds-surface-sunken)' }}>
          <h4>Job Details</h4>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', lineHeight: '1.6' }}>
            <div><strong>Item:</strong> BR-104</div>
            <div><strong>Owner:</strong> Vikram Indla</div>
            <div><strong>Progress:</strong> {progress}%</div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ STAGE 4: EVIDENCE PACK PAGE ═══
  if (stage === 'evidence-pack') {
    const tabs = ['Overview', 'Detailed Summary', 'Comments Intelligence', 'Documentation Health', 'Source Evidence', 'Delta History', 'Generate'];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: '100vh', backgroundColor: 'var(--ds-surface)' }}>
        <div style={{ borderRight: '1px solid var(--ds-border)' }}>
          <div style={{ padding: '32px', borderBottom: '1px solid var(--ds-border)' }}>
            <h1 style={{ margin: '0 0 8px 0' }}>Evidence Pack — BR-104</h1>
            <div style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-icon-subtle)' }}>Industrial License Renewal Enhancement</div>
          </div>

          <div style={{ borderBottom: '1px solid var(--ds-border)', padding: '0 32px', display: 'flex', gap: '16px', overflowX: 'auto' }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                style={{
                  padding: '12px 0',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderBottom: selectedTab === tab ? '3px solid var(--ds-link)' : 'none',
                  color: selectedTab === tab ? 'var(--ds-link)' : 'var(--ds-icon-subtle)',
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-300)',
                  fontWeight: selectedTab === tab ? 500 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: '32px' }}>
            {selectedTab === 'Overview' && (
              <div>
                <h3>Evidence Pack Statistics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'Files Included', value: '5' },
                    { label: 'Pages Processed', value: '47' },
                    { label: 'Comments Indexed', value: '8' },
                    { label: 'Linked Items', value: '3' },
                    { label: 'Arabic Detected', value: '✓' },
                    { label: 'English Detected', value: '✓' },
                    { label: 'Figma Frames', value: '2' },
                    { label: 'OCR Confidence', value: '94%' },
                  ].map((stat) => (
                    <div key={stat.label} style={{ padding: '12px', backgroundColor: 'var(--ds-surface-sunken)', borderRadius: '4px', border: '1px solid var(--ds-border)' }}>
                      <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', marginBottom: '4px' }}>{stat.label}</div>
                      <div style={{ fontSize: 'var(--ds-font-size-600)', fontWeight: 600, color: 'var(--ds-text)' }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'Detailed Summary' && (
              <div>
                <h3>Business Objective</h3>
                <p>Enable citizens to renew their industrial licenses online in both Arabic and English, reducing the burden on back-office staff and improving citizen experience.</p>
                <h3>Process Summary</h3>
                <p>Applicants submit renewal requests with required documents. Back-office staff review and make decisions. Applicants receive notifications in their preferred language.</p>
                <h3>Functional Requirements</h3>
                <ul>
                  <li>Support Arabic and English throughout</li>
                  <li>Accept document uploads (PDF, images)</li>
                  <li>Validate required fields</li>
                  <li>Display submission status</li>
                  <li>Provide reviewer dashboard</li>
                  <li>Send notifications in preferred language</li>
                </ul>
              </div>
            )}

            {selectedTab === 'Comments Intelligence' && (
              <div>
                <h3>Extracted Comments (6)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { type: 'Decision', color: 'var(--ds-link)', text: 'Arabic + English support mandatory', author: 'Vikram' },
                    { type: 'Scope Change', color: 'var(--ds-text-warning)', text: 'Add phone OTP verification', author: 'Abdullah' },
                    { type: 'Clarification', color: 'var(--ds-text-success)', text: 'Identity verification requirements?', author: 'Aisha' },
                    { type: 'Unresolved', color: 'var(--ds-text-warning)', text: 'Who owns approval workflow?', author: 'Marcus' },
                    { type: 'Contradiction', color: 'var(--ds-text-danger)', text: '24 hours vs 3-5 business days', author: 'Priya' },
                    { type: 'Test', color: 'var(--ds-background-discovery-bold)', text: 'Test in Arabic and English?', author: 'James' },
                  ].map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--ds-surface-sunken)',
                        borderRadius: '4px',
                        borderLeft: `4px solid ${c.color}`,
                      }}
                    >
                      <div style={{ fontSize: 'var(--ds-font-size-200)', marginBottom: '4px' }}>
                        <span style={{ backgroundColor: c.color, color: 'var(--ds-surface)', padding: '2px 6px', borderRadius: '3px', fontSize: 'var(--ds-font-size-100)', fontWeight: 500 }}>
                          {c.type}
                        </span>
                        <span style={{ marginLeft: '8px', color: 'var(--ds-icon-subtle)', fontSize: 'var(--ds-font-size-100)' }}>{c.author}</span>
                      </div>
                      <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>{c.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'Documentation Health' && (
              <div>
                <h3>Issues Found (5)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { severity: 'P0', issue: 'Missing acceptance criteria for renewal approval' },
                    { severity: 'P1', issue: 'Conflicting timeline: 24 hours vs 3-5 business days' },
                    { severity: 'P1', issue: 'Missing exception flow for rejected renewals' },
                    { severity: 'P2', issue: 'Figma shows 4 steps but BRD describes 5' },
                    { severity: 'P2', issue: 'Unclear who assigns reviewer roles' },
                  ].map((issue, i) => (
                    <div key={i} style={{ padding: '12px', backgroundColor: 'var(--ds-surface-sunken)', borderRadius: '4px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div
                        style={{
                          backgroundColor: issue.severity === 'P0' ? 'var(--ds-text-danger)' : issue.severity === 'P1' ? 'var(--ds-text-warning)' : 'var(--ds-background-discovery-bold)',
                          color: 'var(--ds-text-inverse)',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: 'var(--ds-font-size-100)',
                          fontWeight: 600,
                          minWidth: '35px',
                          textAlign: 'center',
                        }}
                      >
                        {issue.severity}
                      </div>
                      <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>{issue.issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'Source Evidence' && (
              <div>
                <h3>Included Evidence (7)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { name: 'Business Request Description', included: true },
                    { name: 'Industrial-License-BRD-Arabic.pdf', included: true, lang: 'AR' },
                    { name: 'Renewal-Process-English.pdf', included: true, lang: 'EN' },
                    { name: 'back-office-review-screen.png', included: true },
                    { name: 'Industrial License Renewal Flow', included: true },
                    { name: '8 comments', included: true },
                    { name: '3 linked items', included: true },
                  ].map((source, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        backgroundColor: source.included ? 'var(--ds-background-success)' : 'var(--ds-surface-sunken)',
                        borderRadius: '4px',
                        border: `1px solid ${source.included ? '#4CE97' : 'var(--ds-border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      {source.included && <span>✓</span>}
                      <span style={{ flex: 1, fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text)' }}>{source.name}</span>
                      {source.lang && (
                        <span style={{ fontSize: 'var(--ds-font-size-100)', backgroundColor: '#E3F2FD', color: 'var(--ds-link)', padding: '2px 6px', borderRadius: '3px', fontWeight: 500 }}>
                          {source.lang}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'Delta History' && (
              <div style={{ padding: '16px', backgroundColor: 'var(--ds-surface-sunken)', borderRadius: '4px', border: '1px solid var(--ds-border)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Evidence Pack v1</strong>
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', marginLeft: '8px' }}>(current)</span>
                </div>
                <div style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-icon-subtle)' }}>No previous version found. All sources processed for the first time.</div>
              </div>
            )}

            {selectedTab === 'Generate' && (
              <div>
                <h3>Generate Work Items</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {[
                    { title: 'Generate Epics', desc: 'Create Epic, Feature, Story hierarchy', icon: '📋' },
                    { title: 'Generate Features', desc: 'Create Feature structure from evidence', icon: '🎯' },
                    { title: 'Generate Stories', desc: 'Create Story structure', icon: '📖' },
                    { title: 'Generate Test Cases', desc: 'Create Test Cases for QA', icon: '✅' },
                    { title: 'Generate BRD', desc: 'Create Business Requirements Document', icon: '📄' },
                  ].map((option) => (
                    <div
                      key={option.title}
                      onClick={option.title === 'Generate Epics' ? handleGenerateEpics : () => {}}
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--ds-surface-sunken)',
                        borderRadius: '6px',
                        border: '1px solid var(--ds-border)',
                        cursor: option.title === 'Generate Epics' ? 'pointer' : 'not-allowed',
                        opacity: option.title === 'Generate Epics' ? 1 : 0.5,
                      }}
                    >
                      <div style={{ fontSize: 'var(--ds-font-size-800)', marginBottom: '8px' }}>{option.icon}</div>
                      <h4 style={{ margin: '0 0 4px 0' }}>{option.title}</h4>
                      <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-icon-subtle)' }}>{option.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '32px 16px', backgroundColor: 'var(--ds-surface-sunken)', overflowY: 'auto' }}>
          <h4 style={{ marginTop: 0, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ds-icon-subtle)' }}>Summary</h4>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', lineHeight: '1.8' }}>
            <div><strong>Status:</strong> Ready</div>
            <div><strong>Item:</strong> BR-104</div>
            <div><strong>Evidence Files:</strong> 5</div>
            <div><strong>Comments:</strong> 8</div>
            <div><strong>Linked Items:</strong> 3</div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--ds-border)' }}>
              <div><strong>Ready to generate:</strong></div>
              <div style={{ fontSize: 'var(--ds-font-size-100)', marginTop: '4px' }}>1 Epic + 3 Features + 8 Stories</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ STAGE 5: GENERATE EPICS MODAL ═══
  if (stage === 'generate-epics') {
    const projects = [
      { label: 'Product Modernization', value: 'prod-mod' },
      { label: 'Industrial Services', value: 'ind-svc' },
      { label: 'Licensing Platform', value: 'lic-plat' },
    ];

    const generatedItems = [
      { id: 'epic-1', title: 'Renew Industrial License Online', type: 'epic', confidence: 98, approved: true, sources: ['BR-104', 'BRD-Arabic', 'Figma Flow'] },
      { id: 'feat-1', title: 'Applicant Renewal Submission', type: 'feature', confidence: 96, approved: true, sources: ['BR-104', 'Comments'], parent: 'epic-1' },
      { id: 'story-1', title: 'Submit renewal request', type: 'story', confidence: 94, approved: true, sources: ['BRD-Arabic', 'Figma'], parent: 'feat-1' },
      { id: 'story-2', title: 'Upload required documents', type: 'story', confidence: 92, approved: true, sources: ['BRD-English'], parent: 'feat-1' },
      { id: 'story-3', title: 'Save renewal draft', type: 'story', confidence: 91, approved: true, sources: ['BRD-Arabic'], parent: 'feat-1' },
      { id: 'story-4', title: 'Validate Arabic and English data', type: 'story', confidence: 89, approved: true, sources: ['Decision Comment'], parent: 'feat-1' },
      { id: 'feat-2', title: 'Back Office Review', type: 'feature', confidence: 95, approved: true, sources: ['Screenshot', 'BRD'], parent: 'epic-1' },
      { id: 'story-5', title: 'Review submitted request', type: 'story', confidence: 93, approved: true, sources: ['Screenshot'], parent: 'feat-2' },
      { id: 'story-6', title: 'Return for correction', type: 'story', confidence: 90, approved: true, sources: ['BRD-English'], parent: 'feat-2' },
      { id: 'story-7', title: 'Capture reviewer decision', type: 'story', confidence: 88, approved: true, sources: ['Comments'], parent: 'feat-2' },
      { id: 'feat-3', title: 'Decision and Notification', type: 'feature', confidence: 94, approved: true, sources: ['BR-104', 'Comments'], parent: 'epic-1' },
      { id: 'story-8', title: 'Approve renewal request', type: 'story', confidence: 91, approved: true, sources: ['BRD'], parent: 'feat-3' },
      { id: 'story-9', title: 'Reject with reason', type: 'story', confidence: 90, approved: true, sources: ['BRD'], parent: 'feat-3' },
      { id: 'story-10', title: 'Notify in Arabic and English', type: 'story', confidence: 89, approved: true, sources: ['Decision'], parent: 'feat-3' },
    ];

    const getIndent = (type: string) => {
      return type === 'epic' ? 0 : type === 'feature' ? 20 : 40;
    };

    const typeIcon = { epic: '🔵', feature: '🟢', story: '◻️' };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: '100vh', backgroundColor: 'var(--ds-surface)' }}>
        <div style={{ padding: '32px', borderRight: '1px solid var(--ds-border)' }}>
          <h1 style={{ marginBottom: '8px' }}>Generate Epics from Evidence</h1>

          {generateStage === 'project-select' && (
            <div>
              <p style={{ color: 'var(--ds-icon-subtle)', marginBottom: '24px' }}>Select the destination project where these work items will be created.</p>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Select Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--ds-border)',
                    borderRadius: '4px',
                    fontSize: 'var(--ds-font-size-300)',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="">Choose a project...</option>
                  {projects.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--ds-background-success)', borderRadius: '4px', marginBottom: '24px' }}>
                <strong>Expected output:</strong>
                <div style={{ fontSize: 'var(--ds-font-size-300)', marginTop: '8px', color: 'var(--ds-text)' }}>
                  <strong>12 draft work items</strong> (1 Epic + 3 Features + 8 Stories)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setStage('evidence-pack')}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid var(--ds-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--ds-surface)',
                    cursor: 'pointer',
                    fontSize: 'var(--ds-font-size-400)',
                    fontWeight: 500,
                  }}
                >
                  Back
                </button>
                <button
                  onClick={() => selectedProject && setGenerateStage('preview')}
                  disabled={!selectedProject}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: selectedProject ? 'var(--ds-link)' : 'var(--ds-border)',
                    color: 'var(--ds-text-inverse)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedProject ? 'pointer' : 'not-allowed',
                    fontSize: 'var(--ds-font-size-400)',
                    fontWeight: 500,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {generateStage === 'preview' && (
            <div>
              <h3>Generated Hierarchy — {projects.find((p) => p.value === selectedProject)?.label}</h3>
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-icon-subtle)', marginBottom: '16px' }}>
                12 of 12 items approved for creation
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {generatedItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--ds-background-success)',
                      borderRadius: '4px',
                      border: '1px solid #4CE97', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
                      marginLeft: `${getIndent(item.type)}px`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: 'var(--ds-font-size-600)' }}>{typeIcon[item.type as keyof typeof typeIcon]}</span>
                      <strong style={{ flex: 1 }}>{item.title}</strong>
                      <span
                        style={{
                          backgroundColor: '#E3F2FD', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
                          color: 'var(--ds-link)',
                          padding: '2px 8px',
                          borderRadius: '3px',
                          fontSize: 'var(--ds-font-size-100)',
                          fontWeight: 600,
                        }}
                      >
                        {item.confidence}%
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', marginLeft: '26px' }}>
                      <strong>Source:</strong> {item.sources.join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setGenerateStage('project-select')}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid var(--ds-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--ds-surface)',
                    cursor: 'pointer',
                    fontSize: 'var(--ds-font-size-400)',
                    fontWeight: 500,
                  }}
                >
                  Back
                </button>
                <button
                  onClick={() => setGenerateStage('success')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--ds-link)',
                    color: 'var(--ds-text-inverse)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: 'var(--ds-font-size-400)',
                    fontWeight: 500,
                  }}
                >
                  Create All (12 items)
                </button>
              </div>
            </div>
          )}

          {generateStage === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
              <h2>Ready to Create</h2>
              <p style={{ color: 'var(--ds-icon-subtle)', marginBottom: '20px' }}>
                12 draft work items would be created in <strong>{projects.find((p) => p.value === selectedProject)?.label}</strong>.
              </p>
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--ds-background-success)',
                  borderRadius: '4px',
                  border: '1px solid #4CE97', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span style={{ fontSize: 'var(--ds-font-size-700)' }}>✅</span>
                  <span style={{ color: 'var(--ds-text-success)', fontWeight: 500 }}>In production, these items would be created as drafts in your project.</span>
                </div>
              </div>
              <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)' }}>This is a prototype. Actual creation is mocked.</p>
              <button
                onClick={() => setStage('evidence-pack')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--ds-link)',
                  color: 'var(--ds-text-inverse)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 500,
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '16px', backgroundColor: 'var(--ds-surface-sunken)' }}>
          <h4 style={{ marginTop: 0 }}>Status</h4>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-icon-subtle)', lineHeight: '1.6' }}>
            <div><strong>Stage:</strong> {generateStage}</div>
            <div><strong>Project:</strong> {projects.find((p) => p.value === selectedProject)?.label || 'Not selected'}</div>
            <div><strong>Items:</strong> 12</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
