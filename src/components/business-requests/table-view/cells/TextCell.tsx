interface TextCellProps {
  value: string | null | undefined;
  className?: string;
}

export function TextCell({ value, className }: TextCellProps) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }
  
  return (
    <span className={`text-sm text-foreground truncate ${className || ''}`}>
      {value}
    </span>
  );
}
