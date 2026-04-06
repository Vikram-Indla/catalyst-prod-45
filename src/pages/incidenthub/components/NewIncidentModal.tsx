/**
 * NewIncidentModal — Create new incident
 * 760px width, shadcn dialog, form fields
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateIncident } from '@/hooks/useIncidents';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NewIncidentModalProps {
  open: boolean;
  onClose: () => void;
}

const SEVERITIES = ['SEV1', 'SEV2', 'SEV3', 'SEV4'] as const;
const SEV_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  SEV1: { bg: 'rgba(248,113,113,0.10)', border: '#FECACA', text: '#F87171' },
  SEV2: { bg: 'rgba(251,191,36,0.10)', border: '#FDE68A', text: '#FBBF24' },
  SEV3: { bg: '#DBEAFE', border: '#BFDBFE', text: '#7DB8FC' },
  SEV4: { bg: '#1A1A1A', border: 'var(--bd-default, rgba(255,255,255,0.10))', text: '#475569' },
};

export function NewIncidentModal({ open, onClose }: NewIncidentModalProps) {
  const createIncident = useCreateIncident();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string>('SEV3');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setIsSubmitting(true);
    try {
      await createIncident.mutateAsync({
        title: title.trim(),
        description,
        severity: severity as any,
        impact: 'medium' as any,
        urgency: 'medium' as any,
      });
      qc.invalidateQueries({ queryKey: ['incident-hub-list'] });
      toast.success('Incident created');
      setTitle('');
      setDescription('');
      setSeverity('SEV3');
      onClose();
    } catch {
      toast.error('Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[760px]" style={{ borderRadius: 8, padding: 0 }}>
        <DialogHeader className="px-6 pt-5 pb-3" style={{ borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>
            <div className="flex items-center justify-center rounded" style={{ width: 28, height: 28, backgroundColor: 'rgba(248,113,113,0.10)' }}>
              <AlertTriangle size={14} style={{ color: '#DC2626' }} />
            </div>
            New Incident
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          <div>
            <Label style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, fontWeight: 650 }}>Title *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of the incident"
              style={{ borderRadius: 4, fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 13, marginTop: 4 }}
            />
          </div>

          <div>
            <Label style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, fontWeight: 650, marginBottom: 8 }}>Severity *</Label>
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
                      border: `1.5px solid ${selected ? s.text : s.border}`,
                      backgroundColor: selected ? s.bg : '#FFFFFF',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                      fontWeight: 700,
                      color: s.text,
                    }}
                  >
                    {sev.replace(/(\d)/, '-$1')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, fontWeight: 650 }}>Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed description of the incident..."
              style={{ borderRadius: 4, fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 13, marginTop: 4, minHeight: 80 }}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-3" style={{ borderTop: '0.75px solid rgba(15,23,42,0.06)' }}>
          <Button variant="ghost" onClick={onClose} style={{ borderRadius: 6 }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()} style={{ backgroundColor: '#2563EB', borderRadius: 6 }}>
            {isSubmitting ? 'Creating...' : 'Create Incident'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
