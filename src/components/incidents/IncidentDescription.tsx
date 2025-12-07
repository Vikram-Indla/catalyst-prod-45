import { Textarea } from '@/components/ui/textarea';

interface IncidentDescriptionProps {
  description: string;
  isEditMode: boolean;
  editedDescription: string;
  onDescriptionChange: (value: string) => void;
}

export function IncidentDescription({
  description,
  isEditMode,
  editedDescription,
  onDescriptionChange,
}: IncidentDescriptionProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4">
        {isEditMode ? (
          <Textarea
            value={editedDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="min-h-[150px] border-border bg-card resize-y text-sm"
            placeholder="Describe the incident in detail..."
          />
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {description || 'No description provided.'}
          </p>
        )}
      </div>
    </div>
  );
}
