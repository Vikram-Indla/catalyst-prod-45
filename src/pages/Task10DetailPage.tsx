import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Zap,
  Plus,
  User,
  Tag,
  X,
  Clock,
  AlignLeft,
  Trash2,
  Archive
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PriorityItem {
  id: string;
  rank: number;
  title: string;
  description: string | null;
  status: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  due_date: string | null;
  labels: unknown;
  taskhub_key: string | null;
  is_buffer: boolean | null;
  carryover_count: number | null;
  created_at: string | null;
  week_id: string | null;
}

interface WeekDetail {
  week_id: string;
  list_id: string;
  list_key: string;
  list_name: string;
  week_start: string;
  week_end: string;
  is_current: boolean;
  completed_count: number;
  total_count: number;
  buffer_count: number;
}

interface AISuggestion {
  id: string;
  taskhub_key: string;
  title: string;
  due_date: string | null;
  priority: string;
  assignee_name: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SORTABLE PRIORITY CARD
// ═══════════════════════════════════════════════════════════════════════════════

function SortablePriorityCard({ 
  item, 
  onToggleComplete, 
  onClick 
}: { 
  item: PriorityItem; 
  onToggleComplete: () => void;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCompleted = item.status === 'done';
  const labels = Array.isArray(item.labels) 
    ? (item.labels as Array<{ id: string; name: string; color: string }>)
    : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        flex items-center gap-4 p-4 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-xl cursor-pointer
        hover:border-blue-200 hover:shadow-sm transition-all
        ${isCompleted ? 'bg-gray-50' : ''}
        ${isDragging ? 'shadow-lg border-blue-500' : ''}
      `}
    >
      {/* DRAG HANDLE */}
      <div
        {...attributes}
        {...listeners}
        className="flex flex-col gap-0.5 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 bg-current rounded-sm" />
          <div className="w-1.5 h-1.5 bg-current rounded-sm" />
        </div>
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 bg-current rounded-sm" />
          <div className="w-1.5 h-1.5 bg-current rounded-sm" />
        </div>
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 bg-current rounded-sm" />
          <div className="w-1.5 h-1.5 bg-current rounded-sm" />
        </div>
      </div>

      {/* RANK BADGE - ALWAYS BLUE */}
      <div className="w-10 h-10 flex items-center justify-center text-sm font-bold text-white rounded-xl flex-shrink-0" style={{ backgroundColor: '#2563eb' }}>
        {item.rank}
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {item.title}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          {/* LABELS */}
          {labels.length > 0 && labels.map((label) => (
            <span 
              key={label.id} 
              className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded"
            >
              {label.name}
            </span>
          ))}
          
          {/* ASSIGNEE - FULL NAME */}
          {item.assignee_name && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <User className="w-3 h-3" />
              {item.assignee_name}
            </span>
          )}
          
          {/* DUE DATE */}
          {item.due_date && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {format(parseISO(item.due_date), 'MMM d')}
            </span>
          )}

          {/* TASKHUB KEY */}
          {item.taskhub_key && (
            <span className="px-2 py-0.5 text-xs font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded">
              {item.taskhub_key}
            </span>
          )}
        </div>
      </div>

      {/* CHECKBOX - BLUE WHEN CHECKED */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0"
        style={{
          backgroundColor: isCompleted ? '#2563eb' : '#ffffff',
          borderColor: isCompleted ? '#2563eb' : '#d1d5db',
        }}
      >
        {isCompleted && <Check className="w-4 h-4 text-white" />}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDE PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function SidePanel({
  item,
  users,
  onClose,
  onUpdate,
  onToggleComplete,
  onDelete,
}: {
  item: PriorityItem;
  users: UserProfile[];
  onClose: () => void;
  onUpdate: (updates: Partial<PriorityItem>) => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleTitleBlur = () => {
    if (title !== item.title) {
      onUpdate({ title });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== item.description) {
      onUpdate({ description });
    }
  };

  return (
    <>
      {/* OVERLAY */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* PANEL */}
      <div className="fixed top-0 right-0 w-[440px] h-full bg-white dark:bg-[#1A1A1A] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center text-lg font-bold text-white rounded-xl shadow-md" style={{ backgroundColor: '#2563eb' }}>
              {item.rank}
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 font-mono">T10-003</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority Item</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TITLE */}
        <div className="p-5 border-b border-gray-200">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full text-xl font-semibold text-gray-900 bg-transparent border-none outline-none"
            placeholder="Item title..."
          />
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-5 py-3.5 text-sm font-medium relative ${
              activeTab === 'details' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-5 py-3.5 text-sm font-medium relative ${
              activeTab === 'activity' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Activity
            {activeTab === 'activity' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
            )}
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'details' ? (
            <>
              {/* STATUS */}
              <div>
                <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Status
                </div>
                <button
                  onClick={onToggleComplete}
                  className={`flex items-center gap-3 w-full p-4 rounded-xl border transition-all ${
                    item.status === 'done' 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{
                      backgroundColor: item.status === 'done' ? '#2563eb' : '#ffffff',
                      borderColor: item.status === 'done' ? '#2563eb' : '#d1d5db',
                    }}
                  >
                    {item.status === 'done' && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {item.status === 'done' ? 'Completed' : 'Mark as completed'}
                  </span>
                </button>
              </div>

              {/* ASSIGNEE */}
              <div>
                <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" />
                  Assigned To
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className="flex items-center justify-between w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{item.assignee_name || 'Add assignee'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  {showAssigneeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-xl shadow-xl z-10 py-2 max-h-64 overflow-y-auto">
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full px-4 py-2.5 text-sm border-b border-gray-100 outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onUpdate({ assignee_id: null, assignee_name: null });
                          setShowAssigneeDropdown(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50"
                      >
                        Unassigned
                      </button>
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            onUpdate({ assignee_id: user.id, assignee_name: user.full_name });
                            setShowAssigneeDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {user.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* DUE DATE */}
              <div>
                <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  Due Date
                </div>
                <input
                  type="date"
                  value={item.due_date || ''}
                  onChange={(e) => onUpdate({ due_date: e.target.value || null })}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-300"
                />
              </div>

              {/* LABELS */}
              <div>
                <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5" />
                  Labels
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Array.isArray(item.labels) && (item.labels as Array<{ id: string; name: string; color: string }>).map((label) => (
                    <span 
                      key={label.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600"
                    >
                      {label.name}
                      <button className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
                    </span>
                  ))}
                </div>
                {showLabelInput ? (
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLabelName.trim()) {
                        toast.success(`Label "${newLabelName}" created`);
                        setNewLabelName('');
                        setShowLabelInput(false);
                      }
                      if (e.key === 'Escape') {
                        setShowLabelInput(false);
                        setNewLabelName('');
                      }
                    }}
                    placeholder="Type label name and press Enter..."
                    className="w-full p-3 text-sm border-2 border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setShowLabelInput(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add label
                  </button>
                )}
              </div>

              {/* DESCRIPTION */}
              <div>
                <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <AlignLeft className="w-3.5 h-3.5" />
                  Description
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  placeholder="Add notes or details..."
                  className="w-full p-4 min-h-[140px] bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg flex-shrink-0">
                  <Check className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-sm text-gray-700">
                    <strong className="font-semibold">Vikram Iyer</strong> marked as completed
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">2 hours ago</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg flex-shrink-0">
                  <Plus className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-sm text-gray-700">
                    <strong className="font-semibold">Ibrahim Ahmed</strong> created this item
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Yesterday at 3:45 PM</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            Created {format(parseISO(item.created_at), 'MMM d, yyyy')}
          </span>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function Task10DetailPage() {
  const { listId, weekId } = useParams<{ listId: string; weekId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedItem, setSelectedItem] = useState<PriorityItem | null>(null);
  const [addInputValue, setAddInputValue] = useState('');
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // QUERIES - Using actual database schema
  const { data: weekDetail } = useQuery({
    queryKey: ['t10-week-detail', listId, weekId],
    queryFn: async () => {
      // Get list info
      const { data: list, error: listError } = await supabase
        .from('t10_lists')
        .select('*')
        .eq('id', listId)
        .single();
      if (listError) throw listError;

      // Get week info
      const { data: week, error: weekError } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('id', weekId)
        .single();
      if (weekError) throw weekError;

      // Get items count
      const { data: allItems } = await supabase
        .from('t10_items')
        .select('id, status, rank')
        .eq('week_id', weekId);

      const completedCount = allItems?.filter(i => i.status === 'done').length || 0;
      const totalCount = allItems?.filter(i => (i.rank || 0) <= 10).length || 0;
      const bufferCount = allItems?.filter(i => (i.rank || 0) > 10).length || 0;

      return {
        week_id: week.id,
        list_id: list.id,
        list_key: list.key || `T10-${list.id.slice(0,3).toUpperCase()}`,
        list_name: list.name,
        week_start: week.week_start,
        week_end: week.week_end,
        is_current: week.is_current ?? true,
        completed_count: completedCount,
        total_count: totalCount,
        buffer_count: bufferCount,
      } as WeekDetail;
    },
    enabled: !!listId && !!weekId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['t10-items', weekId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t10_items_full')
        .select('*')
        .eq('week_id', weekId)
        .order('rank');
      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        rank: item.rank,
        title: item.title,
        description: item.description,
        status: item.status,
        assignee_id: item.assignee_id,
        assignee_name: item.assignee_name,
        due_date: item.due_date,
        labels: item.labels,
        taskhub_key: item.taskhub_key,
        is_buffer: item.is_buffer,
        carryover_count: item.carryover_count,
        created_at: item.created_at,
        week_id: item.week_id,
      })) as PriorityItem[];
    },
    enabled: !!weekId,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['t10-ai-suggestions', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t10_ai_suggestions')
        .select('*')
        .eq('list_id', listId)
        .eq('is_added', false)
        .limit(5);
      if (error) return [];
      return (data || []).map(s => ({
        id: s.id,
        taskhub_key: s.taskhub_key,
        title: s.title,
        due_date: s.due_date,
        priority: s.priority,
        assignee_name: null, // Not in the table
      })) as AISuggestion[];
    },
    enabled: !!listId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['t10-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const top10Items = items.filter(i => (i.rank || 0) <= 10);
  const bufferItems = items.filter(i => (i.rank || 0) > 10);

  // MUTATIONS - Using actual database tables
  const addItemMutation = useMutation({
    mutationFn: async ({ title, taskhubKey }: { title: string; taskhubKey?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const nextRank = items.length + 1;
      const { data, error } = await supabase
        .from('t10_items')
        .insert({
          week_id: weekId,
          title: title,
          taskhub_key: taskhubKey || null,
          rank: nextRank,
          status: 'pending',
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      queryClient.invalidateQueries({ queryKey: ['t10-week-detail'] });
      toast.success('Item added');
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const item = items.find(i => i.id === itemId);
      const newStatus = item?.status === 'done' ? 'pending' : 'done';
      const { error } = await supabase
        .from('t10_items')
        .update({ status: newStatus })
        .eq('id', itemId);
      if (error) throw error;
      return newStatus === 'done';
    },
    onSuccess: (isCompleted) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      queryClient.invalidateQueries({ queryKey: ['t10-week-detail'] });
      toast.success(isCompleted ? 'Completed' : 'Incomplete');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      // Update ranks one by one
      const updates = itemIds.map((id, index) => 
        supabase.from('t10_items').update({ rank: index + 1 }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      toast.success('Order updated');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<PriorityItem> }) => {
      const { error } = await supabase
        .from('t10_items')
        .update(updates)
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      toast.success('Saved');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('t10_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      queryClient.invalidateQueries({ queryKey: ['t10-week-detail'] });
      setSelectedItem(null);
      setShowDeleteModal(false);
      toast.success('Item deleted');
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('aqd_checkout_week', {
        p_week_id: weekId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-week-detail'] });
      setShowCheckoutModal(false);
      toast.success('Week checked out!');
    },
  });

  const swapBufferMutation = useMutation({
    mutationFn: async ({ bufferItemId, targetRank }: { bufferItemId: string; targetRank: number }) => {
      // Simple swap: buffer item gets target rank, current target goes to buffer
      const currentTop = items.find(i => i.rank === targetRank);
      const bufferItem = items.find(i => i.id === bufferItemId);
      if (!bufferItem) return;

      const updates = [
        supabase.from('t10_items').update({ rank: targetRank }).eq('id', bufferItemId),
      ];
      if (currentTop) {
        updates.push(supabase.from('t10_items').update({ rank: 11 }).eq('id', currentTop.id));
      }
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      toast.success('Swapped');
    },
  });

  // HANDLERS
  const handleAddItem = () => {
    if (!addInputValue.trim()) return;
    const taskhubMatch = addInputValue.match(/^(TH|EPIC)-\d+$/i);
    addItemMutation.mutate({
      title: addInputValue,
      taskhubKey: taskhubMatch ? addInputValue.toUpperCase() : undefined,
    });
    setAddInputValue('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = top10Items.findIndex(i => i.id === active.id);
      const newIndex = top10Items.findIndex(i => i.id === over.id);
      const newOrder = arrayMove(top10Items, oldIndex, newIndex);
      reorderMutation.mutate(newOrder.map(i => i.id));
    }
  };

  const formatWeekDate = () => {
    if (!weekDetail) return '';
    const start = parseISO(weekDetail.week_start);
    const end = parseISO(weekDetail.week_end);
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  };

  if (!weekDetail) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }

  // RENDER
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-[#2E2E2E]">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/task10')} className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center text-white rounded-xl font-bold text-sm" style={{ backgroundColor: '#2563eb' }}>
              10
            </div>
            <div>
              <div className="text-base font-bold text-gray-900">Task<sup className="text-xs text-blue-600">10</sup></div>
              <div className="text-xs text-gray-500">Priority Management</div>
            </div>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-px h-6 bg-gray-200" />
            <span className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg font-mono">
              {weekDetail.list_key}
            </span>
            <span className="text-sm font-semibold text-gray-900">{weekDetail.list_name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">{formatWeekDate()}</span>
            {weekDetail.is_current && (
              <span className="px-2 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 rounded uppercase tracking-wide">Current</span>
            )}
          </div>
          <button disabled className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-gray-300">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
            <Check className="w-4 h-4" style={{ color: '#2563eb' }} />
            <span className="text-sm font-semibold text-gray-900">
              <span style={{ color: '#2563eb' }}>{weekDetail.completed_count}</span> of {weekDetail.total_count} completed
            </span>
          </div>
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-lg transition-all hover:shadow-xl"
            style={{ backgroundColor: '#2563eb', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)' }}
          >
            <Check className="w-4 h-4" />
            Checkout Week
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* AI SUGGESTIONS */}
        <div className="mb-5 p-5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-blue-50 border border-blue-200 rounded-xl">
                <Zap className="w-5 h-5" style={{ color: '#2563eb' }} />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">AI Suggestions</div>
                <div className="text-xs text-gray-500">Based on TaskHub items for Ibrahim Ahmed, Vikram Iyer, Maali Abbas</div>
              </div>
            </div>
            <button
              onClick={() => setShowAISuggestions(!showAISuggestions)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {showAISuggestions ? 'Hide' : 'Show'}
              <ChevronRight className={`w-4 h-4 transition-transform ${showAISuggestions ? 'rotate-90' : ''}`} />
            </button>
          </div>
          
          {showAISuggestions && suggestions.length > 0 && (
            <div className="mt-4 space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  onClick={() => addItemMutation.mutate({ title: suggestion.title, taskhubKey: suggestion.taskhub_key })}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group"
                >
                  <div className="w-9 h-9 flex items-center justify-center text-xs font-bold text-blue-600 bg-blue-100 rounded-lg">
                    P{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{suggestion.title}</div>
                    <div className="text-xs text-gray-500">
                      {suggestion.due_date ? `Due ${format(parseISO(suggestion.due_date), 'MMM d')}` : 'No due date'} · {suggestion.assignee_name || 'Unassigned'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded">
                    {suggestion.taskhub_key}
                  </span>
                  <Plus className="w-5 h-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADD INPUT */}
        <div className="mb-5">
          <div className="flex items-center bg-white dark:bg-[#1A1A1A] border-2 border-gray-200 dark:border-[#2E2E2E] rounded-xl overflow-hidden transition-all focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-500/10">
            <div className="px-4" style={{ color: '#2563eb' }}>
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={addInputValue}
              onChange={(e) => setAddInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Add list item or paste TaskHub key..."
              className="flex-1 py-4 text-sm font-medium text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
            />
            <div className="flex items-center gap-2 px-4 text-sm text-gray-400">
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded">Enter</kbd>
              <span>to add</span>
            </div>
          </div>
        </div>

        {/* SECTION HEADER */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top 10 Priorities</span>
          <span className="text-xs text-gray-400">{top10Items.length}/10 slots</span>
        </div>

        {/* PRIORITY LIST */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={top10Items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {top10Items.map((item) => (
                <SortablePriorityCard
                  key={item.id}
                  item={item}
                  onToggleComplete={() => toggleCompleteMutation.mutate(item.id)}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* BUFFER ZONE */}
        {bufferItems.length > 0 && (
          <div className="mt-6 p-5 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Archive className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Buffer Zone</span>
              <span className="px-2 py-0.5 text-xs font-semibold text-gray-500 dark:text-[#A1A1A1] bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded">{bufferItems.length}</span>
            </div>
            <div className="space-y-2">
              {bufferItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-xl">
                  <div className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-gray-500 bg-gray-100 border border-dashed border-gray-300 rounded-lg">
                    {item.rank}
                  </div>
                  <span className="flex-1 text-sm text-gray-700">{item.title}</span>
                  <button
                    onClick={() => swapBufferMutation.mutate({ bufferItemId: item.id, targetRank: 10 })}
                    className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Swap with #10
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* SIDE PANEL */}
      {selectedItem && (
        <SidePanel
          item={selectedItem}
          users={users}
          onClose={() => setSelectedItem(null)}
          onUpdate={(updates) => updateItemMutation.mutate({ itemId: selectedItem.id, updates })}
          onToggleComplete={() => toggleCompleteMutation.mutate(selectedItem.id)}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="w-[420px] bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Checkout Week</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">This will lock the current week and create a new week.</p>
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-3xl font-bold text-gray-900">{weekDetail.completed_count}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Completed</div>
                </div>
                <div className="flex-1 p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-3xl font-bold text-gray-900">{weekDetail.total_count - weekDetail.completed_count}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Incomplete</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 bg-gray-50 border-t border-gray-200">
              <button onClick={() => setShowCheckoutModal(false)} className="flex-1 py-3 text-sm font-medium text-gray-700 dark:text-[#A1A1A1] bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                Cancel
              </button>
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className="flex-1 py-3 text-sm font-semibold text-white rounded-lg"
                style={{ backgroundColor: '#2563eb' }}
              >
                {checkoutMutation.isPending ? 'Processing...' : 'Checkout Week'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[60]">
          <div className="w-[400px] bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Item</h3>
              <p className="text-sm text-gray-600">Are you sure you want to delete this item? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 p-5 bg-gray-50 border-t border-gray-200">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 text-sm font-medium text-gray-700 dark:text-[#A1A1A1] bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2E2E2E] rounded-lg hover:bg-gray-50 dark:hover:bg-[#1A1A1A]">
                Cancel
              </button>
              <button
                onClick={() => deleteItemMutation.mutate(selectedItem.id)}
                disabled={deleteItemMutation.isPending}
                className="flex-1 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                {deleteItemMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
