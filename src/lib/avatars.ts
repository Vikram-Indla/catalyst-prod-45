/**
 * Avatar resolver — single chokepoint for mapping a user name to a local avatar asset.
 *
 * Images live in `src/assets/avatars/` as `<slug>.<ext>` (png|jpg|jpeg|webp).
 * Vite's `import.meta.glob` eager-loads them at build time so each file becomes
 * a hashed URL — no runtime fetching, no external hosts, no PII leak.
 *
 * If no local file matches, `resolveAvatarUrl` returns `null` and the caller
 * falls back to its existing initials/CircleUser rendering.
 *
 * To add avatars: run `node scripts/download-avatars.mjs` (see script for details).
 * External avatar URLs (gravatar, cdn, supabase storage) are banned per CLAUDE.md §19.
 */

const avatarModules = import.meta.glob(
  '/src/assets/avatars/*.{png,jpg,jpeg,webp}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const avatarBySlug: Record<string, string> = Object.entries(avatarModules).reduce(
  (acc, [path, url]) => {
    const filename = path.split('/').pop() ?? '';
    const slug = filename.replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase();
    if (slug) acc[slug] = url;
    return acc;
  },
  {} as Record<string, string>,
);

export function slugifyName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function resolveAvatarUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  const slug = slugifyName(name);
  return avatarBySlug[slug] ?? null;
}

export function getAvailableAvatarSlugs(): string[] {
  return Object.keys(avatarBySlug);
}
