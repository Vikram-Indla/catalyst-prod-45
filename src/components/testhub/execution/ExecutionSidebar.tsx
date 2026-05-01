/**
 * G19: Execution Sidebar (Right Pane)
 * Shows attachments, linked defects, and previous run history
 */
import { useState } from 'react';
import { Bug, Paperclip, ExternalLink, Plus, Loader2, History } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { ExecutionAttachments } from '@/components/testhub/ExecutionAttachments';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface LinkedDefect {
  id: string;
  defect_key: string;
  title: string;
  severity: string | null;
  status: string | null;
  created_at: string;
}

interface PreviousRunData {
  execution_number: number;
  result: string;
  executed_at: string;
  step_results: Array<{
    step_number: number;
    title: string;
    status: string;
    notes: string;
  }>;
  executor?: { full_name: string } | null;
}

interface ExecutionSidebarProps {
  cycleTestCaseId: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  onCreateDefect: () => void;
  previousRunData?: PreviousRunData | null;
  isViewMode?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))',
  major: '#EA580C',
  minor: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))',
  trivial: 'var(--ds-text-success, var(--ds-text-success, #16A34A))',
};

const STEP_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  passed:  { text: 'var(--ds-text-success, var(--ds-text-success, #16A34A))', bg: '#F0FDF4', border: '#BBF7D0' },
  failed:  { text: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', bg: 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))', border: '#FECACA' },
  blocked: { text: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))', bg: '#FFFBEB', border: '#FED7AA' },
  skipped: { text: 'var(--ds-text-subtle, var(--ds-text-subtle, #475569))', bg: 'var(--bg-1, #F8FAFC)', border: 'var(--bd-default, #E2E8F0)' },
  not_run: { text: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', bg: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F1F5F9))', border: 'var(--bd-default, #E2E8F0)' },
};

export function ExecutionSidebar({
  cycleTestCaseId,
  attachments,
  onAttachmentsChange,
  onCreateDefect,
  previousRunData,
  isViewMode,
}: ExecutionSidebarProps) {
  const [activeTab, setActiveTab] = useState<'attachments' | 'defects' | 'history'>('attachments');
  const queryClient = useQueryClient();

  const { data: linkedDefects = [], isLoading: defectsLoading } = useQuery({
    queryKey: ['testcase-defects', cycleTestCaseId],
    enabled: !!cycleTestCaseId,
    queryFn: async (): Promise<LinkedDefect[]> => {
      const { data, error } = await typedQuery('tm_defect_links')
        .select(`
          defect_id,
          tm_defects (
            id, defect_key, title, severity, status, created_at
          )
        `)
        .eq('test_run_id', cycleTestCaseId);

      if (error) throw error;
      return (data || [])
        .map((row: any) => row.tm_defects)
        .filter(Boolean) as LinkedDefect[];
    },
  });

  const handleCreateDefect = () => {
    onCreateDefect();
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['testcase-defects', cycleTestCaseId] });
    }, 1000);
  };

  const tabs: Array<{ key: 'attachments' | 'defects' | 'history'; label: string; icon: any; count?: number }> = [
    { key: 'attachments', label: 'Attachments', icon: Paperclip, count: attachments.length },
    { key: 'defects', label: 'Defects', icon: Bug, count: linkedDefects.length },
  ];

  if (previousRunData) {
    tabs.push({ key: 'history', label: `Run #${previousRunData.execution_number}`, icon: History });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-app)' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--divider)' }}>
        {tabs.map(tab => (
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
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, backgroundColor: activeTab === tab.key ? 'var(--cp-blue)' : 'var(--bg-2)',
                color: activeTab === tab.key ? 'var(--fg-on-blue)' : 'var(--fg-3)',
                padding: '1px 6px', borderRadius: 12, minWidth: 18, textAlign: 'center',
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
            {!isViewMode && (
              <button
                onClick={handleCreateDefect}
                style={{
                  width: '100%', padding: '10px 14px', marginBottom: 16,
                  background: 'linear-gradient(135deg, var(--sem-danger) 0%, #B91C1C 100%)',
                  border: 'none', borderRadius: 8, color: 'var(--ds-text-inverse, #FFFFFF)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Plus size={16} /> Create Defect
              </button>
            )}

            {defectsLoading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : linkedDefects.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>
                <Bug size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p style={{ fontSize: 13, margin: 0 }}>No linked defects</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkedDefects.map(defect => (
                  <div
                    key={defect.id}
                    style={{
                      padding: '10px 12px', backgroundColor: 'color-mix(in srgb, var(--bg-2) 30%, transparent)',
                      borderRadius: 8, border: '1px solid var(--divider)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-mono)' }}>
                        {defect.defect_key}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        color: SEVERITY_COLORS[defect.severity || 'minor'] || 'var(--fg-3)',
                      }}>
                        {defect.severity}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>
                      {defect.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && previousRunData && (
          <div>
            <div style={{ marginBottom: 12, padding: '8px 12px', backgroundColor: 'var(--ds-background-selected, var(--ds-background-selected, #EFF6FF))', borderRadius: 6, border: '1px solid #BFDBFE' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-background-brand-bold-hovered, var(--ds-background-brand-bold-hovered, #1D4ED8))', margin: 0 }}>
                Previous Run #{previousRunData.execution_number}
              </p>
              <p style={{ fontSize: 10, color: 'var(--ds-text-brand, var(--ds-text-brand, #3B82F6))', margin: '2px 0 0' }}>
                {new Date(previousRunData.executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {' · Result: '}{previousRunData.result.toUpperCase()}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {previousRunData.step_results.map((step, i) => {
                const colors = STEP_COLORS[step.status] || STEP_COLORS.not_run;
                return (
                  <div key={i} style={{
                    padding: '8px 10px', backgroundColor: 'var(--bg-app, #FFFFFF)',
                    border: '0.75px solid var(--bd-default, #E2E8F0)', borderRadius: 6,
                    borderLeft: `3px solid ${colors.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        Step {step.step_number}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                        color: colors.text, backgroundColor: colors.bg, textTransform: 'uppercase',
                      }}>
                        {step.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0, lineHeight: 1.4 }}>{step.title}</p>
                    {step.notes && (
                      <p style={{ fontSize: 10, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', margin: '4px 0 0', fontStyle: 'italic' }}>{step.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
