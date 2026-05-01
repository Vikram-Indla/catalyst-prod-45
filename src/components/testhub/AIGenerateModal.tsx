import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, FolderOpen, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentFolderId?: string | null;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  project_id: string;
}

interface GeneratedTestCase {
  id: string;
  title: string;
  summary: string;
  priority: string;
  testType: string;
  testCategory: 'positive' | 'negative' | 'edge_case';
  steps: Array<{ stepNumber: number; action: string; expectedResult: string; testData?: string }>;
}

const CATEGORY_CONFIG = {
  positive: { label: 'Positive', icon: CheckCircle2, color: 'var(--sem-success)', bg: 'rgba(5,150,105,0.08)', border: 'var(--sem-success)' },
  negative: { label: 'Negative', icon: XCircle, color: 'var(--sem-danger)', bg: 'rgba(220,38,38,0.08)', border: 'var(--sem-danger)' },
  edge_case: { label: 'Edge Case', icon: AlertTriangle, color: 'var(--sem-warning)', bg: 'rgba(217,119,6,0.08)', border: 'var(--sem-warning)' },
};

// Build a nested tree from flat folder list
function buildFolderTree(folders: Folder[], parentId: string | null = null): (Folder & { children: any[] })[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .map(f => ({ ...f, children: buildFolderTree(folders, f.id) }));
}

// Get the full breadcrumb path for a folder
function getFolderPath(folders: Folder[], folderId: string): string[] {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return [];
  if (!folder.parent_id) return [folder.name];
  return [...getFolderPath(folders, folder.parent_id), folder.name];
}

/**
 * Fetch the next unique case_key by scanning ALL existing keys and finding the max.
 * Returns consecutive keys for batch inserts (e.g., TC-010, TC-011, TC-012).
 */
