import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InlineEditTextarea } from '@/components/ui/InlineEditTextarea';

interface MissionVisionValuesCardProps {
  title: string;
  subtitle: string;
  value: string;
  placeholder: string;
  ariaLabel: string;
  onSave: (value: string) => Promise<void>;
  isEditing?: boolean;
  onEditStart?: () => void;
}

export function MissionVisionValuesCard({
  title,
  subtitle,
  value,
  placeholder,
  ariaLabel,
  onSave,
}: MissionVisionValuesCardProps) {
  return (
    <Card className="border-l-4 border-l-brand-gold min-h-[140px] overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-brand-gold text-lg font-medium">{title}</CardTitle>
        <p className="text-sm text-muted-foreground italic">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <InlineEditTextarea
          value={value}
          onSave={onSave}
          placeholder={placeholder}
          emptyText="None found."
          aria-label={ariaLabel}
        />
      </CardContent>
    </Card>
  );
}
