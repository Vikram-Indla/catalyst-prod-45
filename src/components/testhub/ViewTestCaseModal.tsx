import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Edit2, Copy, FileText, ClipboardList, Paperclip, Link2, History, Play, Plus, Trash2, Download, Upload, Bug, BookOpen, ImageIcon, Table, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useDropzone } from 'react-dropzone';

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
  step_id?: string | null;
  uploaded_at?: string;
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

// --- ADD LINK MODAL ---
function AddLinkModal({
  isOpen,
  onClose,
  linkType,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  linkType: 'requirement' | 'defect' | 'story';
  onAdd: (key: string, title: string) => void;
}) {
  const [itemKey, setItemKey] = useState('');
  const [itemTitle, setItemTitle] = useState('');

  if (!isOpen) return null;

  const titleMap = {
    requirement: 'Requirement',
    defect: 'Defect',
    story: 'Story',
  };

  const prefixMap = {
    requirement: 'REQ-',
    defect: 'DEF-',
    story: 'STORY-',
  };

  const handleSubmit = () => {
    if (!itemKey.trim()) return;
    onAdd(itemKey.trim(), itemTitle.trim() || 'Untitled');
    setItemKey('');
    setItemTitle('');
    onClose();
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
        zIndex: 1100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Add {titleMap[linkType]} Link
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6 }}>
              Item Key *
            </label>
            <input
              type="text"
              value={itemKey}
              onChange={(e) => setItemKey(e.target.value)}
              placeholder={prefixMap[linkType]}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                border: '1.5px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', marginBottom: 6 }}>
              Title
            </label>
            <input
              type="text"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder="Enter title..."
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                fontSize: 14,
                fontFamily: 'Inter, sans-serif',
                border: '1.5px solid #E2E8F0',
                borderRadius: 8,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 20px', borderTop: '1px solid #E2E8F0' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#64748B', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!itemKey.trim()}
            style={{
              height: 40,
              padding: '0 20px',
              background: itemKey.trim() ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#E2E8F0',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: itemKey.trim() ? '#FFFFFF' : '#94A3B8',
              cursor: itemKey.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add Link
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Link modal state
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [addLinkType, setAddLinkType] = useState<'requirement' | 'defect' | 'story'>('requirement');

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

  // --- LINK OPERATIONS ---
  const handleAddLink = async (key: string, title: string) => {
    if (!testCase) return;
    
    const { data, error } = await supabase.from('th_test_case_links').insert({
      test_case_id: testCase.id,
      link_type: addLinkType,
      linked_item_key: key,
      linked_item_title: title,
    }).select().single();

    if (!error && data) {
      setLinks([...links, data]);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    await supabase.from('th_test_case_links').delete().eq('id', linkId);
    setLinks(links.filter(l => l.id !== linkId));
  };

  // --- ATTACHMENT OPERATIONS ---
  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!testCase || files.length === 0) return;
    setIsUploading(true);

    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          console.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        const filePath = `test-cases/${testCase.id}/attachments/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('testhub-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('testhub-attachments')
          .getPublicUrl(filePath);

        const { data: insertedAtt, error: dbError } = await supabase
          .from('th_test_case_attachments')
          .insert({
            test_case_id: testCase.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            file_type: file.type,
          })
          .select()
          .single();

        if (!dbError && insertedAtt) {
          setAttachments(prev => [insertedAtt, ...prev]);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [testCase]);

  const handleDeleteAttachment = async (attId: string) => {
    const att = attachments.find(a => a.id === attId);
    if (!att) return;

    // Try to extract storage path from the public URL
    try {
      const url = new URL(att.file_url);
      const pathMatch = url.pathname.match(/\/object\/public\/testhub-attachments\/(.*)/);
      if (pathMatch) {
        await supabase.storage.from('testhub-attachments').remove([pathMatch[1]]);
      }
    } catch {}

    await supabase.from('th_test_case_attachments').delete().eq('id', attId);
    setAttachments(attachments.filter(a => a.id !== attId));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleUploadFiles(acceptedFiles);
  }, [handleUploadFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

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

  // --- TAB CONTENT ---
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
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header with Upload */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  height: 36,
                  padding: '0 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#2563EB',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                Upload
              </button>
            </div>

            {/* Attachment List */}
            {attachments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attachments.map((att) => {
                  const getFileIcon = () => {
                    if (att.file_type?.startsWith('image/')) return ImageIcon;
                    if (att.file_type === 'application/pdf') return FileText;
                    if (att.file_type?.includes('spreadsheet') || att.file_type?.includes('excel')) return Table;
                    return File;
                  };
                  const FileIcon = getFileIcon();
                  const fileExt = att.file_name.split('.').pop()?.toUpperCase() || 'FILE';
                  const fileSizeKb = Math.round((att.file_size || 0) / 1024);

                  return (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 16,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                      }}
                    >
                      <FileIcon style={{ width: 20, height: 20, color: '#64748B', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {att.file_name}
                        </p>
                        <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', margin: '2px 0 0 0' }}>
                          {fileExt} • {fileSizeKb} KB
                          {att.uploaded_at && ` • Uploaded ${formatDistanceToNow(new Date(att.uploaded_at), { addSuffix: true })}`}
                        </p>
                      </div>
                      <button
                        onClick={() => window.open(att.file_url, '_blank')}
                        style={{
                          height: 32,
                          padding: '0 12px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#2563EB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Download style={{ width: 14, height: 14 }} />
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        style={{
                          width: 28,
                          height: 28,
                          padding: 0,
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 4,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Hidden file input for Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  handleUploadFiles(Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
              style={{ display: 'none' }}
            />

            {/* Upload Dropzone */}
            <div
              {...getRootProps()}
              style={{
                border: `2px dashed ${isDragActive ? '#2563EB' : '#E2E8F0'}`,
                borderRadius: 8,
                padding: 32,
                textAlign: 'center',
                backgroundColor: isDragActive ? 'rgba(37,99,235,0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <>
                  <div style={{ width: 24, height: 24, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                  <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#64748B', margin: 0 }}>Uploading...</p>
                </>
              ) : (
                <>
                  <Upload style={{ width: 24, height: 24, color: '#64748B', margin: '0 auto 8px' }} />
                  <p style={{ fontFamily: 'Inter', fontSize: 14, color: '#64748B', margin: 0 }}>
                    {isDragActive ? 'Drop files here...' : 'Drag and drop files here, or click to upload'}
                  </p>
                  <p style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', margin: '4px 0 0' }}>Max 10MB per file</p>
                </>
              )}
            </div>
          </div>
        );

      case 'links':
        const requirements = links.filter(l => l.link_type === 'requirement');
        const defects = links.filter(l => l.link_type === 'defect');
        const stories = links.filter(l => l.link_type === 'story');

        const renderLinkSection = (
          title: string,
          items: Link[],
          type: 'requirement' | 'defect' | 'story',
          icon: any,
          iconColor: string,
          bgColor: string
        ) => {
          const Icon = icon;
          return (
            <div style={{ marginBottom: 24 }}>
              {/* Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
                  {title}
                </span>
                <button
                  onClick={() => { setAddLinkType(type); setAddLinkOpen(true); }}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563EB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus style={{ width: 12, height: 12 }} />
                  Add Link
                </button>
              </div>

              {/* Items */}
              {items.length === 0 ? (
                <p style={{ fontFamily: 'Inter', fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>
                  No {title.toLowerCase()} linked
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(link => (
                    <div
                      key={link.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                      }}
                    >
                      <Icon style={{ width: 16, height: 16, color: iconColor, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: '#0F172A', marginLeft: 12, minWidth: 100 }}>
                        {link.linked_item_key}
                      </span>
                      <span style={{ fontFamily: 'Inter', fontSize: 13, color: '#64748B', flex: 1 }}>
                        {link.linked_item_title}
                      </span>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        style={{
                          width: 28,
                          height: 28,
                          padding: 0,
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 4,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        };

        return (
          <div>
            {renderLinkSection('Requirements', requirements, 'requirement', ClipboardList, '#2563EB', '#EFF6FF')}
            {renderLinkSection('Defects', defects, 'defect', Bug, '#EF4444', '#FEF2F2')}
            {renderLinkSection('Stories', stories, 'story', BookOpen, '#8B5CF6', '#F5F3FF')}
          </div>
        );

      case 'history':
        if (history.length === 0) {
          return <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No version history</div>;
        }

        const formatChange = (changes: any): string => {
          if (!changes) return 'Version saved';
          if (typeof changes === 'string') return changes;
          if (changes.field) {
            return `Changed ${changes.field}`;
          }
          return JSON.stringify(changes);
        };

        const getChangeDiff = (changes: any): { old?: string; new?: string } | null => {
          if (!changes || typeof changes !== 'object') return null;
          if (changes.old !== undefined || changes.new !== undefined) {
            return { old: changes.old, new: changes.new };
          }
          return null;
        };

        return (
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: 5,
              top: 6,
              bottom: 6,
              width: 2,
              backgroundColor: '#E2E8F0',
            }} />

            {history.map((ver, idx) => {
              const diff = getChangeDiff(ver.changes);
              return (
                <div key={ver.id} style={{ position: 'relative', paddingBottom: idx < history.length - 1 ? 24 : 0 }}>
                  {/* Dot */}
                  <div style={{
                    position: 'absolute',
                    left: -24,
                    top: 4,
                    width: 12,
                    height: 12,
                    backgroundColor: '#2563EB',
                    border: '2px solid #FFFFFF',
                    borderRadius: '50%',
                    boxShadow: '0 0 0 2px #E2E8F0',
                  }} />

                  {/* Content */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                      Version {ver.version}
                    </span>
                    <span style={{ fontFamily: 'Inter', fontSize: 13, color: '#94A3B8' }}>
                      {formatDistanceToNow(new Date(ver.changed_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#64748B', marginTop: 4 }}>
                    {formatChange(ver.changes)}
                  </div>
                  {diff && (
                    <div style={{ fontFamily: 'Inter', fontSize: 13, marginTop: 4 }}>
                      {diff.old && (
                        <span style={{ color: '#DC2626', textDecoration: 'line-through' }}>"{diff.old}"</span>
                      )}
                      {diff.old && diff.new && (
                        <span style={{ color: '#64748B', margin: '0 6px' }}>→</span>
                      )}
                      {diff.new && (
                        <span style={{ color: '#059669' }}>"{diff.new}"</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
    <>
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

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={addLinkOpen}
        onClose={() => setAddLinkOpen(false)}
        linkType={addLinkType}
        onAdd={handleAddLink}
      />
    </>
  );
}

export default ViewTestCaseModal;
