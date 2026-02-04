import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useT10AISuggestions } from '@/modules/task10/hooks/useT10AISuggestions';
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
  Archive,
  ChevronDown
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
  assignee_avatar: string | null;
  due_date: string | null;
  labels: unknown;
  taskhub_key: string | null;
  is_buffer: boolean | null;
  carryover_count: number | null;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
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
}

interface AISuggestion {
  id: string;
  key: string;
  title: string;
  due_date: string | null;
  priority: 'critical' | 'high';
  assignee_name: string;
  assignee_id: string | null;
  reason: string;
}

interface UserProfile {
  id: string;
  full_name: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAG HANDLE COMPONENT - 6 dots in 2x3 grid
// ═══════════════════════════════════════════════════════════════════════════════

function DragHandle({ listeners, attributes }: { listeners: any; attributes: any }) {
  return (
    <div
      {...attributes}
      {...listeners}
      className="flex flex-col gap-[3px] p-2 cursor-grab active:cursor-grabbing"
      onClick={(e) => e.stopPropagation()}
      style={{ color: '#9ca3af' }}
    >
      <div className="flex gap-[3px]">
        <div style={{ width: 4, height: 4, backgroundColor: 'currentColor', borderRadius: 1 }} />
        <div style={{ width: 4, height: 4, backgroundColor: 'currentColor', borderRadius: 1 }} />
      </div>
      <div className="flex gap-[3px]">
        <div style={{ width: 4, height: 4, backgroundColor: 'currentColor', borderRadius: 1 }} />
        <div style={{ width: 4, height: 4, backgroundColor: 'currentColor', borderRadius: 1 }} />
      </div>
      <div className="flex gap-[3px]">
        <div style={{ width: 4, height: 4, backgroundColor: 'currentColor', borderRadius: 1 }} />
        <div style={{ width: 4, height: 4, backgroundColor: 'currentColor', borderRadius: 1 }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SORTABLE PRIORITY CARD COMPONENT
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

  const isCompleted = item.status === 'done';
  const labels = item.labels && Array.isArray(item.labels) 
    ? (item.labels as Array<{ id: string; name: string; color: string }>) 
    : [];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={onClick}
      className={`
        flex items-center gap-4 px-4 py-5 bg-white border border-gray-200 rounded-2xl cursor-pointer
        hover:border-blue-200 hover:shadow-sm transition-all
        ${isDragging ? 'shadow-lg border-blue-400 z-50' : ''}
      `}
    >
      {/* DRAG HANDLE */}
      <DragHandle listeners={listeners} attributes={attributes} />

      {/* RANK BADGE - Blue rounded square */}
      <div 
        style={{
          width: 48,
          height: 48,
          backgroundColor: '#3b82f6',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>
          {item.rank}
        </span>
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div 
          className="text-[15px] font-medium"
          style={{ 
            color: isCompleted ? '#9ca3af' : '#111827',
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}
        >
          {item.title}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {/* LABELS */}
          {labels.map((label) => (
            <span 
              key={label.id} 
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
              }}
            >
              {label.name}
            </span>
          ))}
          
          {/* ASSIGNEE */}
          {item.assignee_name && (
            <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#6b7280' }}>
              <User style={{ width: 14, height: 14 }} />
              {item.assignee_name}
            </span>
          )}
          
          {/* DUE DATE */}
          {item.due_date && (
            <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#6b7280' }}>
              <Calendar style={{ width: 14, height: 14 }} />
              {format(parseISO(item.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      {/* TASKHUB KEY - Right aligned */}
      {item.taskhub_key && (
        <span 
          style={{
            padding: '4px 10px',
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 600,
            color: '#3b82f6',
            backgroundColor: 'transparent',
          }}
        >
          {item.taskhub_key}
        </span>
      )}

      {/* CHECKBOX */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: isCompleted ? 'none' : '2px solid #d1d5db',
          backgroundColor: isCompleted ? '#3b82f6' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        {isCompleted && <Check style={{ width: 18, height: 18, color: 'white' }} />}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDE PANEL COMPONENT
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

  const labels = item.labels && Array.isArray(item.labels) 
    ? (item.labels as Array<{ id: string; name: string; color: string }>) 
    : [];

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      <div className="fixed top-0 right-0 w-[440px] h-full bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div style={{ 
              width: 40, 
              height: 40, 
              backgroundColor: '#3b82f6',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{item.rank}</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-600 font-mono">T10-003</div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority Item</div>
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
            className={`px-5 py-3 text-sm font-medium relative ${
              activeTab === 'details' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-5 py-3 text-sm font-medium relative ${
              activeTab === 'activity' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Activity
            {activeTab === 'activity' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'details' ? (
            <>
              {/* STATUS */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5" />
                  Status
                </div>
                <button
                  onClick={onToggleComplete}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all ${
                    item.status === 'done' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: item.status === 'done' ? '#3b82f6' : '#ffffff',
                      border: item.status === 'done' ? 'none' : '2px solid #d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.status === 'done' && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">
                    {item.status === 'done' ? 'Completed' : 'Mark as completed'}
                  </span>
                </button>
              </div>

              {/* ASSIGNEE */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <User className="w-3.5 h-3.5" />
                  Assigned To
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className="flex items-center justify-between w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-gray-300"
                  >
                    <span>{item.assignee_name || 'Add assignee'}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  {showAssigneeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-2">
                      <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full px-3 py-2 text-sm border-b border-gray-100 outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onUpdate({ assignee_id: null, assignee_name: null });
                          setShowAssigneeDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
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
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
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
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5" />
                  Due Date
                </div>
                <input
                  type="date"
                  value={item.due_date || ''}
                  onChange={(e) => onUpdate({ due_date: e.target.value || null })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700"
                />
              </div>

              {/* LABELS */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Tag className="w-3.5 h-3.5" />
                  Labels
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {labels.map((label) => (
                    <span 
                      key={label.id}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-sm text-gray-600"
                    >
                      {label.name}
                      <button className="text-gray-400 hover:text-gray-600">×</button>
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
                    className="w-full p-2 text-sm border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setShowLabelInput(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add label
                  </button>
                )}
              </div>

              {/* DESCRIPTION */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <AlignLeft className="w-3.5 h-3.5" />
                  Description
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  placeholder="Add notes or details..."
                  className="w-full p-3 min-h-[120px] bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg">
                  <Check className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-sm text-gray-700">
                    <strong>Vikram Iyer</strong> marked as completed
                  </div>
                  <div className="text-xs text-gray-400">2 hours ago</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg">
                  <Plus className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-sm text-gray-700">
                    <strong>Ibrahim Ahmed</strong> created this item
                  </div>
                  <div className="text-xs text-gray-400">Yesterday at 3:45 PM</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            Created {item.created_at ? format(parseISO(item.created_at), 'MMM d, yyyy') : 'Unknown'}
          </span>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
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
// MAIN PAGE COMPONENT
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

  // ─────────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────────────────────

  const { data: listData } = useQuery({
    queryKey: ['t10-list', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t10_lists')
        .select('id, key, name')
        .eq('id', listId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });

  const { data: weekData } = useQuery({
    queryKey: ['t10-week', weekId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t10_weeks')
        .select('*')
        .eq('id', weekId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!weekId,
  });

  const weekDetail: WeekDetail | undefined = weekData && listData ? {
    week_id: weekData.id,
    list_id: weekData.list_id,
    list_key: listData.key,
    list_name: listData.name,
    week_start: weekData.week_start,
    week_end: weekData.week_end,
    is_current: weekData.is_current ?? true,
    completed_count: weekData.completed_count ?? 0,
    total_count: weekData.total_count ?? 0,
  } : undefined;

  const { data: items = [] } = useQuery({
    queryKey: ['t10-items', weekId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t10_items_full')
        .select('*')
        .eq('week_id', weekId)
        .order('rank');
      if (error) throw error;
      return (data ?? []) as PriorityItem[];
    },
    enabled: !!weekId,
  });

  const { data: aiSuggestionsData } = useT10AISuggestions(listId, weekId, undefined);
  const suggestions: AISuggestion[] = aiSuggestionsData?.suggestions ?? [];

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

  const top10Items = items.filter(i => (i.rank ?? 0) <= 10);
  const bufferItems = items.filter(i => (i.rank ?? 0) > 10);

  // ─────────────────────────────────────────────────────────────────────────────
  // MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const addItemMutation = useMutation({
    mutationFn: async ({ title, taskhubKey }: { title: string; taskhubKey?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const nextRank = items.length + 1;
      
      const { data, error } = await supabase
        .from('t10_items')
        .insert({
          week_id: weekId,
          title,
          taskhub_key: taskhubKey || null,
          rank: nextRank,
          status: 'todo',
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      queryClient.invalidateQueries({ queryKey: ['t10-week'] });
      toast.success('Item added');
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const item = items.find(i => i.id === itemId);
      const newStatus = item?.status === 'done' ? 'todo' : 'done';
      
      const { error } = await supabase
        .from('t10_items')
        .update({ status: newStatus })
        .eq('id', itemId);
      if (error) throw error;
      return newStatus === 'done';
    },
    onSuccess: (isCompleted) => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      queryClient.invalidateQueries({ queryKey: ['t10-week'] });
      toast.success(isCompleted ? 'Completed' : 'Incomplete');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
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
      queryClient.invalidateQueries({ queryKey: ['t10-week'] });
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
      queryClient.invalidateQueries({ queryKey: ['t10-week'] });
      setShowCheckoutModal(false);
      toast.success('Week checked out!');
    },
  });

  const swapBufferMutation = useMutation({
    mutationFn: async ({ bufferItemId, targetRank }: { bufferItemId: string; targetRank: number }) => {
      const top10Item = items.find(i => i.rank === targetRank);
      const bufferItem = items.find(i => i.id === bufferItemId);
      
      if (!top10Item || !bufferItem) throw new Error('Items not found');
      
      await supabase.from('t10_items').update({ rank: bufferItem.rank }).eq('id', top10Item.id);
      await supabase.from('t10_items').update({ rank: targetRank }).eq('id', bufferItemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-items'] });
      toast.success('Swapped');
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

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
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#f8fafc' }}>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════════ */}
      <header 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {/* LEFT - Logo & List Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button 
            onClick={() => navigate('/taskhub/task10')} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <div 
              style={{
                width: 40,
                height: 40,
                backgroundColor: '#3b82f6',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>10</span>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                Task<sup style={{ fontSize: 10, color: '#3b82f6' }}>10</sup>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Priority Management</div>
            </div>
          </button>
          
          <div style={{ width: 1, height: 24, backgroundColor: '#e5e7eb' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span 
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: '#3b82f6',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
              }}
            >
              {weekDetail.list_key}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {weekDetail.list_name}
            </span>
          </div>
        </div>

        {/* CENTER - Week Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button 
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
          >
            <Calendar style={{ width: 16, height: 16, color: '#6b7280' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {formatWeekDate()}
            </span>
            {weekDetail.is_current && (
              <span 
                style={{
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#3b82f6',
                  backgroundColor: '#eff6ff',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                Current
              </span>
            )}
          </div>
          
          <button 
            disabled
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              color: '#d1d5db',
              cursor: 'not-allowed',
            }}
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* RIGHT - Progress & Checkout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              backgroundColor: '#f9fafb',
              borderRadius: 8,
            }}
          >
            <Check style={{ width: 16, height: 16, color: '#3b82f6' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              <span style={{ color: '#3b82f6' }}>{weekDetail.completed_count}</span> of {weekDetail.total_count} completed
            </span>
          </div>
          
          <button
            onClick={() => setShowCheckoutModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            }}
          >
            <Check style={{ width: 16, height: 16 }} />
            Checkout Week
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════════════ */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
        {/* AI SUGGESTIONS PANEL */}
        <div 
          style={{
            marginBottom: 20,
            padding: 20,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div 
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 12,
                }}
              >
                <Zap style={{ width: 20, height: 20, color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>AI Suggestions</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Based on TaskHub items for Ibrahim Ahmed, Vikram Iyer, Maali Abbas
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAISuggestions(!showAISuggestions)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 500,
                color: '#374151',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              {showAISuggestions ? 'Hide' : 'Show'}
              <ChevronDown 
                style={{ 
                  width: 14, 
                  height: 14,
                  transform: showAISuggestions ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }} 
              />
            </button>
          </div>
          
          {showAISuggestions && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Demo suggestions if none from API */}
              {(suggestions.length > 0 ? suggestions : [
                { id: '1', key: 'TH-1042', title: 'Finalize Q1 Marketing Budget', due_date: '2026-02-04', priority: 'critical', assignee_name: 'Vikram Iyer' },
                { id: '2', key: 'TH-1038', title: 'Review Social Media Analytics Report', due_date: '2026-02-05', priority: 'high', assignee_name: 'Maali Abbas' },
                { id: '3', key: 'EPIC-204', title: 'Prepare Partner Presentation Deck', due_date: '2026-02-08', priority: 'high', assignee_name: 'Ibrahim Ahmed' },
              ] as any[]).map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  onClick={() => addItemMutation.mutate({ title: suggestion.title, taskhubKey: suggestion.key })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                    e.currentTarget.style.borderColor = '#bfdbfe';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div 
                    style={{
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#3b82f6',
                      backgroundColor: '#dbeafe',
                      borderRadius: 8,
                    }}
                  >
                    P{index + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                      {suggestion.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      Due {suggestion.due_date ? `in ${Math.ceil((new Date(suggestion.due_date).getTime() - Date.now()) / (1000*60*60*24))} days` : 'No due date'} · {suggestion.assignee_name}
                    </div>
                  </div>
                  <span 
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: '#3b82f6',
                    }}
                  >
                    {suggestion.key}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ADD INPUT */}
        <div style={{ marginBottom: 20 }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: 12,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ padding: '0 16px', color: '#3b82f6' }}>
              <Plus style={{ width: 20, height: 20, strokeWidth: 2.5 }} />
            </div>
            <input
              type="text"
              value={addInputValue}
              onChange={(e) => setAddInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Add list item or paste TaskHub key..."
              style={{
                flex: 1,
                padding: '16px 0',
                fontSize: 14,
                fontWeight: 500,
                color: '#111827',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 16 }}>
              <kbd 
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#374151',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                }}
              >
                Enter
              </kbd>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>to add</span>
            </div>
          </div>
        </div>

        {/* SECTION HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Top 10 Priorities
          </span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {top10Items.length}/10 slots
          </span>
        </div>

        {/* PRIORITY LIST */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={top10Items.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          <div 
            style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: '#f9fafb',
              border: '2px dashed #d1d5db',
              borderRadius: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Archive style={{ width: 16, height: 16, color: '#6b7280' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Buffer Zone
              </span>
              <span 
                style={{
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6b7280',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                }}
              >
                {bufferItems.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bufferItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                  }}
                >
                  <div 
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#6b7280',
                      backgroundColor: '#f3f4f6',
                      border: '1px dashed #d1d5db',
                      borderRadius: 8,
                    }}
                  >
                    {item.rank}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: '#374151' }}>{item.title}</span>
                  <button
                    onClick={() => swapBufferMutation.mutate({ bufferItemId: item.id, targetRank: 10 })}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#3b82f6',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
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
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
          }}
        >
          <div 
            style={{
              width: 420,
              backgroundColor: 'white',
              borderRadius: 16,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Checkout Week</h3>
              <button
                onClick={() => setShowCheckoutModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: '#9ca3af',
                  cursor: 'pointer',
                }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                This will lock the current week and create a new week.
              </p>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{weekDetail.completed_count}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</div>
                </div>
                <div style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{weekDetail.total_count - weekDetail.completed_count}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incomplete</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: 20, backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setShowCheckoutModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                {checkoutMutation.isPending ? 'Processing...' : 'Checkout Week'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedItem && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 60,
          }}
        >
          <div 
            style={{
              width: 400,
              backgroundColor: 'white',
              borderRadius: 16,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div 
                style={{
                  width: 48,
                  height: 48,
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fee2e2',
                  borderRadius: '50%',
                }}
              >
                <Trash2 style={{ width: 24, height: 24, color: '#dc2626' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Delete Item</h3>
              <p style={{ fontSize: 14, color: '#6b7280' }}>
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: 20, backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteItemMutation.mutate(selectedItem.id)}
                disabled={deleteItemMutation.isPending}
                style={{
                  flex: 1,
                  padding: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
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
