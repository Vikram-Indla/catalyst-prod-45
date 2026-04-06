import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

const DOMAINS = [
  { code: 'D1', name: 'Industrial Licensing' },
  { code: 'D2', name: 'Customs & Trade' },
  { code: 'D3', name: 'Chemical Permits' },
  { code: 'D4', name: 'Environmental Compliance' },
  { code: 'D5', name: 'Industrial Incentives' },
  { code: 'D6', name: 'Fourth Industrial Revolution' },
  { code: 'D7', name: 'Workforce & Industrial Support' },
  { code: 'D8', name: 'Senaei Platform' },
  { code: 'D9', name: 'Mining & Mineral Resources' },
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WikiKnowledgeRequestForm({ open, onClose }: Props) {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domainCode, setDomainCode] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const canSubmit = title.trim().length >= 3 && domainCode;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { error } = await supabase.from('wiki_knowledge_requests').insert({
        title: title.trim(),
        description: description.trim() || null,
        domain_code: domainCode,
        priority,
        status: 'open',
        requested_by: userId ?? null,
      } as any);

      if (error) throw error;

      toast.success('Knowledge Request submitted', {
        description: 'Your request has been routed to domain experts.',
      });
      qc.invalidateQueries({ queryKey: ['wiki-knowledge-requests'] });
      qc.invalidateQueries({ queryKey: ['wiki-sidebar-counts'] });
      setTitle(''); setDescription(''); setDomainCode(''); setPriority('medium');
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit request', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 12, padding: '8px 12px', borderRadius: 6,
    border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(0,0,0,0.10)',
    outline: 'none', fontFamily: 'Inter, sans-serif',
    transition: 'border-color 150ms',
    background: 'transparent',
    color: isDark ? '#EDEDED' : undefined,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: isDark ? '#A1A1A1' : 'var(--fg-2)', marginBottom: 4, display: 'block',
    fontFamily: 'Sora, sans-serif',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.3)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 440, maxWidth: '92vw', background: isDark ? '#1A1A1A' : 'var(--cp-float)', borderRadius: 12,
        boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.12)', zIndex: 61,
        animation: 'fadeScaleIn 180ms ease-out',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, margin: 0, flex: 1, color: isDark ? '#EDEDED' : undefined }}>New Knowledge Request</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} style={{ color: isDark ? '#878787' : 'var(--fg-3)' }} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What knowledge are you looking for?"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--cp-blue)'}
              onBlur={e => e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : 'rgba(0,0,0,0.10)'}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Provide additional context..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--cp-blue)'}
              onBlur={e => e.currentTarget.style.borderColor = isDark ? '#2E2E2E' : 'rgba(0,0,0,0.10)'}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Domain *</label>
              <select
                value={domainCode} onChange={e => setDomainCode(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', background: isDark ? '#1A1A1A' : 'var(--cp-float)' }}
              >
                <option value="">Select domain...</option>
                {DOMAINS.map(d => (
                  <option key={d.code} value={d.code}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Priority</label>
              <select
                value={priority} onChange={e => setPriority(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', background: isDark ? '#1A1A1A' : 'var(--cp-float)' }}
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px 20px', borderTop: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{
            fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
            border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(0,0,0,0.10)', background: isDark ? '#1A1A1A' : 'var(--cp-float)', color: isDark ? '#A1A1A1' : 'var(--fg-2)',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{
            fontSize: 12, fontWeight: 650, padding: '8px 20px', borderRadius: 6, cursor: canSubmit ? 'pointer' : 'not-allowed',
            border: 'none', background: canSubmit ? 'var(--cp-blue)' : (isDark ? '#878787' : 'var(--fg-4)'), color: '#FFFFFF',
            display: 'flex', alignItems: 'center', gap: 6, opacity: submitting ? 0.7 : 1,
          }}>
            <Send size={12} /> {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeScaleIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }`}</style>
    </>
  );
}
