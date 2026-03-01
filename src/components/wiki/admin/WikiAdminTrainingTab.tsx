/**
 * WikiAdminTrainingTab — Training question management
 */
import React, { useState } from 'react';
import { useWikiTrainingQuestions } from '@/hooks/useWikiAdminData';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { Search, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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

  if (isLoading) return <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} height={36} style={{ marginBottom: 4 }} />)}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', height: 32, borderRadius: 4,
          border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          flex: 1, maxWidth: 300,
        }}>
          <Search style={{ width: 14, height: 14, color: 'var(--cp-text-tertiary, #64748B)' }} />
          <input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Inter, sans-serif', fontSize: 12, width: '100%', color: 'var(--cp-text-primary, #0F172A)' }}
          />
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 4,
          background: 'var(--cp-primary-60, #2563EB)', color: '#fff', border: 'none', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
        }}>
          <Plus style={{ width: 14, height: 14 }} /> Add Question
        </button>
      </div>

      {/* Inline add form */}
      {showAdd && <AddQuestionForm onClose={() => setShowAdd(false)} />}

      {/* Table */}
      <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
              {['Question', 'Module', 'Language', 'Has Answer', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--cp-text-tertiary, #64748B)' }}>No training questions</td></tr>
            ) : rows.map((r: any) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 36 }}>
                <td style={{ padding: '8px 12px', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.question}</td>
                <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.module || '—'}</td>
                <td style={{ padding: '8px 12px', fontSize: 11 }}>{r.language || '—'}</td>
                <td style={{ padding: '8px 12px', fontSize: 13 }}>{r.answer ? '✓' : '✕'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => deleteQ.mutate(r.id)} title="Delete" style={{
                    padding: 4, borderRadius: 3, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
                    background: 'transparent', cursor: 'pointer', color: 'var(--cp-text-tertiary, #64748B)',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 8px', borderRadius: 3, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', background: 'transparent', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
          <span style={{ color: 'var(--cp-text-tertiary, #64748B)' }}>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 8px', borderRadius: 3, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', background: 'transparent', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
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
      background: 'var(--cp-bg-sunken, #F8FAFC)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <input placeholder="Question *" value={question} onChange={(e) => setQuestion(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', fontFamily: 'Inter, sans-serif', fontSize: 12, background: 'var(--cp-bg-page, #fff)' }} />
      <textarea placeholder="Answer (optional)" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2}
        style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', fontFamily: 'Inter, sans-serif', fontSize: 12, background: 'var(--cp-bg-page, #fff)', resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => addQ.mutate()} disabled={!question.trim()} style={{
          padding: '6px 14px', borderRadius: 4, background: 'var(--cp-primary-60, #2563EB)', color: '#fff',
          border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
          opacity: !question.trim() ? 0.5 : 1,
        }}>Save</button>
        <button onClick={onClose} style={{
          padding: '6px 14px', borderRadius: 4, background: 'transparent',
          border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 12,
        }}>Cancel</button>
      </div>
    </div>
  );
}
