/**
 * =====================================================
 * CATALYST THEME DRAWER
 * =====================================================
 * 
 * Enterprise-grade Theme details drawer with auto-save,
 * KPI band, tabs layout, and enhanced link pickers.
 * Follows Catalyst V5 design system.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trash2, Copy, X, Pencil, Link as LinkIcon, 
  MoreVertical, Plus, ChevronRight,
  Target, Layers, Clock, FileText, History, BarChart3,
  AlertTriangle, Search, ArrowUpDown, Eye, ChevronDown,
  TrendingUp, HelpCircle, Sparkles, CheckCircle2
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip } from '@/components/ads';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { LinkObjectivePicker } from './pickers/LinkObjectivePicker';
import { LinkEpicPicker } from './pickers/LinkEpicPicker';
import { ThemeStatusDropdown } from './ThemeStatusDropdown';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

interface Theme {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  portfolio_ask_date?: string | null;
  color_tag?: string | null;
  owner_id?: string | null;
  snapshot_id?: string | null;
  created_at: string;
  updated_at?: string;
}

interface CatalystThemeDrawerProps {
  theme: Theme | null;
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatThemeKey(id: string): string {
  return `TH-${id.slice(0, 4).toUpperCase()}`;
}

function normalizeProgress(value: number | null | undefined): { percent: number; overflow: boolean } {
  if (value === null || value === undefined) {
    return { percent: 0, overflow: false };
  }
  const rawPercent = value <= 1 ? Math.round(value * 100) : Math.round(value);
  const overflow = rawPercent > 100;
  const percent = Math.max(0, Math.min(100, rawPercent));
  return { percent, overflow };
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  proposed: {
    label: 'Draft',
    bg: 'var(--bg-2)',
    text: 'var(--fg-3)',
    border: 'var(--divider)',
    icon: FileText,
  },
  draft: {
    label: 'Draft',
    bg: 'var(--bg-2)',
    text: 'var(--fg-3)',
    border: 'var(--divider)',
    icon: FileText,
  },
  active: {
    label: 'Active',
    bg: 'rgba(59,130,246,0.12)',
    text: 'var(--cp-blue)',
    border: 'rgba(59,130,246,0.3)',
    icon: Sparkles,
  },
  approved: {
    label: 'Approved',
    bg: 'rgba(38,166,154,0.12)',
    text: 'var(--sem-success)',
    border: 'rgba(38,166,154,0.3)',
    icon: CheckCircle2,
  },
  on_hold: {
    label: 'On Hold',
    bg: 'rgba(245,158,11,0.12)',
    text: 'var(--sem-warning)',
    border: 'rgba(245,158,11,0.3)',
    icon: Clock,
  },
  done: {
    label: 'Retired',
    bg: 'var(--bg-2)',
    text: 'var(--fg-3)',
    border: 'var(--divider)',
    icon: FileText,
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'rgba(239,68,68,0.12)',
    text: 'var(--sem-danger)',
    border: 'rgba(239,68,68,0.3)',
    icon: AlertTriangle,
  },
};

// Epic states for breakdown
const EPIC_STATES: Record<string, { label: string; color: string }> = {
  funnel: { label: 'Funnel', color: 'var(--fg-3)' },
  candidate: { label: 'Candidate', color: '#3B82F6' },
  analysis: { label: 'Analysis', color: '#F59E0B' },
  backlog: { label: 'Backlog', color: 'var(--cp-blue)' },
  implementing: { label: 'Implementing', color: 'var(--sem-success)' },
  done: { label: 'Done', color: 'var(--fg-3)' },
};

// =============================================================================
// PREMIUM PROGRESS BAR
// =============================================================================

function PremiumProgressBar({ progress }: { progress: number }) {
  const getProgressColor = () => {
    if (progress === 0) return {
      fill: 'var(--bg-2)',
      glow: 'none',
      text: 'var(--fg-3)'
    };
    if (progress === 100) return {
      fill: 'linear-gradient(90deg, var(--sem-success) 0%, #2EB8A6 100%)',
      glow: '0 0 20px color-mix(in srgb, var(--sem-success) 40%, transparent), 0 0 40px color-mix(in srgb, var(--sem-success) 20%, transparent)',
      text: 'var(--sem-success)'
    };
    return {
      fill: 'linear-gradient(90deg, var(--cp-blue) 0%, #5B9BF7 100%)',
      glow: '0 0 16px color-mix(in srgb, var(--cp-blue) 30%, transparent)',
      text: 'var(--cp-blue)'
    };
  };

  const colors = getProgressColor();

  return (
    <div 
      className="px-6 py-5"
      style={{ 
        background: 'linear-gradient(180deg, var(--bg-app) 0%, color-mix(in srgb, var(--bg-2) 30%, transparent) 100%)',
        borderBottom: '1px solid var(--divider)'
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-lg"
            style={{ background: 'color-mix(in srgb, var(--cp-blue) 10%, transparent)' }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--cp-blue)' }} />
          </div>
          <span 
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--fg-1)' }}
          >
            Overall Progress
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span 
            className="text-2xl font-bold tabular-nums tracking-tight"
            style={{ color: colors.text }}
          >
            {progress}%
          </span>
          <button
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            style={{ color: 'var(--fg-3)' }}
            title="How is progress calculated?"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Progress Track */}
      <div 
        className="relative h-3 w-full rounded-full overflow-hidden"
        style={{ 
          background: 'var(--bg-2)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {/* Animated Background Pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, #1F1F1F 10px, #1F1F1F 20px)'
          }}
        />
        
        {/* Progress Fill */}
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `${Math.max(progress, 0)}%`,
            background: colors.fill,
            boxShadow: colors.glow
          }}
        >
          {/* Shine Effect */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
            }}
          />
        </div>
        
        {/* Milestone Markers */}
        {[25, 50, 75].map((marker) => (
          <div
            key={marker}
            className="absolute top-0 bottom-0 w-px"
            style={{ 
              left: `${marker}%`,
              background: 'var(--divider)',
              opacity: 0.5
            }}
          />
        ))}
      </div>
      
      {/* Progress Labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] font-medium" style={{ color: 'var(--fg-3)' }}>0%</span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--fg-3)' }}>50%</span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--fg-3)' }}>100%</span>
      </div>
    </div>
  );
}

// =============================================================================
// KPI CARD
// =============================================================================

function KPICard({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  overflow,
  variant = 'default',
  onClick 
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  overflow?: boolean;
  variant?: 'default' | 'warning' | 'success' | 'info';
  onClick?: () => void;
}) {
  const variantStyles = {
    default: {
      iconBg: '#EBEBEB',
      iconColor: '#737373',
      valueColor: 'var(--fg-1)',
    },
    warning: {
      iconBg: 'rgba(245,158,11,0.15)',
      iconColor: '#D97706',
      valueColor: '#D97706',
    },
    success: {
      iconBg: 'rgba(38,166,154,0.15)',
      iconColor: '#26A69A',
      valueColor: '#26A69A',
    },
    info: {
      iconBg: 'rgba(59,130,246,0.15)',
      iconColor: '#2563EB',
      valueColor: '#2563EB',
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative p-5 rounded-2xl border text-left w-full",
        "transition-all duration-200 ease-out",
        "hover:shadow-md",
        "hover:-translate-y-0.5",
        "active:translate-y-0",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      )}
      style={{ 
        background: 'var(--bg-app)',
        borderColor: 'var(--divider)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)'
      }}
    >
      {/* Gradient overlay on hover */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--cp-blue) 3%, transparent) 0%, transparent 50%)'
        }}
      />
      
      <div className="relative">
        {/* Icon + Label */}
        <div className="flex items-center gap-2.5 mb-3">
          <div 
            className="p-2 rounded-xl transition-transform duration-200 group-hover:scale-110"
            style={{ background: styles.iconBg }}
          >
            <Icon className="h-4 w-4" style={{ color: styles.iconColor }} />
          </div>
          <span 
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--fg-3)' }}
          >
            {label}
          </span>
          {overflow && (
            <Tooltip content={<p className="text-xs">Rollup exceeds 100%</p>}>
              <AlertTriangle size={12} style={{ color: '#F59E0B' }} />
            </Tooltip>
          )}
        </div>
        
        {/* Value */}
        <div 
          className="text-[32px] font-bold tabular-nums tracking-tight leading-none"
          style={{ color: styles.valueColor }}
        >
          {value}
        </div>
        
        {/* Subtext */}
        {subtext && (
          <p 
            className="text-xs mt-2 leading-relaxed"
            style={{ color: 'var(--fg-3)' }}
          >
            {subtext}
          </p>
        )}
      </div>
      
      {/* Hover indicator */}
      <div 
        className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: 'var(--cp-blue)' }}
      />
    </button>
  );
}

