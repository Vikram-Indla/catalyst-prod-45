/**
 * Task¹⁰ Skeleton Loaders
 * Enterprise-grade loading states for cards
 */

interface AqdSkeletonListCardProps {
  count?: number;
}

export function AqdSkeletonListCard({ count = 3 }: AqdSkeletonListCardProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-pulse"
        >
          {/* Title skeleton */}
          <div className="h-5 bg-slate-200 rounded-md w-1/2 mb-3" />
          
          {/* Meta skeleton */}
          <div className="flex gap-2 mb-4">
            <div className="h-3 bg-slate-100 rounded w-16" />
            <div className="h-3 bg-slate-100 rounded w-20" />
            <div className="h-3 bg-slate-100 rounded w-16" />
          </div>
          
          {/* Progress bar skeleton */}
          <div className="flex justify-between items-center mb-1.5">
            <div className="h-3 bg-slate-100 rounded w-24" />
            <div className="h-3 bg-slate-100 rounded w-8" />
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-200 rounded-full w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AqdSkeletonPriorityCardProps {
  count?: number;
}

export function AqdSkeletonPriorityCard({ count = 5 }: AqdSkeletonPriorityCardProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse flex items-start gap-3"
        >
          {/* Rank badge skeleton */}
          <div className="w-8 h-8 bg-slate-200 rounded-lg shrink-0" />
          
          {/* Status toggle skeleton */}
          <div className="w-6 h-6 bg-slate-200 rounded-full shrink-0 mt-0.5" />
          
          {/* Content skeleton */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            
            {/* Meta */}
            <div className="flex gap-2 mb-2">
              <div className="h-3 bg-slate-100 rounded w-16" />
              <div className="h-3 bg-slate-100 rounded w-24" />
            </div>
            
            {/* Labels */}
            <div className="flex gap-1">
              <div className="h-5 bg-slate-100 rounded w-14" />
              <div className="h-5 bg-slate-100 rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default { AqdSkeletonListCard, AqdSkeletonPriorityCard };
