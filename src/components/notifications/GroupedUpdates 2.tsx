import { useState } from "react";
import { getAvatarColor, getUserInitials } from "@/utils/avatarColor";

interface GroupedActor {
  id: string;
  full_name: string;
}

interface GroupedUpdatesProps {
  actors: GroupedActor[];
  count: number;
  primaryActorName: string;
  children?: React.ReactNode;
}

export default function GroupedUpdates({ actors, count, primaryActorName, children }: GroupedUpdatesProps) {
  const [expanded, setExpanded] = useState(false);
  const displayActors = actors.slice(0, 3);

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#2563EB',
        }}
      >
        <div style={{ display: 'flex' }}>
          {displayActors.map((a, i) => (
            <div key={a.id} style={{
              width: 20, height: 20, borderRadius: '50%',
              background: getAvatarColor(a.id),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#FFFFFF',
              border: '1.5px solid #FFFFFF',
              marginLeft: i > 0 ? -6 : 0,
              zIndex: displayActors.length - i,
              position: 'relative',
            }}>
              {getUserInitials(a.full_name)}
            </div>
          ))}
        </div>
        {/* m-02: +N is 650 weight, "from [Actor]" is 400 */}
        <span>
          <span style={{ fontWeight: 650 }}>+{count}</span>
          <span style={{ fontWeight: 400 }}> updates from {primaryActorName}</span>
        </span>
      </button>
      {expanded && children && (
        <div style={{ marginTop: 8, paddingLeft: 28, borderLeft: '1px solid rgba(15,23,42,.08)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
