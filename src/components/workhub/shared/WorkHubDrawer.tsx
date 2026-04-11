export function WorkHubDrawer(props: any) {
  const open = props.open ?? props.isOpen;
  if (!open) return null;
  return <div>{props.children}</div>;
}
