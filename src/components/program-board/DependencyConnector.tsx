import { useEffect, useRef } from 'react';

interface DependencyConnectorProps {
  fromFeatureId: string;
  toFeatureId: string;
  status?: 'resolved' | 'open' | 'blocked';
}

export function DependencyConnector({ fromFeatureId, toFeatureId, status = 'open' }: DependencyConnectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fromElement = document.querySelector(`[data-feature-id="${fromFeatureId}"]`);
    const toElement = document.querySelector(`[data-feature-id="${toFeatureId}"]`);

    if (!fromElement || !toElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const boardContainer = canvas.parentElement;
    if (!boardContainer) return;

    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();
    const containerRect = boardContainer.getBoundingClientRect();

    // Calculate positions relative to canvas
    const fromX = fromRect.right - containerRect.left;
    const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
    const toX = toRect.left - containerRect.left;
    const toY = toRect.top + toRect.height / 2 - containerRect.top;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set line style based on status
    ctx.strokeStyle = status === 'resolved' ? '#22c55e' : status === 'blocked' ? '#ef4444' : '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash(status === 'blocked' ? [5, 5] : []);

    // Draw arrow
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    
    // Control points for bezier curve
    const cpX1 = fromX + (toX - fromX) * 0.3;
    const cpX2 = fromX + (toX - fromX) * 0.7;
    ctx.bezierCurveTo(cpX1, fromY, cpX2, toY, toX, toY);
    ctx.stroke();

    // Draw arrowhead
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }, [fromFeatureId, toFeatureId, status]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      width={2000}
      height={2000}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
