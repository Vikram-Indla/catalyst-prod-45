import { LucideIcon } from '@/lib/atlaskit-icons';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  className?: string;
}

export const SectionHeader = ({ icon: Icon, title, className }: SectionHeaderProps) => (
  <div className={cn("flex items-center gap-3 mb-5", className)}>
    <div className={cn(
      "w-7 h-7 rounded-lg flex items-center justify-center",
      "bg-[rgba(37,99,235,0.1)] dark:bg-[rgba(96,165,250,0.15)]"
    )}>
      <Icon className="w-3.5 h-3.5 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-text-brand)]" />
    </div>
    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] dark:text-[var(--ds-text-brand)]">
      {title}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-[var(--ds-elevation-surface)] to-transparent" />
  </div>
);

export default SectionHeader;
