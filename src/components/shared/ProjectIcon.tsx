/**
 * ProjectIcon — canonical, single-source-of-truth project tile.
 *
 * Rule (mem://constraints/canonical-project-icons):
 *   Project visuals MUST come from the project's own data. NEVER from a
 *   hashed-name generator and NEVER from a single-letter initial tile.
 *
 * Resolution order (canonical):
 *   1. `avatarUrl`      → render the Jira-uploaded image (projects.avatar_url)
 *   2. `iconName + color` → render Lucide icon on a tinted square
 *                          (ph_projects.icon + ph_projects.color)
 *   3. fallback         → Lucide <Folder> in muted grey. Never letters.
 *
 * ADS compliance
 * ──────────────
 * Sizing scale mirrors @atlaskit/avatar appearance="square":
 *   xsmall=16, small=20, medium=24, large=32, xlarge=40
 * Border radius matches ADS square avatar (3px ≤ 24, 4px ≥ 32) so the
 * component drops cleanly into rows that previously rendered Atlaskit
 * Avatar without disturbing line-height or vertical rhythm.
 */
import React from 'react';
import * as LucideIcons from 'lucide-react';
import {
  PROJECT_AVATAR_REGISTRY,
  STOCK_AVATAR_REGISTRY,
  pickStockAvatarForKey,
  type ProjectKey,
} from '@/components/icons/icons.registry';
import { useIconOverrides } from '@/components/icons/useIconOverrides';

export type ProjectIconSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

const SIZE_PX: Record<ProjectIconSize, number> = {
  xsmall: 16,
  small: 20,
  medium: 24,
  large: 32,
  xlarge: 40,
};

const ICON_PX: Record<ProjectIconSize, number> = {
  xsmall: 10,
  small: 12,
  medium: 14,
  large: 18,
  xlarge: 22,
};

interface ProjectIconProps {
  /**
   * 2026-05-03 (RESET ICONS): Catalyst project key. When set and the key
   * exists in PROJECT_AVATAR_REGISTRY, the bundled brand avatar wins over
   * every other source. This is the new canonical path.
   */
  projectKey?: string | null;
  /** projects.avatar_url — Jira-uploaded project image. Used when projectKey is unmapped. */
  avatarUrl?: string | null;
  /** ph_projects.icon — Lucide icon name (e.g. "rocket", "folder"). */
  iconName?: string | null;
  /** ph_projects.color — hex (e.g. "var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))"). */
  color?: string | null;
  /** ADS sizing. Defaults to 'medium' (24px). */
  size?: ProjectIconSize;
  /** Project name — accessibility only. NEVER rendered as a letter tile. */
  name?: string | null;
  className?: string;
  /**
   * Visual variant.
   * - 'solid' (default): filled tile in `color`, white icon. Matches Jira's
   *   project-card and breadcrumb chips.
   * - 'ghost': transparent / faintly-tinted tile, icon stroke uses the
   *   project color. Matches Jira's recent-items and side-nav rows in
   *   dark mode (per ref screenshot 2026-05).
   */
  variant?: 'solid' | 'ghost';
}

/**
 * Convert a Lucide icon name (kebab-case from DB) to its PascalCase
 * component name and resolve from lucide-react's named exports.
 */
function resolveLucideIcon(name?: string | null): React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> | null {
  if (!name) return null;
  const pascal = name
    .split(/[-_\s]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const Comp = (LucideIcons as Record<string, unknown>)[pascal];
  return (typeof Comp === 'function' ? Comp : null) as React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> | null;
}

export function ProjectIcon({
  projectKey,
  avatarUrl,
  iconName,
  color,
  size = 'medium',
  name,
  className,
  variant = 'solid',
}: ProjectIconProps) {
  const px = SIZE_PX[size];
  const radius = px <= 24 ? 3 : 4;
  const iconPx = ICON_PX[size];
  const { data: overrides } = useIconOverrides();

  // 0. Admin override via /admin/icons — checked for ANY projectKey, not just
  // the 18 bundled in PROJECT_AVATAR_REGISTRY. This lets COMP, DM, SEC etc.
  // resolve once their icon is uploaded in the admin UI.
  if (projectKey && overrides?.projectAvatar?.[projectKey]) {
    const url = overrides.projectAvatar[projectKey];
    return (
      <img
        src={url}
        alt={name ?? projectKey}
        width={px}
        height={px}
        className={className}
        data-project-key={projectKey}
        data-icon-source="override"
        style={{
          width: px,
          height: px,
          borderRadius: radius,
          objectFit: 'fill',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
    );
  }

  // 0b. Explicit avatarUrl — takes priority over the bundled registry so that
  // product adapters (ProductHeaderChip) can inject a landmark SVG for product
  // codes that share a key with PROJECT_AVATAR_REGISTRY (e.g. 'INV').
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? ''}
        width={px}
        height={px}
        className={className}
        data-icon-source="avatar-url"
        style={{
          width: px,
          height: px,
          borderRadius: radius,
          objectFit: 'fill',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
    );
  }

  // 0c. Bundled registry avatar (the 18 canonical Catalyst project keys).
  if (projectKey && projectKey in PROJECT_AVATAR_REGISTRY) {
    const url = PROJECT_AVATAR_REGISTRY[projectKey as ProjectKey].url;
    return (
      <img
        src={url}
        alt={name ?? PROJECT_AVATAR_REGISTRY[projectKey as ProjectKey].name}
        width={px}
        height={px}
        className={className}
        data-project-key={projectKey}
        data-icon-source="bundled"
        style={{
          width: px,
          height: px,
          borderRadius: radius,
          objectFit: 'fill',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
    );
  }

  // 2. Secondary: Lucide icon. 'solid' = filled tile + white icon.
  // 'ghost' = transparent tile + colored icon stroke (Jira recent-items).
  const LucideIcon = resolveLucideIcon(iconName);
  if (LucideIcon && color) {
    const isGhost = variant === 'ghost';
    return (
      <span
        aria-label={name ?? undefined}
        className={className}
        style={{
          width: px,
          height: px,
          borderRadius: radius,
          background: isGhost ? 'transparent' : color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: isGhost ? color : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
        }}
      >
        <LucideIcon
          size={iconPx}
          color={isGhost ? color : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))'}
          strokeWidth={2}
        />
      </span>
    );
  }

  // 3. Fallback: stock avatar from rotation pool (deterministic hash on projectKey).
  // Unknown project keys get a real branded icon — never a grey folder.
  const stockId = pickStockAvatarForKey(projectKey ?? 'unknown');
  const stockUrl = STOCK_AVATAR_REGISTRY[stockId];
  return (
    <img
      src={stockUrl}
      alt={name ?? projectKey ?? 'project'}
      width={px}
      height={px}
      className={className}
      data-project-key={projectKey ?? ''}
      data-icon-source="stock"
      data-stock-id={stockId}
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        objectFit: 'fill',
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

export default ProjectIcon;