async function getNextCaseKeys(batchSize: number): Promise<string[]> {
  const { data: allCases } = await supabase
    .from('tm_test_cases')
    .select('case_key');

  let maxNum = 0;
  if (allCases) {
    for (const row of allCases) {
      const match = row.case_key?.match(/TC-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  return Array.from({ length: batchSize }, (_, i) =>
    `TC-${String(maxNum + 1 + i).padStart(3, '0')}`
  );
}

export function AIGenerateModal({ isOpen, onClose, onSuccess, currentFolderId }: AIGenerateModalProps) {
  const [step, setStep] = useState<'folder' | 'input' | 'preview'>('folder');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null);
  const [description, setDescription] = useState('');
  const [count, setCount] = useState(5);
  const [includeSteps, setIncludeSteps] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTestCase[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Fetch folders when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      // Pre-select the current folder if provided
      setSelectedFolderId(currentFolderId || null);
    }
  }, [isOpen, currentFolderId]);

  const fetchFolders = async () => {
    setLoadingFolders(true);
    try {
      const { data, error } = await supabase
        .from('tm_folders')
        .select('id, name, parent_id, project_id')
        .order('sort_order');
      if (error) throw error;
      setFolders(data || []);
      // Auto-expand all parent folders
      const parentIds = new Set<string>();
      (data || []).forEach(f => { if (f.parent_id) parentIds.add(f.parent_id); });
      setExpandedFolders(parentIds);
    } catch {
      toast.error('Failed to load folders');
    } finally {
      setLoadingFolders(false);
    }
  };

  const resetState = () => {
    setStep('folder');
    setDescription('');
    setCount(5);
    setIncludeSteps(true);
    setIsGenerating(false);
    setGenerated([]);
    setSelected(new Set());
    setValidationError(null);
    setSelectedFolderId(currentFolderId || null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFolderContinue = () => {
    if (!selectedFolderId) {
      toast.error('Please select a target folder');
      return;
    }
    setStep('input');
  };

  const handleGenerate = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      setValidationError('Please enter a description');
      return;
    }
    setValidationError(null);
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-test-cases', {
        body: { description: trimmed, count, includeSteps },
      });

      if (error) {
        const errBody = typeof error === 'object' && 'context' in error ? error : null;
        throw new Error(errBody?.message || 'Failed to generate test cases');
      }

      if (data?.error) {
        if (data.errorType === 'validation') {
          setValidationError(data.error);
          return;
        }
        throw new Error(data.error);
      }

      if (!data?.data?.testCases?.length) {
        throw new Error('No test cases were generated');
      }

      const results: GeneratedTestCase[] = data.data.testCases.map((tc: any, i: number) => ({
        id: `gen-${i}`,
        title: tc.title || `Test Case ${i + 1}`,
        summary: tc.summary || '',
        priority: tc.priority || 'medium',
        testType: tc.testType || 'functional',
        testCategory: tc.testCategory || 'positive',
        steps: tc.steps || [],
      }));

      setGenerated(results);
      setSelected(new Set(results.map(r => r.id)));
      setStep('preview');
    } catch (err: any) {
      console.error('AI generation error:', err);
      if (err?.message?.includes('too short') || err?.message?.includes('too vague') || err?.message?.includes('lacks enough detail')) {
        setValidationError(err.message);
      } else {
        toast.error(err?.message || 'Failed to generate test cases');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = async () => {
    const toInsert = generated.filter(g => selected.has(g.id));
    if (toInsert.length === 0) {
      toast.error('Please select at least one test case');
      return;
    }

    setIsInserting(true);

    try {
      const selectedFolder = folders.find(folder => folder.id === selectedFolderId);
      const projectId = selectedFolder?.project_id || DEFAULT_PROJECT_ID;

      const [caseKeys, priorityResponse, typeResponse] = await Promise.all([
        getNextCaseKeys(toInsert.length),
        supabase
          .from('tm_case_priorities')
          .select('id, name')
          .eq('project_id', projectId),
        supabase
          .from('tm_case_types')
          .select('id, name')
          .eq('project_id', projectId),
      ]);

      if (priorityResponse.error) throw priorityResponse.error;
      if (typeResponse.error) throw typeResponse.error;

      const priorityIdByName = new Map(
        (priorityResponse.data || []).map((priority) => [priority.name.toLowerCase(), priority.id])
      );
      const typeIdByName = new Map(
        (typeResponse.data || []).map((type) => [type.name.toLowerCase(), type.id])
      );

      const fallbackPriorityId = priorityIdByName.get('medium') ?? null;
      const fallbackTypeId = typeIdByName.get('functional') ?? null;
      const typeAliases: Record<string, string> = {
        e2e: 'functional',
        'end-to-end': 'functional',
        end_to_end: 'functional',
        integration: 'functional',
        regression: 'functional',
        smoke: 'functional',
        usability: 'functional',
      };

      for (let i = 0; i < toInsert.length; i++) {
        const tc = toInsert[i];
        const normalizedPriority = tc.priority?.trim().toLowerCase() || 'medium';
        const normalizedType = tc.testType?.trim().toLowerCase() || 'functional';
        const resolvedType = typeAliases[normalizedType] || normalizedType;

        const { data: newCase, error: tcError } = await supabase
          .from('tm_test_cases')
          .insert({
            project_id: projectId,
            case_key: caseKeys[i],
            title: tc.title.trim(),
            description: tc.summary?.trim() || null,
            folder_id: selectedFolderId || null,
            priority_id: priorityIdByName.get(normalizedPriority) ?? fallbackPriorityId,
            case_type_id: typeIdByName.get(resolvedType) ?? fallbackTypeId,
            status: 'draft',
            automation_status: 'manual',
            is_ai_generated: true,
            ai_generation_prompt: description.trim() || null,
            ai_generated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (tcError) throw tcError;

        if (includeSteps && tc.steps?.length && newCase) {
          const { error: stepError } = await supabase.from('tm_test_steps').insert(
            tc.steps.map((s, idx) => ({
              test_case_id: newCase.id,
              step_number: s.stepNumber || idx + 1,
              action: s.action,
              expected_result: s.expectedResult,
            }))
          );

          if (stepError) throw stepError;
        }
      }

      const folderName = selectedFolder?.name || 'selected folder';
      toast.success(`Created ${toInsert.length} test cases in "${folderName}"`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Insert failed:', err);

      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to create test cases';

      toast.error(message);
    } finally {
      setIsInserting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelected(newSelected);
  };

  const toggleFolderExpand = (folderId: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    setExpandedFolders(next);
  };

  if (!isOpen) return null;

  const categoryCounts = generated.reduce((acc, tc) => {
    acc[tc.testCategory] = (acc[tc.testCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const selectedFolderPath = selectedFolderId ? getFolderPath(folders, selectedFolderId) : [];
  const tree = buildFolderTree(folders);

  // Recursive folder tree renderer
  const renderFolderTree = (nodes: (Folder & { children: any[] })[], depth: number = 0) => {
    return nodes.map(node => {
      const isSelected = selectedFolderId === node.id;
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedFolders.has(node.id);

      return (
        <div key={node.id}>
          <div
            onClick={() => setSelectedFolderId(node.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', paddingLeft: 12 + depth * 20,
              borderRadius: 6, cursor: 'pointer', transition: 'all 0.1s',
              backgroundColor: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
              border: isSelected ? '1px solid rgba(37,99,235,0.25)' : '1px solid transparent',
            }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-1)'; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleFolderExpand(node.id); }}
                style={{
                  width: 18, height: 18, padding: 0, border: 'none', borderRadius: 4,
                  backgroundColor: 'transparent', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--fg-4)',
                }}
              >
                <ChevronRight size={14} style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                }} />
              </button>
            ) : (
              <span style={{ width: 18 }} />
            )}
            <FolderOpen size={16} style={{ color: isSelected ? 'var(--cp-blue)' : 'var(--fg-4)', flexShrink: 0 }} />
            <span style={{
              fontSize: 14, fontWeight: isSelected ? 600 : 400,
              color: isSelected ? 'var(--cp-blue)' : 'var(--fg-2)',
            }}>
              {node.name}
            </span>
            {isSelected && (
              <CheckCircle2 size={14} style={{ color: 'var(--cp-blue)', marginLeft: 'auto' }} />
            )}
          </div>
          {hasChildren && isExpanded && renderFolderTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  // Step titles
  const stepConfig = {
    folder: { title: 'Select Target Folder', subtitle: 'Choose the folder where generated test cases will be stored' },
    input: { title: 'Generate Test Cases with AI', subtitle: 'Powered by Google Gemini · 60% positive · 20% negative · 20% edge cases' },
    preview: { title: 'Review Generated Test Cases', subtitle: `${generated.length} test cases generated` },
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }} onClick={handleClose}>
      <div style={{
        width: 680, backgroundColor: 'var(--cp-float)', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--divider)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 50, borderRadius: 8,
              background: step === 'folder'
                ? 'linear-gradient(135deg, var(--ds-text-brand, #2563EB) 0%, var(--ds-background-brand-bold-hovered, #1D4ED8) 100%)'
                : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {step === 'folder' ? <FolderOpen size={20} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} /> : <Sparkles size={20} style={{ color: 'var(--ds-text-inverse, #FFFFFF)' }} />}
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
                {stepConfig[step].title}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 2 }}>
                {stepConfig[step].subtitle}
              </p>
            </div>
          </div>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {(['folder', 'input', 'preview'] as const).map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: step === s ? 'var(--cp-blue)' : (['folder', 'input', 'preview'].indexOf(step) > i ? 'var(--sem-success)' : 'var(--divider)'),
                    color: step === s || (['folder', 'input', 'preview'].indexOf(step) > i) ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--fg-4)',
                  }}>
                    {['folder', 'input', 'preview'].indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  {i < 2 && <div style={{ width: 16, height: 1, backgroundColor: 'var(--divider)' }} />}
                </div>
              ))}
            </div>
            <button onClick={handleClose} style={{
              width: 32, height: 32, border: 'none', borderRadius: 8,
              backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
          {/* ──── STEP 1: FOLDER SELECTION ──── */}
          {step === 'folder' && (
            <>
              {loadingFolders ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--cp-blue)' }} />
                  <span style={{ marginLeft: 10, color: 'var(--fg-3)', fontSize: 14 }}>Loading folders...</span>
                </div>
              ) : folders.length === 0 ? (
                <div style={{
                  padding: '32px 20px', textAlign: 'center', borderRadius: 8,
                  backgroundColor: '#FFFBEB', border: '1px solid color-mix(in srgb, var(--sem-warning) 30%, transparent)',
                }}>
                  <AlertTriangle size={24} style={{ color: 'var(--sem-warning)', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#92400E', margin: 0 }}>No folders found</p>
                  <p style={{ fontSize: 13, color: '#A16207', marginTop: 4 }}>
                    Please create a folder in the Test Repository before generating test cases.
                  </p>
                </div>
              ) : (
                <div style={{
                  border: '1px solid var(--divider)', borderRadius: 8,
                  maxHeight: 340, overflowY: 'auto', padding: '4px 0',
                }}>
                  {renderFolderTree(tree)}
                </div>
              )}

              {/* Selected folder breadcrumb */}
              {selectedFolderId && selectedFolderPath.length > 0 && (
                <div style={{
                  marginTop: 16, padding: '10px 14px', borderRadius: 8,
                  backgroundColor: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <FolderOpen size={14} style={{ color: 'var(--cp-blue)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--cp-primary-70)', fontWeight: 500 }}>
                    Target: {selectedFolderPath.join(' / ')}
                  </span>
                </div>
              )}
            </>
          )}

          {/* ──── STEP 2: DESCRIPTION INPUT ──── */}
          {step === 'input' && (
            <>
              {/* Show selected folder */}
              <div style={{
                marginBottom: 20, padding: '10px 14px', borderRadius: 8,
                backgroundColor: 'var(--bg-1)', border: '1px solid var(--divider)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <FolderOpen size={14} style={{ color: 'var(--cp-blue)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                  <strong>Folder:</strong> {selectedFolderPath.join(' / ')}
                </span>
                <button
                  onClick={() => setStep('folder')}
                  style={{
                    marginLeft: 'auto', fontSize: 12, color: 'var(--cp-blue)', fontWeight: 500,
                    background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Change
                </button>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--fg-1)' }}>
                  What do you want to test?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setValidationError(null); }}
                  placeholder="e.g., User login with email and password including forgot-password flow, session timeout, and multi-factor authentication..."
                  style={{
                    width: '100%', minHeight: 120, padding: 12,
                    border: `1.5px solid ${validationError ? 'var(--sem-danger)' : 'var(--divider)'}`, borderRadius: 8, fontSize: 14,
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
                {validationError && (
                  <div style={{
                    marginTop: 8, padding: '10px 12px', borderRadius: 8,
                    backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <AlertTriangle size={16} style={{ color: 'var(--sem-danger)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: 'var(--ds-text-danger, #991B1B)', lineHeight: 1.5 }}>{validationError}</span>
                  </div>
                )}
              </div>

              {/* Count */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--fg-1)' }}>
                  Number of test cases to generate
                </label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))}
                  style={{
                    width: 100, height: 40, padding: '8px 12px',
                    border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14,
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--fg-4)', marginLeft: 10 }}>
                  ({Math.round(count * 0.6)} positive · {Math.round(count * 0.2)} negative · {count - Math.round(count * 0.6) - Math.round(count * 0.2)} edge)
                </span>
              </div>

              {/* Include Steps */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeSteps}
                  onChange={(e) => setIncludeSteps(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14, color: 'var(--fg-2)' }}>Include detailed steps</span>
              </label>
            </>
          )}

          {/* ──── STEP 3: PREVIEW ──── */}
          {step === 'preview' && (
            <>
              {/* Folder + Category Summary */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6,
                  backgroundColor: 'var(--bg-1)', border: '1px solid var(--divider)',
                  fontSize: 12, fontWeight: 500, color: 'var(--fg-2)',
                }}>
                  <FolderOpen size={13} style={{ color: 'var(--cp-blue)' }} />
                  {selectedFolderPath.join(' / ')}
                </div>
                {(['positive', 'negative', 'edge_case'] as const).map(cat => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const Icon = cfg.icon;
                  return (
                    <div key={cat} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 6,
                      backgroundColor: cfg.bg, border: `1px solid ${cfg.border}20`,
                      fontSize: 12, fontWeight: 600, color: cfg.color,
                    }}>
                      <Icon size={14} />
                      {cfg.label}: {categoryCounts[cat] || 0}
                    </div>
                  );
                })}
              </div>

              {/* Preview Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {generated.map(tc => {
                  const catCfg = CATEGORY_CONFIG[tc.testCategory] || CATEGORY_CONFIG.positive;
                  const CatIcon = catCfg.icon;
                  return (
                    <div
                      key={tc.id}
                      onClick={() => toggleSelection(tc.id)}
                      style={{
                        padding: 16, border: `1px solid ${selected.has(tc.id) ? 'var(--cp-blue)' : 'var(--divider)'}`,
                        borderRadius: 8, backgroundColor: selected.has(tc.id) ? 'rgba(37,99,235,0.04)' : 'var(--cp-float)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)', margin: 0 }}>
                            {tc.title}
                          </h4>
                          <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0' }}>
                            {tc.summary}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px',
                            borderRadius: 4, backgroundColor: catCfg.bg, color: catCfg.color,
                          }}>
                            <CatIcon size={11} />
                            {catCfg.label}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: tc.priority === 'critical' ? 'rgba(220,38,38,0.1)' :
                                            tc.priority === 'high' ? 'rgba(234,88,12,0.1)' :
                                            tc.priority === 'medium' ? 'rgba(161,98,7,0.1)' : 'var(--cp-bd-zone)',
                            color: tc.priority === 'critical' ? 'var(--sem-danger)' :
                                   tc.priority === 'high' ? '#EA580C' :
                                   tc.priority === 'medium' ? '#A16207' : 'var(--fg-3)',
                          }}>
                            {tc.priority}
                          </span>
                          <input
                            type="checkbox"
                            checked={selected.has(tc.id)}
                            onChange={() => toggleSelection(tc.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 16, height: 16 }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setStep('input')}
                style={{
                  marginTop: 16, background: 'none', border: 'none', color: 'var(--cp-blue)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                ← Back to input
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handleClose} style={{
            height: 40, padding: '0 20px', backgroundColor: 'var(--cp-float)', border: '1.5px solid var(--divider)',
            borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
          }}>Cancel</button>

          {step === 'folder' && (
            <button
              onClick={handleFolderContinue}
              disabled={!selectedFolderId || folders.length === 0}
              style={{
                height: 40, padding: '0 20px',
                background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)',
                cursor: (!selectedFolderId || folders.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (!selectedFolderId || folders.length === 0) ? 0.5 : 1,
              }}
            >
              Continue
            </button>
          )}

          {step === 'input' && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              style={{
                height: 40, padding: '0 20px',
                background: 'linear-gradient(135deg, #10B981 0%, var(--sem-success) 100%)',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)',
                cursor: isGenerating ? 'wait' : 'pointer',
                opacity: (isGenerating || !description.trim()) ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate
                </>
              )}
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleInsert}
              disabled={isInserting || selected.size === 0}
              style={{
                height: 40, padding: '0 20px',
                background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--ds-text-inverse, #FFFFFF)',
                cursor: isInserting ? 'wait' : 'pointer',
                opacity: (isInserting || selected.size === 0) ? 0.7 : 1,
              }}
            >
              {isInserting ? 'Inserting...' : `Insert ${selected.size} Selected`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIGenerateModal;
