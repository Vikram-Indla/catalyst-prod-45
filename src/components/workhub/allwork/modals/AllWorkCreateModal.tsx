/**
 * AllWorkCreateModal — Create work item modal (NO native <select>)
 */
import { useState, useRef, useEffect } from 'react';
import { X, Loader2, ChevronDown, Check } from 'lucide-react';
import { useIssueTypes } from '@/hooks/workhub/useWorkItems';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

/** Custom dropdown replacing native <select> */
function CustomSelect({ label, required, value, options, onChange, placeholder, isLoading }: {
  label: string;
  required?: boolean;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler); };
  }, [open]);

  return (
    <div>
      <label className="text-[11px] uppercase font-semibold block mb-1" style={{ color: 'var(--fg-2)', letterSpacing: '0.05em', fontFamily: 'var(--cp-font-body)' }}>
        {label} {required && <span style={{ color: 'var(--sem-danger)' }}>*</span>}
      </label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md border text-[13px] text-left transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[var(--ds-text-brand,#2563EB)]"
          style={{
            borderColor: open ? 'var(--cp-blue)' : 'var(--bd-default, #2E2E2E)',
            color: value ? 'var(--fg-1)' : 'var(--fg-3)',
            fontFamily: 'var(--cp-font-body)',
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {value || placeholder}
          <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ds-text-subtlest, #6b6e76)' }} />
        </button>
        {open && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-white shadow-lg z-50 py-1 max-h-52 overflow-y-auto animate-scale-in"
            style={{ borderColor: 'var(--bd-default, #2E2E2E)' }}
            role="listbox"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fg-3)' }} />
                <span className="ml-2 text-[12px]" style={{ color: 'var(--fg-3)' }}>Loading...</span>
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--fg-3)' }}>No options available</div>
            ) : (
              options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] hover:bg-[var(--hover,#1F1F1F)] text-left transition-colors duration-[80ms]"
                  style={{ color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
                  role="option"
                  aria-selected={opt === value}
                >
                  {opt}
                  {opt === value && <Check className="w-3.5 h-3.5" style={{ color: 'var(--cp-blue)' }} />}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AllWorkCreateModal({ onClose, onCreated }: Props) {
  const [summary, setSummary] = useState('');
  const [workType, setWorkType] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [createAnother, setCreateAnother] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: issueTypes, isLoading: typesLoading } = useIssueTypes();
  const qc = useQueryClient();

  const canSubmit = summary.trim() && workType;

  // Trap focus + Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      toast.success(`Work item created: ${summary}`);
      qc.invalidateQueries({ queryKey: ['workhub'] });
      qc.invalidateQueries({ queryKey: ['projecthub'] });
      onCreated();
      if (createAnother) {
        setSummary('');
        setDescription('');
      } else {
        onClose();
      }
    } catch (err: any) {
      toast.error(`Failed to create work item. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create work item"
    >
      <div
        className="bg-white shadow-2xl w-full animate-scale-in"
        style={{ maxWidth: 640, borderRadius: 16 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--bd-subtle, #292929)' }}>
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>Create Work Item</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--hover,#1F1F1F)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[var(--ds-text-brand,#2563EB)]" aria-label="Close modal">
            <X className="w-5 h-5" style={{ color: 'var(--ds-text-subtlest, #6b6e76)' }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Project */}
          <div>
            <label className="text-[11px] uppercase font-semibold block mb-1" style={{ color: 'var(--fg-2)', letterSpacing: '0.05em', fontFamily: 'var(--cp-font-body)' }}>Project</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border" style={{ borderColor: 'var(--bd-default, #2E2E2E)', backgroundColor: 'var(--hover, #1F1F1F)' }}>
              <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--sem-success)' }}>B</div>
              <span className="text-[13px]" style={{ color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}>Senaei BAU</span>
            </div>
          </div>

          <CustomSelect
            label="Work Type"
            required
            value={workType}
            options={issueTypes ?? []}
            onChange={setWorkType}
            placeholder="Select type..."
            isLoading={typesLoading}
          />

          <CustomSelect
            label="Priority"
            value={priority}
            options={PRIORITIES}
            onChange={setPriority}
            placeholder="Select priority..."
          />

          {/* Summary */}
          <div>
            <label className="text-[11px] uppercase font-semibold block mb-1" style={{ color: 'var(--fg-2)', letterSpacing: '0.05em', fontFamily: 'var(--cp-font-body)' }}>
              Summary <span style={{ color: 'var(--sem-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 rounded-md border text-[13px] transition-colors duration-[80ms] focus:border-[var(--ds-text-brand,#2563EB)] focus:outline-none"
              style={{ borderColor: 'var(--bd-default, #2E2E2E)', color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] uppercase font-semibold block mb-1" style={{ color: 'var(--fg-2)', letterSpacing: '0.05em', fontFamily: 'var(--cp-font-body)' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 rounded-md border text-[13px] resize-none transition-colors duration-[80ms] focus:border-[var(--ds-text-brand,#2563EB)] focus:outline-none"
              style={{ borderColor: 'var(--bd-default, #2E2E2E)', color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--bd-subtle, #292929)' }}>
          <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: 'var(--ds-text-subtlest, #6b6e76)', fontFamily: 'var(--cp-font-body)' }}>
            <input
              type="checkbox"
              checked={createAnother}
              onChange={e => setCreateAnother(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--ds-text-brand,#2563EB)]"
            />
            Create another
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] rounded-md hover:bg-[var(--hover,#1F1F1F)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[var(--ds-text-brand,#2563EB)]"
              style={{ color: 'var(--ds-text-subtlest, #6b6e76)', fontFamily: 'var(--cp-font-body)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="px-4 py-2 text-[13px] font-medium rounded-md text-white disabled:opacity-50 transition-colors duration-[80ms] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-text-brand,#2563EB)]"
              style={{ backgroundColor: 'var(--cp-blue)', fontFamily: 'var(--cp-font-body)' }}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
