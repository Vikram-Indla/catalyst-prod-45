/**
 * Release Dropdown - Revamped for Catalyst Menu
 * Shows: Incident Room, Create Release, Manage Releases (admin only)
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Siren } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface ReleaseDropdownProps {
  onClose: () => void;
}

export function ReleaseDropdown({ onClose }: ReleaseDropdownProps) {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const handleIncidentRoom = useCallback(() => {
    navigate('/release/incident-room');
    onClose();
  }, [navigate, onClose]);

  const handleCreateRelease = useCallback(() => {
    navigate('/release/versions?create=true');
    onClose();
  }, [navigate, onClose]);

  const handleManageReleases = useCallback(() => {
    navigate('/release/versions');
    onClose();
  }, [navigate, onClose]);

  return (
    <div className="w-64 bg-popover border border-border rounded-md shadow-md overflow-hidden z-[60]">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-sm font-medium text-foreground">Release</p>
      </div>
      
      <div className="divide-y divide-border/50">
        {/* Incident Room - always visible */}
        <button
          onClick={handleIncidentRoom}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
        >
          <Siren className="h-4 w-4 text-destructive" />
          Incident Room
        </button>
        
        {isAdmin && (
          <button
            onClick={handleCreateRelease}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create Release
          </button>
        )}
        {isAdmin && (
          <button
            onClick={handleManageReleases}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Manage Releases
          </button>
        )}
      </div>
    </div>
  );
}
