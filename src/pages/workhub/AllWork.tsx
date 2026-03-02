/**
 * WorkHub "All Work" — Stage A Shell
 * Skeleton loading state only. Full UI in Stage B.
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function AllWork() {
  return (
    <div className="w-full flex flex-col gap-6 p-6" style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* ── Breadcrumb + Title + Tabs skeleton ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-3 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
        <Skeleton className="h-7 w-36 rounded" />
        <div className="flex items-center gap-4 mt-1">
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </div>

      {/* ── Toolbar skeleton (search, filters, view toggle) ── */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>

      {/* ── Table skeleton (12 rows × 6 columns) ── */}
      <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-4 px-4 bg-[#F8FAFC] border-b border-[#E2E8F0]" style={{ height: 40 }}>
          <Skeleton className="h-3.5 w-8 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-48 rounded flex-1" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-28 rounded" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 border-b border-[#F1F5F9] last:border-b-0"
            style={{ height: 44 }}
          >
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-3.5 rounded flex-1" style={{ width: `${45 + Math.random() * 35}%` }} />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
