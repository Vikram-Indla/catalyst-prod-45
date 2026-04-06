import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import type { ProjectListItem } from '@/types/projecthub';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  projects: ProjectListItem[];
}

function downloadCSV(projects: ProjectListItem[]) {
  const headers = ['Key', 'Name', 'Department', 'Status', 'Health', 'Epics', 'Stories', 'Tasks', 'Completion'];
  const rows = projects.map(p => [p.project_key, p.name, p.department || '', p.status, p.health_status, p.total_epics, p.total_stories, p.total_tasks, `${p.completion_percentage}%`]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'projects.csv'; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(projects: ProjectListItem[]) {
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'projects.json'; a.click();
  URL.revokeObjectURL(url);
}

const FORMATS = [
  { key: 'csv', label: 'CSV', icon: FileSpreadsheet, action: downloadCSV },
  { key: 'excel', label: 'Excel (CSV)', icon: FileSpreadsheet, action: downloadCSV },
  { key: 'json', label: 'JSON', icon: FileJson, action: downloadJSON },
] as const;

export function ExportDialog({ open, onClose, projects }: Props) {
  const handleExport = (action: (p: ProjectListItem[]) => void) => {
    action(projects);
    toast.success('Export downloaded');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Sora', sans-serif", fontSize: 18 }}>Export Projects</DialogTitle>
        </DialogHeader>
        <p className="text-[#64748B] dark:text-[rgba(255,255,255,0.55)]" style={{ fontSize: 13, marginTop: -4, marginBottom: 12 }}>
          Export {projects.length} project{projects.length !== 1 ? 's' : ''} matching current filters.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {FORMATS.map(f => (
            <button
              key={f.key}
              onClick={() => handleExport(f.action)}
              className="flex flex-col items-center gap-2 rounded-lg transition-all hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-[rgba(255,255,255,0.03)] bg-[#F8FAFC] dark:bg-[rgba(255,255,255,0.03)] border border-[var(--bd-default, #E2E8F0)] dark:border-[rgba(255,255,255,0.10)]"
              style={{ padding: '20px 12px', cursor: 'pointer' }}
            >
              <f.icon size={24} color="var(--cp-blue)" />
              <span className="text-[#334155] dark:text-[rgba(255,255,255,0.72)]" style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}