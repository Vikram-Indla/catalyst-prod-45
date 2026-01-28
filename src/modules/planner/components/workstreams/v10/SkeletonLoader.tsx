// ============================================================
// WORKSTREAMS V10 SKELETON LOADERS
// Animated skeleton states for list and grid views
// ============================================================

import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  variant: 'summary' | 'list' | 'grid' | 'drawer';
  count?: number;
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'rounded animate-pulse',
        'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200',
        'dark:from-slate-700 dark:via-slate-600 dark:to-slate-700',
        'bg-[length:200%_100%]',
        className
      )}
      style={{
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
        >
          <SkeletonPulse className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-6 w-12" />
            <SkeletonPulse className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
      {/* Checkbox */}
      <SkeletonPulse className="w-5 h-5 rounded" />
      
      {/* Name column */}
      <div className="flex items-center gap-3 flex-[2]">
        <SkeletonPulse className="w-3 h-3 rounded-full" />
        <div className="space-y-1.5">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-3 w-16" />
        </div>
      </div>
      
      {/* Lead column */}
      <div className="flex items-center gap-2 flex-[1.5]">
        <SkeletonPulse className="w-7 h-7 rounded-full" />
        <SkeletonPulse className="h-4 w-24" />
      </div>
      
      {/* Health column */}
      <div className="w-[120px]">
        <SkeletonPulse className="h-6 w-20 rounded-full" />
      </div>
      
      {/* Tasks column */}
      <div className="w-[80px] text-center">
        <SkeletonPulse className="h-5 w-8 mx-auto" />
      </div>
      
      {/* Overdue column */}
      <div className="w-[80px] text-center">
        <SkeletonPulse className="h-5 w-6 mx-auto" />
      </div>
      
      {/* Actions column */}
      <div className="w-[50px]">
        <SkeletonPulse className="w-8 h-8 rounded" />
      </div>
    </div>
  );
}

function GridCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <SkeletonPulse className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-5 w-28" />
          <SkeletonPulse className="h-3 w-12" />
        </div>
        <SkeletonPulse className="h-6 w-20 rounded-full" />
      </div>
      
      {/* Lead section */}
      <div className="mb-4 space-y-2">
        <SkeletonPulse className="h-3 w-10" />
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
          <SkeletonPulse className="w-8 h-8 rounded-full" />
          <SkeletonPulse className="h-4 w-24" />
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
            <SkeletonPulse className="h-6 w-8 mx-auto mb-1" />
            <SkeletonPulse className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="flex -space-x-2">
          {[...Array(3)].map((_, i) => (
            <SkeletonPulse key={i} className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-800" />
          ))}
        </div>
        <SkeletonPulse className="h-8 w-16 rounded" />
      </div>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <SkeletonPulse className="w-14 h-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-6 w-36" />
          <SkeletonPulse className="h-4 w-20" />
        </div>
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-16 w-full rounded-lg" />
      </div>
      
      {/* Details */}
      <div className="space-y-3">
        <SkeletonPulse className="h-4 w-20" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-4 w-32" />
          </div>
        ))}
      </div>
      
      {/* Members */}
      <div className="space-y-3">
        <SkeletonPulse className="h-4 w-28" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
            <SkeletonPulse className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <SkeletonPulse className="h-4 w-28" />
              <SkeletonPulse className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonLoader({ variant, count = 6 }: SkeletonLoaderProps) {
  switch (variant) {
    case 'summary':
      return <SummarySkeleton />;
    
    case 'list':
      return (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          {/* Header row */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <SkeletonPulse className="w-5 h-5 rounded" />
            <SkeletonPulse className="h-4 w-16" />
            <SkeletonPulse className="h-4 w-12 ml-auto" />
          </div>
          {[...Array(count)].map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </div>
      );
    
    case 'grid':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(count)].map((_, i) => (
            <GridCardSkeleton key={i} />
          ))}
        </div>
      );
    
    case 'drawer':
      return <DrawerSkeleton />;
    
    default:
      return null;
  }
}

// Add shimmer animation to global CSS
export const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;
