import { LucideIcon } from 'lucide-react';
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
      "bg-[#5c7c5c]/10 dark:bg-[#7a9a7a]/15"
    )}>
      <Icon className="w-3.5 h-3.5 text-[#5c7c5c] dark:text-[#7a9a7a]" />
    </div>
    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c7c5c] dark:text-[#7a9a7a]">
      {title}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-[#242424] to-transparent" />
  </div>
);

export default SectionHeader;
