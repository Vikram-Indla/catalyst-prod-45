import { useState, useEffect } from 'react';
import { X, Edit2, Copy, FileText, ClipboardList, Paperclip, Link2, History, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface TestCase {
  id: string;
  case_key: string;
  title: string;
  objective: string | null;
  preconditions: string | null;
  folder_id: string | null;
  priority: string;
  type: string;
  status: string;
  automation: string;
  version: number;
  updated_at: string;
}

interface Step {
  id: string;
  step_number: number;
  action: string;
  expected_result: string | null;
}

interface Link {
  id: string;
  link_type: string;
  linked_item_key: string;
  linked_item_title: string;
}

interface VersionHistory {
  id: string;
  version: number;
  changes: any;
  changed_at: string;
}

interface Execution {
  id: string;
  cycle_name: string;
  result: string;
  executed_at: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
}

interface ViewTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCase: TestCase | null;
  onEdit: () => void;
  onClone: () => void;
}

type TabKey = 'details' | 'steps' | 'attachments' | 'links' | 'history' | 'runs';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: '#F1F5F9', color: '#64748B' },
  ready: { bg: '#DCFCE7', color: '#16A34A' },
  approved: { bg: '#DBEAFE', color: '#2563EB' },
  deprecated: { bg: '#FEE2E2', color: '#DC2626' },
};

const PRIORITY_STYLES: Record<string, { color: string }> = {
  critical: { color: '#DC2626' },
  high: { color: '#EA580C' },
  medium: { color: '#CA8A04' },
  low: { color: '#64748B' },
};

