import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiArticleTemplates } from '@/hooks/useWikiHub';
import { useTheme } from '@/hooks/useTheme';
import { ChevronRight, FileText, AlertTriangle, CalendarIcon, Clock, X } from '@/lib/atlaskit-icons';
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
      background: isDark ? 'var(--ds-background-warning, rgba(217,119,6,0.12))' : 'var(--ds-background-warning, var(--ds-background-warning))',
      border: `1px solid rgba(217,119,6,${isDark ? '0.25' : '0.3'})`, // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <AlertTriangle size={16} style={{ color: 'var(--ds-text-warning, var(--cp-warning))', flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 650, color: isDark ? 'var(--ds-background-warning-bold)' : 'var(--ds-text-warning)', marginBottom: 4 }}>
          Similar article{duplicates.length > 1 ? 's' : ''} found
        </div>
        {duplicates.map((d: any) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-50)', fontWeight: 700,
              padding: '1px 5px', borderRadius: 4,
              background: isDark ? 'var(--ds-background-warning, rgba(217,119,6,0.2))' : 'var(--ds-background-warning, var(--ds-background-warning))',
              color: 'var(--ds-text-warning, var(--cp-warning))',
            }}>{Math.round((d.similarity ?? 0.8) * 100)}%</span>
            <span
              onClick={() => navigate(`/wiki/${d.slug}`)}
              style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer', fontWeight: 600 }}
            >{d.title}</span>
          </div>
        ))}
        <div style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-warning)', marginTop: 4 }}>
          You can proceed or navigate to an existing article instead.
        </div>
      </div>
      <button onClick={onDismiss} style={{
        background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-warning, var(--cp-warning))', padding: 2,
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
        fontSize: 'var(--ds-font-size-100)', fontWeight: 700, color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 4,
        textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'block',
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="datetime-local"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px', fontSize: 'var(--ds-font-size-200)', borderRadius: 4,
            border: `0.75px solid ${isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-overlay, rgba(15,23,42,0.12))'}`,
            background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', fontFamily: 'var(--cp-font-body)',
          }}
        />
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', marginTop: 4 }}>{helperText}</div>
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

  const borderColor = isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-raised, rgba(0,0,0,0.06))';
  const cardBorderHover = 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))';

  return (
    <div style={{
      fontFamily: 'var(--cp-font-body)',
      color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))',
      background: isDark ? 'var(--cp-bg-page)' : 'var(--ds-surface-sunken)',
      minHeight: '100%', padding: '24px 40px 48px',
    }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontWeight: 600 }}>Templates</span>
      </nav>

      <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, marginBottom: 8, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' }}>Article Templates</h1>
      <p style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 16 }}>Pre-built structures for common article types. Click "Use Template" to create a pre-filled article.</p>

      {/* ── Duplicate Detection Warning ── */}
      <DuplicateWarning
        duplicates={duplicates}
        onDismiss={() => { setDuplicates([]); setPendingTemplate(null); }}
        isDark={isDark}
      />
      {pendingTemplate && duplicates.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => createArticleFromTemplate(pendingTemplate)} style={{
            fontSize: 'var(--ds-font-size-100)', fontWeight: 650, padding: '6px 16px', borderRadius: 4,
            border: `1px solid rgba(217,119,6,${isDark ? '0.25' : '0.3'})`, // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
            background: isDark ? 'var(--ds-background-warning, rgba(217,119,6,0.12))' : 'var(--ds-background-warning, var(--ds-background-warning))',
            color: 'var(--ds-text-warning, var(--cp-warning))',
            cursor: 'pointer',
          }}>Proceed Anyway</button>
        </div>
      )}

      {/* ── Content Scheduling Section ── */}
      <div style={{
        marginBottom: 20, padding: '14px 16px', borderRadius: 6,
        background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
        border: `0.75px solid ${isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-overlay, rgba(15,23,42,0.08))'}`,
      }}>
        <button onClick={() => setShowScheduling(!showScheduling)} style={{
          fontSize: 'var(--ds-font-size-200)', fontWeight: 650, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: 'transparent',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        }}>
          <CalendarIcon size={14} style={{ color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }} />
          Content Scheduling
          <span style={{ fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', fontWeight: 500, marginLeft: 'auto' }}>
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
                fontSize: 'var(--ds-font-size-50)', fontWeight: 600, padding: '4px 10px', borderRadius: 4,
                border: '1px solid var(--ds-background-danger-bold, rgba(220,38,38,0.2))', background: isDark ? 'var(--ds-background-danger-bold, rgba(220,38,38,0.12))' : 'var(--ds-background-danger)', color: 'var(--ds-text-danger, var(--cp-danger))',
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
            background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            border: `0.75px solid ${borderColor}`, height: 140,
          }} />
        )) : (templates ?? []).map((t: any) => {
          const sections = (t.template_sections as any[]) || [];
          return (
            <div key={t.id} style={{
              padding: 20, borderRadius: 8,
              background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
              border: `0.75px solid ${borderColor}`,
              transition: 'border-color 120ms',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = cardBorderHover}
              onMouseLeave={e => e.currentTarget.style.borderColor = borderColor}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={16} style={{ color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' }}>{t.name}</div>
                  <div style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{t.description}</div>
                </div>
              </div>
              <div style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 12 }}>{sections.length} sections</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                {sections.slice(0, 4).map((s: any, i: number) => (
                  <span key={i} style={{
                    fontSize: 'var(--ds-font-size-100)', padding: '2px 6px', borderRadius: 4,
                    background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
                    color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
                  }}>{s.title}</span>
                ))}
                {sections.length > 4 && <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>+{sections.length - 4} more</span>}
              </div>
              <button
                onClick={() => handleUseTemplate(t)}
                disabled={creatingSlug !== null}
                style={{
                  fontSize: 'var(--ds-font-size-100)', fontWeight: 650, padding: '6px 16px', borderRadius: 4,
                  border: 'none', background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', cursor: 'pointer', width: '100%',
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
