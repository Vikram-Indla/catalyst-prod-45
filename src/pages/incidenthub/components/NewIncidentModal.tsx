/**
 * NewIncidentModal — Create new incident
 * 760px width, shadcn dialog, form fields
 */

import { useState } from 'react';
import { AlertTriangle } from '@/lib/atlaskit-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateIncident } from '@/hooks/useIncidents';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import { useTheme } from '@/hooks/useTheme';

interface NewIncidentModalProps {
  open: boolean;
  onClose: () => void;
}

const SEVERITIES = ['SEV1', 'SEV2', 'SEV3', 'SEV4'] as const;
const SEV_STYLES: Record<string, { bg: string; border: string; text: string; darkBg: string; darkBorder: string; darkText: string }> = {
  SEV1: { bg: 'var(--ds-background-danger)', border: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)', darkBg: 'var(--ds-background-danger)', darkBorder: 'var(--ds-background-danger)', darkText: 'var(--ds-border-danger)' },
  SEV2: { bg: 'var(--ds-background-warning)', border: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', darkBg: 'var(--ds-background-warning-bold)', darkBorder: 'var(--ds-background-warning-bold)', darkText: 'var(--ds-background-warning, var(--ds-background-warning))' },
  SEV3: { bg: 'var(--ds-background-information)', border: 'var(--ds-background-information)', text: 'var(--ds-link-pressed)', darkBg: 'var(--ds-background-information-bold)', darkBorder: 'var(--ds-background-information-bold)', darkText: 'var(--ds-background-information-bold, var(--ds-link))' },
  SEV4: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', border: 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))', text: 'var(--ds-text-subtle)', darkBg: 'var(--ds-border, var(--cp-ink-1))', darkBorder: 'var(--ds-border-bold)', darkText: 'var(--ds-text-subtlest)' },
};

export function NewIncidentModal({ open, onClose }: NewIncidentModalProps) {
  const createIncident = useCreateIncident();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string>('SEV3');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { catalystToast.error('Title is required'); return; }
    setIsSubmitting(true);
    try {
      const created = await createIncident.mutateAsync({
        title: title.trim(),
        description,
        severity: severity as any,
        impact: 'medium' as any,
        urgency: 'medium' as any,
      });
      qc.invalidateQueries({ queryKey: ['incident-hub-list'] });
      catalystToast.success('Incident created');
      setTitle('');
      setDescription('');
      setSeverity('SEV3');
      onClose();
      // Land on the created incident's detail view in incident hub.
      if ((created as any)?.id) navigate(`/incident-hub/view/${(created as any).id}`);
    } catch {
      catalystToast.error('Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[760px]" style={{ borderRadius: 8, padding: 0 }}>
        <DialogHeader className="px-6 pt-5 pb-3" style={{ borderBottom: '0.75px solid var(--ds-shadow-overlay)' }}>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-500)', fontWeight: 700 }}>
            <div className="flex items-center justify-center rounded" style={{ width: 28, height: 28, backgroundColor: 'var(--ds-background-danger)' }}>
              <AlertTriangle size={14} style={{ color: 'var(--ds-text-danger, var(--cp-danger))' }} />
            </div>
            New Incident
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          <div>
            <Label style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', fontWeight: 650 }}>Title *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of the incident"
              style={{ borderRadius: 4, fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', marginTop: 4 }}
            />
          </div>

          <div>
            <Label style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', fontWeight: 650, marginBottom: 8 }}>Severity *</Label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {SEVERITIES.map(sev => {
                const s = SEV_STYLES[sev];
                const selected = severity === sev;
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className="p-2 text-center transition-all"
                    style={{
                      borderRadius: 4,
                      border: `1.5px solid ${selected ? (isDark ? s.darkText : s.text) : (isDark ? s.darkBorder : s.border)}`,
                      backgroundColor: selected ? (isDark ? s.darkBg : s.bg) : ('var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))'),
                      fontFamily: 'var(--cp-font-mono)',
                      fontSize: 'var(--ds-font-size-200)',
                      fontWeight: 700,
                      color: isDark ? s.darkText : s.text,
                    }}
                  >
                    {sev.replace(/(\d)/, '-$1')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label style={{ fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-200)', fontWeight: 650 }}>Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed description of the incident..."
              style={{ borderRadius: 4, fontFamily: 'var(--cp-font-body)', fontSize: 'var(--ds-font-size-300)', marginTop: 4, minHeight: 80 }}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-3" style={{ borderTop: '0.75px solid var(--ds-shadow-overlay)' }}>
          <Button variant="ghost" onClick={onClose} style={{ borderRadius: 6 }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()} style={{ backgroundColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', borderRadius: 6 }}>
            {isSubmitting ? 'Creating...' : 'Create Incident'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
