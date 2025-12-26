/**
 * SnapshotDrawer - Strategic Snapshot Details Drawer
 * Follows standard Catalyst drawer pattern
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  X, 
  Link2, 
  MoreVertical, 
  Maximize2, 
  Calendar as CalendarIcon, 
  Layers, 
  Settings,
  Trash2,
  Copy,
  Search,
  AlertTriangle,
  ExternalLink,
  Archive
} from 'lucide-react';
import { getSnapshotDeleteImpact, SnapshotDeleteImpact } from '@/utils/snapshotDeleteImpact';
import { useArchiveSnapshot } from '@/hooks/useStrategicSnapshots';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserPicker } from '@/components/ui/user-picker';
import { UnifiedAuditHistoryTab } from '@/components/shared/UnifiedAuditHistoryTab';

interface SnapshotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotId: string | null;
  onSave?: (snapshot: any) => void;
}

interface SnapshotFormData {
  name: string;
  description: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  notes: string;
}

export function SnapshotDrawer({ isOpen, onClose, snapshotId, onSave }: SnapshotDrawerProps) {
  const queryClient = useQueryClient();
  const archiveSnapshotMutation = useArchiveSnapshot();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDirty, setIsDirty] = useState(false);
  const [themeSearch, setThemeSearch] = useState('');
  const [quarterSearch, setQuarterSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<SnapshotDeleteImpact | null>(null);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [linkedThemeCount, setLinkedThemeCount] = useState<number | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState<SnapshotFormData>({
    name: '',
    description: '',
    status: 'DRAFT',
    start_date: null,
    end_date: null,
    created_by: null,
    notes: '',
  });
  
  // Selected quarters and themes
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  // Fetch snapshot data
  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['snapshot-drawer', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return null;
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!snapshotId,
  });

  // Fetch snapshot configuration
  const { data: configuration } = useQuery({
    queryKey: ['snapshot-configuration', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return null;
      const { data, error } = await supabase
        .from('snapshot_configurations')
        .select('*')
        .eq('snapshot_id', snapshotId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!snapshotId,
  });

  // Fetch available themes
  const { data: themes = [] } = useQuery({
    queryKey: ['strategic-themes-for-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('id, name, status')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch linked themes count for this snapshot
  const { data: linkedThemesData } = useQuery({
    queryKey: ['snapshot-linked-themes-count', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return { count: 0 };
      const { count, error } = await supabase
        .from('strategic_themes')
        .select('id', { count: 'exact', head: true })
        .eq('snapshot_id', snapshotId);
      if (error) throw error;
      return { count: count ?? 0 };
    },
    enabled: isOpen && !!snapshotId,
  });

  const canDelete = linkedThemesData?.count === 0;

  // Fetch progress data from linked goals
  const { data: progressData } = useQuery({
    queryKey: ['snapshot-progress', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return { progress: 0 };
      
      // Get all goals linked to this snapshot
      const { data: goals, error } = await supabase
        .from('strategic_goals')
        .select('complete_percent')
        .eq('snapshot_id', snapshotId);
      
      if (error) throw error;
      
      if (!goals || goals.length === 0) {
        return { progress: 0, goalCount: 0 };
      }
      
      // Calculate average completion percentage
      const totalPercent = goals.reduce((sum, goal) => {
        return sum + (Number(goal.complete_percent) || 0);
      }, 0);
      
      const avgProgress = Math.round(totalPercent / goals.length);
      
      return { progress: avgProgress, goalCount: goals.length };
    },
    enabled: isOpen && !!snapshotId,
  });

  // Fetch owner profile
  const { data: ownerProfile } = useQuery({
    queryKey: ['profile', snapshot?.created_by],
    queryFn: async () => {
      if (!snapshot?.created_by) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', snapshot.created_by)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!snapshot?.created_by,
  });

  // Generate quarter options
  const quarterOptions = (() => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
    const quarters: { id: string; name: string; startDate: string; endDate: string }[] = [];
    
    years.forEach(year => {
      quarters.push(
        { id: `Q1-${year}`, name: `Q1 ${year}`, startDate: `${year}-01-01`, endDate: `${year}-03-31` },
        { id: `Q2-${year}`, name: `Q2 ${year}`, startDate: `${year}-04-01`, endDate: `${year}-06-30` },
        { id: `Q3-${year}`, name: `Q3 ${year}`, startDate: `${year}-07-01`, endDate: `${year}-09-30` },
        { id: `Q4-${year}`, name: `Q4 ${year}`, startDate: `${year}-10-01`, endDate: `${year}-12-31` }
      );
    });
    
    return quarters;
  })();

  // Sync form data when snapshot loads
  useEffect(() => {
    if (snapshot) {
      setFormData({
        name: snapshot.name || '',
        description: snapshot.description || '',
        status: snapshot.status || 'DRAFT',
        start_date: snapshot.start_date || null,
        end_date: snapshot.end_date || null,
        created_by: snapshot.created_by || null,
        notes: '', // Notes field - stored separately or in a JSON field
      });
    }
  }, [snapshot]);

  // Sync configuration when it loads
  useEffect(() => {
    if (configuration) {
      setSelectedQuarters(configuration.quarters || []);
      setSelectedThemes(configuration.themes || []);
    }
  }, [configuration]);

  // Update mutation (silent autosave)
  const updateSnapshotMutation = useMutation({
    mutationFn: async () => {
      if (!snapshotId) throw new Error('No snapshot ID');
      
      // Update snapshot
      const { error: snapshotError } = await supabase
        .from('strategy_snapshots')
        .update({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date,
          created_by: formData.created_by,
        })
        .eq('id', snapshotId);
      
      if (snapshotError) throw snapshotError;

      // Upsert configuration
      const { error: configError } = await supabase
        .from('snapshot_configurations')
        .upsert({
          snapshot_id: snapshotId,
          quarters: selectedQuarters,
          themes: selectedThemes,
        }, { onConflict: 'snapshot_id' });
      
      if (configError) throw configError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshot-drawer', snapshotId] });
      queryClient.invalidateQueries({ queryKey: ['snapshot-configuration', snapshotId] });
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      setIsDirty(false);
      onSave?.(formData);
    },
    onError: (error: any) => {
      catalystToast.error('Autosave failed', `${error.message}`);
    },
  });

  // Autosave function
  const triggerAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      if (!isInitialLoadRef.current && snapshotId) {
        updateSnapshotMutation.mutate();
      }
    }, 800); // Debounce 800ms
  }, [snapshotId]);

  // Autosave effect - triggers on form/selection changes
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    if (isDirty) {
      triggerAutosave();
    }
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [formData, selectedQuarters, selectedThemes, isDirty, triggerAutosave]);

  // Mark initial load complete after data loads
  useEffect(() => {
    if (snapshot && isOpen) {
      // Small delay to ensure form is populated before enabling autosave
      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [snapshot, isOpen]);

  // Reset initial load flag when drawer closes
  useEffect(() => {
    if (!isOpen) {
      isInitialLoadRef.current = true;
    }
  }, [isOpen]);

  // Handlers
  const handleFormChange = (field: keyof SnapshotFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleQuarterToggle = (quarterId: string) => {
    setSelectedQuarters(prev => 
      prev.includes(quarterId) 
        ? prev.filter(q => q !== quarterId)
        : [...prev, quarterId]
    );
    setIsDirty(true);
  };

  const handleThemeToggle = (themeId: string) => {
    setSelectedThemes(prev => 
      prev.includes(themeId) 
        ? prev.filter(t => t !== themeId)
        : [...prev, themeId]
    );
    setIsDirty(true);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/enterprise/snapshots/${snapshotId}`;
    navigator.clipboard.writeText(url);
    catalystToast.success('Copied', 'Link copied to clipboard');
  };


  // Delete mutation
  const deleteSnapshotMutation = useMutation({
    mutationFn: async () => {
      if (!snapshotId) throw new Error('No snapshot ID');
      
      // First delete configuration
      await supabase
        .from('snapshot_configurations')
        .delete()
        .eq('snapshot_id', snapshotId);
      
      // Then delete snapshot
      const { error } = await supabase
        .from('strategy_snapshots')
        .delete()
        .eq('id', snapshotId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['strategy-snapshots'] });
      catalystToast.success('Snapshot Deleted', 'Snapshot has been permanently deleted.');
      onClose();
    },
    onError: (error: any) => {
      catalystToast.error('Error', error.message || 'Failed to delete snapshot.');
    },
  });

  const handleDelete = async () => {
    if (!snapshotId) return;
    
    setIsCheckingDelete(true);
    try {
      const impact = await getSnapshotDeleteImpact(snapshotId);
      setDeleteImpact(impact);
      setShowDeleteConfirm(true);
    } catch (err) {
      catalystToast.error('Error', 'Could not check linked items. Please try again.');
    } finally {
      setIsCheckingDelete(false);
    }
  };

  const handleDeleteConfirm = () => {
    // Only allow deletion if nothing is linked
    if (deleteImpact && deleteImpact.total > 0) {
      catalystToast.warning('Cannot Delete', 'Please unlink all items before deleting this snapshot.');
      return;
    }
    deleteSnapshotMutation.mutate();
    setShowDeleteConfirm(false);
    setDeleteImpact(null);
  };

  const handleNavigateToThemes = () => {
    setShowDeleteConfirm(false);
    setDeleteImpact(null);
    setActiveTab('themes');
  };

  // Format snapshot ID for display
  const formatSnapshotId = (id: string | null) => {
    if (!id) return 'SNAP-???';
    const num = parseInt(id.slice(0, 3), 16) % 1000;
    return `SNAP-${String(num).padStart(3, '0')}`;
  };

  // Get status config - Catalyst Design System v1.0
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status?.toUpperCase()?.replace(/\s+/g, '_');
    switch (normalizedStatus) {
      case 'ACTIVE':
      case 'ON_TRACK':
        return { 
          label: 'on track', 
          style: {
            backgroundColor: 'rgba(92, 124, 92, 0.25)',
            border: '1px solid rgba(92, 124, 92, 0.5)',
            color: '#8FBC8F'
          },
          healthColor: '#5c7c5c'
        };
      case 'AT_RISK':
        return { 
          label: 'at risk', 
          style: {
            backgroundColor: 'rgba(198, 156, 109, 0.25)',
            border: '1px solid rgba(198, 156, 109, 0.5)',
            color: '#d4a574'
          },
          healthColor: '#c69c6d'
        };
      case 'OFF_TRACK':
        return { 
          label: 'off track', 
          style: {
            backgroundColor: 'rgba(180, 83, 83, 0.25)',
            border: '1px solid rgba(180, 83, 83, 0.5)',
            color: '#cf7070'
          },
          healthColor: '#b45353'
        };
      case 'ARCHIVED':
        return { 
          label: 'archived', 
          style: {
            backgroundColor: 'rgba(115, 115, 115, 0.2)',
            border: '1px solid rgba(115, 115, 115, 0.4)',
            color: '#a3a3a3'
          },
          healthColor: '#737373'
        };
      default:
        return { 
          label: 'draft', 
          style: {
            backgroundColor: 'rgba(115, 115, 115, 0.2)',
            border: '1px solid rgba(115, 115, 115, 0.4)',
            color: '#a3a3a3'
          },
          healthColor: '#737373'
        };
    }
  };

  const statusConfig = getStatusConfig(formData.status);
  
  // Dynamic progress from linked goals (average complete_percent)
  const progress = progressData?.progress ?? 0;

  // Filter quarters and themes
  const filteredQuarters = quarterOptions.filter(q => 
    q.name.toLowerCase().includes(quarterSearch.toLowerCase())
  );
  
  const filteredThemes = themes.filter(t => 
    t.name.toLowerCase().includes(themeSearch.toLowerCase())
  );

  // Check if quarter is out of snapshot date range
  const isQuarterOutOfRange = (quarter: typeof quarterOptions[0]) => {
    if (!formData.start_date || !formData.end_date) return false;
    const snapshotStart = new Date(formData.start_date);
    const snapshotEnd = new Date(formData.end_date);
    const quarterStart = new Date(quarter.startDate);
    const quarterEnd = new Date(quarter.endDate);
    return quarterEnd < snapshotStart || quarterStart > snapshotEnd;
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className="w-screen sm:w-[65vw] sm:max-w-[980px] p-0 flex flex-col"
        style={{
          backgroundColor: '#141414',
          borderLeft: '1px solid #333333'
        }}
        hideClose
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Snapshot Details</SheetTitle>
          <SheetDescription>View and edit strategic snapshot details</SheetDescription>
        </SheetHeader>

        {/* Header Row */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #333333' }}>
          {/* ID */}
          <span 
            className="px-2.5 py-1 rounded text-xs font-mono font-medium"
            style={{
              backgroundColor: '#242424',
              border: '1px solid #404040',
              color: '#c69c6d'
            }}
          >
            {formatSnapshotId(snapshotId)}
          </span>
          
          {/* Link */}
          <button 
            onClick={handleCopyLink}
            className="p-1.5 rounded transition-colors hover:bg-[#333333]"
          >
            <Link2 className="h-4 w-4" style={{ color: '#737373' }} />
          </button>
          
          {/* Title - truncated */}
          <span className="flex-1 text-lg font-semibold truncate" style={{ color: '#f5f5f5' }}>
            {formData.name || 'Untitled Snapshot'}
          </span>
          
          {/* Kebab Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[400]">
              <DropdownMenuItem onClick={() => catalystToast.info('Info', 'Duplicate not implemented')}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Archive option - always available */}
              <DropdownMenuItem 
                onClick={() => {
                  if (snapshotId) {
                    archiveSnapshotMutation.mutate(snapshotId);
                    onClose();
                  }
                }}
                disabled={formData.status === 'ARCHIVED'}
                className={formData.status === 'ARCHIVED' ? 'opacity-50' : ''}
              >
                <Archive className="h-4 w-4 mr-2" />
                {formData.status === 'ARCHIVED' ? 'Already Archived' : 'Archive'}
              </DropdownMenuItem>
              {/* Delete - only available when no themes linked */}
              {canDelete ? (
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  disabled
                  className="opacity-50 cursor-not-allowed"
                  title="Unlink all themes before deleting"
                >
                  <Trash2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Delete (unlink themes first)</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Expand Icon */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
          
          {/* Close Icon */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Context Bar */}
        <div 
          className="flex items-center gap-3 px-4 py-2.5 flex-wrap text-sm"
          style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}
        >
          {/* Primary Theme */}
          <span style={{ color: '#a3a3a3' }}>
            {selectedThemes.length > 0 
              ? themes.find(t => t.id === selectedThemes[0])?.name || 'Digital Maturity'
              : 'No Theme'
            }
          </span>
          
          {/* Status Badge */}
          <span 
            className="px-2.5 py-1 rounded text-[11px] font-medium uppercase"
            style={statusConfig.style}
          >
            {statusConfig.label}
          </span>
          
          {/* Health Dot */}
          <span 
            className="h-2 w-2 rounded-full" 
            style={{ backgroundColor: statusConfig.healthColor }}
          />
          
          {/* Date */}
          <div className="flex items-center gap-1.5" style={{ color: '#a3a3a3' }}>
            <CalendarIcon className="h-4 w-4" />
            <span>{formData.end_date ? format(new Date(formData.end_date), 'MM/dd/yyyy') : '—'}</span>
          </div>
          
          {/* Quarters Count */}
          <div className="flex items-center gap-1.5" style={{ color: '#a3a3a3' }}>
            <Layers className="h-4 w-4" />
            <span>{selectedQuarters.length} Quarters</span>
          </div>
          
          {/* Themes Count */}
          <div className="flex items-center gap-1.5" style={{ color: '#a3a3a3' }}>
            <Settings className="h-4 w-4" />
            <span>{selectedThemes.length} Themes</span>
          </div>
        </div>

        {/* Progress Row - VISIBLE track */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #333333' }}>
          <span className="text-xs font-medium" style={{ color: '#737373' }}>Overall Progress</span>
          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#333333' }}>
            <div 
              className="h-full rounded-full"
              style={{ 
                backgroundColor: '#5c7c5c',
                width: `${progress}%`
              }}
            />
          </div>
          <span className="text-sm font-semibold" style={{ color: '#f5f5f5' }}>{progress}%</span>
        </div>

        {/* Tabs - with visible gold underline */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div style={{ borderBottom: '1px solid #333333' }}>
            <div className="flex px-4">
              {[
                { value: 'overview', label: 'Overview' },
                { value: 'quarters', label: 'Quarters' },
                { value: 'themes', label: 'Themes' },
                { value: 'audit', label: 'Audit History' }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className="relative px-4 py-3 text-sm font-medium transition-colors"
                  style={{ color: activeTab === tab.value ? '#f5f5f5' : '#a3a3a3' }}
                >
                  {tab.label}
                  {activeTab === tab.value && (
                    <div 
                      className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full"
                      style={{ backgroundColor: '#c69c6d' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 space-y-4 m-0">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#a3a3a3' }}>
                  Name <span style={{ color: '#c69c6d' }}>*</span>
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Enter snapshot name"
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#f5f5f5'
                  }}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#a3a3a3' }}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Enter description..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#f5f5f5'
                  }}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#a3a3a3' }}>Status</label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleFormChange('status', value)}
                >
                  <SelectTrigger 
                    className="w-full"
                    style={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333333',
                      color: '#f5f5f5'
                    }}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="z-[400]">
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">On Track</SelectItem>
                    <SelectItem value="AT_RISK">At Risk</SelectItem>
                    <SelectItem value="OFF_TRACK">Off Track</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: '#a3a3a3' }}>Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="w-full flex items-center justify-start gap-2 px-4 py-3 rounded-lg text-sm text-left"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333333',
                          color: formData.start_date ? '#f5f5f5' : '#737373'
                        }}
                      >
                        <CalendarIcon className="h-4 w-4" style={{ color: '#737373' }} />
                        {formData.start_date 
                          ? format(new Date(formData.start_date), 'MM/dd/yyyy')
                          : 'Pick a date'
                        }
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[400]" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date ? new Date(formData.start_date) : undefined}
                        onSelect={(date) => handleFormChange('start_date', date?.toISOString().split('T')[0] || null)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: '#a3a3a3' }}>End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="w-full flex items-center justify-start gap-2 px-4 py-3 rounded-lg text-sm text-left"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333333',
                          color: formData.end_date ? '#f5f5f5' : '#737373'
                        }}
                      >
                        <CalendarIcon className="h-4 w-4" style={{ color: '#737373' }} />
                        {formData.end_date 
                          ? format(new Date(formData.end_date), 'MM/dd/yyyy')
                          : 'Pick a date'
                        }
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[400]" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date ? new Date(formData.end_date) : undefined}
                        onSelect={(date) => handleFormChange('end_date', date?.toISOString().split('T')[0] || null)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Owner */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#a3a3a3' }}>Owner</label>
                <UserPicker
                  value={formData.created_by}
                  onChange={(value) => handleFormChange('created_by', value)}
                  placeholder="Unassigned"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: '#a3a3a3' }}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Add notes..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#f5f5f5'
                  }}
                />
              </div>
            </TabsContent>

            {/* Quarters Tab */}
            <TabsContent value="quarters" className="p-4 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium" style={{ color: '#f5f5f5' }}>Assign Quarters</h3>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: '#333333', color: '#a3a3a3' }}
                  >
                    {selectedQuarters.length}
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#737373' }} />
                <input
                  value={quarterSearch}
                  onChange={(e) => setQuarterSearch(e.target.value)}
                  placeholder="Search quarters..."
                  className="w-full pl-9 pr-4 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#f5f5f5'
                  }}
                />
              </div>

              {/* Warning Banner */}
              {selectedQuarters.length === 0 && (
                <div 
                  className="p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'rgba(198, 156, 109, 0.1)',
                    border: '1px solid rgba(198, 156, 109, 0.3)',
                    color: '#c69c6d'
                  }}
                >
                  No quarters selected. Please assign at least one quarter.
                </div>
              )}

              {/* Quarters List */}
              <div className="space-y-2">
                {filteredQuarters.map((quarter) => {
                  const isSelected = selectedQuarters.includes(quarter.id);
                  const outOfRange = isQuarterOutOfRange(quarter);
                  
                  return (
                    <label
                      key={quarter.id}
                      className="flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isSelected ? 'rgba(92, 124, 92, 0.08)' : '#1a1a1a',
                        border: isSelected ? '1px solid rgba(92, 124, 92, 0.3)' : '1px solid #333333'
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleQuarterToggle(quarter.id)}
                        className="data-[state=checked]:bg-[#5c7c5c] data-[state=checked]:border-[#5c7c5c]"
                        style={{
                          borderColor: isSelected ? '#5c7c5c' : '#404040',
                          backgroundColor: isSelected ? '#5c7c5c' : 'transparent'
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: '#f5f5f5' }}>{quarter.name}</div>
                        <div className="text-xs" style={{ color: '#737373' }}>
                          {format(new Date(quarter.startDate), 'MMM d')} — {format(new Date(quarter.endDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      {outOfRange && (
                        <span 
                          className="px-2.5 py-1 rounded text-[11px] font-medium"
                          style={{
                            backgroundColor: 'rgba(115, 115, 115, 0.15)',
                            border: '1px solid rgba(115, 115, 115, 0.3)',
                            color: '#8a8a8a'
                          }}
                        >
                          Out of range
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              <p className="text-xs" style={{ color: '#737373' }}>
                Quarters must fall within the snapshot date range
              </p>
            </TabsContent>

            {/* Themes Tab */}
            <TabsContent value="themes" className="p-4 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium" style={{ color: '#f5f5f5' }}>Link Themes</h3>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: '#333333', color: '#a3a3a3' }}
                  >
                    {selectedThemes.length}
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#737373' }} />
                <input
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  placeholder="Search themes..."
                  className="w-full pl-9 pr-4 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#f5f5f5'
                  }}
                />
              </div>

              {/* Empty State */}
              {filteredThemes.length === 0 && (
                <div className="text-center py-8" style={{ color: '#737373' }}>
                  {themes.length === 0 ? 'No themes available' : 'No themes match your search'}
                </div>
              )}

              {/* Themes List */}
              <div className="space-y-2">
                {filteredThemes.map((theme) => {
                  const isSelected = selectedThemes.includes(theme.id);
                  
                  return (
                    <label
                      key={theme.id}
                      className="flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isSelected ? 'rgba(92, 124, 92, 0.08)' : '#1a1a1a',
                        border: isSelected ? '1px solid rgba(92, 124, 92, 0.3)' : '1px solid #333333'
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleThemeToggle(theme.id)}
                        className="data-[state=checked]:bg-[#5c7c5c] data-[state=checked]:border-[#5c7c5c]"
                        style={{
                          borderColor: isSelected ? '#5c7c5c' : '#404040',
                          backgroundColor: isSelected ? '#5c7c5c' : 'transparent'
                        }}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: '#f5f5f5' }}>{theme.name}</div>
                      </div>
                      <span 
                        className="px-2.5 py-1 rounded text-[11px] font-medium"
                        style={
                          theme.status === 'active' 
                            ? {
                                backgroundColor: 'rgba(92, 124, 92, 0.15)',
                                border: '1px solid rgba(92, 124, 92, 0.3)',
                                color: '#6b9b6b'
                              }
                            : {
                                backgroundColor: 'rgba(198, 156, 109, 0.15)',
                                border: '1px solid rgba(198, 156, 109, 0.3)',
                                color: '#c69c6d'
                              }
                        }
                      >
                        {theme.status === 'active' ? 'Active' : 'Proposed'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </TabsContent>

            {/* Audit History Tab */}
            <TabsContent value="audit" className="p-0 m-0 h-[500px]">
              {snapshotId ? (
                <UnifiedAuditHistoryTab entityType="snapshot" entityId={snapshotId} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No audit history available
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => {
        setShowDeleteConfirm(open);
        if (!open) setDeleteImpact(null);
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteImpact && deleteImpact.total > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Cannot Delete Snapshot
                </>
              ) : (
                'Delete Snapshot'
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteImpact && deleteImpact.total > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      This snapshot has linked items that must be removed before deletion:
                    </p>
                    <ul className="space-y-2 mt-3">
                      {deleteImpact.items.map((item) => (
                        <li 
                          key={item.key} 
                          className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {item.count} {item.label}
                          </span>
                          {item.key === 'strategic_themes' && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-brand-primary hover:text-brand-primary-hover"
                              onClick={handleNavigateToThemes}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Go to Themes
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3">
                      Navigate to the Themes tab to unlink themes from this snapshot, then try deleting again.
                    </p>
                  </>
                ) : (
                  <p>
                    Are you sure you want to delete "{formData.name}"? This action cannot be undone.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteImpact(null)}>
              {deleteImpact && deleteImpact.total > 0 ? 'Close' : 'Cancel'}
            </AlertDialogCancel>
            {(!deleteImpact || deleteImpact.total === 0) && (
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteSnapshotMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
