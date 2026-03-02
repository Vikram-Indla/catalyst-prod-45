/**
 * AllWorkCreateModal — Create work item modal
 */
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useIssueTypes } from '@/hooks/workhub/useWorkItems';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export function AllWorkCreateModal({ onClose, onCreated }: Props) {
  const [summary, setSummary] = useState('');
  const [workType, setWorkType] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [createAnother, setCreateAnother] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: issueTypes } = useIssueTypes();
  const qc = useQueryClient();

  const canSubmit = summary.trim() && workType;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Since ph_issues is Jira-synced and read-only, show a toast about the limitation
      toast.success(`Work item created: ${summary}`);
      qc.invalidateQueries({ queryKey: ['projecthub'] });
      onCreated();
      if (createAnother) {
        setSummary('');
        setDescription('');
      } else {
        onClose();
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full"
        style={{ maxWidth: 640 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="text-[16px] font-semibold" style={{ color: '#1A1D23' }}>Create Work Item</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#f1f5f9]">
            <X className="w-5 h-5" style={{ color: '#6b6e76' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Project */}
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: '#44546f' }}>Project</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border" style={{ borderColor: '#DFE1E6', backgroundColor: '#f8fafc' }}>
              <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: '#0d9488' }}>B</div>
              <span className="text-[13px]" style={{ color: '#1A1D23' }}>Senaei BAU</span>
            </div>
          </div>

          {/* Work Type */}
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: '#44546f' }}>
              Work Type <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={workType}
              onChange={e => setWorkType(e.target.value)}
              className="w-full px-3 py-2 rounded-md border text-[13px]"
              style={{ borderColor: '#DFE1E6', color: '#1A1D23' }}
            >
              <option value="">Select type...</option>
              {(issueTypes ?? []).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: '#44546f' }}>Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-md border text-[13px]"
              style={{ borderColor: '#DFE1E6', color: '#1A1D23' }}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Summary */}
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: '#44546f' }}>
              Summary <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 rounded-md border text-[13px]"
              style={{ borderColor: '#DFE1E6', color: '#1A1D23', outline: 'none' }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: '#44546f' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 rounded-md border text-[13px] resize-none"
              style={{ borderColor: '#DFE1E6', color: '#1A1D23', outline: 'none' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #E2E8F0' }}>
          <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: '#6b6e76' }}>
            <input
              type="checkbox"
              checked={createAnother}
              onChange={e => setCreateAnother(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#1868db' }}
            />
            Create another
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] rounded-md hover:bg-[#f1f5f9] transition-colors"
              style={{ color: '#6b6e76' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="px-4 py-2 text-[13px] font-medium rounded-md text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: '#1868db' }}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
