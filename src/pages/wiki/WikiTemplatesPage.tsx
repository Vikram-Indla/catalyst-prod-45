import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiArticleTemplates } from '@/hooks/useWikiHub';
import { useTheme } from '@/hooks/useTheme';
import { ChevronRight, FileText, AlertTriangle, CalendarIcon, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

/* ── Duplicate Detection Warning ── */
function DuplicateWarning({ duplicates, onDismiss, isDark }: { duplicates: any[]; onDismiss: () => void; isDark: boolean }) {
  const navigate = useNavigate();
  if (duplicates.length === 0) return null;
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 6, marginBottom: 16,
      background: isDark ? 'rgba(217,119,6,0.12)' : '#FFFBEB',
      border: `1px solid rgba(217,119,6,${isDark ? '0.25' : '0.3'})`,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 650, color: isDark ? '#FBBF24' : '#92400E', marginBottom: 4 }}>
          Similar article{duplicates.length > 1 ? 's' : ''} found
        </div>
        {duplicates.map((d: any) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 10, fontWeight: 700,
              padding: '1px 5px', borderRadius: 4,
              background: isDark ? 'rgba(217,119,6,0.2)' : '#FEF3C7',
              color: '#D97706',
            }}>{Math.round((d.similarity ?? 0.8) * 100)}%</span>
            <span
              onClick={() => navigate(`/wiki/${d.slug}`)}
              style={{ fontSize: 12, color: '#2563EB', cursor: 'pointer', fontWeight: 600 }}
            >{d.title}</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#92400E', marginTop: 4 }}>
          You can proceed or navigate to an existing article instead.
        </div>
      </div>
      <button onClick={onDismiss} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', color: '#D97706', padding: 2,
      }}><X size={14} /></button>
    </div>
  );
}

/* ── Date Picker (simple) ── */
function SimpleDateInput({ label, value, onChange, helperText, isDark }: {
  label: string; value: string; onChange: (v: string) => void; helperText: string; isDark: boolean;
}) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <label style={{
        fontSize: 11, fontWeight: 700, color: isDark ? '#878787' : '#64748B', marginBottom: 4,
        textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'block',
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="datetime-local"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 4,
            border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.12)'}`,
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            color: isDark ? '#EDEDED' : '#0F172A', fontFamily: 'var(--ds-font-family-body)',
          }}
        />
      </div>
      <div style={{ fontSize: 10, color: isDark ? '#878787' : '#94A3B8', marginTop: 4 }}>{helperText}</div>
    </div>
  );
}

