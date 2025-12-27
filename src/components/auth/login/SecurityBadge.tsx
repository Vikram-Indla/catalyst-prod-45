import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { loginColors } from './constants';

interface SecurityBadgeProps {
  delay?: number;
}

export function SecurityBadge({ delay = 0.8 }: SecurityBadgeProps) {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.5, 
        delay: prefersReducedMotion ? 0 : delay 
      }}
      className="flex items-center justify-center gap-2 mt-6"
    >
      <ShieldCheck 
        size={16} 
        style={{ color: loginColors.successLight }}
      />
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: loginColors.successLight,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Enterprise Secured
      </span>
    </motion.div>
  );
}
