import { useEffect, useState } from 'react';
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
import { MoreVertical, MessageSquare, Bell, History, Copy, Trash2, Edit, RefreshCw } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Calendar, Users, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
        requesting_project_id: existingDependency.requesting_project_id || undefined,
        depends_on_team_id: existingDependency.depends_on_team_id || undefined,
        depends_on_project_id: existingDependency.depends_on_project_id || undefined,
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
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} dependency: ${error.message}`);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const dependencyLevel = form.watch('dependency_level');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="executive-drawer w-full sm:w-[600px] md:w-[700px] lg:w-[800px] sm:max-w-[90vw] p-0 flex flex-col overflow-hidden bg-white">
        <SheetHeader className="executive-drawer-header flex-row items-center justify-between space-y-0 shrink-0 bg-white px-3 md:px-4 py-2 border-b border-neutral-200">
          <div className="flex-1 pr-2 min-w-0">
            <SheetTitle className="executive-drawer-title truncate text-base font-semibold">
              {isEdit ? 'Edit Dependency' : 'Create Dependency'}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground truncate">
              {isEdit && existingDependency ? (
                `${existingDependency.from_feature?.name || 'Unknown'} → ${existingDependency.to_feature?.name || 'Unknown'}`
              ) : (
                'Define a new dependency relationship'
              )}
            </SheetDescription>
          </div>
          {isEdit && (
            <div className="flex items-center gap-[var(--s2)] flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#1a1a1a] hover:bg-[rgba(198,156,109,0.08)]">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => toast.info('Subscribe to dependency updates')}>
                    <Bell className="h-4 w-4 mr-2" />
                    Subscribe
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('audit')}>
                    <History className="h-4 w-4 mr-2" />
                    Audit Log
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('Refresh dependency status')}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.info('Copy dependency')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.info('Delete dependency')}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="executive-drawer-tabs overflow-x-auto flex-shrink-0">
            <TabsList className="w-full justify-start rounded-none flex-nowrap bg-transparent">
              <TabsTrigger value="details" className="executive-drawer-tab">Details</TabsTrigger>
              <TabsTrigger value="negotiation" className="executive-drawer-tab">Negotiation</TabsTrigger>
              <TabsTrigger value="stories" className="executive-drawer-tab">Stories</TabsTrigger>
              <TabsTrigger value="audit" className="executive-drawer-tab">Audit</TabsTrigger>
            </TabsList>
          </div>

          <div className="executive-drawer-content flex-1 overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">

              <TabsContent value="details" className="space-y-4 p-[var(--s4)] sm:p-[var(--s6)]">
                {/* Core Fields Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Core Information
                  </h3>

                  <FormField
                    control={form.control}
                    name="dependency_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dependency Level*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <FormLabel>Program Increment*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select PI" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {programIncrements?.map(pi => (
                              <SelectItem key={pi.id} value={pi.id}>{pi.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {dependencyLevel === 'team' && (
                    <>
                      <FormField
                        control={form.control}
                        name="requesting_team_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Requesting Team*</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                            <FormLabel>Depends On Team*</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                        name="from_feature_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Item (Requesting)*</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select feature" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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

                  {dependencyLevel === 'program' && (
                    <>
                      <FormField
                        control={form.control}
                        name="requesting_program_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Requesting Program*</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select program" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
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
                            <FormLabel>Depends On Program*</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select program" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {programs?.map(program => (
                                  <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {dependencyLevel === 'external' && (
                    <FormField
                      control={form.control}
                      name="external_entity_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>External Entity*</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select external entity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what needs to be delivered..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type*</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                          <FormLabel>Risk Level*</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="needed_by_sprint_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Needed By Sprint</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sprint" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                          <FormLabel>Or Needed By Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="negotiation" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Negotiation & Commitment
                  </h3>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                          <FormLabel>Committed By Sprint</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sprint" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                          <FormLabel>Or Committed By Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
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
                          <FormLabel className="!mt-0 font-normal">
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
                            <FormLabel>Blocked Reason (Requestor)</FormLabel>
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
                          <FormLabel className="!mt-0 font-normal">
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
                            <FormLabel>Blocked Reason (Respondent)</FormLabel>
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
                          <FormLabel className="!mt-0 font-normal">
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
                          <FormLabel>Rejection Reason*</FormLabel>
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

              <TabsContent value="negotiation" className="space-y-4 mt-4">
                <div className="text-center text-sm text-muted-foreground py-8">
                  Negotiation history will appear here
                </div>
              </TabsContent>

              <TabsContent value="stories" className="space-y-4 mt-4">
                <div className="text-center text-sm text-muted-foreground py-8">
                  Related stories will appear here
                </div>
              </TabsContent>

              <TabsContent value="audit" className="space-y-4 mt-4">
                <div className="text-center text-sm text-muted-foreground py-8">
                  Audit log will appear here
                </div>
              </TabsContent>

                <div className="flex justify-end gap-3 px-[var(--s3)] sm:px-[var(--s4)] md:px-[var(--s6)] py-[var(--s4)] mt-auto border-t sticky bottom-0 bg-background">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
                    {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}