/**
 * Evidence-to-Execution Prototype — Catalyst Modal
 *
 * Mocked BR-104 using actual Catalyst detail view layout:
 * - Top nav with breadcrumb + actions
 * - Left content area with tabs
 * - Right sidebar with Details section
 * - Evidence-to-Execution button in action bar
 */

import React, { useState } from 'react';

export default function EvidenceToExecutionSimple() {
  const [stage, setStage] = useState<'br-view' | 'evidence-modal' | 'processing'>('br-view');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [selectedTab, setSelectedTab] = useState('description');

  const handlePrepareEvidence = () => {
    setStage('evidence-modal');
  };

  const handleStartProcessing = () => {
    setStage('processing');
    let step = 0;
    const steps = [
      'Collecting selected evidence',
      'Reading Business Request description',
      'Reading comments',
      'Extracting Arabic and English PDF text',
      'Reading screenshots and Figma evidence',
      'Indexing linked items',
      'Creating evidence chunks',
      'Creating vector index',
      'Building detailed summary',
      'Preparing generation options',
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

  if (stage === 'processing') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ padding: '32px', borderRight: '1px solid #DFE1E6' }}>
          <h1 style={{ marginBottom: '32px' }}>Preparing Evidence Pack</h1>
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', color: '#626F86', marginBottom: '8px' }}>
              {currentStep}
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#F0F0F0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                backgroundColor: '#0052CC',
                width: `${progress}%`,
                transition: 'width 0.2s',
              }} />
            </div>
            <div style={{ fontSize: '12px', color: '#626F86', marginTop: '8px' }}>
              {progress}% complete
            </div>
          </div>
          {progress === 100 && (
            <div style={{ padding: '16px', backgroundColor: '#DFFCF0', borderRadius: '4px' }}>
              <h2 style={{ marginTop: 0 }}>✅ Evidence Pack Ready</h2>
              <p style={{ marginBottom: 0 }}>12 draft work items ready to generate (1 Epic + 3 Features + 8 Stories)</p>
            </div>
          )}
        </div>
        <div style={{ padding: '16px', backgroundColor: '#F7F8F9' }}>
          <h4>Job Details</h4>
          <div style={{ fontSize: '12px', color: '#626F86', lineHeight: '1.6' }}>
            <div><strong>Item:</strong> BR-104</div>
            <div><strong>Owner:</strong> Vikram Indla</div>
            <div><strong>Progress:</strong> {progress}%</div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'evidence-modal') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ padding: '32px', borderRight: '1px solid #DFE1E6' }}>
          <h1 style={{ marginBottom: '8px' }}>Prepare Evidence Pack</h1>
          <p style={{ color: '#626F86', marginBottom: '24px' }}>
            Select the evidence Catalyst should use before extraction, indexing, and generation.
          </p>

          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ marginTop: 0 }}>Evidence to Include</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Business Request Description', type: 'text', lang: 'EN', checked: true },
                { name: 'Industrial-License-BRD-Arabic.pdf', type: 'PDF', lang: 'AR', checked: true },
                { name: 'Renewal-Process-English.pdf', type: 'PDF', lang: 'EN', checked: true },
                { name: 'back-office-review-screen.png', type: 'Screenshot', lang: 'EN', checked: true },
                { name: 'Industrial License Renewal Flow', type: 'Figma', lang: 'EN', checked: true },
                { name: '8 comments (decisions, scope changes, clarifications)', type: 'Comments', lang: 'Mixed', checked: true },
                { name: '3 linked items (Epic, Feature, Story)', type: 'Links', lang: 'EN', checked: true },
              ].map((item) => (
                <label key={item.name} style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  padding: '8px',
                  backgroundColor: '#F7F8F9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}>
                  <input type="checkbox" defaultChecked={item.checked} style={{ marginTop: '2px', cursor: 'pointer' }} />
                  <span style={{ flex: 1, fontSize: '13px' }}>
                    <div style={{ fontWeight: 500, color: '#172B4D' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: '#626F86' }}>{item.type} • {item.lang}</div>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0 }}>Processing Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Arabic + English extraction', checked: true },
                { label: 'Include comments intelligence', checked: true },
                { label: 'Include linked items', checked: true },
                { label: 'Include Figma/design evidence', checked: true },
                { label: 'Prepare for Epic / Feature / Story generation', checked: true },
              ].map((opt) => (
                <label key={opt.label} style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked={opt.checked} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: '13px' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setStage('br-view')}
              style={{
                padding: '8px 16px',
                border: '1px solid #DFE1E6',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleStartProcessing}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0052CC',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Prepare Evidence Pack
            </button>
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#F7F8F9' }}>
          <h4 style={{ marginTop: 0 }}>Summary</h4>
          <div style={{ fontSize: '12px', color: '#626F86', lineHeight: '1.8' }}>
            <div><strong>Files:</strong> 5</div>
            <div><strong>Attachments:</strong> 4 files</div>
            <div><strong>Comments:</strong> 8 items</div>
            <div><strong>Links:</strong> 3 items</div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #DFE1E6' }}>
              <strong>Expected output:</strong> 12 draft items
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main BR view - matching Catalyst detail modal layout
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 280px',
      minHeight: '100vh',
      backgroundColor: '#FFFFFF'
    }}>
      {/* Left Content Area */}
      <div style={{ borderRight: '1px solid #DFE1E6' }}>
        {/* Top Action Bar */}
        <div style={{
          padding: '16px 32px',
          borderBottom: '1px solid #DFE1E6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#626F86', marginBottom: '4px' }}>
              Senael BAU / BAU-22 / BAU-6086
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              Industrial License Renewal Enhancement
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrepareEvidence}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0052CC',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              ✨ Prepare
            </button>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#F7F8F9',
              border: '1px solid #DFE1E6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}>
              Discuss
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #DFE1E6', padding: '0 32px', display: 'flex', gap: '24px' }}>
          {['description', 'attachments', 'comments', 'links'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                padding: '12px 0',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: selectedTab === tab ? '3px solid #0052CC' : 'none',
                color: selectedTab === tab ? '#0052CC' : '#626F86',
                cursor: 'pointer',
                fontSize: '13px',
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
              <p>
                Enable citizens to renew their industrial licenses online in both Arabic and English,
                reducing the burden on back-office staff and improving citizen experience.
              </p>

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
                <li style={{ padding: '8px 0', borderBottom: '1px solid #DFE1E6' }}>📄 Industrial-License-BRD-Arabic.pdf (2.3 MB)</li>
                <li style={{ padding: '8px 0', borderBottom: '1px solid #DFE1E6' }}>📄 Renewal-Process-English.pdf (1.8 MB)</li>
                <li style={{ padding: '8px 0', borderBottom: '1px solid #DFE1E6' }}>📷 back-office-review-screen.png (0.5 MB)</li>
                <li style={{ padding: '8px 0' }}>🎨 Industrial License Renewal Flow (Figma)</li>
              </ul>
            </div>
          )}

          {selectedTab === 'comments' && (
            <div>
              <h3>Comments (8)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: '#F7F8F9', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Vikram Indla (Product Owner)</div>
                  <div>Decision: Arabic + English support mandatory across all screens and communications.</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F7F8F9', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Abdullah Almetwally (BA)</div>
                  <div>Scope change: Add phone OTP verification as additional security measure.</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F7F8F9', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>Aisha Mohammed (Arabic Translator)</div>
                  <div style={{ direction: 'rtl', textAlign: 'right' }}>ما هي متطلبات التحقق من الهوية؟</div>
                  <div style={{ fontSize: '12px', color: '#626F86' }}>(What are the identity verification requirements?)</div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'links' && (
            <div>
              <h3>Linked Items (3)</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ padding: '8px 0', borderBottom: '1px solid #DFE1E6' }}>🔵 EPIC-312 License Management Overhaul</li>
                <li style={{ padding: '8px 0', borderBottom: '1px solid #DFE1E6' }}>🟢 FEAT-445 Renewal Submission Portal</li>
                <li style={{ padding: '8px 0' }}>◻️ STORY-1204 Enable citizens to upload documents</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Details */}
      <div style={{ padding: '32px 16px', backgroundColor: '#F7F8F9', overflowY: 'auto' }}>
        <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: '#626F86' }}>
          Details
        </h4>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#626F86', marginBottom: '4px' }}>Status</div>
          <div style={{ fontSize: '13px', color: '#172B4D' }}>🟢 Active</div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#626F86', marginBottom: '4px' }}>Product</div>
          <div style={{ fontSize: '13px', color: '#172B4D' }}>Licensing Platform</div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#626F86', marginBottom: '4px' }}>Request Type</div>
          <div style={{ fontSize: '13px', color: '#172B4D' }}>Feature</div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#626F86', marginBottom: '4px' }}>Created</div>
          <div style={{ fontSize: '13px', color: '#172B4D' }}>15 June 2026</div>
        </div>

        <div style={{
          borderTop: '1px solid #DFE1E6',
          paddingTop: '16px',
          marginTop: '16px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#626F86', marginBottom: '8px' }}>Linked Items</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#0052CC', cursor: 'pointer' }}>🔵 EPIC-312</div>
            <div style={{ fontSize: '12px', color: '#0052CC', cursor: 'pointer' }}>🟢 FEAT-445</div>
            <div style={{ fontSize: '12px', color: '#0052CC', cursor: 'pointer' }}>◻️ STORY-1204</div>
          </div>
        </div>
      </div>
    </div>
  );
}
