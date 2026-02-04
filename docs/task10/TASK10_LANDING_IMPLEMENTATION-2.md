# TASK¹⁰ LANDING PAGE — COMPLETE IMPLEMENTATION

## CRITICAL ISSUES TO FLAG UPFRONT

Before implementing, verify these database requirements exist:

### Required Tables (Check if exists)
```sql
-- Run this to verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('t10_lists', 't10_weeks', 't10_priority_items');
```

### If Tables Don't Exist, Create Them:
```sql
-- T10 Lists table
CREATE TABLE IF NOT EXISTS t10_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- T10-001, T10-002, etc.
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID
);

-- T10 Weeks table
CREATE TABLE IF NOT EXISTS t10_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES t10_lists(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Sunday
  week_end DATE NOT NULL,   -- Thursday
  is_current BOOLEAN DEFAULT false,
  is_checked_out BOOLEAN DEFAULT false,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- T10 Priority Items table
CREATE TABLE IF NOT EXISTS t10_priority_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES t10_weeks(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10),
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  taskhub_key TEXT, -- Optional link to TaskHub
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_id, rank)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_t10_weeks_list_id ON t10_weeks(list_id);
CREATE INDEX IF NOT EXISTS idx_t10_weeks_current ON t10_weeks(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_t10_priority_items_week_id ON t10_priority_items(week_id);
```

### Required Views:
```sql
-- Landing page view: Lists with current week stats
CREATE OR REPLACE VIEW t10_lists_with_stats AS
SELECT 
  l.id,
  l.key,
  l.name,
  l.status,
  l.created_at,
  l.created_by,
  -- Current week info
  cw.id as current_week_id,
  cw.week_start as current_week_start,
  cw.week_end as current_week_end,
  -- Current week progress
  COALESCE(
    (SELECT COUNT(*) FROM t10_priority_items WHERE week_id = cw.id),
    0
  ) as total_items,
  COALESCE(
    (SELECT COUNT(*) FROM t10_priority_items WHERE week_id = cw.id AND is_completed = true),
    0
  ) as completed_items,
  -- Past weeks count
  (SELECT COUNT(*) FROM t10_weeks WHERE list_id = l.id AND is_current = false) as past_weeks_count
FROM t10_lists l
LEFT JOIN t10_weeks cw ON cw.list_id = l.id AND cw.is_current = true;

-- Completed weeks view (for Completed tab)
CREATE OR REPLACE VIEW t10_completed_weeks AS
SELECT 
  w.id as week_id,
  w.list_id,
  l.key as list_key,
  l.name as list_name,
  w.week_start,
  w.week_end,
  w.checked_out_at,
  COUNT(p.id) as total_items,
  COUNT(p.id) FILTER (WHERE p.is_completed = true) as completed_items,
  ROUND(
    (COUNT(p.id) FILTER (WHERE p.is_completed = true)::numeric / NULLIF(COUNT(p.id), 0)) * 100
  ) as completion_rate
FROM t10_weeks w
JOIN t10_lists l ON l.id = w.list_id
LEFT JOIN t10_priority_items p ON p.week_id = w.id
WHERE w.is_checked_out = true
GROUP BY w.id, w.list_id, l.key, l.name, w.week_start, w.week_end, w.checked_out_at
ORDER BY w.week_end DESC;

-- Archived lists with incomplete count
CREATE OR REPLACE VIEW t10_archived_lists AS
SELECT 
  l.id,
  l.key,
  l.name,
  l.updated_at as archived_at,
  (SELECT COUNT(*) FROM t10_weeks WHERE list_id = l.id) as total_weeks,
  (
    SELECT COUNT(*) 
    FROM t10_priority_items p 
    JOIN t10_weeks w ON w.id = p.week_id 
    WHERE w.list_id = l.id AND p.is_completed = false
  ) as incomplete_count
FROM t10_lists l
WHERE l.status = 'archived';
```

---

## FILE STRUCTURE

