import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProject, useProjects } from '@/hooks/useProjectHub';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Extract first 3 letters (alpha only) from a name, uppercase */
function deriveKeyFromName(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 3);
}

export function CreateProjectDialog({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');
  const createProject = useCreateProject();
  const { data: projects } = useProjects();

  const existingKeys = new Set((projects ?? []).map(p => p.project_key.toUpperCase()));
  const isDuplicate = key.length === 3 && existingKeys.has(key);

  // Auto-generate key when name changes
  useEffect(() => {
    setKey(deriveKeyFromName(name));
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (key.length !== 3) {
      toast.error('Project key must be exactly 3 letters');
      return;
    }
    if (isDuplicate) {
      toast.error(`Key "${key}" is already in use`);
      return;
    }
    try {
      await createProject.mutateAsync({
        name: name.trim(),
        project_key: key,
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
            <input
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3))}
              className="w-full rounded-md outline-none"
              style={{
                height: 40, padding: '0 12px',
                border: `1px solid ${isDuplicate ? '#DC2626' : '#E2E8F0'}`,
                fontSize: 14, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em',
              }}
              placeholder="ABC"
              maxLength={3}
            />
            {isDuplicate && (
              <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>This key is already in use</p>
            )}
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Auto-generated from project name · exactly 3 letters</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 6 }}>Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Energy & Sustainability">Energy &amp; Sustainability</SelectItem>
                  <SelectItem value="Human Capital">Human Capital</SelectItem>
                  <SelectItem value="Information Security">Information Security</SelectItem>
                  <SelectItem value="Logistics">Logistics</SelectItem>
                  <SelectItem value="Mining & Minerals">Mining &amp; Minerals</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Quality Assurance">Quality Assurance</SelectItem>
                  <SelectItem value="Technology & Innovation">Technology &amp; Innovation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 6 }}>Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md outline-none resize-vertical" style={{ minHeight: 80, padding: '12px', border: '1px solid #E2E8F0', fontSize: 14 }} placeholder="Brief project description..." />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-md" style={{ height: 40, background: '#FFF', border: '1px solid #E2E8F0', fontSize: 14, fontWeight: 500, color: '#475569', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={createProject.isPending || isDuplicate || key.length !== 3} className="flex-1 rounded-md" style={{ height: 40, background: '#2563EB', border: 'none', fontSize: 14, fontWeight: 600, color: '#FFF', cursor: 'pointer', opacity: (createProject.isPending || isDuplicate || key.length !== 3) ? 0.7 : 1 }}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
