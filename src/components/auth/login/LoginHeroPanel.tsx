import { motion } from 'framer-motion';
import { GeometricCanvas } from './GeometricCanvas';
import { VisionBadge } from './VisionBadge';
import { Headline } from './Headline';
import { FeatureGrid } from './FeatureGrid';
import { loginColors } from './constants';

export function LoginHeroPanel() {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  // Floating dust particles
  const dustParticles = [
    { left: '10%', top: '20%', delay: 0, color: loginColors.brand },
    { left: '80%', top: '30%', delay: 2, color: loginColors.success },
    { left: '30%', top: '60%', delay: 4, color: loginColors.champagne },
    { left: '70%', top: '70%', delay: 6, color: loginColors.brand },
    { left: '50%', top: '40%', delay: 8, color: loginColors.successLight },
    { left: '20%', top: '80%', delay: 10, color: loginColors.brandLight },
  ];

  return (
    <div 
      className="relative flex-1 flex flex-col justify-between overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${loginColors.heroDark} 0%, ${loginColors.heroMid} 40%, #0a0e14 100%)`,
        padding: '2.5rem 3.5rem',
      }}
    >
      {/* Geometric Canvas */}
      <GeometricCanvas />

      {/* Atmospheric Layer 1 - Gradient Glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(198, 156, 109, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 60% 50% at 80% 90%, rgba(13, 148, 136, 0.08) 0%, transparent 50%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Atmospheric Layer 2 - Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Floating Dust Particles */}
      {!prefersReducedMotion && dustParticles.map((particle, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full pointer-events-none"
          style={{
            left: particle.left,
            top: particle.top,
            backgroundColor: particle.color,
            animation: `float 15s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
          aria-hidden="true"
        />
      ))}

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top Section */}
        <div className="mb-auto">
          <VisionBadge />
          <Headline />
          
          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: prefersReducedMotion ? 0.01 : 0.5, 
              delay: prefersReducedMotion ? 0 : 0.75 
            }}
            className="mb-10"
            style={{
              maxWidth: 440,
              fontSize: '1.0625rem',
              lineHeight: 1.7,
              color: loginColors.textSecondary,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Transform how your organization manages demand and delivery with intelligent workflows and real-time insights.
          </motion.p>

          {/* Feature Grid */}
          <FeatureGrid />
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ 
            duration: prefersReducedMotion ? 0.01 : 0.5, 
            delay: prefersReducedMotion ? 0 : 1.1 
          }}
          className="mt-8"
        >
          {/* Accent Bar */}
          <div className="flex items-center gap-1.5 mb-4">
            <div 
              className="h-1 rounded-sm"
              style={{ width: 32, backgroundColor: loginColors.brand }}
            />
            <div 
              className="h-1 rounded-sm"
              style={{ width: 20, backgroundColor: loginColors.success }}
            />
            <div 
              className="h-1 rounded-sm"
              style={{ width: 12, backgroundColor: loginColors.primary }}
            />
          </div>

          {/* Copyright */}
          <p 
            style={{ 
              fontSize: '0.75rem', 
              color: loginColors.textMuted,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            © 2025 Catalyst. All rights reserved.
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.6; }
          75% { transform: translateY(-30px) translateX(5px); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
