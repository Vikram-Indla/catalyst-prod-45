import { useState } from 'react';
import { Plus, Calendar, AlertCircle, ChevronDown } from 'lucide-react';
import { Milestone } from '@/types/backlog.types';

interface MilestonesTabProps {
  milestones: Milestone[];
  onAddMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  onUpdateMilestone: (id: string, updates: Partial<Milestone>) => void;
}

const MILESTONE_STATES = ['Pending', 'In Progress', 'Complete', 'Blocked'];
const MILESTONE_CATEGORIES = ['Technical', 'Business', 'Regulatory', 'Customer', 'Internal'];

export function MilestonesTab({ milestones, onAddMilestone, onUpdateMilestone }: MilestonesTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: '',
    startDate: '',
    dueDate: '',
    description: '',
    state: 'Pending' as const,
    category: '',
  });
  const [showError, setShowError] = useState(false);

  const handleSave = () => {
    if (!newMilestone.name.trim()) {
      setShowError(true);
      return;
    }
    onAddMilestone({
      ...newMilestone,
      startDate: newMilestone.startDate || null,
      dueDate: newMilestone.dueDate || null,
      category: newMilestone.category || null,
    });
    setNewMilestone({ name: '', startDate: '', dueDate: '', description: '', state: 'Pending', category: '' });
    setIsAdding(false);
    setShowError(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewMilestone({ name: '', startDate: '', dueDate: '', description: '', state: 'Pending', category: '' });
    setShowError(false);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Sort by</label>
          <select className="px-3 py-1.5 text-sm bg-background border border-border rounded">
            <option>Name</option>
            <option>Due Date</option>
            <option>State</option>
          </select>
          <button className="p-1.5 text-muted-foreground hover:text-foreground">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
        >
          <Plus className="w-4 h-4" />
          Add milestone
        </button>
      </div>

      {/* Add Milestone Form */}
      {isAdding && (
        <div className="p-4 mb-4 border-2 border-primary rounded-lg bg-background">
          <div className="mb-4">
            <label className="block text-sm text-foreground mb-2">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={newMilestone.name}
              onChange={(e) => {
                setNewMilestone({ ...newMilestone, name: e.target.value });
                setShowError(false);
              }}
              placeholder="What is a name for your milestone?"
              className={`w-full px-3 py-2 text-sm bg-background border rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                showError ? 'border-destructive' : 'border-border'
              }`}
            />
            {showError && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                Enter a name to save your milestone
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-foreground mb-2">Start date</label>
              <div className="relative">
                <input
                  type="date"
                  value={newMilestone.startDate}
                  onChange={(e) => setNewMilestone({ ...newMilestone, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-foreground mb-2">Due date</label>
              <div className="relative">
                <input
                  type="date"
                  value={newMilestone.dueDate}
                  onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <textarea
            value={newMilestone.description}
            onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
            placeholder="Add description"
            className="w-full min-h-[60px] px-3 py-2 text-sm bg-background border border-border rounded resize-vertical mb-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-foreground mb-2">State</label>
              <select
                value={newMilestone.state}
                onChange={(e) => setNewMilestone({ ...newMilestone, state: e.target.value as any })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:border-primary"
              >
                {MILESTONE_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground mb-2">Category</label>
              <select
                value={newMilestone.category}
                onChange={(e) => setNewMilestone({ ...newMilestone, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:border-primary"
              >
                <option value="">Select</option>
                {MILESTONE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-foreground hover:bg-muted rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Existing Milestones */}
      <div className="flex flex-col gap-3">
        {milestones.map((milestone) => (
          <div key={milestone.id} className="p-4 border border-border rounded-lg bg-card">
            <div className="font-medium text-sm text-foreground">{milestone.name}</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Start: {milestone.startDate || 'Not set'}</span>
              <span>—</span>
              <span>Due: {milestone.dueDate || 'Not set'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
