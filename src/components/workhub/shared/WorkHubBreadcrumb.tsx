export function WorkHubBreadcrumb({ items, className }: { items?: { label: string; href?: string }[]; className?: string }) {
  return <nav className={className}>{items?.map((i, idx) => <span key={idx}>{i.label}</span>)}</nav>;
}
