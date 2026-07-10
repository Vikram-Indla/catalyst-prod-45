import { useState } from 'react';
import { Search, Loader2, CheckCircle2 } from '@/lib/atlaskit-icons';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import { RA_KEYS } from '@/hooks/useReqAssist';
import { sanitiseError } from '@/lib/errorUtils';

interface Epic {
  id: string;
  title: string;
  ra_tag: string | null;
  publish_status: string | null;
}

interface Props {
  brdId: string;
  epics: Epic[];
  onClose: () => void;
  onPublished: () => void;
}

function StatusLozenge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: 'var(--ds-link)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
    completed: { bg: 'var(--cp-lozenge-green-bg)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
    planning:  { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', color: 'var(--ds-text-subtle)' },
  };
  const m = map[status] ?? map.planning;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 18, borderRadius: 4,
      fontSize: 'var(--ds-font-size-50)', fontWeight: 700, textTransform: 'uppercase',
      background: m.bg, color: m.color,
    }}>{status}</span>
  );
}

export default function RAPublishEpicsModal({ brdId, epics, onClose, onPublished }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; status: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects-for-publish'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name, status').order('name');
      return (data || []) as { id: string; name: string; status: string }[];
    },
  });

  const filtered = (projects || []).filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePublish = async () => {
    if (!selectedProject) return;
    setPublishing(true);
    try {
      // Insert into project epics — use correct column names per schema:
      // epics table uses: name (not title), source_ra_doc_id, description
      // ra_tag stored in description suffix for traceability
      const results = await Promise.allSettled(
        epics.map(epic =>
          typedQuery('epics').insert({
            name: epic.title,
            program_id: selectedProject.id,
            status: 'funnel',
            source_ra_doc_id: brdId,
            ra_tag: epic.ra_tag ?? null,
            description: epic.ra_tag
              ? `${epic.title}\n\n[RA: ${epic.ra_tag}]`
              : epic.title,
          })
        )
      );

      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      if (failures.length > 0 && successes.length > 0) {
        // Partial success — still mark succeeded ones
        catalystToast.warning(`Published ${successes.length} of ${epics.length} epics. ${failures.length} failed.`);
      } else if (failures.length > 0 && successes.length === 0) {
        catalystToast.error('Publish failed — no epics were created');
        return;
      } else {
        catalystToast.success(`${successes.length} epics published to ${selectedProject.name}`);
      }

      // Update brd_epics.publish_status = 'published'
      await typedQuery('brd_epics')
        .update({
          publish_status: 'published',
          project_id: selectedProject.id,
        })
        .in('id', epics.map(e => e.id));

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['brd-epics'] });
      queryClient.invalidateQueries({ queryKey: RA_KEYS.stats() });
      queryClient.invalidateQueries({ queryKey: RA_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['req-assist-stats-bar'] });

      onPublished();
    } catch (err: any) {
      catalystToast.error(sanitiseError(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      {/* Backdrop on top of drawer */}
      <div style={{ position: 'fixed', inset: 0, background: 'var(--ds-shadow-raised)', zIndex: 80 }} onClick={onClose} />

      <div style={{
        position: 'fixed', top: '48%', left: '48%', transform: 'translate(-50%, -50%)',
        width: 440, background: 'var(--cp-float)', borderRadius: 8, zIndex: 90,
        padding: 24, border: '0.75px solid var(--divider)',
        fontFamily: 'var(--cp-font-body)',
      }}>
        <h3 style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 650, color: 'var(--fg-1)', margin: '0 0 16px', fontFamily: 'var(--cp-font-heading)' }}>
          Publish Epics to Project
        </h3>

        {step === 1 && (
          <>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: '0.75px solid var(--divider)', borderRadius: 6,
              padding: '0 10px', height: 50, marginBottom: 12, background: 'var(--bg-app)',
            }}>
              <Search size={14} color="var(--fg-4)" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search projects..."
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: 'var(--ds-font-size-300)',
                  color: 'var(--fg-1)', background: 'transparent',
                  fontFamily: 'var(--cp-font-body)',
                }}
              />
            </div>

            {/* Project list */}
            <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
              {filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setSelectedProject(p); setStep(2); }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: 4, cursor: 'pointer',
                    background: selectedProject?.id === p.id ? 'var(--ds-background-information)' : 'transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (selectedProject?.id !== p.id) e.currentTarget.style.background = 'var(--ds-shadow-raised)'; }}
                  onMouseLeave={e => { if (selectedProject?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--fg-1)' }}>{p.name}</span>
                  <StatusLozenge status={p.status || 'planning'} />
                </div>
              ))}
              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--fg-4)', fontSize: 'var(--ds-font-size-300)', padding: 16 }}>No projects found</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '8px 16px', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, borderRadius: 6,
                border: '0.75px solid var(--ds-border)', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </>
        )}

        {step === 2 && selectedProject && (
          <>
            <p style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--fg-2)', margin: '0 0 12px' }}>
              <strong>{epics.length}</strong> epics will be added to <strong>{selectedProject.name}</strong>
            </p>

            {/* Compact list */}
            <div style={{
              maxHeight: 200, overflowY: 'auto', marginBottom: 12,
              border: '0.75px solid var(--divider)', borderRadius: 6, padding: 8,
            }}>
              {epics.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{
                    fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-50)',
                    color: 'var(--fg-2)', background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '0px 6px', borderRadius: 4,
                  }}>{e.ra_tag || '—'}</span>
                  <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.title}
                  </span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--fg-2)', margin: '0 0 16px' }}>
              Each epic will carry a Req Assist™ tag for traceability
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={{
                padding: '8px 16px', fontSize: 'var(--ds-font-size-300)', fontWeight: 500, borderRadius: 6,
                border: '0.75px solid var(--ds-border)', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer',
              }}>Back</button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  padding: '8px 16px', fontSize: 'var(--ds-font-size-300)', fontWeight: 600, borderRadius: 6,
                  border: 'none', background: 'var(--cp-blue)', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', cursor: 'pointer',
                  opacity: publishing ? 0.7 : 1,
                }}
              >
                {publishing ? 'Publishing…' : `Publish ${epics.length} Epics`}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
