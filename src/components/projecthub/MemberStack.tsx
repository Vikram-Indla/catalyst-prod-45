interface MemberStackProps {
  memberIds: string[] | null;
  memberCount: number;
  max?: number;
}

const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0D9488', '#D97706', '#DC2626', '#16A34A', '#0284C7', '#6366F1'];

function getColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function MemberStack({ memberIds, memberCount, max = 3 }: MemberStackProps) {
  const ids = memberIds ?? [];
  const shown = ids.slice(0, max);
  const overflow = memberCount - shown.length;

  if (memberCount === 0) {
    return <span style={{ fontSize: 11, color: '#94A3B8' }}>—</span>;
  }

  return (
    <div className="flex items-center">
      {shown.map((id, i) => (
        <div
          key={id}
          className="flex items-center justify-center rounded-full border-2 border-white"
          style={{
            width: 26,
            height: 26,
            background: getColor(id),
            marginLeft: i > 0 ? -8 : 0,
            fontSize: 9,
            fontWeight: 700,
            color: '#FFF',
            zIndex: max - i,
          }}
        >
          {id.substring(0, 2).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full border-2 border-white"
          style={{
            width: 26,
            height: 26,
            background: '#F1F5F9',
            marginLeft: -8,
            fontSize: 10,
            fontWeight: 600,
            color: '#64748B',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
