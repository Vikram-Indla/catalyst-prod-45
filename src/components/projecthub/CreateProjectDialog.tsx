import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [status, setStatus] = useState('planning');
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
        status: status as 'planning' | 'active' | 'on_hold',
        description: description || undefined,
      });
      toast.success('Project created');
      onClose();
      setName(''); setKey(''); setDepartment(''); setStatus('planning'); setDescription('');
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
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Project Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md outline-none" style={{ height: 36, padding: '0 12px', border: '1px solid #E2E8F0', fontSize: 13 }} placeholder="e.g. Industrial Automation" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Project Key *</label>
            <input value={key} onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4))} className="w-full rounded-md outline-none" style={{ height: 36, padding: '0 12px', border: '1px solid #E2E8F0', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }} placeholder="e.g. IA" maxLength={4} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Department</label>
            <input value={department} onChange={e => setDepartment(e.target.value)} className="w-full rounded-md outline-none" style={{ height: 36, padding: '0 12px', border: '1px solid #E2E8F0', fontSize: 13 }} placeholder="e.g. Technology & Innovation" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-md outline-none" style={{ height: 36, padding: '0 12px', border: '1px solid #E2E8F0', fontSize: 13, background: '#FFF' }}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md outline-none resize-none" style={{ height: 72, padding: '8px 12px', border: '1px solid #E2E8F0', fontSize: 13 }} placeholder="Brief project description..." />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-md" style={{ height: 36, background: '#FFF', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={createProject.isPending} className="flex-1 rounded-md" style={{ height: 36, background: '#2563EB', border: 'none', fontSize: 13, fontWeight: 600, color: '#FFF', cursor: 'pointer', opacity: createProject.isPending ? 0.7 : 1 }}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
