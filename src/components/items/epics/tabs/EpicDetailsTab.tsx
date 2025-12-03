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
import { toast } from 'sonner';

interface EpicDetailsTabProps {
  epic: any;
}

export function EpicDetailsTab({ epic }: EpicDetailsTabProps) {
  const [addPIOpen, setAddPIOpen] = useState(false);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [hideDetails, setHideDetails] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [acceptanceCriteriaOpen, setAcceptanceCriteriaOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [dependenciesOpen, setDependenciesOpen] = useState(false);
  const [featureSearch, setFeatureSearch] = useState('');
  const [showFeatureSuggestions, setShowFeatureSuggestions] = useState(false);
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
    budget: epic.budget || '',
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
      budget: epic.budget || '',
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

  // Fetch child features with teams and progress - per Jira Align spec
  const { data: childProgress } = useQuery({
    queryKey: ['epic-child-progress', epic.id],
    queryFn: async () => {
      const { data: features } = await supabase
        .from('features')
        .select(`
          id, 
          name,
          display_id,
          status, 
          progress_pct,
          estimate_points,
          team_id,
          teams:team_id(id, name),
          stories:stories(id, status, estimate_points)
        `)
        .eq('epic_id', epic.id);

      if (!features || features.length === 0) {
        return { totalFeatures: 0, features: [] };
      }

      return {
        totalFeatures: features.length,
        features,
      };
    },
  });

  // Fetch available features for inline search/add
  const { data: availableFeatures } = useQuery({
    queryKey: ['available-features-for-epic', epic.id, featureSearch],
    queryFn: async () => {
      if (!featureSearch || featureSearch.length < 2) return [];
      
      const { data } = await supabase
        .from('features')
        .select('id, name, display_id, status, estimate_points, teams:team_id(name)')
        .or(`epic_id.is.null,epic_id.neq.${epic.id}`)
        .or(`name.ilike.%${featureSearch}%,display_id.ilike.%${featureSearch}%`)
        .limit(10);
      
      return data || [];
    },
    enabled: featureSearch.length >= 2,
  });

  // Fetch dependencies count for this epic (via features)
  const { data: dependenciesCount } = useQuery({
    queryKey: ['epic-dependencies-count', epic.id],
    queryFn: async () => {
      // Get feature IDs for this epic first
      const { data: features } = await supabase
        .from('features')
        .select('id')
        .eq('epic_id', epic.id);
      
      if (!features || features.length === 0) return 0;
      
      const featureIds = features.map(f => f.id);
      
      // Count dependencies where from_feature_id or to_feature_id is in our features
      const { count } = await supabase
        .from('dependencies')
        .select('*', { count: 'exact', head: true })
        .or(`from_feature_id.in.(${featureIds.join(',')}),to_feature_id.in.(${featureIds.join(',')})`);
      
      return count || 0;
    },
  });

  // Link feature to epic mutation
  const linkFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const { error } = await supabase
        .from('features')
        .update({ epic_id: epic.id })
        .eq('id', featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-child-progress', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      setFeatureSearch('');
      setShowFeatureSuggestions(false);
      toast.success('Feature linked to epic');
    },
    onError: () => toast.error('Failed to link feature'),
  });

  // Unlink feature from epic mutation
  const unlinkFeatureMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const { error } = await supabase
        .from('features')
        .update({ epic_id: null })
        .eq('id', featureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-child-progress', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature unlinked');
    },
    onError: () => toast.error('Failed to unlink feature'),
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

  // Handle field change with auto-save
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
              <Label>State</Label>
              <Select
              value={formData.state} 
              onValueChange={(value) => handleFieldChange('state', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="funnel">1 - Funnel</SelectItem>
                <SelectItem value="analyzing">2 - Analyzing</SelectItem>
                <SelectItem value="portfolio_backlog">3 - Portfolio Backlog</SelectItem>
                <SelectItem value="implementing">4 - Implementing</SelectItem>
                <SelectItem value="validating_in_production">5 - Validating in Production</SelectItem>
                <SelectItem value="done">6 - Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Process Step</Label>
            <Select 
              value={formData.process_step_id || 'none'} 
              onValueChange={(value) => handleFieldChange('process_step_id', value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select process step" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="ideation">Ideation</SelectItem>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="deployment">Deployment</SelectItem>
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
          <Label>Budget</Label>
          <Input 
            type="number" 
            value={formData.budget}
            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            onBlur={() => handleTextBlur('budget')}
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
          <Input 
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            onBlur={() => handleTextBlur('tags')}
            placeholder="Enter tags separated by commas" 
          />
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
          {/* Features Collapsible Section - per Jira Align spec */}
          <Collapsible open={featuresOpen} onOpenChange={setFeaturesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2">
              <ChevronRight className={`h-4 w-4 transition-transform ${featuresOpen ? 'rotate-90' : ''}`} />
              <span className="font-medium">Features</span>
              <Badge variant="secondary" className="ml-auto">{childProgress?.totalFeatures || 0}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 space-y-3 pt-2">
                {/* Inline Search to Add Feature */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search existing Features (type the External ID or Name)"
                    value={featureSearch}
                    onChange={(e) => {
                      setFeatureSearch(e.target.value);
                      setShowFeatureSuggestions(true);
                    }}
                    onFocus={() => setShowFeatureSuggestions(true)}
                    className="pl-9 pr-16"
                  />
                  {featureSearch.length >= 2 && (
                    <Button 
                      size="sm" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 bg-brand-gold hover:bg-brand-gold-hover"
                      onClick={() => {
                        if (availableFeatures && availableFeatures.length > 0) {
                          linkFeatureMutation.mutate(availableFeatures[0].id);
                        }
                      }}
                      disabled={!availableFeatures || availableFeatures.length === 0 || linkFeatureMutation.isPending}
                    >
                      {linkFeatureMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                    </Button>
                  )}
                  
                  {/* Autocomplete Suggestions */}
                  {showFeatureSuggestions && featureSearch.length >= 2 && availableFeatures && availableFeatures.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-[200px] overflow-auto">
                      {availableFeatures.map((feature: any) => (
                        <div
                          key={feature.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                          onClick={() => {
                            linkFeatureMutation.mutate(feature.id);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{feature.name}</span>
                            <span className="text-muted-foreground ml-2">({feature.display_id || 'No ID'})</span>
                          </div>
                          <Badge variant="outline" className="ml-2">{feature.status || 'funnel'}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Linked Features Table */}
                {childProgress?.features && childProgress.features.length > 0 && (
                  <div className="border rounded">
                    <div className="grid grid-cols-[1fr_80px_80px_100px_40px] gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                      <div>Title</div>
                      <div>Points</div>
                      <div>Status</div>
                      <div>Team</div>
                      <div></div>
                    </div>
                    <ScrollArea className="max-h-[200px]">
                      {childProgress.features.map((feature: any) => {
                        const pct = feature.progress_pct || 0;
                        
                        return (
                          <TooltipProvider key={feature.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="grid grid-cols-[1fr_80px_80px_100px_40px] gap-2 p-2 border-b hover:bg-muted/30 items-center">
                                  <div className="text-sm truncate">{feature.name}</div>
                                  <div className="text-sm">{feature.estimate_points || 0}</div>
                                  <Badge variant="outline" className="text-xs w-fit">{feature.status || 'funnel'}</Badge>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {feature.teams?.name || '—'}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => unlinkFeatureMutation.mutate(feature.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="w-64 p-3">
                                <div className="space-y-2">
                                  <div className="font-medium">{feature.name}</div>
                                  <Progress value={pct} className="h-2" />
                                  <div className="text-xs text-muted-foreground">{pct}% complete</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </ScrollArea>
                  </div>
                )}
                
                {(!childProgress?.features || childProgress.features.length === 0) && (
                  <div className="text-sm text-muted-foreground">No features linked to this epic</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Acceptance Criteria Collapsible Section */}
          <Collapsible open={acceptanceCriteriaOpen} onOpenChange={setAcceptanceCriteriaOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2">
              <ChevronRight className={`h-4 w-4 transition-transform ${acceptanceCriteriaOpen ? 'rotate-90' : ''}`} />
              <span className="font-medium">Acceptance Criteria</span>
              <Badge variant="secondary" className="ml-auto">0</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 py-2 space-y-2">
                <div className="text-sm text-muted-foreground">No acceptance criteria defined</div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Risks Collapsible Section */}
          <Collapsible open={risksOpen} onOpenChange={setRisksOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2">
              <ChevronRight className={`h-4 w-4 transition-transform ${risksOpen ? 'rotate-90' : ''}`} />
              <span className="font-medium">Risks</span>
              <Badge variant="secondary" className="ml-auto">0</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 py-2 space-y-2">
                <div className="text-sm text-muted-foreground">No risks linked</div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Dependencies Collapsible Section */}
          <Collapsible open={dependenciesOpen} onOpenChange={setDependenciesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2">
              <ChevronRight className={`h-4 w-4 transition-transform ${dependenciesOpen ? 'rotate-90' : ''}`} />
              <span className="font-medium">Dependencies</span>
              <Badge variant="secondary" className="ml-auto">{dependenciesCount || 0}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 py-2 space-y-2">
                <div className="text-sm text-muted-foreground">
                  {dependenciesCount && dependenciesCount > 0 
                    ? `${dependenciesCount} dependencies linked through features`
                    : 'No dependencies linked'}
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
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
