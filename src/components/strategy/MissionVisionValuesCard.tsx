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
    <Card 
      className="overflow-hidden rounded-lg shadow-sm border" 
      style={{ 
        borderColor: 'var(--divider)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <CardHeader 
        className="py-2.5 px-3 border-b" 
        style={{ 
          borderColor: 'var(--divider)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <CardTitle className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{title}</CardTitle>
        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
      </CardHeader>
      <CardContent className="px-3 py-2">
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
