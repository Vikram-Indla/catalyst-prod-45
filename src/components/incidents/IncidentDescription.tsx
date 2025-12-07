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
    <div className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E8E8E8]">
        <h3 className="text-[11px] font-semibold uppercase text-[#8C8C8C] tracking-wide">
          Description
        </h3>
      </div>
      <div className="p-4">
        {isEditMode ? (
          <Textarea
            value={editedDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="min-h-[150px] border-[#E8E8E8] bg-white resize-y"
            placeholder="Describe the incident in detail..."
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-[#5C5C5C] leading-relaxed whitespace-pre-wrap">
              {description || 'No description provided.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
