/**
 * WikiAdminTrainingTab — Training question management with empty state, V12 polish
 */
import React, { useState } from 'react';
import { useWikiTrainingQuestions } from '@/hooks/useWikiAdminData';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { EmptyState } from './WikiAdminSyncTab';
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

const fromAny = (t: string) => (supabase as any).from(t);

export function WikiAdminTrainingTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const pageSize = 30;

  const { data, isLoading } = useWikiTrainingQuestions({ page, pageSize, search: search || undefined });
  const qc = useQueryClient();

  const deleteQ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromAny('kb_training_questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['wiki-training-questions'] }); },
    onError: () => toast.error('Delete failed'),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) return <div>{Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} height={36} style={{ marginBottom: 4 }} />)}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', height: 32, borderRadius: 4,
          border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          flex: 1, maxWidth: 300,
        }}>
          <Search style={{ width: 14, height: 14, color: 'var(--cp-text-tertiary, rgba(237,237,237,0.40))' }} />
          <input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, width: '100%', color: 'var(--cp-text-primary, rgba(237,237,237,0.93))' }}
          />
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 4,
          background: 'var(--cp-primary-60, #2563EB)', color: '#fff', border: 'none', cursor: 'pointer',
          fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, fontWeight: 600, outline: 'none',
        }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Plus style={{ width: 14, height: 14 }} /> Add Question
        </button>
      </div>

      {showAdd && <AddQuestionForm onClose={() => setShowAdd(false)} />}

      {rows.length === 0 && !showAdd ? (
        <EmptyState
          icon={<GraduationCap style={{ width: 28, height: 28, color: 'var(--cp-text-tertiary, rgba(237,237,237,0.40))' }} />}
          message="No training questions"
          sub="Add training questions to improve KB accuracy."
        />
      ) : rows.length > 0 && (
        <>
          <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--cp-bg-sunken, #1A1A1A)' }}>
                  {['Question', 'Module', 'Has Answer', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, rgba(237,237,237,0.40))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} style={{ borderTop: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 50 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '8px 12px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.question}>{r.question ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.module ?? '—'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13 }}>{r.answer ? '✓' : '✕'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <button onClick={() => deleteQ.mutate(r.id)} title="Delete" aria-label="Delete question" style={{
                        padding: 4, borderRadius: 4, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
                        background: 'transparent', cursor: 'pointer', color: 'var(--cp-text-tertiary, rgba(237,237,237,0.40))',
                        display: 'flex', alignItems: 'center', outline: 'none',
                      }}
                        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
                        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12 }}>
              <span style={{ color: 'var(--cp-text-tertiary, rgba(237,237,237,0.40))', marginInlineEnd: 8 }}>{total} questions</span>
              <PagBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft style={{ width: 14, height: 14 }} /></PagBtn>
              <span style={{ color: 'var(--cp-text-tertiary, rgba(237,237,237,0.40))' }}>Page {page + 1} of {totalPages}</span>
              <PagBtn disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight style={{ width: 14, height: 14 }} /></PagBtn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AddQuestionForm({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [module, setModule] = useState('wiki');
  const qc = useQueryClient();

  const addQ = useMutation({
    mutationFn: async () => {
      const { error } = await fromAny('kb_training_questions').insert({
        question, answer: answer || null, module, language: 'en',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Question added');
      qc.invalidateQueries({ queryKey: ['wiki-training-questions'] });
      onClose();
    },
    onError: () => toast.error('Failed to add question'),
  });

  return (
    <div style={{
      padding: 16, borderRadius: 6,
      border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      background: 'var(--cp-bg-sunken, #1A1A1A)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <input placeholder="Question *" value={question} onChange={(e) => setQuestion(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, background: 'var(--cp-bg-page, #fff)', color: 'var(--cp-text-primary, rgba(237,237,237,0.93))', outline: 'none' }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      />
      <textarea placeholder="Answer (optional)" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2}
        style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, background: 'var(--cp-bg-page, #fff)', color: 'var(--cp-text-primary, rgba(237,237,237,0.93))', resize: 'vertical', outline: 'none' }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => addQ.mutate()} disabled={!question.trim()} style={{
          padding: '6px 14px', borderRadius: 4, background: 'var(--cp-primary-60, #2563EB)', color: '#fff',
          border: 'none', cursor: 'pointer', fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, fontWeight: 600,
          opacity: !question.trim() ? 0.5 : 1, outline: 'none',
        }}>Save</button>
        <button onClick={onClose} style={{
          padding: '6px 14px', borderRadius: 4, background: 'transparent',
          border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', cursor: 'pointer',
          fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: 'var(--cp-text-secondary, rgba(237,237,237,0.53))', outline: 'none',
        }}>Cancel</button>
      </div>
    </div>
  );
}

function PagBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: '4px 8px', borderRadius: 4,
      border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      background: 'transparent', cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center',
      color: 'var(--cp-text-primary, rgba(237,237,237,0.93))', outline: 'none',
    }}
      onFocus={(e) => { if (!disabled) e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >{children}</button>
  );
}
