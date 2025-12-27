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
      "bg-[rgba(37,99,235,0.1)] dark:bg-[rgba(96,165,250,0.15)]"
    )}>
      <Icon className="w-3.5 h-3.5 text-[#2563eb] dark:text-[#60a5fa]" />
    </div>
    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#2563eb] dark:text-[#60a5fa]">
      {title}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-[#242424] to-transparent" />
  </div>
);

export default SectionHeader;
