/**
 * Cursor Presence UI
 * 
 * Display active collaborators + their cursors.
 * Features:
 * - Active users list with colors
 * - Live cursor tracking (if supported)
 * - Connection status
 * - Conflict indicators
 * 
 * All ADS themed.
 */

import React, { useEffect, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Badge from '@atlaskit/badge';
import Button from '@atlaskit/button';
import { Box, Inline, Stack } from '@atlaskit/primitives';

import type {
  CollaborativeSession,
  RemoteUser,
} from './collaborativeEditing';
import {
  getRemoteUsers,
  getActiveCollaboratorCount,
  getSessionStats,
} from './collaborativeEditing';

// ============================================================================
// PRESENCE INDICATOR
// ============================================================================

interface PresenceIndicatorProps {
  session: CollaborativeSession;
  showStats?: boolean;
}

/**
 * Real-time presence indicator
 * Shows who's currently editing
 * 
 * DYNAMITE Stage D:
 * - WebSocket awareness updates → Component re-renders → UI shows live users
 */
export const PresenceIndicator = React.forwardRef<
  HTMLDivElement,
  PresenceIndicatorProps
>(({ session, showStats = false }, ref) => {
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [stats, setStats] = useState({ collaborators: 0, updates: 0, bytesUsed: 0 });

  // Update on awareness changes
  useEffect(() => {
    const updatePresence = () => {
      const users = getRemoteUsers(session.provider);
      setRemoteUsers(users);

      if (showStats) {
        const newStats = getSessionStats(session);
        setStats(newStats);
      }
    };

    session.provider.awareness.on('change', updatePresence);
    updatePresence(); // Initial

    return () => {
      session.provider.awareness.off('change', updatePresence);
    };
  }, [session, showStats]);

  const activeCount = remoteUsers.filter((u) => u.isActive).length;

  return (
    <div
      ref={ref}
      style={{
        padding: token('space.100'),
        backgroundColor: token('color.background.neutral'),
        borderRadius: token('border.radius.100'),
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.100'),
      }}
    >
      {/* ============================================================ */}
      {/* ACTIVE USERS BADGE */}
      {/* ============================================================ */}

      <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050') }}>
        <span style={{ fontSize: '13px', color: token('color.text.subtlest') }}>
          Editing:
        </span>
        {activeCount === 0 ? (
          <Badge>Just you</Badge>
        ) : (
          <Badge appearance="primary">{activeCount + 1} editing</Badge>
        )}
      </div>

      {/* ============================================================ */}
      {/* ACTIVE USERS LIST */}
      {/* ============================================================ */}

      {activeCount > 0 && (
        <div style={{ display: 'flex', gap: token('space.050'), flexWrap: 'wrap' }}>
          {remoteUsers
            .filter((u) => u.isActive)
            .map((user) => (
              <div
                key={user.userId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: `2px ${token('space.050')}`,
                  backgroundColor: user.color + '20',
                  border: `1px solid ${user.color}`,
                  borderRadius: token('border.radius.050'),
                  fontSize: '12px',
                  color: token('color.text'),
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: user.color,
                  }}
                />
                {user.userName}
              </div>
            ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* STATISTICS (OPTIONAL) */}
      {/* ============================================================ */}

      {showStats && (
        <div
          style={{
            fontSize: '11px',
            color: token('color.text.subtlest'),
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: token('space.050'),
            borderTop: `1px solid ${token('color.border')}`,
            paddingTop: token('space.050'),
          }}
        >
          <span>Updates: {stats.updates}</span>
          <span>Size: {(stats.bytesUsed / 1024).toFixed(1)}KB</span>
        </div>
      )}
    </div>
  );
});

PresenceIndicator.displayName = 'PresenceIndicator';

// ============================================================================
// COLLABORATORS PANEL (SIDEBAR)
// ============================================================================

interface CollaboratorsPanelProps {
  session: CollaborativeSession;
  onKick?: (userId: string) => void;
}

/**
 * Detailed collaborators panel
 * Shows all users (active + idle) with actions
 */
export const CollaboratorsPanel = React.forwardRef<
  HTMLDivElement,
  CollaboratorsPanelProps
>(({ session, onKick }, ref) => {
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);

  useEffect(() => {
    const updateUsers = () => {
      const users = getRemoteUsers(session.provider);
      setRemoteUsers(users);
    };

    session.provider.awareness.on('change', updateUsers);
    updateUsers(); // Initial

    return () => {
      session.provider.awareness.off('change', updateUsers);
    };
  }, [session]);

  return (
    <div
      ref={ref}
      style={{
        padding: token('space.200'),
        backgroundColor: token('color.background'),
        borderLeft: `2px solid ${token('color.border')}`,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <h4
        style={{
          margin: 0,
          marginBottom: token('space.150'),
          fontSize: '13px',
          color: token('color.text'),
        }}
      >
        Collaborators ({remoteUsers.length + 1})
      </h4>

      {/* ============================================================ */}
      {/* SELF */}
      {/* ============================================================ */}

      <div
        style={{
          padding: token('space.100'),
          marginBottom: token('space.100'),
          backgroundColor: token('color.background.neutral'),
          borderRadius: token('border.radius.050'),
          fontSize: '12px',
        }}
      >
        <strong>You</strong>
        <span style={{ marginLeft: token('space.050'), color: token('color.text.subtlest') }}>
          (editing)
        </span>
      </div>

      {/* ============================================================ */}
      {/* REMOTE USERS */}
      {/* ============================================================ */}

      {remoteUsers.length === 0 ? (
        <p style={{ color: token('color.text.subtlest'), fontSize: '12px' }}>
          No other collaborators
        </p>
      ) : (
        remoteUsers.map((user) => (
          <div
            key={user.userId}
            style={{
              padding: token('space.100'),
              marginBottom: token('space.050'),
              borderLeft: `3px solid ${user.color}`,
              backgroundColor: token('color.background.neutral'),
              borderRadius: token('border.radius.050'),
              fontSize: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{user.userName}</strong>
                <span
                  style={{
                    marginLeft: token('space.050'),
                    color: user.isActive ? token('color.text.success') : token('color.text.subtlest'),
                    fontSize: '11px',
                  }}
                >
                  {user.isActive ? '🟢 Active' : '⚫ Idle'}
                </span>
              </div>
              {onKick && (
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => onKick(user.userId)}
                  isDisabled={!user.isActive}
                >
                  ✕
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
});

CollaboratorsPanel.displayName = 'CollaboratorsPanel';

// ============================================================================
// CONNECTION STATUS
// ============================================================================

interface ConnectionStatusProps {
  session: CollaborativeSession;
}

/**
 * Show connection status (connected, syncing, offline)
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ session }) => {
  const [status, setStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');

  useEffect(() => {
    const updateStatus = () => {
      if (session.provider.shouldConnect) {
        if (session.provider.synced) {
          setStatus('connected');
        } else {
          setStatus('syncing');
        }
      } else {
        setStatus('offline');
      }
    };

    const statusUpdateHandler = () => updateStatus();
    session.provider.on('sync', statusUpdateHandler);
    session.provider.on('connection-close', statusUpdateHandler);
    session.provider.on('connection-error', statusUpdateHandler);

    updateStatus(); // Initial

    return () => {
      session.provider.off('sync', statusUpdateHandler);
      session.provider.off('connection-close', statusUpdateHandler);
      session.provider.off('connection-error', statusUpdateHandler);
    };
  }, [session]);

  const statusConfig = {
    connected: { color: '#16A34A', icon: '●', text: 'All changes saved' },
    syncing: { color: '#D97706', icon: '◐', text: 'Syncing...' },
    offline: { color: '#DC2626', icon: '○', text: 'Offline' },
  };

  const config = statusConfig[status];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: `4px ${token('space.100')}`,
        borderRadius: token('border.radius.050'),
        fontSize: '12px',
        color: config.color,
      }}
    >
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
};

// ============================================================================
// CONFLICT INDICATOR
// ============================================================================

interface ConflictIndicatorProps {
  hasConflict: boolean;
  onResolve?: () => void;
}

/**
 * Show if there are unresolved conflicts
 * (Yjs resolves them automatically, but UI can show notification)
 */
export const ConflictIndicator: React.FC<ConflictIndicatorProps> = ({
  hasConflict,
  onResolve,
}) => {
  if (!hasConflict) return null;

  return (
    <div
      style={{
        padding: token('space.100'),
        backgroundColor: token('color.background.warning'),
        border: `1px solid ${token('color.border.warning')}`,
        borderRadius: token('border.radius.050'),
        fontSize: '12px',
        color: token('color.text.warning'),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>⚠️ Conflicting edits detected. Yjs is resolving...</span>
      {onResolve && (
        <Button appearance="warning" size="small" onClick={onResolve}>
          Resolve
        </Button>
      )}
    </div>
  );
};

// ============================================================================
// COMBINED HEADER BAR
// ============================================================================

interface CollaborativeHeaderProps {
  session: CollaborativeSession;
}

/**
 * All-in-one header showing presence + status
 */
export const CollaborativeHeader: React.FC<CollaborativeHeaderProps> = ({
  session,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: token('space.100'),
        borderBottom: `1px solid ${token('color.border')}`,
        backgroundColor: token('color.background.neutral'),
      }}
    >
      <PresenceIndicator session={session} />
      <ConnectionStatus session={session} />
    </div>
  );
};