// =============================================================================
// SECTION CARD (Collapsible)
// =============================================================================

function SectionCard({ 
  icon: Icon,
  title,
  action,
  children,
  defaultOpen = true,
  badge
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div 
      className="rounded-2xl border overflow-hidden"
      style={{ 
        background: 'var(--bg-app)',
        borderColor: 'var(--divider)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)'
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--cp-blue) 10%, transparent)' }}
          >
            <Icon className="h-4 w-4" style={{ color: 'var(--cp-blue)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--fg-1)' }}>
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span 
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center"
              style={{ 
                background: 'var(--bg-2)',
                color: 'var(--fg-3)'
              }}
            >
              {badge}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          <ChevronRight 
            className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-90")}
            style={{ color: 'var(--fg-3)' }}
          />
        </div>
      </button>
      
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div style={{ borderTop: '1px solid color-mix(in srgb, var(--divider) 50%, transparent)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel,
  onAction 
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      {/* Icon with ping */}
      <div className="relative mb-5">
        <div 
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ 
            background: 'var(--cp-blue)',
            animationDuration: '3s'
          }}
        />
        <div 
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{ 
            background: 'linear-gradient(135deg, var(--bg-2) 0%, color-mix(in srgb, var(--bg-2) 50%, transparent) 100%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <Icon className="h-7 w-7" style={{ color: 'var(--fg-3)' }} />
        </div>
      </div>
      
      <h4 
        className="text-sm font-semibold mb-1.5"
        style={{ color: 'var(--fg-1)' }}
      >
        {title}
      </h4>
      {description && (
        <p 
          className="text-xs text-center max-w-[220px] mb-5 leading-relaxed"
          style={{ color: 'var(--fg-3)' }}
        >
          {description}
        </p>
      )}
      
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 rounded-xl px-4",
            "border-dashed border-2",
            "hover:border-solid hover:border-primary",
            "hover:bg-primary/5",
            "hover:text-primary",
            "transition-all duration-200"
          )}
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// PROGRESS BAR (for list items)
// =============================================================================

function ProgressBar({ value, showOverflowWarning = false }: { value: number | null; showOverflowWarning?: boolean }) {
  const { percent, overflow } = normalizeProgress(value);
  
  const getTextColor = () => {
    if (percent === 0) return 'var(--fg-3)';
    if (percent === 100) return 'var(--sem-success)';
    return 'var(--cp-blue)';
  };
  
  return (
      <div className="flex items-center gap-2">
        <div
          className="w-16 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-2)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: 'var(--sem-success)' }}
          />
        </div>
        <span
          className="text-[10px] font-mono tabular-nums"
          style={{ color: getTextColor() }}
        >
          {percent}%
        </span>
        {showOverflowWarning && overflow && (
          <Tooltip content={<p className="text-xs">Rollup exceeds 100%</p>}>
            <AlertTriangle size={10} style={{ color: 'var(--sem-warning)' }} />
          </Tooltip>
        )}
      </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CatalystThemeDrawer({ theme, isOpen, onClose }: CatalystThemeDrawerProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<Theme>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLinkObjectiveDialog, setShowLinkObjectiveDialog] = useState(false);
  const [showLinkEpicDialog, setShowLinkEpicDialog] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  
  const [objectiveSearch, setObjectiveSearch] = useState('');
  const [epicSearch, setEpicSearch] = useState('');
  const [objectiveSort, setObjectiveSort] = useState<'name' | 'progress'>('name');
  const [epicSort, setEpicSort] = useState<'name' | 'state'>('name');
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (theme) {
      setFormData({
        name: theme.name,
        description: theme.description,
        status: theme.status,
        snapshot_id: theme.snapshot_id,
      });
      setEditedName(theme.name);
      setEditedDescription(theme.description || '');
      setActiveTab('overview');
    }
  }, [theme]);

  const { data: snapshot } = useQuery({
    queryKey: ['snapshot-name', theme?.snapshot_id],
    queryFn: async () => {
      if (!theme?.snapshot_id) return null;
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('id, name')
        .eq('id', theme.snapshot_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!theme?.snapshot_id,
  });

  const { data: objectives = [] } = useQuery({
    queryKey: ['theme-objectives', theme?.id],
    queryFn: async () => {
      if (!theme?.id) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('id, name, status, overall_progress, owner_id, updated_at')
        .eq('theme_id', theme.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!theme?.id,
  });

  const { data: epics = [] } = useQuery({
    queryKey: ['theme-epics', theme?.id],
    queryFn: async () => {
      if (!theme?.id) return [];
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, state, owner_id, updated_at')
        .eq('theme_id', theme.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!theme?.id,
  });

  useEffect(() => {
    if (!theme?.id || !isOpen) return;

    const objectivesChannel = supabase
      .channel(`theme-objectives-${theme.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives', filter: `theme_id=eq.${theme.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ['theme-objectives', theme.id] }); }
      ).subscribe();

    const epicsChannel = supabase
      .channel(`theme-epics-${theme.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epics', filter: `theme_id=eq.${theme.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ['theme-epics', theme.id] }); }
      ).subscribe();

    const themeChannel = supabase
      .channel(`theme-details-${theme.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'strategic_themes', filter: `id=eq.${theme.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
          queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
          queryClient.invalidateQueries({ queryKey: ['themes'] });
        }
      ).subscribe();

    const statusesChannel = supabase
      .channel('theme-statuses-config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'theme_statuses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['theme-statuses'] });
          queryClient.invalidateQueries({ queryKey: ['theme-statuses-active'] });
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(objectivesChannel);
      supabase.removeChannel(epicsChannel);
      supabase.removeChannel(themeChannel);
      supabase.removeChannel(statusesChannel);
    };
  }, [theme?.id, isOpen, queryClient]);

  const kpiMetrics = useMemo(() => {
    const objectivesWithProgress = objectives.filter(o => o.overall_progress !== null);
    const avgObjectiveProgress = objectivesWithProgress.length > 0
      ? objectivesWithProgress.reduce((sum, o) => {
          const { percent } = normalizeProgress(o.overall_progress);
          return sum + percent;
        }, 0) / objectivesWithProgress.length
      : 0;
    
    const hasOverflow = objectives.some(o => {
      const { overflow } = normalizeProgress(o.overall_progress);
      return overflow;
    });
    
    const overallProgress = normalizeProgress(avgObjectiveProgress / 100);
    
    const hasAnyWork = objectives.length > 0 || epics.length > 0;
    const gaps = hasAnyWork ? 0 : null;
    
    return {
      overallProgress: overallProgress.percent,
      overallOverflow: hasOverflow,
      objectiveCount: objectives.length,
      avgObjectiveProgress: Math.round(avgObjectiveProgress),
      epicCount: epics.length,
      gaps,
      hasAnyWork,
    };
  }, [objectives, epics]);

  const filteredObjectives = useMemo(() => {
    let result = [...objectives];
    if (objectiveSearch) {
      const search = objectiveSearch.toLowerCase();
      result = result.filter(o => o.name?.toLowerCase().includes(search));
    }
    if (objectiveSort === 'progress') {
      result.sort((a, b) => {
        const { percent: pA } = normalizeProgress(a.overall_progress);
        const { percent: pB } = normalizeProgress(b.overall_progress);
        return pB - pA;
      });
    } else {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return result;
  }, [objectives, objectiveSearch, objectiveSort]);

  const filteredEpics = useMemo(() => {
    let result = [...epics];
    if (epicSearch) {
      const search = epicSearch.toLowerCase();
      result = result.filter(e => e.name?.toLowerCase().includes(search) || e.epic_key?.toLowerCase().includes(search));
    }
    if (epicSort === 'state') {
      const stateOrder = ['implementing', 'backlog', 'analysis', 'candidate', 'funnel', 'done'];
      result.sort((a, b) => {
        const aIdx = stateOrder.indexOf(a.state || 'funnel');
        const bIdx = stateOrder.indexOf(b.state || 'funnel');
        return aIdx - bIdx;
      });
    } else {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return result;
  }, [epics, epicSearch, epicSort]);

  // Mutations
  const saveNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!theme) throw new Error('No theme selected');
      const { error } = await supabase
        .from('strategic_themes')
        .update({ name: newName })
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme name updated');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!theme) throw new Error('No theme selected');
      const { error } = await supabase
        .from('strategic_themes')
        .update({ status: newStatus as 'proposed' | 'active' | 'done' | 'cancelled' })
        .eq('id', theme.id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      setFormData(prev => ({ ...prev, status: newStatus }));
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!theme) throw new Error('No theme selected');
      const { error } = await supabase
        .from('strategic_themes')
        .delete()
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme deleted');
      onClose();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!theme) throw new Error('No theme selected');
      const { error } = await supabase
        .from('strategic_themes')
        .insert({
          name: `${theme.name} (Copy)`,
          description: theme.description,
          status: 'proposed' as const,
          snapshot_id: theme.snapshot_id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme duplicated');
    },
  });

  const saveDescriptionMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      if (!theme) throw new Error('No theme selected');
      const { error } = await supabase
        .from('strategic_themes')
        .update({ description: newDescription })
        .eq('id', theme.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-themes'] });
      queryClient.invalidateQueries({ queryKey: ['strategic_themes'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });

  if (!theme) return null;

  const statusConfig = STATUS_CONFIG[formData.status || theme.status || 'draft'] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const lastUpdated = theme.updated_at || theme.created_at;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/backlog/themes/${theme.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard', {
      description: formatThemeKey(theme.id),
      duration: 2000,
    });
  };

  const handleStartEditName = () => {
    setIsEditingName(true);
    setEditedName(formData.name || theme.name);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== theme.name) {
      setFormData(prev => ({ ...prev, name: editedName.trim() }));
      saveNameMutation.mutate(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(formData.name || theme.name);
    }
  };

  const handleAttemptClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleAttemptClose()}>
        <SheetContent
          side="right"
          hideClose
          className={cn(
            "flex flex-col p-0 gap-0 border-l border-border-default",
            "bg-surface-0 text-text-primary",
            "rounded-l-[20px] rounded-r-none",
            "transition-all duration-300 ease-out",
            "w-[640px] sm:max-w-[640px]",
          )}
        >
          {/* HEADER */}
          <SheetHeader className="shrink-0 space-y-0">
            {/* Breadcrumb + Controls */}
            <div 
              className="flex items-center justify-between px-6 py-3"
              style={{ borderBottom: '1px solid color-mix(in srgb, var(--divider) 50%, transparent)' }}
            >
              <div className="flex items-center gap-2.5">
                <span 
                  className="text-[10px] font-semibold uppercase tracking-[0.5px]"
                  style={{ color: 'var(--fg-3)' }}
                >
                  Strategic Themes
                </span>
                <span style={{ color: 'var(--fg-3)' }}>/</span>
                <span 
                  className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md"
                  style={{ 
                    color: 'var(--cp-blue)',
                    background: 'color-mix(in srgb, var(--cp-blue) 10%, transparent)'
                  }}
                >
                  {formatThemeKey(theme.id)}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  style={{ color: 'var(--fg-3)' }}
                  title="Copy link"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
                
                {snapshot && (
                  <span 
                    className="ml-2 text-[10px] px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: 'var(--bg-2)',
                      border: '1px solid var(--divider)',
                      color: 'var(--fg-3)'
                    }}
                  >
                    <Eye size={10} className="inline mr-1" style={{ marginTop: -1 }} />
                    Viewing: {snapshot.name}
                  </span>
                )}
              </div>

              {/* Actions in header */}
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-muted transition-colors"
                      style={{ color: 'var(--fg-3)' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 rounded-xl"
                    style={{ 
                      background: 'var(--bg-app)',
                      borderColor: 'var(--divider)',
                    }}
                  >
                    <DropdownMenuItem className="rounded-lg" onSelect={() => duplicateMutation.mutate()}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Theme
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-lg text-destructive" onSelect={() => setShowDeleteDialog(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Theme
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAttemptClose}
                  className="h-8 w-8 rounded-lg hover:bg-muted transition-colors"
                  style={{ color: 'var(--fg-3)' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Hero Row */}
            <div className="flex items-start px-6 py-5 gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                {/* Title with Edit */}
                <div className="flex items-center gap-1.5 group">
                  {isEditingName ? (
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleNameKeyDown}
                      className="text-2xl font-bold h-auto py-1.5 px-2 max-w-[480px] border-primary focus-visible:ring-primary/20"
                      style={{ 
                        background: 'var(--bg-2)',
                        color: 'var(--fg-1)'
                      }}
                    />
                  ) : (
                    <>
                      <SheetTitle 
                        className="text-2xl font-bold tracking-tight truncate max-w-[520px] leading-tight"
                        style={{ color: 'var(--fg-1)' }}
                      >
                        {formData.name || theme.name || 'Untitled Theme'}
                      </SheetTitle>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                        style={{ color: 'var(--fg-3)' }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status Dropdown */}
                  <ThemeStatusDropdown
                    currentStatus={formData.status || theme.status || 'draft'}
                    onChange={(newStatus) => updateStatusMutation.mutate(newStatus)}
                    isLoading={updateStatusMutation.isPending}
                  />

                  <div className="w-px h-5" style={{ background: 'var(--divider)' }} />

                  {/* Timestamp */}
                  <div 
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: 'var(--fg-3)' }}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>

            <SheetDescription className="sr-only">Strategic theme details panel</SheetDescription>
          </SheetHeader>

          {/* PROGRESS BAR */}
          <PremiumProgressBar progress={kpiMetrics.overallProgress} />

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList
              className={cn(
                "w-full justify-start rounded-none shrink-0",
                "!bg-transparent !p-0 !h-auto",
                "px-6",
                "border-b border-border-default",
              )}
            >
              {[
                { value: 'overview', label: 'Overview' },
                { value: 'alignment', label: 'Alignment', count: objectives.length + epics.length },
                { value: 'activity', label: 'Activity' },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "relative",
                    "px-4 py-3.5",
                    "text-[14px] font-medium",
                    "rounded-none",
                    "bg-transparent",
                    "text-text-muted hover:text-text-secondary",
                    "data-[state=active]:text-text-primary",
                    "data-[state=active]:bg-transparent",
                    "data-[state=active]:shadow-none",
                    "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                    "after:absolute after:bottom-0 after:left-2 after:right-2",
                    "after:h-[3px] after:rounded-t-full after:transition-all after:duration-200",
                    "data-[state=inactive]:after:bg-transparent data-[state=inactive]:after:scale-x-0",
                    "data-[state=active]:after:bg-brand-primary data-[state=active]:after:scale-x-100",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center bg-surface-2 text-text-muted">
                        {tab.count}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* TAB CONTENT */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ background: 'color-mix(in srgb, var(--bg-2) 30%, transparent)' }}
            >
              {/* OVERVIEW */}
              <TabsContent value="overview" className="mt-0 p-6 space-y-5 focus-visible:outline-none">
                <div className="grid grid-cols-2 gap-4">
                  <KPICard
                    icon={BarChart3}
                    label="Overall Progress"
                    value={`${kpiMetrics.overallProgress}%`}
                    overflow={kpiMetrics.overallOverflow}
                    variant="info"
                  />
                  <KPICard
                    icon={Target}
                    label="Objectives"
                    value={kpiMetrics.objectiveCount}
                    variant="info"
                  />
                  <KPICard
                    icon={Layers}
                    label="Epics"
                    value={kpiMetrics.epicCount}
                    variant="info"
                  />
                  <KPICard
                    icon={AlertTriangle}
                    label="Gaps"
                    value={kpiMetrics.hasAnyWork ? (kpiMetrics.gaps || 0) : "—"}
                    subtext={kpiMetrics.hasAnyWork ? undefined : "No gaps identified"}
                    variant="info"
                  />
                </div>

                <SectionCard icon={FileText} title="Description">
                  <div className="px-5 py-4">
                    {isEditingDescription ? (
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        onBlur={() => {
                          setIsEditingDescription(false);
                          if (editedDescription !== (formData.description || '')) {
                            setFormData(prev => ({ ...prev, description: editedDescription }));
                            saveDescriptionMutation.mutate(editedDescription);
                          }
                        }}
                        className="text-sm leading-relaxed min-h-[80px] border-primary focus-visible:ring-primary/20"
                        style={{ 
                          background: 'var(--bg-2)',
                          color: 'var(--fg-1)'
                        }}
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setEditedDescription(formData.description || theme.description || '');
                          setIsEditingDescription(true);
                        }}
                        className="text-sm leading-relaxed cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                        style={{ color: 'var(--fg-1)' }}
                      >
                        {formData.description || theme.description || 'Click to add a description...'}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </TabsContent>

              {/* ALIGNMENT */}
              <TabsContent value="alignment" className="mt-0 p-6 space-y-5 focus-visible:outline-none">
                <SectionCard 
                  icon={Target} 
                  title="Linked Objectives"
                  badge={objectives.length}
                  action={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-1.5 text-xs rounded-lg"
                      onClick={() => setShowLinkObjectiveDialog(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Link
                    </Button>
                  }
                >
                  {objectives.length > 0 && (
                    <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'color-mix(in srgb, var(--divider) 50%, transparent)' }}>
                      <div className="relative flex-1">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-3)' }} />
                        <Input
                          placeholder="Search objectives..."
                          value={objectiveSearch}
                          onChange={(e) => setObjectiveSearch(e.target.value)}
                          className="h-7 text-[11px] pl-7 bg-muted/50"
                        />
                      </div>
                      <Select value={objectiveSort} onValueChange={(v) => setObjectiveSort(v as 'name' | 'progress')}>
                        <SelectTrigger className="h-7 w-[100px] text-[10px] bg-muted/50">
                          <ArrowUpDown size={10} className="mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[400]">
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="progress">Progress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {objectives.length === 0 ? (
                    <EmptyState
                      icon={Target}
                      title="No objectives linked"
                      description="Link objectives to track strategic alignment and measure progress"
                      actionLabel="Link Objective"
                      onAction={() => setShowLinkObjectiveDialog(true)}
                    />
                  ) : filteredObjectives.length === 0 ? (
                    <EmptyState icon={Search} title="No matching objectives" />
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--divider) 30%, transparent)' }}>
                      {filteredObjectives.map((obj) => (
                        <div 
                          key={obj.id} 
                          className="flex items-center justify-between gap-3 py-3 px-5 hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                              OBJ
                            </span>
                            <span className="text-[12px] font-medium truncate" style={{ color: 'var(--fg-1)' }}>
                              {obj.name}
                            </span>
                            {obj.status && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground shrink-0">
                                {obj.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <ProgressBar value={obj.overall_progress} showOverflowWarning />
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard 
                  icon={Layers} 
                  title="Aligned Epics"
                  badge={epics.length}
                  action={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-1.5 text-xs rounded-lg"
                      onClick={() => setShowLinkEpicDialog(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Link
                    </Button>
                  }
                >
                  {epics.length > 0 && (
                    <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'color-mix(in srgb, var(--divider) 50%, transparent)' }}>
                      <div className="relative flex-1">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-3)' }} />
                        <Input
                          placeholder="Search epics..."
                          value={epicSearch}
                          onChange={(e) => setEpicSearch(e.target.value)}
                          className="h-7 text-[11px] pl-7 bg-muted/50"
                        />
                      </div>
                      <Select value={epicSort} onValueChange={(v) => setEpicSort(v as 'name' | 'state')}>
                        <SelectTrigger className="h-7 w-[100px] text-[10px] bg-muted/50">
                          <ArrowUpDown size={10} className="mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[400]">
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="state">State</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {epics.length === 0 ? (
                    <EmptyState
                      icon={Layers}
                      title="No epics aligned"
                      description="Link epics to show delivery alignment and track implementation"
                      actionLabel="Link Epic"
                      onAction={() => setShowLinkEpicDialog(true)}
                    />
                  ) : filteredEpics.length === 0 ? (
                    <EmptyState icon={Search} title="No matching epics" />
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--divider) 30%, transparent)' }}>
                      {filteredEpics.map((epic) => (
                        <div 
                          key={epic.id} 
                          className="flex items-center justify-between gap-3 py-3 px-5 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedEpic(epic);
                            setSelectedEpicId(epic.id);
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--cp-blue)' }}>
                              {epic.epic_key || 'E-???'}
                            </span>
                            <span className="text-[12px] font-medium truncate" style={{ color: 'var(--fg-1)' }}>
                              {epic.name}
                            </span>
                          </div>
                          {epic.state && (
                            <span 
                              className="text-[9px] px-1.5 py-0.5 rounded shrink-0 bg-muted/50"
                              style={{ color: EPIC_STATES[epic.state]?.color || 'var(--fg-3)' }}
                            >
                              {EPIC_STATES[epic.state]?.label || epic.state}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </TabsContent>

              {/* ACTIVITY */}
              <TabsContent value="activity" className="mt-0 p-6 space-y-5 focus-visible:outline-none">
                <div className="h-[460px] px-3 py-2">
                  <UnifiedAuditHistoryTab embedded entityType="theme" entityId={theme.id} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Link Objective Picker */}
      <LinkObjectivePicker
        open={showLinkObjectiveDialog}
        onClose={() => setShowLinkObjectiveDialog(false)}
        themeId={theme?.id}
        linkedObjectiveIds={objectives.map(o => o.id)}
        onLinked={() => {
          queryClient.invalidateQueries({ queryKey: ['theme-objectives', theme?.id] });
        }}
      />

      {/* Link Epic Picker */}
      <LinkEpicPicker
        open={showLinkEpicDialog}
        onClose={() => setShowLinkEpicDialog(false)}
        themeId={theme?.id}
        linkedEpicIds={epics.map(e => e.id)}
        onLinked={() => {
          queryClient.invalidateQueries({ queryKey: ['theme-epics', theme?.id] });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Theme?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete <strong>"{theme?.name}"</strong>? This action cannot be undone.</p>
              {(objectives.length > 0 || epics.length > 0) && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                    This theme has linked items:
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                    {objectives.length > 0 && <li>{objectives.length} objective{objectives.length !== 1 ? 's' : ''}</li>}
                    {epics.length > 0 && <li>{epics.length} epic{epics.length !== 1 ? 's' : ''}</li>}
                  </ul>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Linked items will be unlinked from this theme.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowDeleteDialog(false);
                deleteMutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Theme'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Epic Details Panel */}
      {selectedEpic && (
        <EpicDetailsPanel
          epic={selectedEpic}
          open={!!selectedEpicId}
          onClose={() => {
            setSelectedEpicId(null);
            setSelectedEpic(null);
          }}
        />
      )}
    </>
  );
}
