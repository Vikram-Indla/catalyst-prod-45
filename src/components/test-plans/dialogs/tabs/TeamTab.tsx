/**
 * TeamTab - Tab 4: Owner & Team Members
 */
import React from 'react';
import { TestPlanFormState, TestPlanFormErrors, TeamMemberOption } from '../CreateEditTestPlanDialog.types';
import { TeamMemberCard } from '../components/TeamMemberCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamTabProps {
  formState: TestPlanFormState;
  errors: TestPlanFormErrors;
  setField: <K extends keyof TestPlanFormState>(field: K, value: TestPlanFormState[K]) => void;
  projectId?: string;
}

// Mock team members - will be replaced with real data
const mockTeamMembers: TeamMemberOption[] = [
  { id: '1', name: 'Ahmed Salem', email: 'ahmed@example.com', role: 'QA Lead', specialty: 'API Testing', is_available: true, capacity_percent: 45, active_plans_count: 2 },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Senior QA', specialty: 'Automation', is_available: true, capacity_percent: 30, active_plans_count: 1 },
  { id: '3', name: 'Mohammed Ali', email: 'mohammed@example.com', role: 'QA Engineer', specialty: 'Performance', is_available: true, capacity_percent: 75, active_plans_count: 3 },
  { id: '4', name: 'Lisa Chen', email: 'lisa@example.com', role: 'QA Engineer', is_available: false, capacity_percent: 100, active_plans_count: 4 },
  { id: '5', name: 'Omar Hassan', email: 'omar@example.com', role: 'Junior QA', is_available: true, capacity_percent: 20, active_plans_count: 1 },
];

export function TeamTab({ formState, errors, setField }: TeamTabProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const leads = mockTeamMembers.filter(m => m.role.includes('Lead'));
  const members = mockTeamMembers.filter(m => !m.role.includes('Lead'));
  
  const filteredLeads = leads.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOwner = (id: string) => {
    setField('owner_id', formState.owner_id === id ? null : id);
  };

  const toggleMember = (id: string) => {
    const current = formState.team_members;
    if (current.includes(id)) {
      setField('team_members', current.filter(m => m !== id));
    } else {
      setField('team_members', [...current, id]);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name, role, or specialty..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9" 
        />
      </div>

      {/* Owner Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            Plan Owner *
          </Label>
          {errors.owner_id && (
            <span className="text-xs text-destructive">{errors.owner_id}</span>
          )}
        </div>
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3",
          errors.owner_id && "animate-shake"
        )}>
          {filteredLeads.map(member => (
            <TeamMemberCard
              key={member.id}
              member={member}
              isSelected={formState.owner_id === member.id}
              isOwner={true}
              onToggle={() => toggleOwner(member.id)}
            />
          ))}
        </div>
      </div>

      {/* Team Members Section */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Users className="w-4 h-4" />
          Team Members ({formState.team_members.length})
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMembers.map(member => (
            <TeamMemberCard
              key={member.id}
              member={member}
              isSelected={formState.team_members.includes(member.id)}
              onToggle={() => toggleMember(member.id)}
            />
          ))}
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">AI Team Recommendation</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Based on the scope and timeline, consider adding Omar Hassan who has 80% availability and specializes in the required test areas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
