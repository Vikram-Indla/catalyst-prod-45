import { useState, useEffect } from 'react';
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
import { Link as LinkIcon, Lock, Unlock, Plus, ExternalLink, Loader2, X, ChevronRight, Search } from 'lucide-react';
import { WSJFInlineScores } from '@/components/wsjf';
import { AddPIDialog } from '../dialogs/AddPIDialog';
import { AddProgramDialog } from '../dialogs/AddProgramDialog';
import { AddFeatureDialog } from '../dialogs/AddFeatureDialog';
import { toast } from 'sonner';

interface EpicDetailsTabProps {
  epic: any;
}

export function EpicDetailsTab({ epic }: EpicDetailsTabProps) {
  const [addPIOpen, setAddPIOpen] = useState(false);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [addFeatureOpen, setAddFeatureOpen] = useState(false);
  const [hideDetails, setHideDetails] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [acceptanceCriteriaOpen, setAcceptanceCriteriaOpen] = useState(false);
  const [risksOpen, setRisksOpen] = useState(false);
  const [featureSearch, setFeatureSearch] = useState('');
  const [newTag, setNewTag] = useState('');
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

  // Fetch child features and their progress with story points - per Jira Align spec
  const { data: childProgress } = useQuery({
    queryKey: ['epic-child-progress', epic.id],
    queryFn: async () => {
      // Get features with their stories
      const { data: features } = await supabase
        .from('features')
        .select(`
          id, 
          name,
          display_id,
          status, 
          progress_pct,
          estimate_points,
          stories:stories(id, status, estimate_points)
        `)
        .eq('epic_id', epic.id);

      if (!features || features.length === 0) {
        return { 
          totalFeatures: 0, 
          featuresAccepted: 0,
          featuresInDelivery: 0,
          featuresDelivered: 0,
          totalStoryPoints: 0,
          acceptedStoryPoints: 0,
          progressPct: 0,
          features: []
        };
      }

      // Calculate feature breakdown by status per Jira Align
      const featuresAccepted = features.filter(f => f.status === 'done').length;
      const featuresInDelivery = features.filter(f => 
        ['dev_complete', 'test_complete', 'implementing'].includes(f.status || '')
      ).length;
      const featuresDelivered = 0;

      // Calculate story points
      let totalStoryPoints = 0;
      let acceptedStoryPoints = 0;
      
      features.forEach((feature: any) => {
        const stories = feature.stories || [];
        stories.forEach((story: any) => {
          const pts = story.estimate_points || 0;
          totalStoryPoints += pts;
          if (story.status === 'done') {
            acceptedStoryPoints += pts;
          }
        });
      });

      const avgProgress = features.reduce((sum, f) => sum + (f.progress_pct || 0), 0) / features.length;

      return {
        totalFeatures: features.length,
        featuresAccepted,
        featuresInDelivery,
        featuresDelivered,
        totalStoryPoints,
        acceptedStoryPoints,
        progressPct: Math.round(avgProgress),
        features,
      };
    },
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
              <span className="font-medium">Features ({childProgress?.totalFeatures || 0})</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search existing Features (type the ID, External ID or Name)"
                    value={featureSearch}
                    onChange={(e) => setFeatureSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="border rounded">
                  <div className="grid grid-cols-[60px_80px_1fr_150px] gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                    <div>ID</div>
                    <div>Ext ID</div>
                    <div>Title</div>
                    <div>Progress</div>
                  </div>
                  <ScrollArea className="max-h-[250px]">
                    {childProgress?.features?.filter((f: any) =>
                      f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
                      f.display_id?.toLowerCase().includes(featureSearch.toLowerCase())
                    ).map((feature: any) => {
                      const stories = feature.stories || [];
                      const acceptedPts = stories.filter((s: any) => s.status === 'done')
                        .reduce((sum: number, s: any) => sum + (s.estimate_points || 0), 0);
                      const totalPts = stories.reduce((sum: number, s: any) => sum + (s.estimate_points || 0), 0);
                      const pct = totalPts > 0 ? Math.round((acceptedPts / totalPts) * 100) : 0;
                      const isLate = pct < 30 && feature.status !== 'done';
                      
                      return (
                        <TooltipProvider key={feature.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="grid grid-cols-[60px_80px_1fr_150px] gap-2 p-2 border-b hover:bg-muted/30 cursor-pointer items-center">
                                <div className="text-sm">{feature.display_id || feature.id.slice(0, 4)}</div>
                                <div className="text-sm text-muted-foreground">—</div>
                                <div className="text-sm truncate">{feature.name}</div>
                                <Progress value={pct} className="h-2" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="w-72 p-0">
                              <div className="bg-[#1a1a1a] text-white rounded-lg overflow-hidden">
                                <div className={`${isLate ? 'bg-red-500' : 'bg-green-500'} px-3 py-1`}>
                                  <span className="font-bold">{isLate ? 'Late' : 'On Track'}</span>
                                </div>
                                <div className="p-3 space-y-2">
                                  <p className="text-xs text-gray-300">
                                    The Feature is in {feature.status || 'funnel'}
                                  </p>
                                  <div>
                                    <span className="font-bold">{pct}% Done</span>
                                    <span className="text-xs text-gray-400 ml-1">(based on story points)</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Progress value={pct} className="h-1.5 flex-1" />
                                      <span className="text-xs">{acceptedPts} of {totalPts} Story Points</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={(stories.filter((s: any) => s.status === 'done').length / Math.max(stories.length, 1)) * 100} className="h-1.5 flex-1" />
                                      <span className="text-xs">{stories.filter((s: any) => s.status === 'done').length} of {stories.length} Stories</span>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-gray-600">
                                    <span className="font-bold">Scope</span>
                                    <p className="text-xs text-gray-400">Estimate: {feature.estimate_points || 0} points</p>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                    {(!childProgress?.features || childProgress.features.length === 0) && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No features found
                      </div>
                    )}
                  </ScrollArea>
                </div>
                
                <Button variant="outline" size="sm" onClick={() => setAddFeatureOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Feature
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Acceptance Criteria Collapsible Section */}
          <Collapsible open={acceptanceCriteriaOpen} onOpenChange={setAcceptanceCriteriaOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2">
              <ChevronRight className={`h-4 w-4 transition-transform ${acceptanceCriteriaOpen ? 'rotate-90' : ''}`} />
              <span className="font-medium">Acceptance Criteria (0)</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 py-2 text-sm text-muted-foreground">
                No acceptance criteria defined
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Risks Collapsible Section */}
          <Collapsible open={risksOpen} onOpenChange={setRisksOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2">
              <ChevronRight className={`h-4 w-4 transition-transform ${risksOpen ? 'rotate-90' : ''}`} />
              <span className="font-medium">Risks (0)</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 py-2 text-sm text-muted-foreground">
                No risks linked
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Add Button */}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
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

      <AddFeatureDialog
        epicId={epic.id}
        open={addFeatureOpen}
        onOpenChange={setAddFeatureOpen}
      />
    </div>
  );
}
