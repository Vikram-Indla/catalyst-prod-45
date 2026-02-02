/**
 * Task¹⁰ Item Detail Panel - Full CRUD for Labels, Notes, Description + Activity History
 */
import { useState, useEffect } from 'react';
import { X, Calendar, User, Tag, FileText, Clock, MessageSquare, History, Trash2, Check, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AqdItemFull, AqdLabel, AqdItemStatus } from '../types/aqd.types';
import { AQD_STATUS_CONFIG, getStatusLabel } from '../types/aqd.types';
import { NotesSection } from './NotesSection';
import { DescriptionEditor } from './DescriptionEditor';
import { LabelSelector } from './LabelSelector';
import { ActivityTimeline } from './ActivityTimeline';
import { logActivity } from '../hooks/useAqdItemDetail';

interface AqdItemDetailPanelProps {
  item: AqdItemFull;
  listId: string;
  weekId: string;
  labels: AqdLabel[];
  onClose: () => void;
  onDelete?: (itemId: string) => void;
}

type TabType = 'details' | 'activity';

export function AqdItemDetailPanel({
  item,
  listId,
  weekId,
  labels,
  onClose,
  onDelete,
}: AqdItemDetailPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    item.due_date ? new Date(item.due_date) : undefined
  );

  // Sync local state when item changes
  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description || '');
    setDueDate(item.due_date ? new Date(item.due_date) : undefined);
  }, [item]);

  // Update item mutation
  const updateItem = useMutation({
    mutationFn: async ({ field, value, oldValue }: { field: string; value: unknown; oldValue?: unknown }) => {
      const { error } = await supabase
        .from('aqd_items')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw new Error(error.message);
      
      // Log activity
      const action = field === 'status' ? 'status_changed' 
        : field === 'description' ? 'description_updated'
        : field === 'due_date' ? (value ? 'due_date_set' : 'due_date_removed')
        : 'status_changed';
      await logActivity(item.id, action as any, field, oldValue?.toString() ?? null, value?.toString() ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', weekId] });
      queryClient.invalidateQueries({ queryKey: ['aqd-item-detail', item.id] });
      queryClient.invalidateQueries({ queryKey: ['aqd-activity', item.id] });
    },
    onError: (e) => toast.error(`Failed to update: ${e.message}`),
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async (status: AqdItemStatus) => {
      const oldStatus = item.status;
      const { error } = await supabase
        .from('aqd_items')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw new Error(error.message);
      await logActivity(item.id, 'status_changed', 'status', oldStatus, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-items', weekId] });
      queryClient.invalidateQueries({ queryKey: ['aqd-activity', item.id] });
    },
  });

  const handleSaveTitle = () => {
    if (title.trim() && title !== item.title) {
      updateItem.mutate({ field: 'title', value: title.trim(), oldValue: item.title });
    }
  };

  const handleSaveDescription = (newDesc: string) => {
    updateItem.mutate({ field: 'description', value: newDesc || null, oldValue: description });
    setDescription(newDesc);
  };

  const handleSaveDueDate = (date: Date | undefined) => {
    setDueDate(date);
    updateItem.mutate({ 
      field: 'due_date', 
      value: date ? date.toISOString().split('T')[0] : null,
      oldValue: item.due_date
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.15s ease-out' }}
      />
      
      {/* Panel */}
      <div 
        className="fixed right-0 top-0 h-full w-[440px] bg-white border-l border-slate-200 shadow-xl flex flex-col z-50"
        style={{ animation: 'slideInRight 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">
              {item.rank}
            </span>
            {item.taskhub_key && (
              <a 
                href={`/taskhub/${item.taskhub_key}`}
                className="text-xs font-mono text-blue-600 hover:underline"
              >
                {item.taskhub_key}
              </a>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              activeTab === 'details'
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === 'activity'
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <History className="w-4 h-4" />
            Activity
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="px-5 py-5">
              {/* Title */}
              <input
                type="text"
                className="w-full text-lg font-semibold text-slate-900 mb-6 leading-snug border-none outline-none bg-transparent focus:bg-slate-50 rounded px-1 -mx-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                placeholder="Item title..."
              />

              {/* Status */}
              <SectionLabel icon={<Clock className="w-3.5 h-3.5" />}>Status</SectionLabel>
              <StatusToggle 
                value={item.status} 
                onChange={(status) => updateStatus.mutate(status as AqdItemStatus)}
                disabled={updateStatus.isPending}
              />

              <Divider />

              {/* Due Date */}
              <SectionLabel icon={<Calendar className="w-3.5 h-3.5" />}>Due Date</SectionLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "w-full px-3 py-2 text-left text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors mb-4",
                    dueDate ? "text-slate-700" : "text-slate-400"
                  )}>
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Set due date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={dueDate}
                    onSelect={handleSaveDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Labels */}
              <SectionLabel icon={<Tag className="w-3.5 h-3.5" />}>Labels</SectionLabel>
              <LabelSelector
                itemId={item.id}
                listId={listId}
                currentLabels={item.labels || []}
                weekId={weekId}
              />

              <Divider />

              {/* Description */}
              <SectionLabel icon={<FileText className="w-3.5 h-3.5" />}>Description</SectionLabel>
              <DescriptionEditor
                value={description}
                onChange={handleSaveDescription}
              />

              <Divider />

              {/* Notes */}
              <SectionLabel icon={<MessageSquare className="w-3.5 h-3.5" />}>
                Notes ({item.note_count || 0})
              </SectionLabel>
              <NotesSection itemId={item.id} />
            </div>
          ) : (
            <ActivityTimeline itemId={item.id} />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-400">
            Created {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
          
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Delete?</span>
              <button 
                onClick={() => {
                  if (onDelete) {
                    onDelete(item.id);
                  }
                  onClose();
                }}
                className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Yes
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

// Section label component
function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
      {icon}
      {children}
    </label>
  );
}

// Divider component
function Divider() {
  return <div className="border-t border-slate-100 my-5" />;
}

// Status toggle component
interface StatusToggleProps {
  value: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS = [
  { id: 'not_started', label: 'To Do', activeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300' },
  { id: 'in_progress', label: 'In Progress', activeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300' },
  { id: 'completed', label: 'Completed', activeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300' },
];

function StatusToggle({ value, onChange, disabled }: StatusToggleProps) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {STATUS_OPTIONS.map((status) => (
        <button
          key={status.id}
          onClick={() => onChange(status.id)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            value === status.id
              ? status.activeClass
              : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <StatusIndicator status={status.id} isActive={value === status.id} />
          {status.label}
        </button>
      ))}
    </div>
  );
}

function StatusIndicator({ status, isActive }: { status: string; isActive: boolean }) {
  if (status === 'completed' && isActive) {
    return (
      <span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
        <Check className="w-2 h-2 text-white" />
      </span>
    );
  }
  
  if (status === 'in_progress' && isActive) {
    return <span className="w-3 h-3 rounded-full bg-amber-500" />;
  }
  
  return (
    <span className={cn(
      "w-3 h-3 rounded-full border-2",
      isActive ? "border-slate-500" : "border-slate-300"
    )} />
  );
}

export default AqdItemDetailPanel;
