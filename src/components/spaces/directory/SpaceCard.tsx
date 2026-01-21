// ════════════════════════════════════════════════════════════════════════════
// SPACE CARD COMPONENT
// ════════════════════════════════════════════════════════════════════════════

import { Link } from 'react-router-dom';
import { Star, Users, Clock, MoreHorizontal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useToggleSpaceStar } from '@/hooks/spaces';
import { SpaceAvatar } from '../shared/SpaceAvatar';
import { SpaceTypeBadge } from '../shared/SpaceTypeBadge';
import type { SpaceWithStats } from '@/types/spaces';

interface SpaceCardProps {
  space: SpaceWithStats;
}

export function SpaceCard({ space }: SpaceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleStar = useToggleSpaceStar();

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  const handleToggleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStar.mutate({
      spaceId: space.id,
      isCurrentlyStarred: space.is_starred || false,
    });
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const getUpdatedText = () => {
    const date = new Date(space.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link
      to={`/spaces/${space.id}`}
      className="group block bg-background border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <SpaceAvatar
            name={space.name}
            spaceKey={space.key}
            color={space.color}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {space.name}
            </h3>
            <span className="text-xs text-muted-foreground">{space.key}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Star Button */}
          <button
            onClick={handleToggleStar}
            className={cn(
              'p-1 rounded transition-colors',
              space.is_starred
                ? 'text-amber-500'
                : 'text-muted-foreground hover:text-amber-500'
            )}
            title={space.is_starred ? 'Unstar' : 'Star'}
          >
            <Star
              className={cn('w-5 h-5', space.is_starred && 'fill-current')}
            />
          </button>

          {/* Actions Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {menuOpen && (
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    // TODO: Open archive modal
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Archive
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 flex-wrap">
        <SpaceTypeBadge type={space.type} />

        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          {space.member_count || 0} members
        </span>

        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {getUpdatedText()}
        </span>
      </div>
    </Link>
  );
}
