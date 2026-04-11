export function ProgressRing({ value = 0, size = 40, className }: { value?: number; size?: number; className?: string }) {
  return (
    <div className={className} style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="text-xs font-medium">{Math.round(value)}%</span>
    </div>
  );
}
