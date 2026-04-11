export function ConfirmDialog({ open, onConfirm, onCancel, title, description }: { open?: boolean; onConfirm?: () => void; onCancel?: () => void; title?: string; description?: string }) {
  if (!open) return null;
  return (
    <div>
      <p>{title}</p>
      <p>{description}</p>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}
