import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
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
    <PremiumCard className="h-full flex flex-col">
      <PremiumCardHeader title={title} subtitle={subtitle} />
      <PremiumCardContent className="flex-1 min-h-[60px] py-3">
        <div className="text-[14px] leading-relaxed text-[var(--fg-1)]">
          <InlineEditTextarea
            value={value}
            onSave={onSave}
            placeholder={placeholder}
            emptyText="None found."
            aria-label={ariaLabel}
          />
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
