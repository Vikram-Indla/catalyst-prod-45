/**
 * ConvertDialog — Convert incident to work item
 * 640px, 3x2 grid of type cards
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ConvertDialogProps {
  open: boolean;
  onClose: () => void;
  incidentId: string;
}

const TYPES = [
  { key: 'bug', label: 'Bug', desc: 'Software defect or malfunction', color: '#DC2626' },
  { key: 'task', label: 'Task', desc: 'General work item', color: '#2563EB' },
  { key: 'story', label: 'Story', desc: 'User story for backlog', color: '#16A34A' },
  { key: 'epic', label: 'Epic', desc: 'Large body of work', color: '#7C3AED' },
  { key: 'feature', label: 'New Feature', desc: 'New functionality', color: '#0D9488' },
  { key: 'improvement', label: 'Improvement', desc: 'Enhance existing feature', color: '#D97706' },
];

export function ConvertDialog({ open, onClose, incidentId }: ConvertDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleConvert = () => {
    if (!selected) return;
    toast.success(`Incident queued for conversion to ${selected}`);
    setSelected(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[640px]" style={{ borderRadius: 8, padding: 0 }}>
        <DialogHeader className="px-6 pt-5 pb-3" style={{ borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
          <DialogTitle style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>Convert Incident</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-3">
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setSelected(t.key)}
                className="p-3 text-left transition-all"
                style={{
                  borderRadius: 6,
                  border: `1.5px solid ${selected === t.key ? '#2563EB' : 'rgba(15,23,42,0.12)'}`,
                  backgroundColor: selected === t.key ? '#EFF6FF' : '#FFFFFF',
                }}
              >
                {/* Type icon circle */}
                <div className="mb-2 rounded flex items-center justify-center" style={{ width: 28, height: 28, backgroundColor: `${t.color}15` }}>
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <rect x="2" y="2" width="12" height="12" rx="2" fill={t.color} opacity="0.8" />
                  </svg>
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 650, color: 'var(--fg-1, #0F172A)', marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#64748B' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-3" style={{ borderTop: '0.75px solid rgba(15,23,42,0.06)' }}>
          <Button variant="ghost" onClick={onClose} style={{ borderRadius: 6 }}>Cancel</Button>
          <Button disabled={!selected} onClick={handleConvert} style={{ backgroundColor: '#2563EB', borderRadius: 6, opacity: selected ? 1 : 0.5 }}>
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
