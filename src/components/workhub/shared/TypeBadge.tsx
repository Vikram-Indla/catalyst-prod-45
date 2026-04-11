export function TypeBadge({ type, className }: { type?: string; className?: string }) {
  return <span className={className}>{type}</span>;
}
