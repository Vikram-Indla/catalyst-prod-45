// ============================================================================
// src/spaces/components/CreateSpaceModal.tsx
// Self-rolled modal scaffold (fixed-position backdrop + dialog) wrapping the
// CreateSpaceWizard. Mounts via React.createPortal to <body> so we don't
// inherit the AllProjectsPage stacking context.
//
// Why not @atlaskit/modal-dialog? The Atlaskit Modal v14.15 in this codebase
// mounts its portal scaffold (FocusLockUI, ThemeProvider, motion wrappers)
// but renders empty content — the children never appear in the portal HTML.
// Verified via Chrome MCP DOM probe (Apr 2026 RCA). Same systemic issue we
// hit with @atlaskit/popup. Self-roll until the lib is upgraded.
// ============================================================================

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Heading from '@atlaskit/heading';
import { IconButton } from '@atlaskit/button/new';
import CrossIcon from '@atlaskit/icon/glyph/cross';

import { SpaceServiceProvider } from '../services/SpaceServiceContext';
import { supabaseProjectService } from '../services/SupabaseProjectService';
import type { Space, SpaceService } from '../types';
import { CreateSpaceWizard } from './CreateSpaceWizard';

export interface CreateSpaceModalProps {
  /** Controls modal visibility — parent owns this state. */
  isOpen: boolean;
  /** Fired on cancel, ESC, or backdrop click. */
  onClose: () => void;
  /** Fired after the service successfully creates the space. */
  onCreated?: (space: Space) => void;
  /**
   * Override the SpaceService — defaults to the Supabase adapter.
   * Tests inject a MockSpaceService here.
   */
  service?: SpaceService;
}

export function CreateSpaceModal({
  isOpen,
  onClose,
  onCreated,
  service = supabaseProjectService,
}: CreateSpaceModalProps) {
  // Esc-to-close + body scroll lock while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreated = (space: Space) => {
    onCreated?.(space);
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'rgba(9, 30, 66, 0.54)',
        paddingTop: 80,
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 120px)',
          background: token('elevation.surface.overlay'),
          borderRadius: 8,
          boxShadow: token('elevation.shadow.overlay'),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 12px',
            borderBottom: `1px solid ${token('color.border')}`,
          }}
        >
          <span id="create-project-modal-title">
            <Heading size="medium">Create project</Heading>
          </span>
          <IconButton
            appearance="subtle"
            spacing="compact"
            icon={CrossIcon}
            label="Close"
            onClick={onClose}
          />
        </div>

        {/* Body — wizard renders inside */}
        <div style={{ padding: '16px 24px 20px', overflowY: 'auto', flex: 1 }}>
          <SpaceServiceProvider service={service}>
            <CreateSpaceWizard onCancel={onClose} onCreated={handleCreated} />
          </SpaceServiceProvider>
        </div>
      </div>
    </div>,
    document.body,
  );
}
