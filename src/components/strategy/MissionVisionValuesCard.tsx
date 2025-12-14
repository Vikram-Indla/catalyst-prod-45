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
    <Card className="min-h-[140px] overflow-hidden" style={{ borderLeft: '3px solid var(--accent-color)' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium" style={{ color: 'var(--accent-color)' }}>{title}</CardTitle>
        <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>{subtitle}</p>
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
