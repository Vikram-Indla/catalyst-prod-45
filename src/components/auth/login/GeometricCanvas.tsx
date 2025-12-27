import { useEffect, useRef } from 'react';
import { loginColors } from './constants';

interface GeometricCanvasProps {
  className?: string;
}

export function GeometricCanvas({ className }: GeometricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drawEightPointedStar = (
      x: number, 
      y: number, 
      outerRadius: number, 
      innerRadius: number, 
      rotation: number,
      color: string
    ) => {
      const points = 8;
      ctx.beginPath();
      
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI / points) + rotation;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    const cellSize = 60;
    const goldColor = `rgba(198, 156, 109, 0.04)`;
    const tealColor = `rgba(13, 148, 136, 0.025)`;

    const animate = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      const rotation = prefersReducedMotion ? 0 : time * 0.0001;
      const floatOffset = prefersReducedMotion ? 0 : Math.sin(time * 0.001) * 2;

      const cols = Math.ceil(rect.width / cellSize) + 1;
      const rows = Math.ceil(rect.height / cellSize) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cellSize + cellSize / 2;
          const y = row * cellSize + cellSize / 2 + floatOffset;
          const color = (row + col) % 2 === 0 ? goldColor : tealColor;
          
          drawEightPointedStar(x, y, 18, 8, rotation, color);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    if (!prefersReducedMotion) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Draw static pattern once
      animate(0);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ 
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.6,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}
