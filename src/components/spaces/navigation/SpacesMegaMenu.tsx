// ════════════════════════════════════════════════════════════════════════════
// SPACES MEGA MENU (Dropdown from top nav)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStarredSpaces, useRecentSpaces } from '@/hooks/spaces';
import { SpaceAvatar } from '../shared/SpaceAvatar';
import type { SpaceWithStats } from '@/types/spaces';

interface SpacesMegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSpace: () => void;
}

export function SpacesMegaMenu({ isOpen, onClose, onCreateSpace }: SpacesMegaMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: starredSpaces = [], isLoading: loadingStarred } = useStarredSpaces();
  const { data: recentSpaces = [], isLoading: loadingRecent } = useRecentSpaces(5);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset search when menu closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter spaces by search query
  const filteredRecent = recentSpaces.filter(
    (space) =>
      space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStarred = starredSpaces.filter(
    (space) =>
      space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showStarred = filteredStarred.length > 0;

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-1 w-80 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
      {/* Search Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search spaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1"
        />
      </div>

      <div className="max-h-80 overflow-y-auto">
        {/* Starred Section */}
        {showStarred && (
          <div className="py-2">
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
              <Star className="w-3 h-3" />
              Starred
            </div>
            {filteredStarred.slice(0, 5).map((space) => (
              <SpaceMegaMenuItem
                key={space.id}
                space={space}
                showStar
                onClick={onClose}
              />
            ))}
          </div>
        )}

        {/* Recent Section */}
        <div className="py-2 border-t border-border">
          <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
            Recent
          </div>
          {loadingRecent ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : filteredRecent.length > 0 ? (
            filteredRecent.map((space) => (
              <SpaceMegaMenuItem
                key={space.id}
                space={space}
                showUpdated
                onClick={onClose}
              />
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No spaces found' : 'No recent spaces'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-muted/50">
        <Link
          to="/spaces"
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all spaces
          <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          onClick={onCreateSpace}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Space
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEGA MENU ITEM
// ─────────────────────────────────────────────────────────────────────────────

interface SpaceMegaMenuItemProps {
  space: SpaceWithStats;
  showStar?: boolean;
  showUpdated?: boolean;
  onClick: () => void;
}

function SpaceMegaMenuItem({ space, showStar, showUpdated, onClick }: SpaceMegaMenuItemProps) {
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
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
    >
      <SpaceAvatar
        name={space.name}
        spaceKey={space.key}
        color={space.color}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate">
            {space.name}
          </span>
          {showStar && (
            <Star className="w-3 h-3 text-amber-500 fill-current shrink-0" />
          )}
        </div>
        {showUpdated && (
          <span className="text-xs text-muted-foreground">
            Updated {getUpdatedText()}
          </span>
        )}
      </div>
    </Link>
  );
}
