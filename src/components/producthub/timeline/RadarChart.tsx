// =====================================================
// RADAR CHART — Canvas-based spider chart for 4 scoring dimensions
// =====================================================

import React, { useRef, useEffect } from 'react';

interface RadarChartProps {
  values: { sa: number; bi: number; tu: number; rf: number };
  size?: number;
}

const LABELS = ['SA', 'BI', 'TU', 'RF'];
const ANGLES = LABELS.map((_, i) => (Math.PI / 2) + (2 * Math.PI * i) / LABELS.length);
const LEVELS = 5;

export const RadarChart: React.FC<RadarChartProps> = ({ values, size = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const center = size / 2;
  const radius = (size / 2) - 24;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    // Draw concentric grid levels
    for (let level = 1; level <= LEVELS; level++) {
      const r = (radius / LEVELS) * level;
      ctx.beginPath();
      for (let i = 0; i <= LABELS.length; i++) {
        const angle = ANGLES[i % LABELS.length];
        const x = center + r * Math.cos(angle);
        const y = center - r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'hsl(240 5% 84%)'; // zinc-300
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw axis lines
    for (let i = 0; i < LABELS.length; i++) {
      const angle = ANGLES[i];
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + radius * Math.cos(angle), center - radius * Math.sin(angle));
      ctx.strokeStyle = 'hsl(240 4% 76%)'; // zinc-300
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw axis labels
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'hsl(240 4% 46%)'; // zinc-500
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < LABELS.length; i++) {
      const angle = ANGLES[i];
      const labelR = radius + 16;
      const x = center + labelR * Math.cos(angle);
      const y = center - labelR * Math.sin(angle);
      ctx.fillText(LABELS[i], x, y);
    }

    // Draw data polygon
    const vals = [values.sa, values.bi, values.tu, values.rf];
    ctx.beginPath();
    for (let i = 0; i <= vals.length; i++) {
      const idx = i % vals.length;
      const val = Math.max(0, Math.min(5, vals[idx]));
      const r = (val / LEVELS) * radius;
      const angle = ANGLES[idx];
      const x = center + r * Math.cos(angle);
      const y = center - r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(37,99,235,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < vals.length; i++) {
      const val = Math.max(0, Math.min(5, vals[i]));
      const r = (val / LEVELS) * radius;
      const angle = ANGLES[i];
      const x = center + r * Math.cos(angle);
      const y = center - r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#2563EB';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [values, size, center, radius]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="mx-auto"
    />
  );
};

export default RadarChart;
