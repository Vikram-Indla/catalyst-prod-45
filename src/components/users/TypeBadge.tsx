import { getTypeBadgeClass } from '@/constants/users';

interface TypeBadgeProps {
  type: string | null;
}

/**
 * Normalizes resource type to a single canonical value.
 * Handles edge cases like combined values or legacy names.
 */
const normalizeType = (type: string | null): string | null => {
  if (!type) return null;
  
  // Trim and get just the first word if multiple values exist
  const normalized = type.trim().split(/[\s,]+/)[0];
  
  // Map legacy values to canonical names
  const typeMap: Record<string, string> = {
    'core': 'Variable',
    'variable': 'Variable',
    'fixed': 'Fixed',
    'permanent': 'Permanent',
    'freelance': 'Freelance',
  };
  
  return typeMap[normalized.toLowerCase()] || normalized;
};

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  // Debug: log raw type values to identify data issues
  if (type && (type.includes(' ') || type.includes(','))) {
    console.warn('[TypeBadge] Multi-value type detected:', type);
  }
  
  const normalizedType = normalizeType(type);
  
  if (!normalizedType) return <span>—</span>;
  
  const typeClass = getTypeBadgeClass(normalizedType);
  
  return (
    <span className={`ct-badge ${typeClass}`}>
      <span className="ct-badge-dot" />
      {normalizedType}
    </span>
  );
};
