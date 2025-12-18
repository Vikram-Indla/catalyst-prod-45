import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
} from "@/components/ui/alert-dialog";
import { 
  MoreVertical, 
  Bell, 
  History, 
  Copy, 
  Trash2, 
  RefreshCw, 
  X, 
  Pencil, 
  Link as LinkIcon,
  ChevronDown,
  Maximize2,
  Minimize2,
  Users,
  Calendar
} from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  dependency_level: z.enum(['team', 'program', 'external']),
  from_feature_id: z.string().optional(),
  to_feature_id: z.string().optional(),
  requesting_team_id: z.string().optional(),
  requesting_program_id: z.string().optional(),
  depends_on_team_id: z.string().optional(),
  depends_on_program_id: z.string().optional(),
  external_entity_id: z.string().optional(),
  owner_id: z.string().optional(),
  pi_id: z.string().optional(),
  type: z.enum(['sequential', 'concurrent', 'program', 'external']),
  status: z.enum(['open', 'pending_commit', 'negotiation', 'committed', 'in_progress', 'delivered', 'done', 'no_work_done', 'rejected']),
  risk_level: z.enum(['low', 'med', 'high']),
  needed_by_date: z.string().optional(),
  needed_by_sprint_id: z.string().optional(),
  committed_by_date: z.string().optional(),
  committed_by_sprint_id: z.string().optional(),
  description: z.string().optional(),
  blocked_requestor: z.boolean().optional(),
  blocked_respondent: z.boolean().optional(),
  blocked_reason_requestor: z.string().optional(),
  blocked_reason_respondent: z.string().optional(),
  no_work_required: z.boolean().optional(),
  rejection_reason: z.string().optional(),
  notify_on_commit: z.boolean().optional(),
  notify_on_delivery: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DependencyDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  dependencyId?: string;
}

