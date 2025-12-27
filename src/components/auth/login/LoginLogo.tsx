import { motion } from 'framer-motion';
import { loginColors } from './constants';

interface LoginLogoProps {
  delay?: number;
}

export function LoginLogo({ delay = 0.2 }: LoginLogoProps) {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.5, 
        delay: prefersReducedMotion ? 0 : delay 
      }}
      className="text-center mb-8"
    >
      {/* Logo */}
      <div className="relative inline-block mb-2">
        <h1
          style={{
            fontSize: '2.125rem',
            fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: loginColors.textPrimary }}>Cata</span>
          <span
            style={{
              background: `linear-gradient(135deg, ${loginColors.brand} 0%, ${loginColors.brandLight} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            lyst
          </span>
          <sup
            style={{
              fontSize: '0.625rem',
              color: loginColors.textMuted,
              fontWeight: 400,
              marginLeft: 2,
            }}
          >
            ™
          </sup>
        </h1>
        
        {/* Beta Tag */}
        <span
          className="absolute"
          style={{
            top: -2,
            right: -42,
            padding: '0.2rem 0.5rem',
            background: `linear-gradient(135deg, ${loginColors.primary} 0%, ${loginColors.primaryHover} 100%)`,
            borderRadius: 4,
            fontSize: '0.5625rem',
            fontWeight: 700,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          Beta
        </span>
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: prefersReducedMotion ? 0.01 : 0.5, 
          delay: prefersReducedMotion ? 0 : delay + 0.15 
        }}
        style={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: loginColors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Enterprise Portfolio Management
      </motion.p>
    </motion.div>
  );
}