export function ViewTestCaseModal({
  isOpen,
  onClose,
  testCase,
  onEdit,
  onClone,
}: ViewTestCaseModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [steps, setSteps] = useState<Step[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [history, setHistory] = useState<VersionHistory[]>([]);
  const [runs, setRuns] = useState<Execution[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && testCase) {
      setActiveTab('details');
      fetchRelatedData();
    }
  }, [isOpen, testCase]);

  const fetchRelatedData = async () => {
    if (!testCase) return;
    setLoading(true);

    try {
      const [stepsRes, linksRes, historyRes, runsRes, attachmentsRes] = await Promise.all([
        supabase.from('th_test_steps').select('*').eq('test_case_id', testCase.id).order('step_number'),
        supabase.from('th_test_case_links').select('*').eq('test_case_id', testCase.id),
        supabase.from('th_test_case_versions').select('*').eq('test_case_id', testCase.id).order('version', { ascending: false }),
        supabase.from('th_test_executions').select('*').eq('test_case_id', testCase.id).order('executed_at', { ascending: false }),
        supabase.from('th_test_case_attachments').select('*').eq('test_case_id', testCase.id),
      ]);

      setSteps(stepsRes.data || []);
      setLinks(linksRes.data || []);
      setHistory(historyRes.data || []);
      setRuns(runsRes.data || []);
      setAttachments(attachmentsRes.data || []);
    } catch (err) {
      console.error('Error fetching related data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !testCase) return null;

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'details', label: 'Details', icon: FileText },
    { key: 'steps', label: 'Steps', icon: ClipboardList, count: steps.length },
    { key: 'attachments', label: 'Attachments', icon: Paperclip, count: attachments.length },
    { key: 'links', label: 'Links', icon: Link2, count: links.length },
    { key: 'history', label: 'History', icon: History },
    { key: 'runs', label: 'Runs', icon: Play, count: runs.length },
  ];

  const statusStyle = STATUS_STYLES[testCase.status] || STATUS_STYLES.draft;
  const priorityStyle = PRIORITY_STYLES[testCase.priority] || PRIORITY_STYLES.medium;

  const renderTabContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      );
    }

    switch (activeTab) {
      case 'details':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objective</h4>
              {testCase.objective ? (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A', lineHeight: 1.6 }}>{testCase.objective}</p>
              ) : (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>No objective defined</p>
              )}
            </div>
            <div>
              <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preconditions</h4>
              {testCase.preconditions ? (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{testCase.preconditions}</p>
              ) : (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>No preconditions defined</p>
              )}
            </div>
          </div>
        );

      case 'steps':
        return steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No steps defined</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {steps.map((step) => (
              <div key={step.id} style={{ display: 'flex', gap: 16, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ width: 32, height: 32, backgroundColor: '#2563EB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {step.step_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Action</span>
                    <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A', marginTop: 4 }}>{step.action}</p>
                  </div>
                  {step.expected_result && (
                    <div>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Expected Result</span>
                      <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A', marginTop: 4 }}>{step.expected_result}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'attachments':
        return attachments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No attachments</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attachments.map((att) => (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', textDecoration: 'none' }}>
                <Paperclip style={{ width: 16, height: 16, color: '#64748B' }} />
                <span style={{ fontFamily: 'Inter', fontSize: 14, color: '#2563EB' }}>{att.file_name}</span>
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{Math.round(att.file_size / 1024)}KB</span>
              </a>
            ))}
          </div>
        );

      case 'links':
        const requirements = links.filter(l => l.link_type === 'requirement');
        const defects = links.filter(l => l.link_type === 'defect');
        const stories = links.filter(l => l.link_type === 'story');
        return links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No links</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {requirements.length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Requirements</h4>
                {requirements.map(link => (
                  <div key={link.id} style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563EB', marginRight: 8 }}>{link.linked_item_key}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A' }}>{link.linked_item_title}</span>
                  </div>
                ))}
              </div>
            )}
            {defects.length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Defects</h4>
                {defects.map(link => (
                  <div key={link.id} style={{ padding: 8, backgroundColor: '#FEF2F2', borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#DC2626', marginRight: 8 }}>{link.linked_item_key}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A' }}>{link.linked_item_title}</span>
                  </div>
                ))}
              </div>
            )}
            {stories.length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Stories</h4>
                {stories.map(link => (
                  <div key={link.id} style={{ padding: 8, backgroundColor: '#F0FDF4', borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#16A34A', marginRight: 8 }}>{link.linked_item_key}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A' }}>{link.linked_item_title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'history':
        return history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No version history</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map((ver) => (
              <div key={ver.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ width: 32, height: 32, backgroundColor: '#E2E8F0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                  v{ver.version}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A' }}>
                    {typeof ver.changes === 'object' ? JSON.stringify(ver.changes) : ver.changes || 'Version saved'}
                  </p>
                  <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {formatDistanceToNow(new Date(ver.changed_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'runs':
        return runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No test runs</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runs.map((run) => {
              const resultStyle = run.result === 'passed' 
                ? { bg: '#DCFCE7', color: '#16A34A' } 
                : run.result === 'failed' 
                  ? { bg: '#FEE2E2', color: '#DC2626' }
                  : { bg: '#F1F5F9', color: '#64748B' };
              return (
                <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontFamily: 'Inter', fontSize: 14, color: '#0F172A', flex: 1 }}>{run.cycle_name}</span>
                  <span style={{ padding: '4px 10px', backgroundColor: resultStyle.bg, color: resultStyle.color, borderRadius: 12, fontFamily: 'Inter', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{run.result}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>
                    {formatDistanceToNow(new Date(run.executed_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'calc(100vw - 80px)',
          maxWidth: 1200,
          height: 'calc(100vh - 80px)',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: 4, color: '#64748B' }}>
                {testCase.case_key}
              </span>
              <h2 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {testCase.title}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button 
                onClick={onEdit}
                style={{ height: 36, padding: '0 16px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Edit2 style={{ width: 14, height: 14 }} />
                Edit
              </button>
              <button 
                onClick={onClone}
                style={{ height: 36, padding: '0 16px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Copy style={{ width: 14, height: 14 }} />
                Clone
              </button>
              <button 
                onClick={onClose}
                style={{ width: 36, height: 36, padding: 0, border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
          </div>
          
          {/* Second row - badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ padding: '4px 10px', backgroundColor: statusStyle.bg, color: statusStyle.color, borderRadius: 12, fontFamily: 'Inter', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
              {testCase.status}
            </span>
            <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: priorityStyle.color, textTransform: 'uppercase' }}>
              {testCase.priority}
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: '#F1F5F9', color: '#64748B', borderRadius: 12, fontFamily: 'Inter', fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
              {testCase.type}
            </span>
            <span style={{ padding: '4px 10px', backgroundColor: '#F1F5F9', color: '#64748B', borderRadius: 12, fontFamily: 'Inter', fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>
              {testCase.automation}
            </span>
            <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>v{testCase.version}</span>
            <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8' }}>
              Updated {formatDistanceToNow(new Date(testCase.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 24px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                height: 48,
                padding: '0 16px',
                border: 'none',
                backgroundColor: 'transparent',
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? '#2563EB' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                position: 'relative',
              }}
            >
              <tab.icon style={{ width: 16, height: 16 }} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  height: 20,
                  minWidth: 20,
                  padding: '0 6px',
                  backgroundColor: activeTab === tab.key ? 'rgba(37,99,235,0.1)' : '#F1F5F9',
                  color: activeTab === tab.key ? '#2563EB' : '#64748B',
                  borderRadius: 10,
                  fontFamily: 'Inter',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#2563EB' }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {renderTabContent()}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ViewTestCaseModal;
