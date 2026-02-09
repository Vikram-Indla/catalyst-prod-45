import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
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
  objective: string;
  priority: string;
  type: string;
  steps: Array<{ action: string; expected: string }>;
}

const mockGenerateTestCases = async (description: string, count: number): Promise<GeneratedTestCase[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const keywords = description.toLowerCase();
  const generated: GeneratedTestCase[] = [];
  
  for (let i = 0; i < count; i++) {
    const feature = keywords.includes('login') ? 'Login' : 
                    keywords.includes('api') ? 'API' :
                    keywords.includes('checkout') ? 'Checkout' :
                    keywords.includes('search') ? 'Search' : 'Test';
    
    generated.push({
      id: `gen-${i}`,
      title: `${feature} - Scenario ${i + 1}: ${description.substring(0, 30)}...`,
      objective: `Verify ${description.substring(0, 50)}...`,
      priority: ['critical', 'high', 'medium', 'low'][i % 4],
      type: 'functional',
      steps: [
        { action: 'Navigate to the feature', expected: 'Page loads correctly' },
        { action: 'Perform the action', expected: 'Expected result occurs' },
        { action: 'Verify the outcome', expected: 'Test passes' },
      ],
    });
  }
  
  return generated;
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

  const resetState = () => {
    setStep('input');
    setDescription('');
    setCount(5);
    setIncludeSteps(true);
    setIsGenerating(false);
    setGenerated([]);
    setSelected(new Set());
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    setIsGenerating(true);
    try {
      const results = await mockGenerateTestCases(description, count);
      setGenerated(results);
      setSelected(new Set(results.map(r => r.id)));
      setStep('preview');
    } catch (err) {
      toast.error('Failed to generate test cases');
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
            objective: tc.objective,
            folder_id: currentFolderId || null,
            priority: tc.priority,
            type: tc.type,
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
              step_number: i + 1,
              action: s.action,
              expected_result: s.expected,
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

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }} onClick={handleClose}>
      <div style={{
        width: 640, backgroundColor: '#FFFFFF', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
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
              <p style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                {step === 'input' ? 'Describe what you want to test' : `${generated.length} test cases generated`}
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
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., User login with valid credentials, password reset flow, checkout process..."
                  style={{
                    width: '100%', minHeight: 120, padding: 12,
                    border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14,
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Count */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#0F172A' }}>
                  Number of test cases to generate
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                  style={{
                    width: 100, height: 40, padding: '0 12px',
                    border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14,
                  }}
                />
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
              {/* Preview Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {generated.map(tc => (
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
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                          {tc.title}
                        </h4>
                        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
                          {tc.objective}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                ))}
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
