// =====================================================
// TODAY LINE COMPONENT
// Vertical line indicating current date
// =====================================================

interface TodayLineProps {
  position: number;
}

export function TodayLine({ position }: TodayLineProps) {
  if (position < 0) return null;
  
  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: position }}
    >
      {/* Line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-blue-600" />
      
      {/* Top Circle */}
      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-blue-600 rounded-full" />
    </div>
  );
}
