interface UserAvatarProps {
  letter?: string;
}

export function UserAvatar({ letter = 'V' }: UserAvatarProps) {
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: 32,
        height: 32,
        background: '#7C3AED',
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {letter}
    </div>
  );
}
