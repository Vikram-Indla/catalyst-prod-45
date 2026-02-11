import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatyAIAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CatyAIAvatar({ size = 'md', className }: CatyAIAvatarProps) {
  const sizeClasses = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-10 w-10' };
  const iconSizes = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };

  return (
    <div className={cn("flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500", sizeClasses[size], className)}>
      <Brain className={cn("text-white", iconSizes[size])} />
    </div>
  );
}
