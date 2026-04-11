export function StatusPill(props: any) { return <span className={props.className}>{props.status ?? props.children}</span>; }
export function ProjTag(props: any) { return <span className={props.className}>{props.name ?? props.children}</span>; }
export function AgeBadge(props: any) { return <span className={props.className}>{props.days ?? props.children}</span>; }
export function MiniAvatar(props: any) { return <span className={props.className}>{props.name?.charAt(0) ?? '?'}</span>; }
export function CompletedSummaryBar(props: any) { return <div className={props.className} />; }
