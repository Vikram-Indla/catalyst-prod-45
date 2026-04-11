export function ThemeStatusBadge({ status, className }: { status?: string; className?: string }) {
  return <span className={className}>{status}</span>;
}
