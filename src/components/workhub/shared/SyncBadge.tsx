export function SyncBadge(props: any) {
  return <span className={props.className}>{props.lastSyncedAt || (props.synced ? 'Synced' : '')}</span>;
}
