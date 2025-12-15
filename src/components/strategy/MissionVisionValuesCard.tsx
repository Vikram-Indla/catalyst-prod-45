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
      className="overflow-hidden rounded-lg shadow-sm" 
      style={{ 
        borderLeft: '2px solid var(--accent-color)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <CardHeader className="py-2.5 px-3" style={{ backgroundColor: 'var(--surface-2)', borderRadius: '8px 8px 0 0' }}>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent-color)' }}>{title}</CardTitle>
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
