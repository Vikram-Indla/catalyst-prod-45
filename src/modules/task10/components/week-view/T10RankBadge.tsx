// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ RANK BADGE COMPONENT
// Ranks 1-5: Blue gradient | Ranks 6-10: Gray solid | Ranks 11+: Dashed outline
// ═══════════════════════════════════════════════════════════════════════════

import { getRankStyle, type RankStyle } from '../../types';

interface T10RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
}

// Size dimensions
const sizeDimensions: Record<string, { width: number; height: number; fontSize: number }> = {
  sm: { width: 28, height: 28, fontSize: 12 },
  md: { width: 36, height: 36, fontSize: 14 },
  lg: { width: 44, height: 44, fontSize: 16 },
};

// Inline styles to ensure correct rendering regardless of CSS conflicts
const getStyles = (rank: number, size: 'sm' | 'md' | 'lg'): React.CSSProperties => {
  const { width, height, fontSize } = sizeDimensions[size];
  const rankStyle = getRankStyle(rank);
  
  const baseStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize,
    fontWeight: 700,
    flexShrink: 0,
  };
  
  // Ranks 1-5: Blue gradient
  if (rankStyle === 'blue-gradient') {
    return {
      ...baseStyle,
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
    };
  }
  
  // Ranks 6-10: Gray solid
  if (rankStyle === 'gray') {
    return {
      ...baseStyle,
      backgroundColor: '#6b7280',
      color: '#ffffff',
    };
  }
  
  // Ranks 11+: Dashed outline (buffer items)
  return {
    ...baseStyle,
    backgroundColor: 'transparent',
    border: '2px dashed #d1d5db',
    color: '#9ca3af',
  };
};

export function T10RankBadge({ rank, size = 'md' }: T10RankBadgeProps) {
  const style = getRankStyle(rank);
  const styleClasses: Record<RankStyle, string> = {
    'blue-gradient': 't10-rank-badge--blue',
    'gray': 't10-rank-badge--gray',
    'dashed': 't10-rank-badge--dashed',
  };
  
  return (
    <div 
      className={`t10-rank-badge ${styleClasses[style]}`}
      style={getStyles(rank, size)}
    >
      {rank}
    </div>
  );
}

export default T10RankBadge;
