import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProject } from '@/hooks/useProjectHub';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');
  const createProject = useCreateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) {
      toast.error('Name and Key are required');
      return;
    }
    try {
      await createProject.mutateAsync({
        name: name.trim(),
        project_key: key.trim().toUpperCase(),
        department: department || undefined,
        description: description || undefined,
        status_category: 'todo',
      });
      toast.success('Project created');
      onClose();
      setName(''); setKey(''); setDepartment(''); setStatus('active'); setDescription('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Sora', sans-serif", fontSize: 18 }}>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 6 }}>Project Name <span style={{ color: '#DC2626' }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md outline-none" style={{ height: 40, padding: '0 12px', border: '1px solid #E2E8F0', fontSize: 14 }} placeholder="Enter project name" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 6 }}>Project Key <span style={{ color: '#DC2626' }}>*</span></label>
            <input value={key} onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4))} className="w-full rounded-md outline-none" style={{ height: 40, padding: '0 12px', border: '1px solid #E2E8F0', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }} placeholder="XX" maxLength={4} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 6 }}>Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full rounded-md outline-none appearance-none"
                style={{ height: 40, padding: '0 12px', border: '1px solid #E2E8F0', fontSize: 14, color: department ? '#0F172A' : '#94A3B8', background: '#FFF', cursor: 'pointer' }}
              >
                <option value="">Select department</option>
                <option value="Energy & Sustainability">Energy &amp; Sustainability</option>
                <option value="Human Capital">Human Capital</option>
                <option value="Information Security">Information Security</option>
                <option value="Logistics">Logistics</option>
                <option value="Mining & Minerals">Mining &amp; Minerals</option>
                <option value="Operations">Operations</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Technology & Innovation">Technology &amp; Innovation</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 6 }}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-md outline-none appearance-none"
                style={{ height: 40, padding: '0 12px', border: '1px solid #E2E8F0', fontSize: 14, color: status ? '#0F172A' : '#94A3B8', background: '#FFF', cursor: 'pointer' }}
              >
                <option value="">Select status</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="planning">Planning</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md outline-none resize-vertical" style={{ minHeight: 80, padding: '12px', border: '1px solid #E2E8F0', fontSize: 14 }} placeholder="Brief project description..." />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-md" style={{ height: 40, background: '#FFF', border: '1px solid #E2E8F0', fontSize: 14, fontWeight: 500, color: '#475569', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={createProject.isPending} className="flex-1 rounded-md" style={{ height: 40, background: '#2563EB', border: 'none', fontSize: 14, fontWeight: 600, color: '#FFF', cursor: 'pointer', opacity: createProject.isPending ? 0.7 : 1 }}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