```
src/
├── pages/
│   └── Task10Landing.tsx          # Main landing page
├── components/
│   └── task10/
│       ├── T10Header.tsx          # Header with logo + New List button
│       ├── T10SearchBar.tsx       # Search component
│       ├── T10FilterBar.tsx       # Filter buttons
│       ├── T10Tabs.tsx            # Tab navigation
│       ├── T10ListCard.tsx        # Individual list card
│       ├── T10CompletedCard.tsx   # Completed week card
│       ├── T10ArchivedCard.tsx    # Archived list card
│       ├── T10CompletedDetail.tsx # Modal showing completed items
│       └── T10PastWeeksList.tsx   # Collapsible past weeks
├── hooks/
│   └── task10/
│       ├── useT10Lists.ts         # Fetch lists with stats
│       ├── useT10CompletedWeeks.ts # Fetch completed weeks
│       ├── useT10ArchivedLists.ts  # Fetch archived lists
│       ├── useT10WeekItems.ts     # Fetch items for a week
│       └── useT10Mutations.ts     # Create, archive, delete
└── types/
    └── task10.ts                  # TypeScript interfaces
```

---

## TYPES (src/types/task10.ts)

```typescript
export interface T10List {
  id: string;
  key: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  created_by: string | null;
  // From view
  current_week_id: string | null;
  current_week_start: string | null;
  current_week_end: string | null;
  total_items: number;
  completed_items: number;
  past_weeks_count: number;
}

export interface T10Week {
  id: string;
  list_id: string;
  week_start: string;
  week_end: string;
  is_current: boolean;
  is_checked_out: boolean;
  checked_out_at: string | null;
}

export interface T10PriorityItem {
  id: string;
  week_id: string;
  rank: number;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  taskhub_key: string | null;
}

export interface T10CompletedWeek {
  week_id: string;
  list_id: string;
  list_key: string;
  list_name: string;
  week_start: string;
  week_end: string;
  checked_out_at: string;
  total_items: number;
  completed_items: number;
  completion_rate: number;
}

export interface T10ArchivedList {
  id: string;
  key: string;
  name: string;
  archived_at: string;
  total_weeks: number;
  incomplete_count: number;
}
```

---

## HOOKS

### useT10Lists.ts
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10List } from '@/types/task10';

