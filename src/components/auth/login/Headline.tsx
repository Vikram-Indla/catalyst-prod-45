import { motion, Easing } from 'framer-motion';
import { loginColors } from './constants';

export function Headline() {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const ease: Easing = [0.16, 1, 0.3, 1];

  const lineVariants = {
    hidden: { opacity: 0, y: 35, rotateX: -10 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        duration: prefersReducedMotion ? 0.01 : 0.9,
        delay: prefersReducedMotion ? 0 : delay,
        ease,
      },
    }),
  };

  return (
    <h1
      className="mb-4"
      style={{
        fontSize: 'clamp(2.5rem, 4vw, 3.25rem)',
        fontWeight: 800,
        lineHeight: 1.1,
        letterSpacing: '-0.03em',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <motion.span
        className="block"
        style={{ color: loginColors.textPrimary }}
        initial="hidden"
        animate="visible"
        variants={lineVariants}
        custom={0.4}
      >
        Where{' '}
        <span
          className="vision-shimmer"
          style={{
            background: `linear-gradient(135deg, ${loginColors.brand} 0%, ${loginColors.brandLight} 50%, ${loginColors.brand} 100%)`,
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          vision
        </span>
      </motion.span>
      
      <motion.span
        className="block"
        style={{ color: loginColors.textPrimary }}
        initial="hidden"
        animate="visible"
        variants={lineVariants}
        custom={0.5}
      >
        becomes
      </motion.span>
      
      <motion.span
        className="block"
        style={{ color: loginColors.successLight }}
        initial="hidden"
        animate="visible"
        variants={lineVariants}
        custom={0.6}
      >
        execution
      </motion.span>

      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
        .vision-shimmer {
          animation: shimmer 4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .vision-shimmer {
            animation: none;
          }
        }
      `}</style>
    </h1>
  );
}
