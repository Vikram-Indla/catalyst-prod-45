import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Link as LinkIcon, Lock, Unlock, Plus, ExternalLink } from 'lucide-react';
import { FeatureStatusModal } from '../modals/FeatureStatusModal';
import { toast } from 'sonner';

interface EpicDetailsTabProps {
  epic: any;
}

export function EpicDetailsTab({ epic }: EpicDetailsTabProps) {
  const [featureStatusOpen, setFeatureStatusOpen] = useState(false);
  
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

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data } = await supabase.from('program_increments').select('*').order('name');
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      {/* Classification Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Classification</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>State</Label>
            <Select defaultValue={epic.state || 'funnel'}>
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
            <Select defaultValue={epic.process_step_id}>
              <SelectTrigger>
                <SelectValue placeholder="Select process step" />
              </SelectTrigger>
              <SelectContent>
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
            <Select defaultValue={epic.epic_type || 'business'}>
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
            <Select defaultValue={epic.mvp ? 'yes' : 'no'}>
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
      </div>

      {/* Context Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Context</h3>
        
        <div>
          <Label>Primary Program *</Label>
          <Select defaultValue={epic.primary_program_id}>
            <SelectTrigger>
              <SelectValue placeholder="Select primary program" />
            </SelectTrigger>
            <SelectContent>
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
              onClick={() => toast('Add additional program functionality coming soon')}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </Label>
          <div className="mt-2 text-sm text-muted-foreground">
            No additional programs assigned
          </div>
        </div>

        <div>
          <Label>Program Increments</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {epic.program_increments?.length > 0 ? (
              epic.program_increments.map((pi: string) => (
                <Badge key={pi} variant="secondary">{pi}</Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No PIs assigned</span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => toast('Add PI functionality coming soon')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add PI
          </Button>
        </div>

        <div>
          <Label>Owner</Label>
          <Select defaultValue={epic.owner_id}>
            <SelectTrigger>
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user-1">John Doe</SelectItem>
              <SelectItem value="user-2">Jane Smith</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Report Color</Label>
          <Select defaultValue={epic.report_color || 'blue'}>
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
      </div>

      {/* Full Details Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Full Details</h3>
        
        <div>
          <Label>Description</Label>
          <Textarea
            defaultValue={epic.description}
            rows={4}
            placeholder="Enter epic description"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Portfolio Ask Date</Label>
            <Input type="date" defaultValue={epic.portfolio_ask_date} />
          </div>
          <div>
            <Label>Initiation Date</Label>
            <Input type="date" defaultValue={epic.initiation_date} />
          </div>
          <div>
            <Label>Target Completion Date</Label>
            <div className="flex gap-2">
              <Input type="date" defaultValue={epic.target_completion_date} />
              <Button variant="outline" size="icon">
                {epic.date_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
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
      </div>

      {/* Financial & Estimation Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Financial & Estimation</h3>
        
        <div className="flex items-center gap-2">
          <Checkbox id="capitalized" defaultChecked={epic.capitalized} />
          <Label htmlFor="capitalized">Capitalized</Label>
        </div>

        <div>
          <Label>Budget</Label>
          <Input type="number" defaultValue={epic.budget} placeholder="Enter budget" />
        </div>

        <div>
          <Label>Estimation System</Label>
          <Select defaultValue={epic.estimation_system || 'points'}>
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
      </div>

      {/* Strategy & Analysis Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Strategy & Analysis</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Strategic Value Score (1-100)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              defaultValue={epic.strategic_value_score}
            />
          </div>
          <div>
            <Label>Effort SWAG (1-100)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              defaultValue={epic.effort_swag}
            />
          </div>
        </div>

        <div>
          <Label>Strategic Driver</Label>
          <Input defaultValue={epic.strategic_driver} />
        </div>

        <div>
          <Label>Ability to Execute</Label>
          <Select defaultValue={epic.ability_to_execute}>
            <SelectTrigger>
              <SelectValue placeholder="Select ability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Quadrant</Label>
          <Select defaultValue={epic.quadrant}>
            <SelectTrigger>
              <SelectValue placeholder="Select quadrant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="core">Core</SelectItem>
              <SelectItem value="strategic">Strategic</SelectItem>
              <SelectItem value="competitive">Competitive</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Investment Type</Label>
          <Select defaultValue={epic.investment_type}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_product">New Product</SelectItem>
              <SelectItem value="product_enhancement">Product Enhancement</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="research">Research</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tags</Label>
          <Input defaultValue={epic.tags?.join(', ')} placeholder="Enter tags separated by commas" />
        </div>

        <div>
          <Label>Customers</Label>
          <Textarea
            defaultValue={epic.customers?.join('\n')}
            rows={3}
            placeholder="Enter customer names (one per line)"
          />
        </div>
      </div>

      {/* Progress & Children Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">Progress & Children</h3>
        
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-2">Child Items Progress</div>
          <div className="text-center py-8">
            <div className="text-4xl font-bold text-muted-foreground mb-2">0%</div>
            <div className="text-sm text-muted-foreground">No child items</div>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Capability or Feature
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setFeatureStatusOpen(true)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Feature Status Details
          </Button>
        </div>
      </div>

      <FeatureStatusModal
        epicId={epic.id}
        open={featureStatusOpen}
        onOpenChange={setFeatureStatusOpen}
      />
    </div>
  );
}
