// ════════════════════════════════════════════════════════════════════════════
// SPACES LIST VIEW
// ════════════════════════════════════════════════════════════════════════════

import { Link } from 'react-router-dom';
import { Star, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useToggleSpaceStar } from '@/hooks/spaces';
import { SpaceAvatar } from '../shared/SpaceAvatar';
import { SpaceTypeBadge } from '../shared/SpaceTypeBadge';
import { UserAvatar } from '../shared/UserAvatar';
import type { SpaceWithStats } from '@/types/spaces';

interface SpacesListProps {
  spaces: SpaceWithStats[];
}

export function SpacesList({ spaces }: SpacesListProps) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[auto,1fr,80px,1fr,1fr,100px,80px] gap-4 px-4 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase">
        <span className="w-8" />
        <span>Name</span>
        <span>Key</span>
        <span>Lead</span>
        <span>Category</span>
        <span>Type</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Rows */}
      {spaces.map((space) => (
        <SpaceListRow key={space.id} space={space} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST ROW
// ─────────────────────────────────────────────────────────────────────────────

function SpaceListRow({ space }: { space: SpaceWithStats }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleStar = useToggleSpaceStar();

  const handleToggleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStar.mutate({
      spaceId: space.id,
      isCurrentlyStarred: space.is_starred || false,
    });
  };

  return (
    <Link
      to={`/spaces/${space.id}`}
      className="grid grid-cols-[auto,1fr,80px,1fr,1fr,100px,80px] gap-4 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors items-center"
    >
      <SpaceAvatar
        name={space.name}
        spaceKey={space.key}
        color={space.color}
        size="sm"
      />

      <span className="font-medium text-sm text-foreground truncate">
        {space.name}
      </span>

      <span className="text-sm text-muted-foreground">{space.key}</span>

      <div className="flex items-center gap-2">
        {space.lead_name ? (
          <>
            <UserAvatar name={space.lead_name} email={space.lead_email} size="sm" />
            <div className="min-w-0">
              <div className="text-sm text-foreground truncate">
                {space.lead_name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {space.lead_email?.split('@')[0]}
              </div>
            </div>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        )}
      </div>

      <span className="text-sm text-muted-foreground truncate">
        {space.category_name || 'Uncategorized'}
      </span>

      <SpaceTypeBadge type={space.type} showIcon={false} />

      <div className="flex items-center justify-end gap-1">
        <button
          onClick={handleToggleStar}
          className={cn(
            'p-1 rounded transition-colors',
            space.is_starred
              ? 'text-amber-500'
              : 'text-muted-foreground hover:text-amber-500'
          )}
        >
          <Star className={cn('w-4 h-4', space.is_starred && 'fill-current')} />
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-background border border-border rounded-md shadow-lg z-20 py-1">
                <Link
                  to={`/spaces/${space.id}/settings`}
                  onClick={(e) => e.stopPropagation()}
                  className="block px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Settings
                </Link>
                <Link
                  to={`/spaces/${space.id}/board`}
                  onClick={(e) => e.stopPropagation()}
                  className="block px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Open Board
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