export default function WikiTemplatesPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data: templates, isLoading } = useWikiArticleTemplates();
  const [creatingSlug, setCreatingSlug] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showScheduling, setShowScheduling] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [archiveAt, setArchiveAt] = useState('');
  const [pendingTemplate, setPendingTemplate] = useState<any>(null);

  // Duplicate detection via RPC
  const checkDuplicates = useCallback(async (title: string, content: string) => {
    try {
      const { data, error } = await supabase.rpc('find_similar_articles', {
        p_title: title,
        p_content: content || title,
      });
      if (error) return [];
      return (data ?? []).filter((d: any) => (d.similarity ?? 0) > 0.8);
    } catch {
      return [];
    }
  }, []);

  const handleUseTemplate = async (template: any) => {
    const title = `New ${template.name}`;
    const content = template.description || '';

    // Check for duplicates first
    const dupes = await checkDuplicates(title, content);
    if (dupes.length > 0) {
      setDuplicates(dupes);
      setPendingTemplate(template);
      return;
    }

    await createArticleFromTemplate(template);
  };

  const createArticleFromTemplate = async (template: any) => {
    setDuplicates([]);
    setPendingTemplate(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    const sections = (template.template_sections as any[]) || [];
    const slug = `new-${template.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    setCreatingSlug(slug);

    const insertData: any = {
      title: `New ${template.name}`,
      slug,
      domain_code: template.domain_code || 'D1',
      status: 'draft',
      lead_content: template.description || '',
      verification_status: 'unverified',
      format: 'article',
      version: 1,
      created_by: userId,
      updated_by: userId,
    };

    // Add scheduling fields if set
    if (publishAt) insertData.publish_at = new Date(publishAt).toISOString();
    if (archiveAt) insertData.archive_at = new Date(archiveAt).toISOString();

    const { data: page, error } = await supabase.from('wiki_pages').insert(insertData).select('id').single();

    if (error) { toast.error('Failed to create article'); setCreatingSlug(null); return; }
    if (page?.id && sections.length > 0) {
      const sectionRows = sections.map((s: any, i: number) => ({
        page_id: page.id,
        title: s.title,
        content: s.placeholder || '',
        sort_order: i,
        section_number: i + 1,
        section_type: s.type || 'text',
      }));
      await supabase.from('wiki_sections').insert(sectionRows);
    }
    toast.success('Article created from template');
    setCreatingSlug(null);
    setPublishAt('');
    setArchiveAt('');
    navigate(`/wiki/${slug}`);
  };

  const borderColor = isDark ? '#2E2E2E' : 'rgba(0,0,0,0.06)';
  const cardBorderHover = '#2563EB';

  return (
    <div style={{
      fontFamily: 'var(--ds-font-family-body)',
      color: isDark ? '#EDEDED' : '#0F172A',
      background: isDark ? '#0A0A0A' : '#F8FAFC',
      minHeight: '100%', padding: '24px 40px 48px',
    }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
        <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 600 }}>Templates</span>
      </nav>

      <h1 style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 18, fontWeight: 700, marginBottom: 8, color: isDark ? '#EDEDED' : '#0F172A' }}>Article Templates</h1>
      <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 16 }}>Pre-built structures for common article types. Click "Use Template" to create a pre-filled article.</p>

      {/* ── Duplicate Detection Warning ── */}
      <DuplicateWarning
        duplicates={duplicates}
        onDismiss={() => { setDuplicates([]); setPendingTemplate(null); }}
        isDark={isDark}
      />
      {pendingTemplate && duplicates.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => createArticleFromTemplate(pendingTemplate)} style={{
            fontSize: 11, fontWeight: 650, padding: '6px 16px', borderRadius: 4,
            border: `1px solid rgba(217,119,6,${isDark ? '0.25' : '0.3'})`,
            background: isDark ? 'rgba(217,119,6,0.12)' : '#FFFBEB',
            color: '#D97706',
            cursor: 'pointer',
          }}>Proceed Anyway</button>
        </div>
      )}

      {/* ── Content Scheduling Section ── */}
      <div style={{
        marginBottom: 20, padding: '14px 16px', borderRadius: 6,
        background: isDark ? '#1A1A1A' : '#FFFFFF',
        border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.08)'}`,
      }}>
        <button onClick={() => setShowScheduling(!showScheduling)} style={{
          fontSize: 12, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A', background: 'transparent',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        }}>
          <CalendarIcon size={14} style={{ color: '#2563EB' }} />
          Content Scheduling
          <span style={{ fontSize: 10, color: isDark ? '#878787' : '#94A3B8', fontWeight: 500, marginLeft: 'auto' }}>
            {showScheduling ? '▾' : '▸'} {publishAt || archiveAt ? '(configured)' : '(optional)'}
          </span>
        </button>
        {showScheduling && (
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <SimpleDateInput
              label="Publish At"
              value={publishAt}
              onChange={setPublishAt}
              helperText="Article hidden until this date"
              isDark={isDark}
            />
            <SimpleDateInput
              label="Archive At"
              value={archiveAt}
              onChange={setArchiveAt}
              helperText="Article auto-archived after this date"
              isDark={isDark}
            />
            {(publishAt || archiveAt) && (
              <button onClick={() => { setPublishAt(''); setArchiveAt(''); }} style={{
                fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
                border: '1px solid rgba(220,38,38,0.2)', background: isDark ? 'rgba(220,38,38,0.12)' : '#FEF2F2', color: '#DC2626',
                cursor: 'pointer', alignSelf: 'flex-end', marginBottom: 18,
              }}>Clear Dates</button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            padding: 20, borderRadius: 8,
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `0.75px solid ${borderColor}`, height: 140,
          }} />
        )) : (templates ?? []).map((t: any) => {
          const sections = (t.template_sections as any[]) || [];
          return (
            <div key={t.id} style={{
              padding: 20, borderRadius: 8,
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `0.75px solid ${borderColor}`,
              transition: 'border-color 120ms',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = cardBorderHover}
              onMouseLeave={e => e.currentTarget.style.borderColor = borderColor}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: isDark ? '#1A1A1A' : '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={16} style={{ color: isDark ? '#A1A1A1' : '#64748B' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--ds-font-family-heading)', fontSize: 13, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B' }}>{t.description}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 12 }}>{sections.length} sections</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                {sections.slice(0, 4).map((s: any, i: number) => (
                  <span key={i} style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: isDark ? '#1A1A1A' : '#F1F5F9',
                    color: isDark ? '#A1A1A1' : '#64748B',
                  }}>{s.title}</span>
                ))}
                {sections.length > 4 && <span style={{ fontSize: 9, color: isDark ? '#878787' : '#94A3B8' }}>+{sections.length - 4} more</span>}
              </div>
              <button
                onClick={() => handleUseTemplate(t)}
                disabled={creatingSlug !== null}
                style={{
                  fontSize: 11, fontWeight: 650, padding: '6px 16px', borderRadius: 4,
                  border: 'none', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', width: '100%',
                  opacity: creatingSlug ? 0.6 : 1,
                }}
              >{creatingSlug ? 'Creating…' : 'Use Template'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