export function DependencyDetailsDrawer({ open, onClose, dependencyId }: DependencyDetailsDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('details');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const isEdit = !!dependencyId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dependency_level: 'team',
      type: 'sequential',
      status: 'pending_commit',
      risk_level: 'med',
      blocked_requestor: false,
      blocked_respondent: false,
      no_work_required: false,
      notify_on_commit: true,
      notify_on_delivery: true,
    },
  });

  const hasChanges = form.formState.isDirty;

  // Fetch existing dependency
  const { data: existingDependency } = useQuery({
    queryKey: ['dependency', dependencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name),
          to_feature:features!dependencies_to_feature_id_fkey(id, name),
          requesting_team:teams!dependencies_requesting_team_id_fkey(id, name),
          depends_on_team:teams!dependencies_depends_on_team_id_fkey(id, name),
          requesting_program:programs!dependencies_requesting_program_id_fkey(id, name),
          depends_on_program:programs!dependencies_depends_on_program_id_fkey(id, name),
          external_entity:external_entities(id, name)
        `)
        .eq('id', dependencyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  // Fetch lookup data
  const { data: features } = useQuery({
    queryKey: ['features-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id, team_id, project_id')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('program_increments').select('id, name').order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: iterations } = useQuery({
    queryKey: ['iterations-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('iterations').select('id, name, start_date').order('start_date');
      if (error) throw error;
      return data;
    },
  });

  const { data: externalEntities } = useQuery({
    queryKey: ['external-entities-lookup'],
    queryFn: async () => {
      const { data, error } = await supabase.from('external_entities').select('id, name, entity_type').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingDependency) {
      form.reset({
        dependency_level: existingDependency.dependency_level as any || 'team',
        from_feature_id: existingDependency.from_feature_id || undefined,
        to_feature_id: existingDependency.to_feature_id || undefined,
        requesting_team_id: existingDependency.requesting_team_id || undefined,
        requesting_program_id: existingDependency.requesting_project_id || undefined,
        depends_on_team_id: existingDependency.depends_on_team_id || undefined,
        depends_on_program_id: existingDependency.depends_on_project_id || undefined,
        external_entity_id: existingDependency.external_entity_id || undefined,
        owner_id: existingDependency.owner_id || undefined,
        pi_id: existingDependency.pi_id || undefined,
        type: existingDependency.type as any || 'sequential',
        status: existingDependency.status as any || 'pending_commit',
        risk_level: existingDependency.risk_level || 'med',
        needed_by_date: existingDependency.needed_by_date || undefined,
        needed_by_sprint_id: existingDependency.needed_by_sprint_id || undefined,
        committed_by_date: existingDependency.committed_by_date || undefined,
        committed_by_sprint_id: existingDependency.committed_by_sprint_id || undefined,
        description: existingDependency.description || undefined,
        blocked_requestor: existingDependency.blocked_requestor || false,
        blocked_respondent: existingDependency.blocked_respondent || false,
        blocked_reason_requestor: existingDependency.blocked_reason_requestor || undefined,
        blocked_reason_respondent: existingDependency.blocked_reason_respondent || undefined,
        no_work_required: existingDependency.no_work_required || false,
        rejection_reason: existingDependency.rejection_reason || undefined,
        notify_on_commit: existingDependency.notify_on_commit ?? true,
        notify_on_delivery: existingDependency.notify_on_delivery ?? true,
      });
    }
  }, [existingDependency, form]);

  // Reset to default tab when drawer opens
  useEffect(() => {
    if (open) {
      setActiveTab('details');
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: any = {
        dependency_level: data.dependency_level,
        type: data.type,
        status: data.status,
        risk_level: data.risk_level,
        description: data.description,
        pi_id: data.pi_id || null,
        owner_id: data.owner_id || null,
        from_feature_id: data.from_feature_id || null,
        to_feature_id: data.to_feature_id || null,
        requesting_team_id: data.requesting_team_id || null,
        requesting_program_id: data.requesting_program_id || null,
        depends_on_team_id: data.depends_on_team_id || null,
        depends_on_program_id: data.depends_on_program_id || null,
        external_entity_id: data.external_entity_id || null,
        needed_by_date: data.needed_by_date || null,
        needed_by_sprint_id: data.needed_by_sprint_id || null,
        committed_by_date: data.committed_by_date || null,
        committed_by_sprint_id: data.committed_by_sprint_id || null,
        blocked_requestor: data.blocked_requestor || false,
        blocked_respondent: data.blocked_respondent || false,
        blocked_reason_requestor: data.blocked_reason_requestor || null,
        blocked_reason_respondent: data.blocked_reason_respondent || null,
        no_work_required: data.no_work_required || false,
        rejection_reason: data.rejection_reason || null,
        notify_on_commit: data.notify_on_commit ?? true,
        notify_on_delivery: data.notify_on_delivery ?? true,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('dependencies')
          .update(payload)
          .eq('id', dependencyId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dependencies').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies-grid'] });
      queryClient.invalidateQueries({ queryKey: ['dependency', dependencyId] });
      toast.success(isEdit ? 'Dependency updated' : 'Dependency created');
      handleClose();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} dependency: ${error.message}`);
    },
  });

  const handleAttemptClose = () => {
    if (hasChanges) {
      setShowUnsavedChangesDialog(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    form.reset();
    setShowUnsavedChangesDialog(false);
    onClose();
  };

  const handleDiscardAndClose = () => {
    form.reset();
    setShowUnsavedChangesDialog(false);
    onClose();
  };

  const handleSave = () => {
    form.handleSubmit((data) => mutation.mutate(data))();
  };

  const handleSaveAndClose = () => {
    form.handleSubmit((data) => {
      mutation.mutate(data);
    })();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dependencies?id=${dependencyId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const dependencyLevel = form.watch('dependency_level');

  // Drawer width classes matching Business Drawer
  const drawerWidthClass = isExpanded 
    ? 'w-screen sm:w-[70vw] sm:max-w-[1120px]' 
    : 'w-screen sm:w-[65vw] sm:max-w-[980px]';

  if (!open) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleAttemptClose()}>
        <SheetContent 
          side="right" 
          hideClose 
          className={cn("p-0 flex flex-col", drawerWidthClass)}
          style={{ 
            background: 'var(--surface-bg, hsl(var(--background)))',
            borderLeft: '1px solid var(--border-default, hsl(var(--border)))'
          }}
        >
          <SheetHeader className="flex-col space-y-0 shrink-0 p-0">
            
            {/* ═══════════════════════════════════════════════════════════
                BREADCRUMB ROW
                ═══════════════════════════════════════════════════════════ */}
            <div 
              className="px-5 pt-2.5 pb-1.5 flex items-center gap-1.5"
              style={{ borderBottom: '1px solid var(--border-subtle, hsl(var(--border)/0.5))' }}
            >
              <span 
                className="text-[10px] font-medium uppercase tracking-[0.5px]"
                style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
              >
                Dependencies
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>/</span>
              <span 
                className="text-[11px] font-semibold font-mono"
                style={{ color: '#8B7355' }}
              >
                {isEdit ? `DEP-${dependencyId?.slice(0, 4).toUpperCase()}` : 'New'}
              </span>
              {isEdit && (
                <button
                  onClick={handleCopyLink}
                  className="p-1 rounded hover:bg-[var(--surface-hover,hsl(var(--muted)))] transition-colors"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                  title="Copy link"
                >
                  <LinkIcon className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                HERO ROW: Title + Actions
                ═══════════════════════════════════════════════════════════ */}
            <div className="flex items-start justify-between px-5 py-3 gap-4">
              
              {/* Left Side: Title + Subtitle */}
              <div className="flex-1 min-w-0 space-y-1">
                <SheetTitle 
                  className="text-[18px] font-semibold tracking-[-0.3px] leading-tight"
                  style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}
                >
                  {isEdit ? 'Edit Dependency' : 'Create Dependency'}
                </SheetTitle>
                <SheetDescription 
                  className="text-[13px]"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                >
                  {isEdit && existingDependency ? (
                    `${existingDependency.from_feature?.name || 'Unknown'} → ${existingDependency.to_feature?.name || 'Unknown'}`
                  ) : (
                    'Define a new dependency relationship'
                  )}
                </SheetDescription>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                
                {/* Save Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-[13px] font-medium text-white"
                      style={{ 
                        background: '#5C7C5C',
                        boxShadow: '0 2px 4px rgba(92, 124, 92, 0.25)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#4A6A4A'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#5C7C5C'}
                    >
                      {isEdit ? 'Save' : 'Create'}
                      <ChevronDown className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="z-[400] w-40"
                    style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
                  >
                    <DropdownMenuItem onSelect={handleSave}>
                      {isEdit ? 'Save' : 'Create'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleSaveAndClose}>
                      {isEdit ? 'Save & Close' : 'Create & Close'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* More Options (Edit mode only) */}
                {isEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
                        style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-48 z-[400]"
                      style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}
                    >
                      <DropdownMenuItem onSelect={() => toast.info('Subscribe to dependency updates')}>
                        <Bell className="h-4 w-4 mr-2" />
                        Subscribe
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setActiveTab('audit')}>
                        <History className="h-4 w-4 mr-2" />
                        Audit Log
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => toast.info('Refresh dependency status')}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Status
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => toast.info('Copy dependency')}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onSelect={() => setShowDeleteConfirm(true)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpand}
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                {/* Close */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleAttemptClose}
                  className="h-8 w-8 hover:bg-[var(--surface-hover,hsl(var(--muted)))]"
                  style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Bottom Border */}
            <div style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }} />
          </SheetHeader>

          {/* ═══════════════════════════════════════════════════════════
              TABS - Matching Business Drawer Pattern
              ═══════════════════════════════════════════════════════════ */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList 
              className="w-full justify-start rounded-none h-10 shrink-0 overflow-x-auto flex-nowrap px-5 bg-transparent"
              style={{ borderBottom: '1px solid var(--border-default, hsl(var(--border)))' }}
            >
              <TabsTrigger
                value="details"
                className="relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="negotiation"
                className="relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground"
              >
                Negotiation
              </TabsTrigger>
              <TabsTrigger
                value="stories"
                className="relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground"
              >
                Stories
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap bg-transparent border-none rounded-none data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground"
              >
                Audit
              </TabsTrigger>
            </TabsList>

            {/* ═══════════════════════════════════════════════════════════
                DRAWER BODY
                ═══════════════════════════════════════════════════════════ */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ background: 'var(--surface-subtle, hsl(var(--muted)/0.3))' }}
            >
              <Form {...form}>
                <form className="h-full flex flex-col">
                  
                  {/* Details Tab */}
                  <TabsContent value="details" className="m-0 focus-visible:outline-none p-5 pb-8">
                    <div className="space-y-6">
                      
                      {/* Core Information Section */}
                      <div className="space-y-4">
                        <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                          <Users className="h-4 w-4" />
                          Core Information
                        </h3>

                        {/* Row 1: Dependency Level | Program Increment */}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dependency_level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">Dependency Level*</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[400]">
                                    <SelectItem value="team">Team Dependency</SelectItem>
                                    <SelectItem value="program">Program Dependency</SelectItem>
                                    <SelectItem value="external">External Dependency</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pi_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">Program Increment*</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select PI" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[400]">
                                    {programIncrements?.map(pi => (
                                      <SelectItem key={pi.id} value={pi.id}>{pi.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Row 2: Requesting Team | Depends On Team (Team level) */}
                        {dependencyLevel === 'team' && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="requesting_team_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[13px] font-medium">Requesting Team*</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Select team" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="z-[400]">
                                        {teams?.map(team => (
                                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="depends_on_team_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[13px] font-medium">Depends On Team*</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Select team" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="z-[400]">
                                        {teams?.map(team => (
                                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Row 3: Work Item (Requesting) */}
                            <FormField
                              control={form.control}
                              name="from_feature_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[13px] font-medium">Work Item (Requesting)*</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select feature" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="z-[400]">
                                      {features?.map(feature => (
                                        <SelectItem key={feature.id} value={feature.id}>
                                          {feature.display_id}: {feature.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {/* Program Level Fields */}
                        {dependencyLevel === 'program' && (
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="requesting_program_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[13px] font-medium">Requesting Program*</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select program" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="z-[400]">
                                      {programs?.map(program => (
                                        <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="depends_on_program_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[13px] font-medium">Depends On Program*</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select program" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="z-[400]">
                                      {programs?.map(program => (
                                        <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* External Entity Field */}
                        {dependencyLevel === 'external' && (
                          <FormField
                            control={form.control}
                            name="external_entity_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">External Entity*</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select external entity" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[400]">
                                    {externalEntities?.map(entity => (
                                      <SelectItem key={entity.id} value={entity.id}>
                                        {entity.name} ({entity.entity_type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Description - Full Width */}
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[13px] font-medium">Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe what needs to be delivered..."
                                  className="min-h-[100px] resize-y"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Row 4: Type | Risk Level */}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">Type*</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[400]">
                                    <SelectItem value="sequential">Sequential</SelectItem>
                                    <SelectItem value="concurrent">Concurrent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="risk_level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">Risk Level*</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[400]">
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="med">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Needed By Sprint | Needed By Date */}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="needed_by_sprint_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">Needed By Sprint</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select sprint" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-[400]">
                                    {iterations?.map(sprint => (
                                      <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="needed_by_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">Or Needed By Date</FormLabel>
                                <FormControl>
                                  <Input type="date" className="h-9" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Negotiation Tab */}
                  <TabsContent value="negotiation" className="m-0 focus-visible:outline-none p-5 pb-8">
                    <div className="space-y-6">
                      <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>
                        <Calendar className="h-4 w-4" />
                        Negotiation & Commitment
                      </h3>

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[13px] font-medium">Status*</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="z-[400]">
                                <SelectItem value="pending_commit">Pending Commit</SelectItem>
                                <SelectItem value="negotiation">Negotiation</SelectItem>
                                <SelectItem value="committed">Committed</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                                <SelectItem value="no_work_done">No Work Done</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="committed_by_sprint_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[13px] font-medium">Committed By Sprint</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select sprint" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="z-[400]">
                                  {iterations?.map(sprint => (
                                    <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="committed_by_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[13px] font-medium">Or Committed By Date</FormLabel>
                              <FormControl>
                                <Input type="date" className="h-9" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="blocked_requestor"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal text-[13px]">
                                Blocked (Requestor): Is this work still blocked?
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        {form.watch('blocked_requestor') && (
                          <FormField
                            control={form.control}
                            name="blocked_reason_requestor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">Blocked Reason (Requestor)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Why is the requesting party blocked?" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="blocked_respondent"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal text-[13px]">
                                Blocked (Respondent): Is this work still blocked?
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        {form.watch('blocked_respondent') && (
                          <FormField
                            control={form.control}
                            name="blocked_reason_respondent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[13px] font-medium">Blocked Reason (Respondent)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Why is the responding party blocked?" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="no_work_required"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0 font-normal text-[13px]">
                                No Work Required
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch('status') === 'rejected' && (
                        <FormField
                          control={form.control}
                          name="rejection_reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[13px] font-medium">Rejection Reason*</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Explain why this dependency was rejected..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </TabsContent>

                  {/* Stories Tab */}
                  <TabsContent value="stories" className="m-0 focus-visible:outline-none p-5 pb-8">
                    <div className="text-center text-sm py-12" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>
                      Related stories will appear here
                    </div>
                  </TabsContent>

                  {/* Audit Tab */}
                  <TabsContent value="audit" className="m-0 focus-visible:outline-none p-5 pb-8">
                    <div className="text-center text-sm py-12" style={{ color: 'var(--text-muted, hsl(var(--muted-foreground)))' }}>
                      Audit log will appear here
                    </div>
                  </TabsContent>
                </form>
              </Form>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                STICKY FOOTER
                ═══════════════════════════════════════════════════════════ */}
            <div 
              className="flex justify-end gap-3 px-5 py-4 border-t shrink-0"
              style={{ 
                background: 'var(--surface-bg, hsl(var(--background)))',
                borderColor: 'var(--border-default, hsl(var(--border)))'
              }}
            >
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAttemptClose}
                className="h-9 px-4 text-[13px]"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={handleSave}
                disabled={mutation.isPending} 
                className="h-9 px-4 text-[13px] text-white"
                style={{ background: '#5C7C5C' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#4A6A4A'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#5C7C5C'}
              >
                {mutation.isPending ? 'Saving...' : isEdit ? 'Save' : 'Create'}
              </Button>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedChangesDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscardAndClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={handleSaveAndClose}
              className="text-white"
              style={{ background: '#5C7C5C' }}
            >
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent style={{ background: 'var(--surface-bg, hsl(var(--background)))', borderColor: 'var(--border-default, hsl(var(--border)))' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--text-primary, hsl(var(--foreground)))' }}>Delete Dependency</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>
              Are you sure you want to delete this dependency? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                toast.info('Delete functionality coming soon');
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
