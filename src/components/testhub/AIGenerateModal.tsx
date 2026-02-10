import { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentFolderId?: string | null;
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
  positive: { label: 'Positive', icon: CheckCircle2, color: '#059669', bg: 'rgba(5,150,105,0.08)', border: '#059669' },
  negative: { label: 'Negative', icon: XCircle, color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: '#DC2626' },
  edge_case: { label: 'Edge Case', icon: AlertTriangle, color: '#D97706', bg: 'rgba(217,119,6,0.08)', border: '#D97706' },
};

export function AIGenerateModal({ isOpen, onClose, onSuccess, currentFolderId }: AIGenerateModalProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [description, setDescription] = useState('');
  const [count, setCount] = useState(5);
  const [includeSteps, setIncludeSteps] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTestCase[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetState = () => {
    setStep('input');
    setDescription('');
    setCount(5);
    setIncludeSteps(true);
    setIsGenerating(false);
    setGenerated([]);
    setSelected(new Set());
    setValidationError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
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
        // Try to parse the error body for validation messages
        const errBody = typeof error === 'object' && 'context' in error 
          ? error 
          : null;
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
      // Check for validation error in response
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
      for (const tc of toInsert) {
        const { data: lastCase } = await supabase
          .from('th_test_cases')
          .select('case_key')
          .order('created_at', { ascending: false })
          .limit(1);

        let nextNum = 1;
        if (lastCase?.[0]?.case_key) {
          const match = lastCase[0].case_key.match(/TC-(\d+)/);
          if (match) nextNum = parseInt(match[1]) + 1;
        }

        const { data: newCase, error: tcError } = await supabase
          .from('th_test_cases')
          .insert({
            case_key: `TC-${String(nextNum).padStart(3, '0')}`,
            title: tc.title,
            objective: tc.summary,
            folder_id: currentFolderId || null,
            priority: tc.priority,
            type: tc.testType,
            status: 'draft',
            automation: 'manual',
          })
          .select()
          .single();

        if (tcError) throw tcError;

        if (includeSteps && tc.steps?.length && newCase) {
          await supabase.from('th_test_steps').insert(
            tc.steps.map((s, i) => ({
              test_case_id: newCase.id,
              step_number: s.stepNumber || i + 1,
              action: s.action,
              expected_result: s.expectedResult,
            }))
          );
        }
      }

      toast.success(`Created ${toInsert.length} test cases`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Insert failed:', err);
      toast.error('Failed to create test cases');
    } finally {
      setIsInserting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  if (!isOpen) return null;

  // Count categories for summary
  const categoryCounts = generated.reduce((acc, tc) => {
    acc[tc.testCategory] = (acc[tc.testCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }} onClick={handleClose}>
      <div style={{
        width: 680, backgroundColor: '#FFFFFF', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={20} style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Generate Test Cases with AI
              </h2>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                {step === 'input'
                  ? 'Powered by Google Gemini · 60% positive · 20% negative · 20% edge cases'
                  : `${generated.length} test cases generated`}
              </p>
            </div>
          </div>
          <button onClick={handleClose} style={{
            width: 32, height: 32, border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
          {step === 'input' ? (
            <>
              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#0F172A' }}>
                  What do you want to test?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setValidationError(null); }}
                  placeholder="e.g., User login with email and password including forgot-password flow, session timeout, and multi-factor authentication..."
                  style={{
                    width: '100%', minHeight: 120, padding: 12,
                    border: `1.5px solid ${validationError ? '#DC2626' : '#E2E8F0'}`, borderRadius: 8, fontSize: 14,
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
                {validationError && (
                  <div style={{
                    marginTop: 8, padding: '10px 12px', borderRadius: 8,
                    backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: '#991B1B', lineHeight: 1.5 }}>{validationError}</span>
                  </div>
                )}
              </div>

              {/* Count */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#0F172A' }}>
                  Number of test cases to generate
                </label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))}
                  style={{
                    width: 100, height: 40, padding: '0 12px',
                    border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14,
                  }}
                />
                <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 10 }}>
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
                <span style={{ fontSize: 14, color: '#334155' }}>Include detailed steps</span>
              </label>
            </>
          ) : (
            <>
              {/* Category Summary Bar */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
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
                        padding: 16, border: `1px solid ${selected.has(tc.id) ? '#2563EB' : '#E2E8F0'}`,
                        borderRadius: 8, backgroundColor: selected.has(tc.id) ? 'rgba(37,99,235,0.04)' : '#FFFFFF',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                            {tc.title}
                          </h4>
                          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
                            {tc.summary}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                          {/* Category badge */}
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px',
                            borderRadius: 4, backgroundColor: catCfg.bg, color: catCfg.color,
                          }}>
                            <CatIcon size={11} />
                            {catCfg.label}
                          </span>
                          {/* Priority badge */}
                          <span style={{
                            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: tc.priority === 'critical' ? 'rgba(220,38,38,0.1)' :
                                            tc.priority === 'high' ? 'rgba(234,88,12,0.1)' :
                                            tc.priority === 'medium' ? 'rgba(161,98,7,0.1)' : '#F1F5F9',
                            color: tc.priority === 'critical' ? '#DC2626' :
                                   tc.priority === 'high' ? '#EA580C' :
                                   tc.priority === 'medium' ? '#A16207' : '#64748B',
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
                  marginTop: 16, background: 'none', border: 'none', color: '#2563EB',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                ← Back to input
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handleClose} style={{
            height: 40, padding: '0 20px', backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0',
            borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#334155', cursor: 'pointer',
          }}>Cancel</button>

          {step === 'input' ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              style={{
                height: 40, padding: '0 20px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
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
          ) : (
            <button
              onClick={handleInsert}
              disabled={isInserting || selected.size === 0}
              style={{
                height: 40, padding: '0 20px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#FFFFFF',
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
