export function WorkHubDrawer({ children, open, onClose, title }: { children?: React.ReactNode; open?: boolean; onClose?: () => void; title?: string }) {
  if (!open) return null;
  return <div>{children}</div>;
}
