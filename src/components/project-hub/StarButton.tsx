import { Star } from 'lucide-react';

interface StarButtonProps {
  isStarred: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: number;
}

export function StarButton({ isStarred, onClick, size = 16 }: StarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded transition-colors hover:bg-[#F1F5F9] dark:hover:bg-[#1F1F1F]"
      style={{
        width: 28,
        height: 28,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
      }}
      title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        size={size}
        strokeWidth={1.75}
        fill={isStarred ? 'var(--sem-star)' : 'none'}
        color={isStarred ? 'var(--sem-star)' : 'var(--fg-4)'}
      />
    </button>
  );
}