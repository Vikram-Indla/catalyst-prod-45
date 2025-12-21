/**
 * AcceptanceCriteriaEditor — Rich editor for acceptance criteria
 * Numbered cards with gold left border accent
 */

import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AcceptanceCriteriaEditorProps {
  criteria: string[];
  onChange: (criteria: string[]) => void;
}

export function AcceptanceCriteriaEditor({ criteria, onChange }: AcceptanceCriteriaEditorProps) {
  const addCriterion = () => {
    onChange([...criteria, '']);
  };

  const updateCriterion = (index: number, value: string) => {
    const updated = [...criteria];
    updated[index] = value;
    onChange(updated);
  };

  const removeCriterion = (index: number) => {
    onChange(criteria.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Acceptance Criteria</h4>
          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
            {criteria.filter(c => c.trim()).length}
          </span>
        </div>
      </div>

      {/* Criteria List */}
      <div className="space-y-2">
        {criteria.map((criterion, index) => (
          <div 
            key={index}
            className={cn(
              "flex items-start gap-2 p-3 rounded-md bg-muted/50",
              "border-l-[3px] border-brand-primary"
            )}
          >
            {/* Drag Handle */}
            <div className="pt-2 cursor-grab text-muted-foreground hover:text-foreground">
              <GripVertical className="h-4 w-4" />
            </div>

            {/* Number Badge */}
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-semibold mt-1.5">
              {index + 1}
            </div>

            {/* Textarea */}
            <Textarea
              value={criterion}
              onChange={(e) => updateCriterion(index, e.target.value)}
              placeholder="Given... When... Then..."
              className="flex-1 min-h-[60px] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 text-sm"
              rows={2}
            />

            {/* Delete Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeCriterion(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addCriterion}
        className="w-full border-dashed border-muted-foreground/50 hover:border-brand-primary hover:text-brand-primary"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Acceptance Criterion
      </Button>
    </div>
  );
}
