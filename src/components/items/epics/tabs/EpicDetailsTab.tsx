import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Link as LinkIcon, Lock, Unlock, Plus, Loader2, X, ChevronRight, Search } from 'lucide-react';
import { WSJFInlineScores } from '@/components/wsjf';
import { AddPIDialog } from '../dialogs/AddPIDialog';
import { AddProgramDialog } from '../dialogs/AddProgramDialog';
import { RiskDialog } from '@/components/forms/RiskDialog';
import { toast } from 'sonner';

interface EpicDetailsTabProps {
  epic: any;
}

export function EpicDetailsTab({ epic }: EpicDetailsTabProps) {
  const [addPIOpen, setAddPIOpen] = useState(false);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [hideDetails, setHideDetails] = useState(false);
  const [acceptanceCriteriaOpen, setAcceptanceCriteriaOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [dependenciesOpen, setDependenciesOpen] = useState(false);
  const [newCriteriaText, setNewCriteriaText] = useState('');
  const [showAddDependency, setShowAddDependency] = useState(false);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const queryClient = useQueryClient();

  // Local state for all editable fields
  const [formData, setFormData] = useState({
    state: epic.state || 'funnel',
    process_step_id: epic.process_step_id || '',
    epic_type: epic.epic_type || 'business',
    mvp: epic.mvp || false,
    primary_program_id: epic.primary_program_id || '',
    owner_id: epic.owner_id || '',
    report_color: epic.report_color || 'blue',
    description: epic.description || '',
    portfolio_ask_date: epic.portfolio_ask_date || '',
    initiation_date: epic.initiation_date || '',
    target_completion_date: epic.target_completion_date || '',
    date_locked: epic.date_locked || false,
    capitalized: epic.capitalized || false,
    estimation_system: epic.estimation_system || 'points',
    strategic_value_score: epic.strategic_value_score || '',
    effort_swag: epic.effort_swag || '',
    strategic_driver: epic.strategic_driver || '',
    ability_to_execute: epic.ability_to_execute || '',
    quadrant: epic.quadrant || '',
    investment_type: epic.investment_type || '',
    tags: epic.tags?.join(', ') || '',
    customers: epic.customers?.join('\n') || '',
  });

  // Update local state when epic prop changes
  useEffect(() => {
    setFormData({
      state: epic.state || 'funnel',
      process_step_id: epic.process_step_id || '',
      epic_type: epic.epic_type || 'business',
      mvp: epic.mvp || false,
      primary_program_id: epic.primary_program_id || '',
      owner_id: epic.owner_id || '',
      report_color: epic.report_color || 'blue',
      description: epic.description || '',
      portfolio_ask_date: epic.portfolio_ask_date || '',
      initiation_date: epic.initiation_date || '',
      target_completion_date: epic.target_completion_date || '',
      date_locked: epic.date_locked || false,
      capitalized: epic.capitalized || false,
      estimation_system: epic.estimation_system || 'points',
      strategic_value_score: epic.strategic_value_score || '',
      effort_swag: epic.effort_swag || '',
      strategic_driver: epic.strategic_driver || '',
      ability_to_execute: epic.ability_to_execute || '',
      quadrant: epic.quadrant || '',
      investment_type: epic.investment_type || '',
      tags: epic.tags?.join(', ') || '',
      customers: epic.customers?.join('\n') || '',
    });
  }, [epic]);
  
  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data } = await supabase.from('strategic_themes').select('*').order('name');
      return data || [];
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('*').order('name');
      return data || [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      return data || [];
    },
  });

  // Fetch process steps from database
  const { data: processSteps } = useQuery({
    queryKey: ['process-steps'],
    queryFn: async () => {
      const { data } = await supabase.from('process_steps').select('id, name, sort_order').order('sort_order');
      return data || [];
    },
  });

  // Fetch assigned PIs for this epic
  const { data: epicPIs } = useQuery({
    queryKey: ['epic-pis', epic.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('epic_program_increments')
        .select('pi_id, program_increments(id, name)')
        .eq('epic_id', epic.id);
      return data || [];
    },
  });

  // Fetch additional programs for this epic
  const { data: additionalPrograms } = useQuery({
    queryKey: ['epic-additional-programs', epic.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('epic_programs')
        .select('program_id, programs(id, name)')
        .eq('epic_id', epic.id);
      return data || [];
    },
  });

  // Fetch epic spend for budget
  const { data: epicSpend } = useQuery({
    queryKey: ['epic-spend', epic.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('epic_spend')
        .select('*')
        .eq('epic_id', epic.id)
        .single();
      return data;
    },
  });

  // Fetch acceptance criteria for this epic
  const { data: acceptanceCriteria } = useQuery({
    queryKey: ['epic-acceptance-criteria', epic.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('epic_acceptance_criteria')
        .select('*')
        .eq('epic_id', epic.id)
        .order('created_at');
      return data || [];
    },
  });

  // Fetch available risks filtered by program context
  const { data: availableRisks } = useQuery({
    queryKey: ['available-risks-for-epic', epic.primary_program_id, epic.theme_id],
    queryFn: async () => {
      let query = supabase
        .from('risks')
        .select('id, title, status, impact, occurrence, program_id')
        .is('deleted_at', null);
      
      // Filter by program or theme context
      if (epic.primary_program_id) {
        query = query.eq('program_id', epic.primary_program_id);
      }
      
      const { data } = await query.order('title');
      return data || [];
    },
  });

  // Fetch dependencies count for this epic (via features)
  const { data: epicDependencies } = useQuery({
    queryKey: ['epic-dependencies', epic.id, epic.primary_program_id],
    queryFn: async () => {
      // Get feature IDs for this epic
      const { data: features } = await supabase
        .from('features')
        .select('id')
        .eq('epic_id', epic.id);
      
      if (!features || features.length === 0) return { count: 0, dependencies: [] };
      
      const featureIds = features.map(f => f.id);
      
      // Fetch dependencies where from_feature_id or to_feature_id is in our features
      const { data: deps } = await supabase
        .from('dependencies')
        .select('*, from_feature:from_feature_id(id, name), to_feature:to_feature_id(id, name)')
        .or(`from_feature_id.in.(${featureIds.join(',')}),to_feature_id.in.(${featureIds.join(',')})`);
      
      return { count: deps?.length || 0, dependencies: deps || [] };
    },
  });

  // Fetch available dependencies for linking (from program context)
  const { data: availableDependencies } = useQuery({
    queryKey: ['available-dependencies-for-epic', epic.primary_program_id],
    queryFn: async () => {
      if (!epic.primary_program_id) return [];
      
      const { data } = await supabase
        .from('dependencies')
        .select('*, from_feature:from_feature_id(id, name, program_id), to_feature:to_feature_id(id, name, program_id)')
        .or(`requesting_program_id.eq.${epic.primary_program_id},depends_on_program_id.eq.${epic.primary_program_id}`)
        .limit(50);
      
      return data || [];
    },
    enabled: !!epic.primary_program_id,
  });

  // Mutation to update epic
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof formData>) => {
      // Transform data for database
      const dbUpdates: any = { ...updates };
      
      // Handle tags array
      if (updates.tags !== undefined) {
        dbUpdates.tags = updates.tags 
          ? updates.tags.split(',').map(t => t.trim()).filter(Boolean)
          : null;
      }
      
      // Handle customers array
      if (updates.customers !== undefined) {
        dbUpdates.customers = updates.customers
          ? updates.customers.split('\n').map(c => c.trim()).filter(Boolean)
          : null;
      }

      // Handle empty strings as null
      Object.keys(dbUpdates).forEach(key => {
        if (dbUpdates[key] === '') {
          dbUpdates[key] = null;
        }
      });

      const { error } = await supabase
        .from('epics')
        .update(dbUpdates)
        .eq('id', epic.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-detail', epic.id] });
      toast.success('Epic updated');
    },
    onError: () => {
      toast.error('Failed to update epic');
    }
  });

  // Mutation to save budget to epic_spend table
  const budgetMutation = useMutation({
    mutationFn: async (budget: number | null) => {
      // Check if epic_spend record exists
      const { data: existing } = await supabase
        .from('epic_spend')
        .select('id')
        .eq('epic_id', epic.id)
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from('epic_spend')
          .update({ budget })
          .eq('epic_id', epic.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('epic_spend')
          .insert({ epic_id: epic.id, budget });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-spend', epic.id] });
      toast.success('Budget updated');
    },
    onError: () => toast.error('Failed to update budget'),
  });

  // Mutation to add acceptance criteria
  const addCriteriaMutation = useMutation({
    mutationFn: async (description: string) => {
      const { error } = await supabase
        .from('epic_acceptance_criteria')
        .insert({ epic_id: epic.id, description });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-acceptance-criteria', epic.id] });
      setNewCriteriaText('');
      toast.success('Acceptance criteria added');
    },
    onError: () => toast.error('Failed to add criteria'),
  });

  // Mutation to delete acceptance criteria
  const deleteCriteriaMutation = useMutation({
    mutationFn: async (criteriaId: string) => {
      const { error } = await supabase
        .from('epic_acceptance_criteria')
        .delete()
        .eq('id', criteriaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-acceptance-criteria', epic.id] });
      toast.success('Criteria removed');
    },
    onError: () => toast.error('Failed to remove criteria'),
  });

  // Mutation to link risk to epic
  const linkRiskMutation = useMutation({
    mutationFn: async (riskId: string) => {
      const { error } = await supabase
        .from('risks')
        .update({ relationship: 'Epic', related_item_id: epic.id })
        .eq('id', riskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-linked-risks', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['available-risks-for-epic'] });
      toast.success('Risk linked');
    },
    onError: () => toast.error('Failed to link risk'),
  });

  // Mutation to unlink risk from epic
  const unlinkRiskMutation = useMutation({
    mutationFn: async (riskId: string) => {
      const { error } = await supabase
        .from('risks')
        .update({ relationship: null, related_item_id: null })
        .eq('id', riskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-linked-risks', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['available-risks-for-epic'] });
      toast.success('Risk unlinked');
    },
    onError: () => toast.error('Failed to unlink risk'),
  });

  // Fetch linked risks for this epic
  const { data: linkedRisks } = useQuery({
    queryKey: ['epic-linked-risks', epic.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('risks')
        .select('id, title, status, impact, occurrence')
        .eq('relationship', 'Epic')
        .eq('related_item_id', epic.id)
        .is('deleted_at', null);
      return data || [];
    },
  });
  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    updateMutation.mutate({ [field]: value });
  };

  // Handle text field blur (for text inputs that shouldn't save on every keystroke)
  const handleTextBlur = (field: keyof typeof formData) => {
    updateMutation.mutate({ [field]: formData[field] });
  };

  return (
    <div className="space-y-6">
      {/* Saving indicator */}
      {updateMutation.isPending && (
        <div className="fixed top-4 right-4 bg-background border rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}

      {/* Classification Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Classification</h3>
        
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">State</Label>
              <Select
                value={formData.state} 
                onValueChange={(value) => handleFieldChange('state', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">1 - Not Started</SelectItem>
                  <SelectItem value="in_progress">2 - In Progress</SelectItem>
                  <SelectItem value="accepted">3 - Accepted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Process Step</Label>
              <Select 
                value={formData.process_step_id || 'none'} 
                onValueChange={(value) => handleFieldChange('process_step_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select process step" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {processSteps?.map((step: any) => (
                    <SelectItem key={step.id} value={step.id}>{step.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select 
              value={formData.epic_type} 
              onValueChange={(value) => handleFieldChange('epic_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="architecture">Architecture</SelectItem>
                <SelectItem value="enabler">Enabler</SelectItem>
                <SelectItem value="supporting">Supporting</SelectItem>
                <SelectItem value="non_functional">Non-Functional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>MVP</Label>
            <Select 
              value={formData.mvp ? 'yes' : 'no'} 
              onValueChange={(value) => handleFieldChange('mvp', value === 'yes')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Contained In</Label>
          <div className="flex items-center gap-2 mt-2">
            {epic.theme_id ? (
              <Button variant="link" className="p-0 h-auto">
                <LinkIcon className="h-3 w-3 mr-1" />
                {themes?.find(t => t.id === epic.theme_id)?.name || 'Theme'}
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">No theme assigned</span>
            )}
          </div>
        </div>

        <div>
          <Label>Theme</Label>
          <Select 
            value={epic.theme_id || 'none'} 
            onValueChange={async (value) => {
              const newThemeId = value === 'none' ? null : value;
              const { error } = await supabase
                .from('epics')
                .update({ theme_id: newThemeId })
                .eq('id', epic.id);
              if (error) {
                toast.error('Failed to update theme');
              } else {
                queryClient.invalidateQueries({ queryKey: ['epics'] });
                queryClient.invalidateQueries({ queryKey: ['epic-detail', epic.id] });
                toast.success('Theme updated');
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {themes?.map(theme => (
                <SelectItem key={theme.id} value={theme.id}>
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </CardContent>
      </Card>

      {/* Context Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Context</h3>
        
          <div>
            <Label>Primary Program *</Label>
          <Select 
            value={formData.primary_program_id || 'none'} 
            onValueChange={(value) => handleFieldChange('primary_program_id', value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select primary program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {programs?.map(program => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            Additional Programs
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => setAddProgramOpen(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </Label>
          <div className="mt-2">
            {additionalPrograms && additionalPrograms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {additionalPrograms.map((ap: any) => (
                  <Badge key={ap.program_id} variant="outline" className="bg-white">
                    {ap.programs?.name || 'Unknown Program'}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No additional programs assigned</span>
            )}
          </div>
        </div>

        <div>
          <Label>Program Increments</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {epicPIs && epicPIs.length > 0 ? (
              epicPIs.map((epi: any) => (
                <Badge key={epi.pi_id} variant="outline" className="bg-white">
                  {epi.program_increments?.name || epi.pi_id}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No PIs assigned</span>
            )}
          </div>
          <Button 
            size="sm" 
            className="mt-2 bg-brand-gold hover:bg-brand-gold-hover text-white"
            onClick={() => setAddPIOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add PI
          </Button>
        </div>

        {/* PI-WSJF Prioritization Scores - per Jira Align EpicWSJFFields-2.png */}
        {epicPIs && epicPIs.length > 0 && (
          <div>
            <Label>WSJF Prioritization</Label>
            <div className="mt-2">
              <WSJFInlineScores 
                epicId={epic.id} 
                epicTitle={epic.name}
                epicKey={epic.epic_key}
              />
            </div>
          </div>
        )}

        <div>
          <Label>Owner</Label>
          <Select 
            value={formData.owner_id || 'none'} 
            onValueChange={(value) => handleFieldChange('owner_id', value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {users?.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Report Color</Label>
          <Select 
            value={formData.report_color} 
            onValueChange={(value) => handleFieldChange('report_color', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blue">Blue</SelectItem>
              <SelectItem value="green">Green</SelectItem>
              <SelectItem value="yellow">Yellow</SelectItem>
              <SelectItem value="red">Red</SelectItem>
              <SelectItem value="purple">Purple</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </CardContent>
      </Card>

      {/* Full Details Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Full Details</h3>
        
          <div>
            <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            onBlur={() => handleTextBlur('description')}
            rows={4}
            placeholder="Enter epic description"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Portfolio Ask Date</Label>
            <Input 
              type="date" 
              value={formData.portfolio_ask_date} 
              onChange={(e) => handleFieldChange('portfolio_ask_date', e.target.value)}
            />
          </div>
          <div>
            <Label>Initiation Date</Label>
            <Input 
              type="date" 
              value={formData.initiation_date}
              onChange={(e) => handleFieldChange('initiation_date', e.target.value)}
            />
          </div>
          <div>
            <Label>Target Completion Date</Label>
            <div className="flex gap-2">
              <Input 
                type="date" 
                value={formData.target_completion_date}
                onChange={(e) => handleFieldChange('target_completion_date', e.target.value)}
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleFieldChange('date_locked', !formData.date_locked)}
              >
                {formData.date_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Label>Health</Label>
          <div className="mt-2">
            <HealthBadge health={epic.health} />
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Financial & Estimation Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Financial & Estimation</h3>
        
          <div className="flex items-center gap-2">
          <Checkbox 
            id="capitalized" 
            checked={formData.capitalized}
            onCheckedChange={(checked) => handleFieldChange('capitalized', checked)}
          />
          <Label htmlFor="capitalized">Capitalized</Label>
        </div>

        <div>
          <Label>Budget (SAR)</Label>
          <Input 
            type="number" 
            defaultValue={epicSpend?.budget || ''}
            onBlur={(e) => {
              const value = e.target.value ? parseFloat(e.target.value) : null;
              budgetMutation.mutate(value);
            }}
            placeholder="Enter budget" 
          />
        </div>

        <div>
          <Label>Estimation System</Label>
          <Select 
            value={formData.estimation_system} 
            onValueChange={(value) => handleFieldChange('estimation_system', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="points">Points</SelectItem>
              <SelectItem value="wsjf">WSJF</SelectItem>
              <SelectItem value="tshirt">T-Shirt Sizing</SelectItem>
              <SelectItem value="team_weeks">Team Weeks</SelectItem>
              <SelectItem value="member_weeks">Member Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </CardContent>
      </Card>

      {/* Strategy & Analysis Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Strategy & Analysis</h3>
        
          <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Strategic Value Score (1-100)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.strategic_value_score}
              onChange={(e) => setFormData(prev => ({ ...prev, strategic_value_score: e.target.value }))}
              onBlur={() => handleTextBlur('strategic_value_score')}
            />
          </div>
          <div>
            <Label>Effort SWAG (1-100)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.effort_swag}
              onChange={(e) => setFormData(prev => ({ ...prev, effort_swag: e.target.value }))}
              onBlur={() => handleTextBlur('effort_swag')}
            />
          </div>
        </div>

        <div>
          <Label>Strategic Driver</Label>
          <Input 
            value={formData.strategic_driver}
            onChange={(e) => setFormData(prev => ({ ...prev, strategic_driver: e.target.value }))}
            onBlur={() => handleTextBlur('strategic_driver')}
          />
        </div>

        <div>
          <Label>Ability to Execute</Label>
          <Select 
            value={formData.ability_to_execute || 'none'} 
            onValueChange={(value) => handleFieldChange('ability_to_execute', value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not Set</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Quadrant</Label>
          <Select 
            value={formData.quadrant || 'none'} 
            onValueChange={(value) => handleFieldChange('quadrant', value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select quadrant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not Set</SelectItem>
              <SelectItem value="core">Core</SelectItem>
              <SelectItem value="strategic">Strategic</SelectItem>
              <SelectItem value="competitive">Competitive</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Investment Type</Label>
          <Select 
            value={formData.investment_type || 'none'} 
            onValueChange={(value) => handleFieldChange('investment_type', value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not Set</SelectItem>
              <SelectItem value="new_product">New Product</SelectItem>
              <SelectItem value="product_enhancement">Product Enhancement</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="research">Research</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tags</Label>
          {/* Existing Tags as Chips */}
          {formData.tags && formData.tags.split(',').filter(t => t.trim()).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.split(',').filter(t => t.trim()).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="flex items-center gap-1 px-2 py-1 bg-brand-gold/10 text-brand-gold border-brand-gold/20"
                >
                  {tag.trim()}
                  <button
                    type="button"
                    onClick={() => {
                      const currentTags = formData.tags.split(',').filter(t => t.trim());
                      const newTags = currentTags.filter((_, i) => i !== index);
                      const newTagsString = newTags.join(', ');
                      setFormData(prev => ({ ...prev, tags: newTagsString }));
                      updateMutation.mutate({ tags: newTagsString });
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {/* Input to Add New Tag */}
          <Input
            className="w-full text-sm"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const newTag = newTagInput.trim();
                if (newTag && !newTag.startsWith('j:')) {
                  const currentTags = formData.tags ? formData.tags.split(',').filter(t => t.trim()) : [];
                  if (!currentTags.includes(newTag)) {
                    const newTagsString = [...currentTags, newTag].join(', ');
                    setFormData(prev => ({ ...prev, tags: newTagsString }));
                    updateMutation.mutate({ tags: newTagsString });
                  }
                  setNewTagInput('');
                }
              }
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">Tags sync as labels across work items.</p>
        </div>

        <div>
          <Label>Customers</Label>
          <Textarea
            value={formData.customers}
            onChange={(e) => setFormData(prev => ({ ...prev, customers: e.target.value }))}
            onBlur={() => handleTextBlur('customers')}
            rows={3}
            placeholder="Enter customer names (one per line)"
          />
        </div>
        </CardContent>
      </Card>

      {/* Hide Details Toggle */}
      <div className="border-t border-dashed pt-2">
        <button
          onClick={() => setHideDetails(!hideDetails)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {hideDetails ? '+ Show Details' : '- Hide Details'}
        </button>
      </div>

      {!hideDetails && (
        <>
          {/* Acceptance Criteria Collapsible Section */}
          <Collapsible open={acceptanceCriteriaOpen} onOpenChange={setAcceptanceCriteriaOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 hover:bg-muted/50 rounded px-2 border-b border-border">
              <ChevronRight className={`h-4 w-4 transition-transform text-muted-foreground ${acceptanceCriteriaOpen ? 'rotate-90' : ''}`} />
              <span className="text-sm font-medium text-foreground">Acceptance Criteria</span>
              <Badge variant="secondary" className="ml-auto text-xs">{acceptanceCriteria?.length || 0}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 py-3 space-y-3">
                <div className="space-y-2">
                  <Textarea
                    value={newCriteriaText}
                    onChange={(e) => setNewCriteriaText(e.target.value)}
                    placeholder="Enter acceptance criteria..."
                    rows={4}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="text-xs bg-brand-gold hover:bg-brand-gold-hover text-white"
                      onClick={() => {
                        if (newCriteriaText.trim()) {
                          addCriteriaMutation.mutate(newCriteriaText.trim());
                        }
                      }}
                      disabled={!newCriteriaText.trim() || addCriteriaMutation.isPending}
                    >
                      {addCriteriaMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => setNewCriteriaText('')}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Risks Collapsible Section */}
          <Collapsible open={risksOpen} onOpenChange={setRisksOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 hover:bg-muted/50 rounded px-2 border-b border-border">
              <ChevronRight className={`h-4 w-4 transition-transform text-muted-foreground ${risksOpen ? 'rotate-90' : ''}`} />
              <span className="text-sm font-medium text-foreground">Risks</span>
              <Badge variant="secondary" className="ml-auto text-xs">{linkedRisks?.length || 0}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 py-3 space-y-3">
                {/* Display linked risks as badges */}
                {linkedRisks && linkedRisks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {linkedRisks.map((risk: any) => (
                      <Badge 
                        key={risk.id} 
                        variant={risk.status === 'Open' ? 'destructive' : 'secondary'}
                        className="text-xs px-2 py-1 flex items-center gap-1.5"
                      >
                        <span className="font-medium">RSK-{risk.id?.slice(0, 4)}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="max-w-[120px] truncate">{risk.title}</span>
                        <span className="text-muted-foreground">|</span>
                        <span>{risk.status}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); unlinkRiskMutation.mutate(risk.id); }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {(!linkedRisks || linkedRisks.length === 0) && (
                  <div className="text-sm text-muted-foreground">No risks linked</div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setRiskDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Risk
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Risk Dialog for creating new risks */}
          <RiskDialog 
            open={riskDialogOpen} 
            onOpenChange={(open) => {
              setRiskDialogOpen(open);
              if (!open) {
                // Refresh linked risks after dialog closes
                queryClient.invalidateQueries({ queryKey: ['linked-risks', epic.id] });
                queryClient.invalidateQueries({ queryKey: ['available-risks'] });
              }
            }}
          />

          {/* Dependencies Collapsible Section */}
          <Collapsible open={dependenciesOpen} onOpenChange={setDependenciesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 hover:bg-muted/50 rounded px-2 border-b border-border">
              <ChevronRight className={`h-4 w-4 transition-transform text-muted-foreground ${dependenciesOpen ? 'rotate-90' : ''}`} />
              <span className="text-sm font-medium text-foreground">Dependencies</span>
              <Badge variant="secondary" className="ml-auto text-xs">{epicDependencies?.count || 0}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 py-3 space-y-3">
                {/* Display dependencies as badges */}
                {epicDependencies?.dependencies && epicDependencies.dependencies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {epicDependencies.dependencies.map((dep: any) => (
                      <Badge 
                        key={dep.id} 
                        variant={dep.status === 'open' ? 'outline' : dep.status === 'committed' ? 'default' : 'secondary'}
                        className="text-xs px-2 py-1 flex items-center gap-1.5"
                      >
                        <span className="font-medium">DEP-{dep.id?.slice(0, 4)}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="max-w-[100px] truncate">{dep.from_feature?.name || 'Unknown'}</span>
                        <span>→</span>
                        <span className="max-w-[100px] truncate">{dep.to_feature?.name || 'Unknown'}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="capitalize">{dep.status}</span>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {(!epicDependencies?.dependencies || epicDependencies.dependencies.length === 0) && !showAddDependency && (
                  <div className="text-sm text-muted-foreground">No dependencies linked</div>
                )}
                
                {showAddDependency ? (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      Link existing dependency or create new:
                    </div>
                    <ScrollArea className="h-[120px] border rounded-md">
                      {availableDependencies && availableDependencies.length > 0 ? (
                        availableDependencies.map((dep: any) => (
                          <div
                            key={dep.id}
                            className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs font-medium text-muted-foreground">DEP-{dep.id?.slice(0, 4)}</span>
                              <span className="text-sm text-foreground truncate">
                                {dep.from_feature?.name || 'Unknown'} → {dep.to_feature?.name || 'Unknown'}
                              </span>
                            </div>
                            <Badge variant="outline" className="ml-2 text-xs capitalize">{dep.status}</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-muted-foreground">No available dependencies in program context</div>
                      )}
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="text-xs bg-brand-gold hover:bg-brand-gold-hover text-white"
                        onClick={() => {
                          toast.info('Dependency creation via Dependencies module');
                          setShowAddDependency(false);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Create New Dependency
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => setShowAddDependency(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => setShowAddDependency(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Dependency
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      <AddPIDialog
        epicId={epic.id}
        currentPIs={epicPIs?.map((epi: any) => epi.pi_id) || []}
        open={addPIOpen}
        onOpenChange={setAddPIOpen}
      />

      <AddProgramDialog
        epicId={epic.id}
        primaryProgramId={epic.primary_program_id}
        open={addProgramOpen}
        onOpenChange={setAddProgramOpen}
      />
    </div>
  );
}
