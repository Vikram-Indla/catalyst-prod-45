import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, Calendar, MoreVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Milestone } from '@/types/backlog.types';
import { AddMilestoneModal } from '../modals/AddMilestoneModal';

interface MilestonesTabProps {
  milestones: Milestone[];
  onAddMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  onUpdateMilestone: (id: string, updates: Partial<Milestone>) => void;
}

export function MilestonesTab({ milestones, onAddMilestone, onUpdateMilestone }: MilestonesTabProps) {
  const [sortBy, setSortBy] = useState('name');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'in progress':
        return 'text-success';
      case 'complete':
        return 'text-muted-foreground';
      case 'blocked':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStateLabel = (state: string) => {
    return state.toUpperCase().replace(' ', ' ');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="state">State</SelectItem>
            </SelectContent>
          </Select>
          <button className="text-muted-foreground hover:text-foreground">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
          <Plus className="h-4 w-4" />
          Add milestone
        </Button>
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone) => (
          <div key={milestone.id} className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-base font-medium text-foreground">{milestone.name}</h4>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Calendar className="h-4 w-4" />
              <span>Start: {milestone.startDate || 'Not set'}</span>
              <span>—</span>
              <span>Due: {milestone.dueDate || 'Not set'}</span>
            </div>

            {milestone.description && (
              <p className="text-sm text-foreground mb-3">{milestone.description}</p>
            )}

            <div className="pt-3 border-t border-border">
              <div className="text-sm">
                <span className="text-muted-foreground">State</span>
                <div className={`mt-1 font-semibold ${getStateColor(milestone.state)}`}>
                  {getStateLabel(milestone.state)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Milestone Modal */}
      <AddMilestoneModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(milestone) => {
          onAddMilestone({
            ...milestone,
          });
        }}
      />
    </div>
  );
}
