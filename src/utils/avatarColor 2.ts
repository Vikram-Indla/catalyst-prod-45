// Deterministic avatar color — HSL space, fixed S/L, hue from userId hash
// RULE: NEVER hardcode hex for user avatars anywhere in Catalyst
const AVATAR_HUES = [211, 168, 271, 338, 16, 142, 191, 45, 0, 225, 280, 60];

export function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_HUES.length;
  return `hsl(${AVATAR_HUES[index]}, 62%, 40%)`;
}

export function getUserInitials(fullName: string): string {
  if (!fullName?.trim()) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
