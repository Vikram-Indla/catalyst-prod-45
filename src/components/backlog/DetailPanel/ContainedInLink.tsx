interface ContainedInLinkProps {
  id: string;
  name: string;
  type: string;
}

export function ContainedInLink({ id, name, type }: ContainedInLinkProps) {
  return (
    <a
      href={`/${type}/${id}`}
      className="flex items-center gap-2 text-sm text-primary hover:underline"
      onClick={(e) => e.preventDefault()}
    >
      <div className="w-4 h-4 bg-primary rounded-sm" />
      <span>{name}</span>
    </a>
  );
}
