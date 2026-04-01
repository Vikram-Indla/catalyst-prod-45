/**
 * G19: Execution Sidebar (Right Pane)
 * Shows attachments and linked defects for the current test
 */
import { useState } from 'react';
import { Bug, Paperclip, ExternalLink, Plus } from 'lucide-react';
import { ExecutionAttachments } from '@/components/testhub/ExecutionAttachments';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface ExecutionSidebarProps {
  cycleTestCaseId: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  defectIds: string[];
  onCreateDefect: () => void;
}

export function ExecutionSidebar({
  cycleTestCaseId,
  attachments,
  onAttachmentsChange,
  defectIds,
  onCreateDefect,
}: ExecutionSidebarProps) {
  const [activeTab, setActiveTab] = useState<'attachments' | 'defects'>('attachments');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-app)' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--divider)' }}>
        {[
          { key: 'attachments' as const, label: 'Attachments', icon: Paperclip, count: attachments.length },
          { key: 'defects' as const, label: 'Defects', icon: Bug, count: defectIds.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '12px 8px', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--cp-blue)' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.key ? 'var(--cp-blue)' : 'var(--fg-3)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, backgroundColor: activeTab === tab.key ? 'var(--cp-blue)' : 'var(--bg-2)',
                color: activeTab === tab.key ? 'var(--fg-on-blue)' : 'var(--fg-3)',
                padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {activeTab === 'attachments' && (
          <ExecutionAttachments
            cycleTestCaseId={cycleTestCaseId}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
          />
        )}

        {activeTab === 'defects' && (
          <div>
            <button
              onClick={onCreateDefect}
              style={{
                width: '100%', padding: '10px 14px', marginBottom: 16,
                background: 'linear-gradient(135deg, var(--sem-danger) 0%, #B91C1C 100%)',
                border: 'none', borderRadius: 8, color: '#FFFFFF',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Plus size={16} /> Create Defect
            </button>

            {defectIds.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>
                <Bug size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p style={{ fontSize: 13, margin: 0 }}>No linked defects</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {defectIds.map(defId => (
                  <div
                    key={defId}
                    style={{
                      padding: '10px 12px', backgroundColor: 'color-mix(in srgb, var(--bg-2) 30%, transparent)',
                      borderRadius: 8, border: '1px solid var(--divider)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>
                      {defId}
                    </span>
                    <ExternalLink size={14} style={{ color: 'var(--fg-3)' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