export function useT10Lists() {
  return useQuery({
    queryKey: ['t10-lists'],
    queryFn: async (): Promise<T10List[]> => {
      const { data, error } = await supabase
        .from('t10_lists_with_stats')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
}
```

### useT10CompletedWeeks.ts
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10CompletedWeek } from '@/types/task10';

export function useT10CompletedWeeks() {
  return useQuery({
    queryKey: ['t10-completed-weeks'],
    queryFn: async (): Promise<T10CompletedWeek[]> => {
      const { data, error } = await supabase
        .from('t10_completed_weeks')
        .select('*')
        .order('week_end', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
}
```

### useT10ArchivedLists.ts
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10ArchivedList } from '@/types/task10';

export function useT10ArchivedLists() {
  return useQuery({
    queryKey: ['t10-archived-lists'],
    queryFn: async (): Promise<T10ArchivedList[]> => {
      const { data, error } = await supabase
        .from('t10_archived_lists')
        .select('*')
        .order('archived_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
}
```

### useT10WeekItems.ts (For completed detail modal)
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { T10PriorityItem } from '@/types/task10';

export function useT10WeekItems(weekId: string | null) {
  return useQuery({
    queryKey: ['t10-week-items', weekId],
    queryFn: async (): Promise<T10PriorityItem[]> => {
      if (!weekId) return [];
      
      const { data, error } = await supabase
        .from('t10_priority_items')
        .select('*')
        .eq('week_id', weekId)
        .order('rank', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!weekId
  });
}
```

### useT10Mutations.ts
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useT10Mutations() {
  const queryClient = useQueryClient();

  const createList = useMutation({
    mutationFn: async (name: string) => {
      // Generate next key
      const { data: lists } = await supabase
        .from('t10_lists')
        .select('key')
        .order('key', { ascending: false })
        .limit(1);
      
      const lastNum = lists?.[0] 
        ? parseInt(lists[0].key.replace('T10-', '')) 
        : 0;
      const newKey = `T10-${String(lastNum + 1).padStart(3, '0')}`;
      
      const { data, error } = await supabase
        .from('t10_lists')
        .insert({ key: newKey, name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
      toast.success('List created');
    },
    onError: (error) => {
      toast.error('Failed to create list: ' + error.message);
    }
  });

  const archiveList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('t10_lists')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', listId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
      queryClient.invalidateQueries({ queryKey: ['t10-archived-lists'] });
      toast.success('List archived');
    }
  });

  const restoreList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('t10_lists')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', listId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
      queryClient.invalidateQueries({ queryKey: ['t10-archived-lists'] });
      toast.success('List restored');
    }
  });

  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('t10_lists')
        .delete()
        .eq('id', listId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
      toast.success('List deleted');
    }
  });

  const startWeek = useMutation({
    mutationFn: async (listId: string) => {
      // Calculate current week (Sunday to Thursday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - dayOfWeek);
      const thursday = new Date(sunday);
      thursday.setDate(sunday.getDate() + 4);
      
      // Mark any existing current week as not current
      await supabase
        .from('t10_weeks')
        .update({ is_current: false })
        .eq('list_id', listId)
        .eq('is_current', true);
      
      // Create new week
      const { data, error } = await supabase
        .from('t10_weeks')
        .insert({
          list_id: listId,
          week_start: sunday.toISOString().split('T')[0],
          week_end: thursday.toISOString().split('T')[0],
          is_current: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['t10-lists'] });
      toast.success('Week started');
    }
  });

  return { createList, archiveList, restoreList, deleteList, startWeek };
}
```

---

## COMPONENTS

### T10Header.tsx
```typescript
import { Plus } from 'lucide-react';

interface T10HeaderProps {
  onNewList: () => void;
}

export function T10Header({ onNewList }: T10HeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200">
      <a href="/task10" className="flex items-center gap-2.5 no-underline">
        <span className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-lg text-sm font-extrabold">
          10
        </span>
        <span className="flex flex-col">
          <span className="text-base font-bold text-slate-900">
            Task<sup className="text-xs text-blue-600">10</sup>
          </span>
          <span className="text-[11px] text-slate-400">Priority Management</span>
        </span>
      </a>
      <button
        onClick={onNewList}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
        New List
      </button>
    </header>
  );
}
```

### T10SearchBar.tsx
```typescript
import { Search } from 'lucide-react';

interface T10SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function T10SearchBar({ value, onChange }: T10SearchBarProps) {
  return (
    <div className="relative max-w-[600px] mx-auto mb-3">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" strokeWidth={2} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search lists, task number, or keyword..."
        className="w-full py-3 pl-[42px] pr-4 text-sm text-slate-900 bg-white border border-slate-200 rounded-[10px] outline-none transition-all placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/10"
      />
    </div>
  );
}
```

### T10Tabs.tsx
```typescript
import { cn } from '@/lib/utils';

type TabId = 'this-week' | 'completed' | 'archived';

interface T10TabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  archivedCount: number;
}

export function T10Tabs({ activeTab, onTabChange, archivedCount }: T10TabsProps) {
  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'this-week', label: 'This Week' },
    { id: 'completed', label: 'Completed' },
    { id: 'archived', label: 'Archived', badge: archivedCount },
  ];

  return (
    <div className="flex gap-1 mb-4 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative px-4 py-2.5 text-[13px] font-medium text-slate-500 bg-transparent border-none cursor-pointer transition-colors hover:text-slate-900",
            activeTab === tab.id && "text-slate-900 font-semibold"
          )}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[11px] font-semibold bg-red-100 text-red-500 rounded">
              {tab.badge}
            </span>
          )}
          {activeTab === tab.id && (
            <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
      ))}
    </div>
  );
}
```

### T10ListCard.tsx
```typescript
import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { T10List } from '@/types/task10';
import { T10PastWeeksList } from './T10PastWeeksList';

