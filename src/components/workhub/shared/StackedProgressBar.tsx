export function releaseProgressSegments(_: any) { return []; }
export function StackedProgressBar({ segments, className }: { segments?: any[]; className?: string }) {
  return <div className={`h-2 rounded bg-muted ${className || ''}`} />;
}
