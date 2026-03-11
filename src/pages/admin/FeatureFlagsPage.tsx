/**
 * FeatureFlagsPage — Stage A Shell
 * Skeleton-only placeholder. Real UI built in Stage C.
 */

export default function FeatureFlagsPage() {
  return (
    <div className="flex-1 p-6 min-w-0">
      {/* Page header skeleton */}
      <div className="h-7 w-48 bg-muted rounded mb-1 animate-pulse" />
      <div className="h-4 w-80 bg-muted rounded mb-6 animate-pulse" />

      {/* Stats bar skeleton */}
      <div className="h-14 bg-muted/50 border border-border rounded-md mb-4 animate-pulse" />

      {/* Toolbar skeleton */}
      <div className="flex gap-2 mb-3">
        <div className="h-9 w-64 bg-muted rounded animate-pulse" />
        <div className="h-9 w-16 bg-muted rounded animate-pulse" />
        <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        <div className="h-9 w-24 bg-muted rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="h-9 bg-muted/50 border-b border-border" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[52px] border-b border-border/50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
