// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ RANK BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { getRankStyle, type RankStyle } from '../../types';

interface T10RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 't10-rank-badge--sm',
  md: '',
  lg: 't10-rank-badge--lg',
};

const styleClasses: Record<RankStyle, string> = {
  'blue-gradient': 't10-rank-badge--blue',
  'gray': 't10-rank-badge--gray',
  'dashed': 't10-rank-badge--dashed',
};

export function T10RankBadge({ rank, size = 'md' }: T10RankBadgeProps) {
  const style = getRankStyle(rank);
  
  return (
    <div className={`t10-rank-badge ${styleClasses[style]} ${sizeClasses[size]}`}>
      {rank}
    </div>
  );
}

export default T10RankBadge;
