/**
 * SnapshotDrawer - Strategic Snapshot Details Drawer
 * Follows standard Catalyst drawer pattern
 */
import { useState, useEffect } from 'react';
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
  ChevronDown, 
  Calendar as CalendarIcon, 
  Layers, 
  Settings,
  Trash2,
  Copy,
  FileDown,
  Search
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [isDirty, setIsDirty] = useState(false);
  const [themeSearch, setThemeSearch] = useState('');
  const [quarterSearch, setQuarterSearch] = useState('');
  
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

  // Update mutation
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
      toast.success('Snapshot saved successfully');
      setIsDirty(false);
      onSave?.(formData);
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

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
    toast.success('Link copied to clipboard');
  };

  const handleSave = () => {
    updateSnapshotMutation.mutate();
  };

  // Format snapshot ID for display
  const formatSnapshotId = (id: string | null) => {
    if (!id) return 'SNAP-???';
    const num = parseInt(id.slice(0, 3), 16) % 1000;
    return `SNAP-${String(num).padStart(3, '0')}`;
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return { 
          label: 'on track', 
          bgClass: 'bg-[rgba(92,124,92,0.12)]', 
          textClass: 'text-[#5C7C5C]',
          healthColor: '#5C7C5C'
        };
      case 'ARCHIVED':
        return { 
          label: 'archived', 
          bgClass: 'bg-muted', 
          textClass: 'text-muted-foreground',
          healthColor: '#8B949E'
        };
      default:
        return { 
          label: 'draft', 
          bgClass: 'bg-muted', 
          textClass: 'text-muted-foreground',
          healthColor: '#8B949E'
        };
    }
  };

  const statusConfig = getStatusConfig(formData.status);
  const progress = 6; // Example progress - would be calculated from linked objectives

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
        className="w-screen sm:w-[65vw] sm:max-w-[980px] p-0 flex flex-col bg-background border-l border-border"
        hideClose
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Snapshot Details</SheetTitle>
          <SheetDescription>View and edit strategic snapshot details</SheetDescription>
        </SheetHeader>

        {/* Header Row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-brand-gold">
          {/* ID with copy link */}
          <span className="text-brand-gold font-mono font-semibold text-sm">
            {formatSnapshotId(snapshotId)}
          </span>
          <button 
            onClick={handleCopyLink}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link2 className="h-4 w-4" />
          </button>
          
          {/* Title - truncated */}
          <span className="flex-1 font-semibold text-foreground truncate">
            {formData.name || 'Untitled Snapshot'}
          </span>
          
          {/* Save Button with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                className="bg-brand-gold hover:bg-brand-gold-hover text-white gap-1"
                disabled={updateSnapshotMutation.isPending}
              >
                {updateSnapshotMutation.isPending ? 'Saving...' : 'Save'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[400]">
              <DropdownMenuItem onClick={handleSave}>
                Save Changes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { handleSave(); onClose(); }}>
                Save & Close
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Kebab Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[400]">
              <DropdownMenuItem onClick={() => toast.info('Duplicate not implemented')}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Export not implemented')}>
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
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
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-sm">
          {/* Primary Theme */}
          <span className="font-medium text-foreground">
            {selectedThemes.length > 0 
              ? themes.find(t => t.id === selectedThemes[0])?.name || 'Digital Maturity'
              : 'No Theme'
            }
          </span>
          
          {/* Status Badge */}
          <Badge className={cn('text-[10px] font-medium uppercase', statusConfig.bgClass, statusConfig.textClass)}>
            {statusConfig.label}
          </Badge>
          
          {/* Health Dot */}
          <span 
            className="h-2 w-2 rounded-full" 
            style={{ backgroundColor: statusConfig.healthColor }}
          />
          
          {/* Date */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>{formData.end_date ? format(new Date(formData.end_date), 'MM/dd/yyyy') : '—'}</span>
          </div>
          
          {/* Quarters Count */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span>{selectedQuarters.length}</span>
            <span>Quarters</span>
          </div>
          
          {/* Themes Count */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Settings className="h-3.5 w-3.5" />
            <span>{selectedThemes.length}</span>
            <span>Themes</span>
          </div>
        </div>

        {/* Progress Row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-sm text-muted-foreground">Overall Progress</span>
          <div className="flex-1">
            <Progress value={progress} className="h-2 bg-border [&>div]:bg-brand-gold" />
          </div>
          <span className="text-sm font-medium text-foreground">{progress}%</span>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start px-4 py-0 h-10 bg-transparent border-b border-border rounded-none">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="quarters"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none"
            >
              Quarters
            </TabsTrigger>
            <TabsTrigger 
              value="themes"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none"
            >
              Themes
            </TabsTrigger>
            <TabsTrigger 
              value="audit"
              className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none"
            >
              Audit History
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 space-y-4 m-0">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Enter snapshot name"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Enter description..."
                  rows={4}
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleFormChange('status', value)}
                >
                  <SelectTrigger className="w-full">
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
                <div className="space-y-1.5">
                  <Label className="text-sm">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.start_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date 
                          ? format(new Date(formData.start_date), 'MM/dd/yyyy')
                          : 'Pick a date'
                        }
                      </Button>
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
                <div className="space-y-1.5">
                  <Label className="text-sm">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.end_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date 
                          ? format(new Date(formData.end_date), 'MM/dd/yyyy')
                          : 'Pick a date'
                        }
                      </Button>
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
              <div className="space-y-1.5">
                <Label className="text-sm">Owner</Label>
                <UserPicker
                  value={formData.created_by}
                  onChange={(value) => handleFormChange('created_by', value)}
                  placeholder="Unassigned"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Add notes..."
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* Quarters Tab */}
            <TabsContent value="quarters" className="p-4 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">Assign Quarters</h3>
                  <Badge variant="secondary" className="text-xs">
                    {selectedQuarters.length}
                  </Badge>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={quarterSearch}
                  onChange={(e) => setQuarterSearch(e.target.value)}
                  placeholder="Search quarters..."
                  className="pl-9"
                />
              </div>

              {/* Warning Banner */}
              {selectedQuarters.length === 0 && (
                <div className="p-3 bg-brand-gold/10 border border-brand-gold/30 rounded-lg text-sm text-brand-gold">
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
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected 
                          ? 'bg-[rgba(198,156,109,0.08)] border-brand-gold/30' 
                          : 'bg-background border-border hover:border-brand-gold/20'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleQuarterToggle(quarter.id)}
                        className="data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{quarter.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(quarter.startDate), 'MMM d')} — {format(new Date(quarter.endDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      {outOfRange && (
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                          Out of range
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Quarters must fall within the snapshot date range
              </p>
            </TabsContent>

            {/* Themes Tab */}
            <TabsContent value="themes" className="p-4 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">Link Themes</h3>
                  <Badge variant="secondary" className="text-xs">
                    {selectedThemes.length}
                  </Badge>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  placeholder="Search themes..."
                  className="pl-9"
                />
              </div>

              {/* Empty State */}
              {filteredThemes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
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
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected 
                          ? 'bg-[rgba(198,156,109,0.08)] border-brand-gold/30' 
                          : 'bg-background border-border hover:border-brand-gold/20'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleThemeToggle(theme.id)}
                        className="data-[state=checked]:bg-brand-gold data-[state=checked]:border-brand-gold"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{theme.name}</div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px]',
                          theme.status === 'active' 
                            ? 'text-[#5C7C5C] border-[#5C7C5C]/30' 
                            : 'text-muted-foreground border-border'
                        )}
                      >
                        {theme.status === 'active' ? 'Active' : 'Proposed'}
                      </Badge>
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
    </Sheet>
  );
}
