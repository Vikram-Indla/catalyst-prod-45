export function ConfirmDialog(props: any) {
  const open = props.open ?? props.isOpen;
  if (!open) return null;
  return (
    <div>
      <p>{props.title}</p>
      <p>{props.description ?? props.message}</p>
      <button onClick={props.onConfirm}>{props.confirmLabel || 'Confirm'}</button>
      <button onClick={props.onCancel ?? props.onClose}>Cancel</button>
    </div>
  );
}
