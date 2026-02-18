import React from 'react';

interface CardScoreRingProps {
  score: number | null;
  size?: number;
}

function getScoreColor(score: number | null): string {
  if (score === null) return '#e4e4e7';
  if (score >= 4.0) return '#10b981';
  if (score >= 3.0) return '#3b82f6';
  return '#f59e0b';
}

export const CardScoreRing: React.FC<CardScoreRingProps> = ({ score, size = 64 }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = score !== null ? circumference * (1 - score / 5) : circumference;
  const color = getScoreColor(score);

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e4e4e7"
        strokeWidth={strokeWidth}
      />
      {/* Score arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        {...(score === null ? { strokeDasharray: '4 4' } : {})}
      />
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        className="font-bold fill-zinc-900"
        style={{ fontSize: size <= 48 ? 11 : size <= 64 ? 13 : 15 }}
      >
        {score !== null ? score.toFixed(1) : '—'}
      </text>
    </svg>
  );
};

export default CardScoreRing;
