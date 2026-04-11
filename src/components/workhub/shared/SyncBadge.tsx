export function SyncBadge({ synced, className }: { synced?: boolean; className?: string }) {
  return <span className={className}>{synced ? 'Synced' : 'Not synced'}</span>;
}
