import { IntakeField } from '@/types/backlog.types';

interface IntakeTabProps {
  fields: IntakeField[];
  onFieldChange: (fieldId: string, value: string) => void;
}

export function IntakeTab({ fields, onFieldChange }: IntakeTabProps) {
  return (
    <div className="p-6">
      <h3 className="text-base font-semibold text-foreground mb-6">Default Form</h3>
      
      <div className="flex flex-col gap-5">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm text-foreground mb-2">
              <span className="font-semibold">{field.number}.</span> {field.label}
            </label>
            <textarea
              value={field.value}
              onChange={(e) => onFieldChange(field.id, e.target.value)}
              className="w-full min-h-[80px] p-3 text-sm text-foreground bg-background border border-border rounded resize-vertical focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}