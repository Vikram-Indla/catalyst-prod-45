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
      className="min-h-[120px] overflow-hidden rounded-lg shadow-sm" 
      style={{ 
        borderLeft: '3px solid var(--accent-color)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <CardHeader className="py-3 px-4" style={{ backgroundColor: 'var(--surface-2)', borderRadius: '8px 8px 0 0' }}>
        <CardTitle className="text-sm font-semibold" style={{ color: 'var(--accent-color)' }}>{title}</CardTitle>
        <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
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
