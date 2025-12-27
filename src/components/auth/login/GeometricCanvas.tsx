/**
 * Geometric Canvas Component
 * Animated Islamic-inspired 8-pointed star pattern - matches HTML exactly
 */

import { useEffect, useRef } from 'react';

export function GeometricCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    const drawPattern = () => {
      timeRef.current += 0.003;
      const time = timeRef.current;
      
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      const size = 60;
      const cols = Math.ceil(canvas.offsetWidth / size) + 1;
      const rows = Math.ceil(canvas.offsetHeight / size) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * size;
          const y = j * size;
          const offset = Math.sin(time + i * 0.3 + j * 0.3) * 3;
          
          ctx.save();
          ctx.translate(x + offset, y + offset);
          ctx.rotate(time * 0.1);
          
          const alpha = 0.04 + Math.sin(time + i + j) * 0.02;
          ctx.strokeStyle = `rgba(198, 156, 109, ${alpha})`;
          ctx.lineWidth = 0.5;
          
          // Draw 8-pointed star (outer)
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const angle = (k / 8) * Math.PI * 2;
            const px = Math.cos(angle) * size * 0.3;
            const py = Math.sin(angle) * size * 0.3;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          
          // Draw inner teal star
          ctx.strokeStyle = `rgba(13, 148, 136, ${alpha * 0.6})`;
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const angle = (k / 8) * Math.PI * 2 + Math.PI / 8;
            const px = Math.cos(angle) * size * 0.15;
            const py = Math.sin(angle) * size * 0.15;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          
          ctx.restore();
        }
      }
      
      animationRef.current = requestAnimationFrame(drawPattern);
    };

    window.addEventListener('resize', resize);
    resize();
    drawPattern();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pattern-canvas"
      aria-hidden="true"
    />
  );
}
