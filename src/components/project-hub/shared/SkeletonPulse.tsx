/**
 * Skeleton loading components for ProjectHub
 */

export function SkeletonRow({ height = 36 }: { height?: number }) {
  return (
    <div
      className="rounded-md ph-skeleton"
      style={{ height, background: '#F1F5F9', width: '100%' }}
    />
  );
}

export function SkeletonCard({ height = 200 }: { height?: number }) {
  return (
    <div
      className="rounded-lg ph-skeleton"
      style={{ height, background: '#F1F5F9', width: '100%' }}
    />
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonWidgetGrid() {
  return (
    <div className="ph-widget-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} height={170} />
      ))}
    </div>
  );
}