interface T10ListCardProps {
  list: T10List;
  onNavigate: (listKey: string) => void;
  onStartWeek: (listId: string) => void;
  onRename: (listId: string) => void;
  onDelete: (listId: string) => void;
}

export function T10ListCard({ list, onNavigate, onStartWeek, onRename, onDelete }: T10ListCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPastWeeks, setShowPastWeeks] = useState(false);

  const hasCurrentWeek = !!list.current_week_id;
  const progressPercent = list.total_items > 0 
    ? (list.completed_items / list.total_items) * 100 
    : 0;
  const slotsAvailable = 10 - list.total_items;

  const formatWeekDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[10px] mb-2.5 overflow-hidden transition-all hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div 
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => hasCurrentWeek && onNavigate(list.key)}
      >
        <span className="px-2.5 py-1 font-mono text-xs font-semibold text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-md">
          {list.key}
        </span>
        <span className="flex-1 text-[15px] font-semibold text-slate-900">{list.name}</span>
        <span className="text-xs text-slate-400">
          Created · {new Date(list.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-green-700 bg-green-100 rounded-full uppercase tracking-wide">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Active
        </span>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-md text-slate-400 cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 transition-all [.group:hover_&]:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 w-36 p-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              <button
                onClick={(e) => { e.stopPropagation(); onRename(list.id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-[13px] text-slate-600 bg-transparent border-none rounded-md cursor-pointer hover:bg-slate-100"
              >
                <Pencil className="w-3.5 h-3.5" /> Rename
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(list.id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-[13px] text-red-500 bg-transparent border-none rounded-md cursor-pointer hover:bg-slate-100"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Week Content */}
      <div className="px-4 pb-3">
        {hasCurrentWeek ? (
          <div 
            className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => onNavigate(list.key)}
          >
            <span className="text-[13px] text-slate-600">
              Week of <strong className="text-slate-900 font-semibold">{formatWeekDate(list.current_week_start)}</strong>
            </span>
            <div className="flex-1 flex items-center gap-2.5">
              <div className="flex-1 h-1.5 bg-slate-200 rounded-sm overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-sm transition-all",
                    progressPercent === 100 
                      ? "bg-gradient-to-r from-green-500 to-green-400" 
                      : "bg-gradient-to-r from-blue-600 to-blue-500"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <span className="text-[13px] text-slate-600">
              <strong className="text-blue-600 font-semibold">{list.completed_items}</strong> of {list.total_items} completed
            </span>
            {slotsAvailable > 0 && list.total_items > 0 && (
              <span className="text-xs text-teal-600 font-medium">{slotsAvailable} slots available</span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
            <span className="text-[13px] text-slate-400">No active week</span>
            <button
              onClick={(e) => { e.stopPropagation(); onStartWeek(list.id); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 border-none rounded-md cursor-pointer hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3 h-3" strokeWidth={2.5} />
              Start this week
            </button>
          </div>
        )}

        {/* Past Weeks Toggle */}
        {list.past_weeks_count > 0 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setShowPastWeeks(!showPastWeeks); }}
              className={cn(
                "flex items-center gap-1.5 py-2 text-xs font-medium text-slate-500 bg-transparent border-none cursor-pointer hover:text-slate-700 transition-colors",
                showPastWeeks && "[&_svg]:rotate-180"
              )}
            >
              <ChevronDown className="w-3 h-3 transition-transform" />
              Past Weeks
              <span className="px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded">
                {list.past_weeks_count}
              </span>
            </button>
            {showPastWeeks && (
              <T10PastWeeksList listId={list.id} onWeekClick={(weekId) => console.log('Navigate to week:', weekId)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

### T10PastWeeksList.tsx
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface T10PastWeeksListProps {
  listId: string;
  onWeekClick: (weekId: string) => void;
}

export function T10PastWeeksList({ listId, onWeekClick }: T10PastWeeksListProps) {
  const { data: weeks = [] } = useQuery({
    queryKey: ['t10-past-weeks', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('t10_weeks')
        .select(`
          id,
          week_start,
          week_end,
          t10_priority_items (
            id,
            is_completed
          )
        `)
        .eq('list_id', listId)
        .eq('is_current', false)
        .order('week_start', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(w => ({
        id: w.id,
        week_start: w.week_start,
        week_end: w.week_end,
        total: w.t10_priority_items?.length || 0,
        completed: w.t10_priority_items?.filter(i => i.is_completed).length || 0
      })) || [];
    }
  });

  const formatDate = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="pl-4 ml-1.5 border-l-2 border-blue-600 mt-1">
      {weeks.map((week) => (
        <div
          key={week.id}
          onClick={() => onWeekClick(week.id)}
          className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-600 rounded-md cursor-pointer hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span className={cn(
            "w-2 h-2 rounded-full",
            week.completed === week.total && week.total > 0 ? "bg-green-500" : "bg-slate-300"
          )} />
          <span className="font-medium">{formatDate(week.week_start, week.week_end)}</span>
          <span className="ml-auto text-slate-400">{week.completed}/{week.total} completed</span>
        </div>
      ))}
    </div>
  );
}
```

### T10CompletedCard.tsx
```typescript
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { T10CompletedWeek } from '@/types/task10';

interface T10CompletedCardProps {
  week: T10CompletedWeek;
  onClick: () => void;
}

export function T10CompletedCard({ week, onClick }: T10CompletedCardProps) {
  const formatDate = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-[10px] mb-2 cursor-pointer transition-all hover:border-slate-300"
    >
      <div className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-500 rounded-lg">
        <Check className="w-[18px] h-[18px]" strokeWidth={2.5} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-900 mb-0.5">{week.list_name}</div>
        <div className="text-xs text-slate-400">{week.list_key} · {formatDate(week.week_start, week.week_end)}</div>
      </div>
      <div className="text-right">
        <div className={cn(
          "text-sm font-bold",
          week.completion_rate === 100 ? "text-green-600" : "text-blue-600"
        )}>
          {week.completion_rate}%
        </div>
        <div className="text-[11px] text-slate-400">{week.completed_items}/{week.total_items} done</div>
      </div>
    </div>
  );
}
```

### T10CompletedDetail.tsx (Modal showing completed items)
```typescript
import { X, Check, Circle } from 'lucide-react';
import { useT10WeekItems } from '@/hooks/task10/useT10WeekItems';
import type { T10CompletedWeek } from '@/types/task10';
import { cn } from '@/lib/utils';

interface T10CompletedDetailProps {
  week: T10CompletedWeek;
  onClose: () => void;
}

export function T10CompletedDetail({ week, onClose }: T10CompletedDetailProps) {
  const { data: items = [], isLoading } = useT10WeekItems(week.week_id);

  const formatDate = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <div className="text-base font-semibold text-slate-900">{week.list_name}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {week.list_key} · {formatDate(week.week_start, week.week_end)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold",
              week.completion_rate === 100 ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
            )}>
              {week.completion_rate}%
            </div>
            <div>
              <div className="text-xs text-slate-400">Completion Rate</div>
              <div className="text-sm font-semibold text-slate-900">
                {week.completed_items} of {week.total_items} done
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-slate-400">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400">No items in this week</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full mt-0.5 flex-shrink-0",
                    item.is_completed 
                      ? "bg-green-500 text-white" 
                      : "border-2 border-slate-300 text-slate-300"
                  )}>
                    {item.is_completed ? (
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-md",
                        item.rank <= 3 ? "bg-blue-100 text-blue-600" :
                        item.rank <= 6 ? "bg-green-100 text-green-600" :
                        "bg-orange-100 text-orange-600"
                      )}>
                        {item.rank}
                      </span>
                      <span className={cn(
                        "text-sm font-medium",
                        item.is_completed ? "text-slate-900" : "text-slate-500"
                      )}>
                        {item.title}
                      </span>
                    </div>
                    {item.description && (
                      <div className="text-xs text-slate-400 mt-1 ml-8">{item.description}</div>
                    )}
                    {item.taskhub_key && (
                      <div className="mt-1 ml-8">
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-blue-600 bg-blue-50 rounded">
                          {item.taskhub_key}
                        </span>
                      </div>
                    )}
                  </div>
                  {item.completed_at && (
                    <div className="text-[10px] text-slate-400">
                      {new Date(item.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

### T10ArchivedCard.tsx
```typescript
import { Archive } from 'lucide-react';
import type { T10ArchivedList } from '@/types/task10';

interface T10ArchivedCardProps {
  list: T10ArchivedList;
  onRestore: (listId: string) => void;
}

export function T10ArchivedCard({ list, onRestore }: T10ArchivedCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-[10px] mb-2 opacity-75 transition-all hover:opacity-100 hover:border-slate-300">
      <div className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-500 rounded-lg">
        <Archive className="w-[18px] h-[18px]" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-900 mb-0.5">{list.name}</div>
        <div className="text-xs text-slate-400">
          {list.key} · Last active: {new Date(list.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {list.total_weeks} weeks
        </div>
      </div>
      {list.incomplete_count > 0 && (
        <span className="px-2 py-1 text-[11px] font-semibold text-red-500 bg-red-100 rounded">
          {list.incomplete_count} incomplete
        </span>
      )}
      <button
        onClick={() => onRestore(list.id)}
        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border-none rounded-md cursor-pointer hover:bg-blue-100 transition-colors"
      >
        Restore
      </button>
    </div>
  );
}
```

---

## MAIN PAGE (src/pages/Task10Landing.tsx)

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T10Header } from '@/components/task10/T10Header';
import { T10SearchBar } from '@/components/task10/T10SearchBar';
import { T10Tabs } from '@/components/task10/T10Tabs';
import { T10ListCard } from '@/components/task10/T10ListCard';
import { T10CompletedCard } from '@/components/task10/T10CompletedCard';
import { T10CompletedDetail } from '@/components/task10/T10CompletedDetail';
import { T10ArchivedCard } from '@/components/task10/T10ArchivedCard';
import { useT10Lists } from '@/hooks/task10/useT10Lists';
import { useT10CompletedWeeks } from '@/hooks/task10/useT10CompletedWeeks';
import { useT10ArchivedLists } from '@/hooks/task10/useT10ArchivedLists';
import { useT10Mutations } from '@/hooks/task10/useT10Mutations';
import type { T10CompletedWeek } from '@/types/task10';

type TabId = 'this-week' | 'completed' | 'archived';

export default function Task10Landing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('this-week');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompletedWeek, setSelectedCompletedWeek] = useState<T10CompletedWeek | null>(null);

  const { data: lists = [], isLoading: listsLoading } = useT10Lists();
  const { data: completedWeeks = [] } = useT10CompletedWeeks();
  const { data: archivedLists = [] } = useT10ArchivedLists();
  const { createList, startWeek, archiveList, restoreList, deleteList } = useT10Mutations();

  // Filter lists by search
  const filteredLists = lists.filter(list => 
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewList = () => {
    const name = prompt('Enter list name:');
    if (name?.trim()) {
      createList.mutate(name.trim());
    }
  };

  const handleNavigate = (listKey: string) => {
    navigate(`/task10/${listKey}`);
  };

  const handleRename = (listId: string) => {
    const newName = prompt('Enter new name:');
    if (newName?.trim()) {
      // Add rename mutation
      console.log('Rename:', listId, newName);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <T10Header onNewList={handleNewList} />
      
      <main className="max-w-[900px] mx-auto px-5 py-4">
        <T10SearchBar value={searchQuery} onChange={setSearchQuery} />
        
        {/* Filters would go here */}
        
        <T10Tabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          archivedCount={archivedLists.length}
        />

        {/* This Week Tab */}
        {activeTab === 'this-week' && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Your Lists</span>
              <span className="text-xs text-slate-400">{filteredLists.length} lists</span>
            </div>
            
            {listsLoading ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : filteredLists.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {searchQuery ? 'No lists match your search' : 'No lists yet. Create one to get started.'}
              </div>
            ) : (
              filteredLists.map(list => (
                <T10ListCard
                  key={list.id}
                  list={list}
                  onNavigate={handleNavigate}
                  onStartWeek={(listId) => startWeek.mutate(listId)}
                  onRename={handleRename}
                  onDelete={(listId) => deleteList.mutate(listId)}
                />
              ))
            )}
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === 'completed' && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Completed Weeks</span>
              <span className="text-xs text-slate-400">{completedWeeks.length} weeks</span>
            </div>
            
            {completedWeeks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No completed weeks yet</div>
            ) : (
              completedWeeks.map(week => (
                <T10CompletedCard
                  key={week.week_id}
                  week={week}
                  onClick={() => setSelectedCompletedWeek(week)}
                />
              ))
            )}
          </div>
        )}

        {/* Archived Tab */}
        {activeTab === 'archived' && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Archived Lists</span>
              <span className="text-xs text-slate-400">{archivedLists.length} lists</span>
            </div>
            
            {archivedLists.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No archived lists</div>
            ) : (
              archivedLists.map(list => (
                <T10ArchivedCard
                  key={list.id}
                  list={list}
                  onRestore={(listId) => restoreList.mutate(listId)}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Completed Detail Modal */}
      {selectedCompletedWeek && (
        <T10CompletedDetail
          week={selectedCompletedWeek}
          onClose={() => setSelectedCompletedWeek(null)}
        />
      )}
    </div>
  );
}
```

---

## ROUTE SETUP (Add to App.tsx)

```typescript
import Task10Landing from '@/pages/Task10Landing';

// Add to routes
<Route path="/task10" element={<Task10Landing />} />
```

---

## AUTO-ARCHIVE RULE

Run this as a scheduled function or database trigger:

```sql
-- Function to auto-archive incomplete weeks
CREATE OR REPLACE FUNCTION auto_archive_incomplete_weeks()
RETURNS void AS $$
BEGIN
  -- Find weeks that ended (Thursday) but weren't checked out
  -- and have incomplete items - archive the parent list
  UPDATE t10_lists
  SET status = 'archived', updated_at = now()
  WHERE id IN (
    SELECT DISTINCT w.list_id
    FROM t10_weeks w
    JOIN t10_priority_items p ON p.week_id = w.id
    WHERE w.week_end < CURRENT_DATE - INTERVAL '1 day'
      AND w.is_checked_out = false
      AND p.is_completed = false
  );
END;
$$ LANGUAGE plpgsql;

-- Run daily or on demand
SELECT auto_archive_incomplete_weeks();
```

---

## VERIFICATION CHECKLIST

| Item | Status |
|------|--------|
| Database tables exist | ☐ |
| Views created | ☐ |
| Types file created | ☐ |
| All hooks created | ☐ |
| All components created | ☐ |
| Main page created | ☐ |
| Route added | ☐ |
| Search works | ☐ |
| Tabs switch correctly | ☐ |
| Lists display with stats | ☐ |
| Start week works | ☐ |
| Past weeks expand | ☐ |
| Completed tab shows weeks | ☐ |
| Click completed opens detail | ☐ |
| Detail shows all items with checkmarks | ☐ |
| Archived tab shows lists | ☐ |
| Archived shows incomplete count | ☐ |
| Restore works | ☐ |
