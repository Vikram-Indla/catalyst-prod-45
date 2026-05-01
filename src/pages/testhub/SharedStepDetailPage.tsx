/**
 * Shared Step Detail Page — TestHub Module
 * Route: /testhub/shared-steps/:stepId
 * H-13: Shows shared step details and all test cases referencing it.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';

interface SharedStepData {
  id: string;
  name: string;
  action: string;
  expected_result: string | null;
  description: string | null;
  usage_count: number;
  created_at: string;
  category?: { id: string; name: string; color: string } | null;
}

interface LinkedTestCase {
  step_id: string;
  test_case_id: string;
  case_key: string;
  title: string;
}

export default function SharedStepDetailPage() {
  const { stepId } = useParams<{ stepId: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [step, setStep] = useState<SharedStepData | null>(null);
  const [linkedCases, setLinkedCases] = useState<LinkedTestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!stepId) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch shared step
        const { data: stepData, error } = await supabase
          .from('tm_shared_steps' as any)
          .select('*, category:tm_shared_step_categories(id, name, color)')
          .eq('id', stepId)
          .maybeSingle();
        if (error) throw error;
        if (!stepData) { setIsLoading(false); return; }
        setStep(stepData as any);

        // Fetch linked test steps → test cases
        const { data: testSteps } = await supabase
          .from('tm_test_steps' as any)
          .select('id, test_case_id')
          .eq('shared_step_id', stepId)
          .eq('is_shared', true);

        if (testSteps && testSteps.length > 0) {
          const caseIds = [...new Set((testSteps as any[]).map((ts: any) => ts.test_case_id))];
          const { data: cases } = await typedQuery('tm_test_cases')
            .select('id, case_key, title')
            .in('id', caseIds);
          if (cases) {
            setLinkedCases(cases.map((c: any) => ({
              step_id: '',
              test_case_id: c.id,
              case_key: c.case_key,
              title: c.title,
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load shared step detail', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [stepId]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: 'var(--cp-bg-page, #F8FAFC)' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${'var(--cp-border, #E2E8F0)'}`, borderTopColor: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!step) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--cp-text-tertiary, #64748B)' }}>
        Shared step not found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--cp-bg-page, #F8FAFC)' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
        <button
          onClick={() => navigate('/testhub/shared-steps')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', backgroundColor: 'transparent', color: 'var(--cp-text-tertiary, #64748B)', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Shared Steps
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: '0 0 8px' }}>{step.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--cp-text-tertiary, #64748B)' }}>
          {step.category && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: 'var(--cp-bg-sunken, #F1F5F9)', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: step.category.color }} />
              {step.category.name}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={14} /> Created {formatDate(step.created_at)}
          </span>
          <span>Used {step.usage_count}x</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {/* Step Details */}
        <div style={{ backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--cp-text-tertiary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>Step Details</h2>
          {step.description && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-muted, #94A3B8)', display: 'block', marginBottom: 4 }}>Description</label>
              <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #334155)', margin: 0 }}>{step.description}</p>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-muted, #94A3B8)', display: 'block', marginBottom: 4 }}>Action</label>
            <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #334155)', margin: 0, whiteSpace: 'pre-wrap' }}>{step.action}</p>
          </div>
          {step.expected_result && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cp-text-muted, #94A3B8)', display: 'block', marginBottom: 4 }}>Expected Result</label>
              <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #334155)', margin: 0, whiteSpace: 'pre-wrap' }}>{step.expected_result}</p>
            </div>
          )}
        </div>

        {/* Linked Test Cases */}
        <div style={{ backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)', border: `1px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${'var(--cp-border, #E2E8F0)'}` }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--cp-text-tertiary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Linked Test Cases ({linkedCases.length})
            </h2>
          </div>
          {linkedCases.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--cp-text-muted, #94A3B8)' }}>
              <FileText size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No test cases reference this shared step.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--cp-bg-page, #F8FAFC)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--cp-text-tertiary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Case Key</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--cp-text-tertiary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</th>
                </tr>
              </thead>
              <tbody>
                {linkedCases.map((tc) => (
                  <tr
                    key={tc.test_case_id}
                    onClick={() => navigate(`/testhub/repository?view=${tc.test_case_id}`)}
                    style={{ height: 36, maxHeight: 36, borderBottom: `0.75px solid ${'var(--cp-bg-sunken, #F1F5F9)'}`, cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cp-bg-page, #F8FAFC)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0 16px' }}>
                      <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 13, fontWeight: 500, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' }}>{tc.case_key}</span>
                    </td>
                    <td style={{ padding: '0 16px', fontSize: 14, color: 'var(--cp-text-secondary, #334155)' }}>{tc.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
