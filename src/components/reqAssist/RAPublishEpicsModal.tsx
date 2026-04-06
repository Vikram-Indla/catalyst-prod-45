import { useState } from 'react';
import { Search, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
    active:    { bg: '#0C66E4', color: '#FFFFFF' },
    completed: { bg: '#1B7F37', color: '#FFFFFF' },
    planning:  { bg: '#DFE1E6', color: '#42526E' },
  };
  const m = map[status] ?? map.planning;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 18, borderRadius: 4,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
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
          (supabase as any).from('epics').insert({
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
        toast.warning(`Published ${successes.length} of ${epics.length} epics. ${failures.length} failed.`);
      } else if (failures.length > 0 && successes.length === 0) {
        toast.error('Publish failed — no epics were created');
        return;
      } else {
        toast.success(`${successes.length} epics published to ${selectedProject.name}`);
      }

      // Update brd_epics.publish_status = 'published'
      await (supabase as any)
        .from('brd_epics')
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
      toast.error(sanitiseError(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      {/* Backdrop on top of drawer */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 80 }} onClick={onClose} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 440, background: 'var(--cp-float)', borderRadius: 8, zIndex: 90,
        padding: 24, border: '0.75px solid var(--divider)',
        fontFamily: "'Inter', sans-serif",
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 650, color: 'var(--fg-1)', margin: '0 0 16px', fontFamily: "'Sora', sans-serif" }}>
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
                  flex: 1, border: 'none', outline: 'none', fontSize: 13,
                  color: 'var(--fg-1)', background: 'transparent',
                  fontFamily: "'Inter', sans-serif",
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
                    background: selectedProject?.id === p.id ? 'rgba(37,99,235,0.08)' : 'transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (selectedProject?.id !== p.id) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { if (selectedProject?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{p.name}</span>
                  <StatusLozenge status={p.status || 'planning'} />
                </div>
              ))}
              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--fg-4)', fontSize: 13, padding: 20 }}>No projects found</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                border: '0.75px solid #CBD5E1', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </>
        )}

        {step === 2 && selectedProject && (
          <>
            <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: '0 0 12px' }}>
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
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                    color: 'var(--fg-2)', background: var(--bg-2, '#F1F5F9'), padding: '1px 6px', borderRadius: 4,
                  }}>{e.ra_tag || '—'}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.title}
                  </span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: 'var(--fg-2)', margin: '0 0 16px' }}>
              Each epic will carry a Req Assist™ tag for traceability
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                border: '0.75px solid #CBD5E1', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer',
              }}>Back</button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                  border: 'none', background: 'var(--cp-blue)', color: '#FFFFFF', cursor: 'pointer',
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
