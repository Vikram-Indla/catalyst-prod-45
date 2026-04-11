import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Edit2, Copy, FileText, ClipboardList, Paperclip, Link2, History, Play, Plus, Trash2, Download, Upload, Bug, BookOpen, ImageIcon, Table, File, MessageSquare, Search, Loader2, GitBranch, RefreshCw, Tag } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { EntityCommentsPanel } from '@/components/testhub/EntityCommentsPanel';
import { formatDistanceToNow } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import { useQuery } from '@tanstack/react-query';

interface TestCase {
  id: string;
  case_key: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  folder_id: string | null;
  priority_id: string | null;
  case_type_id: string | null;
  status: string;
  version: number;
  updated_at: string;
  project_id?: string;
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
  _source: 'tm_test_case_links' | 'tm_defect_links';
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

type TabKey = 'details' | 'steps' | 'attachments' | 'links' | 'history' | 'runs' | 'comments';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'var(--cp-bd-zone)', color: 'var(--fg-3)' },
  ready: { bg: '#DCFCE7', color: 'var(--sem-success)' },
  approved: { bg: '#DBEAFE', color: 'var(--cp-blue)' },
  deprecated: { bg: '#FEE2E2', color: 'var(--sem-danger)' },
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
          backgroundColor: 'var(--cp-float)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>
            Add {titleMap[linkType]} Link
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 6 }}>
              Item Key *
            </label>
            <input type="text" value={itemKey} onChange={(e) => setItemKey(e.target.value)} placeholder={prefixMap[linkType]}
              style={{ width: '100%', height: 40, padding: '8px 12px', fontSize: 14, fontFamily: 'Inter, sans-serif', border: '1.5px solid var(--divider)', borderRadius: 8, outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 6 }}>
              Title
            </label>
            <input type="text" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Enter title..."
              style={{ width: '100%', height: 40, padding: '8px 12px', fontSize: 14, fontFamily: 'Inter, sans-serif', border: '1.5px solid var(--divider)', borderRadius: 8, outline: 'none' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 20px', borderTop: '1px solid var(--divider)' }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-3)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!itemKey.trim()}
            style={{ height: 40, padding: '0 20px', background: itemKey.trim() ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : 'var(--divider)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: itemKey.trim() ? '#FFFFFF' : 'var(--fg-4)', cursor: itemKey.trim() ? 'pointer' : 'not-allowed' }}>
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

  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [addLinkType, setAddLinkType] = useState<'requirement' | 'defect' | 'story'>('requirement');

  useEffect(() => {
    if (isOpen && testCase) {
      setActiveTab('details');
      fetchRelatedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, testCase?.id]);

  const fetchRelatedData = async () => {
    if (!testCase) return;
    setLoading(true);

    try {
      const [stepsRes, reqStoryLinksRes, defectLinksRes, historyRes, runsRes, attachmentsRes] = await Promise.all([
        supabase.from('tm_test_steps').select('*').eq('test_case_id', testCase.id).order('step_number'),
        typedQuery('tm_test_case_links').select('*').eq('test_case_id', testCase.id).in('linked_item_type', ['requirement', 'story']),
        typedQuery('tm_defect_links').select('*').eq('link_type', 'test_case').eq('linked_id', testCase.id),
        typedQuery('tm_test_case_versions').select('*').eq('test_case_id', testCase.id).order('version_number', { ascending: false }),
        typedQuery('th_test_executions').select('*').eq('test_case_id', testCase.id).order('executed_at', { ascending: false }),
        typedQuery('th_test_case_attachments').select('*').eq('test_case_id', testCase.id),
      ]);

      setSteps(stepsRes.data || []);

      // Map requirement/story links from tm_test_case_links
      const reqStoryLinks: Link[] = (reqStoryLinksRes.data || []).map((l: any) => ({
        id: l.id,
        link_type: l.linked_item_type || '',
        linked_item_key: l.linked_item_key || l.linked_item_id || '',
        linked_item_title: l.linked_item_title || '',
        _source: 'tm_test_case_links' as const,
      }));

      // Map defect links from tm_defect_links
      const defectLinks: Link[] = (defectLinksRes.data || []).map((l: any) => ({
        id: l.id,
        link_type: 'defect',
        linked_item_key: l.defect_id || '',
        linked_item_title: l.entity_label || 'Defect',
        _source: 'tm_defect_links' as const,
      }));

      setLinks([...reqStoryLinks, ...defectLinks]);

      // Map tm_test_case_versions to expected shape
      const historyData = (historyRes.data || []).map((v: any) => ({
        id: v.id,
        version: v.version_number,
        changes: v.change_summary || v.snapshot,
        changed_at: v.created_at,
      }));
      setHistory(historyData);
      setRuns(runsRes.data || []);
      setAttachments(attachmentsRes.data || []);
    } catch (err) {
      console.error('Error fetching related data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (key: string, title: string) => {
    if (!testCase) return;
    const { data: { user } } = await supabase.auth.getUser();

    if (addLinkType === 'defect') {
      // Write to tm_defect_links
      const { data, error } = await typedQuery('tm_defect_links').insert({
        defect_id: key,
        link_type: 'test_case',
        linked_id: testCase.id,
        entity_label: title,
        link_source: 'manual',
        created_by: user?.id || null,
      }).select().single();
      if (!error && data) {
        setLinks([...links, {
          id: data.id,
          link_type: 'defect',
          linked_item_key: data.defect_id || key,
          linked_item_title: title,
          _source: 'tm_defect_links',
        }]);
      }
    } else {
      // Write requirement/story to tm_test_case_links
      const { data, error } = await typedQuery('tm_test_case_links').insert({
        test_case_id: testCase.id,
        linked_item_type: addLinkType,
        linked_item_id: key,
        linked_by: user?.id || null,
      }).select().single();
      if (!error && data) {
        setLinks([...links, {
          id: data.id,
          link_type: data.linked_item_type,
          linked_item_key: data.linked_item_id || key,
          linked_item_title: title,
          _source: 'tm_test_case_links',
        }]);
      }
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;

    if (link._source === 'tm_defect_links') {
      await typedQuery('tm_defect_links').delete().eq('id', linkId);
    } else {
      await typedQuery('tm_test_case_links').delete().eq('id', linkId);
    }
    setLinks(links.filter(l => l.id !== linkId));
  };

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!testCase || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { console.error(`${file.name} is too large (max 10MB)`); continue; }
        const filePath = `test-cases/${testCase.id}/attachments/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('testhub-attachments').upload(filePath, file);
        if (uploadError) { console.error('Upload error:', uploadError); continue; }
        const { data: urlData } = supabase.storage.from('testhub-attachments').getPublicUrl(filePath);
        const { data: insertedAtt, error: dbError } = await typedQuery('th_test_case_attachments').insert({
          test_case_id: testCase.id, file_name: file.name, file_url: urlData.publicUrl, file_size: file.size, file_type: file.type,
        }).select().single();
        if (!dbError && insertedAtt) { setAttachments(prev => [insertedAtt, ...prev]); }
      }
    } catch (err) { console.error('Upload error:', err); }
    finally { setIsUploading(false); }
  }, [testCase]);

  const handleDeleteAttachment = async (attId: string) => {
    const att = attachments.find(a => a.id === attId);
    if (!att) return;
    try {
      const url = new URL(att.file_url);
      const pathMatch = url.pathname.match(/\/object\/public\/testhub-attachments\/(.*)/);
      if (pathMatch) { await supabase.storage.from('testhub-attachments').remove([pathMatch[1]]); }
    } catch {}
    await typedQuery('th_test_case_attachments').delete().eq('id', attId);
    setAttachments(attachments.filter(a => a.id !== attId));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => { handleUploadFiles(acceptedFiles); }, [handleUploadFiles]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (!isOpen || !testCase) return null;

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'details', label: 'Details', icon: FileText },
    { key: 'steps', label: 'Steps', icon: ClipboardList, count: steps.length },
    { key: 'attachments', label: 'Attachments', icon: Paperclip, count: attachments.length },
    { key: 'links', label: 'Links', icon: Link2, count: links.length },
    { key: 'history', label: 'History', icon: History },
    { key: 'runs', label: 'Runs', icon: Play, count: runs.length },
    { key: 'comments', label: 'Comments', icon: MessageSquare },
  ];

  const statusStyle = STATUS_STYLES[testCase.status] || STATUS_STYLES.draft;

  const renderTabContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--divider)', borderTopColor: 'var(--cp-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      );
    }

    switch (activeTab) {
      case 'details':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</h4>
              {testCase.description ? (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6 }}>{testCase.description}</p>
              ) : (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-4)', fontStyle: 'italic' }}>No description defined</p>
              )}
            </div>
            <div>
              <h4 style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preconditions</h4>
              {testCase.preconditions ? (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{testCase.preconditions}</p>
              ) : (
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-4)', fontStyle: 'italic' }}>No preconditions defined</p>
              )}
            </div>
          </div>
        );

      case 'steps':
        return steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>No steps defined</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {steps.map((step) => (
              <div key={step.id} style={{ display: 'flex', gap: 16, padding: 16, backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
                <div style={{ width: 32, height: 32, backgroundColor: 'var(--cp-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cp-float)', fontFamily: 'Inter', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {step.step_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase' }}>Action</span>
                    <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)', marginTop: 4 }}>{step.action}</p>
                  </div>
                  {step.expected_result && (
                    <div>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase' }}>Expected Result</span>
                      <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'var(--fg-1)', marginTop: 4 }}>{step.expected_result}</p>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => fileInputRef.current?.click()}
                style={{ height: 50, padding: '0 16px', backgroundColor: 'transparent', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--cp-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus style={{ width: 14, height: 14 }} /> Upload
              </button>
            </div>
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
                  const fileSizeKb = Math.round((att.file_size || 0) / 1024);
                  return (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
                      <FileIcon style={{ width: 20, height: 20, color: 'var(--fg-3)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.file_name}</p>
                        <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: 0 }}>{fileSizeKb} KB</p>
                      </div>
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cp-blue)' }}><Download style={{ width: 16, height: 16 }} /></a>
                      <button onClick={() => handleDeleteAttachment(att.id)} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--sem-danger)', cursor: 'pointer', padding: 4 }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div {...getRootProps()} style={{ padding: 40, border: '2px dashed var(--divider)', borderRadius: 12, textAlign: 'center', cursor: 'pointer', backgroundColor: isDragActive ? 'color-mix(in srgb, var(--cp-blue) 5%, transparent)' : 'var(--bg-1)' }}>
                <input {...getInputProps()} />
                <Upload style={{ width: 32, height: 32, color: 'var(--fg-4)', marginBottom: 8 }} />
                <p style={{ fontSize: 14, color: 'var(--fg-3)', margin: 0 }}>Drag files here or click to browse</p>
                <p style={{ fontSize: 12, color: 'var(--fg-4)', margin: '4px 0 0' }}>Max 10MB per file</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" multiple onChange={(e) => e.target.files && handleUploadFiles(Array.from(e.target.files))} style={{ display: 'none' }} />
          </div>
        );

      case 'links':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['requirement', 'defect', 'story'] as const).map(lt => (
                <button key={lt} onClick={() => { setAddLinkType(lt); setAddLinkOpen(true); }}
                  style={{ height: 32, padding: '8px 12px', backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 6, fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus style={{ width: 12, height: 12 }} /> {lt === 'requirement' ? 'Requirement' : lt === 'defect' ? 'Defect' : 'Story'}
                </button>
              ))}
            </div>
            {links.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>No links added yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map(link => (
                  <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
                    {link.link_type === 'defect' ? <Bug style={{ width: 16, height: 16, color: 'var(--sem-danger)' }} /> : <BookOpen style={{ width: 16, height: 16, color: 'var(--cp-blue)' }} />}
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '2px 8px', borderRadius: 4 }}>{link.linked_item_key}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.linked_item_title}</span>
                    <button onClick={() => handleDeleteLink(link.id)} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', padding: 4 }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                  </div>
                ))}
              </div>
            )}
            <AddLinkModal isOpen={addLinkOpen} onClose={() => setAddLinkOpen(false)} linkType={addLinkType} onAdd={handleAddLink} />
          </div>
        );

      case 'history':
        return history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>No version history</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(h => (
              <div key={h.id} style={{ padding: '12px 16px', backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>Version {h.version}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>{h.changed_at ? formatDistanceToNow(new Date(h.changed_at), { addSuffix: true }) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'runs':
        return runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-4)' }}>No execution runs</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {runs.map(r => (
              <div key={r.id} style={{ padding: '12px 16px', backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{r.cycle_name || 'Unknown cycle'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: r.result === 'passed' ? 'var(--sem-success)' : r.result === 'failed' ? 'var(--sem-danger)' : 'var(--fg-3)' }}>{r.result}</span>
              </div>
            ))}
          </div>
        );

      case 'comments':
        return <EntityCommentsPanel entityType="test_case" entityId={testCase.id} />;

      default:
        return null;
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 1100, maxWidth: '95vw', minHeight: 600, maxHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--cp-float)', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--cp-blue)', backgroundColor: 'color-mix(in srgb, var(--cp-blue) 8%, transparent)', padding: '4px 10px', borderRadius: 6 }}>{testCase.case_key}</span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, backgroundColor: statusStyle.bg, color: statusStyle.color, textTransform: 'capitalize' }}>{testCase.status}</span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0, lineHeight: 1.3 }}>{testCase.title}</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
              <button onClick={onEdit} title="Edit" style={{ width: 36, height: 50, border: '1px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 style={{ width: 16, height: 16 }} /></button>
              <button onClick={onClone} title="Clone" style={{ width: 36, height: 50, border: '1px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Copy style={{ width: 16, height: 16 }} /></button>
              <button onClick={onClose} title="Close" style={{ width: 36, height: 50, border: '1px solid var(--divider)', borderRadius: 8, backgroundColor: 'var(--cp-float)', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X style={{ width: 16, height: 16 }} /></button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', border: 'none', backgroundColor: 'transparent', borderBottom: isActive ? '2px solid var(--cp-blue)' : '2px solid transparent', color: isActive ? 'var(--cp-blue)' : 'var(--fg-3)', fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer' }}>
                <Icon style={{ width: 14, height: 14 }} />
                {tab.label}
                {tab.count !== undefined && <span style={{ fontSize: 11, backgroundColor: isActive ? 'color-mix(in srgb, var(--cp-blue) 12%, transparent)' : 'var(--bg-1)', padding: '1px 6px', borderRadius: 12, fontWeight: 600 }}>{tab.count}</span>}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {renderTabContent()}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
