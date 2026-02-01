// Aqd¹⁰ Empty Slot Component - Placeholder for unfilled priority slots
import React from 'react';

interface AqdEmptySlotProps {
  rank: number;
  onClick?: () => void;
}

export function AqdEmptySlot({ rank, onClick }: AqdEmptySlotProps) {
  const placeholderText = rank === 3 
    ? 'Empty slot — drag or type to add priority'
    : rank <= 5 
      ? 'Empty slot — click to add priority'
      : 'Empty slot';
  
  return (
    <div className="aqd-slot-empty" onClick={onClick}>
      <div className="aqd-rank-empty">{rank}</div>
      <span className="aqd-slot-placeholder">{placeholderText}</span>
    </div>
  );
}
