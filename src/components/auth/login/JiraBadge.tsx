import { motion } from 'framer-motion';
import { loginColors } from './constants';

interface JiraBadgeProps {
  delay?: number;
}

export function JiraBadge({ delay = 0.7 }: JiraBadgeProps) {
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
      className="flex items-center justify-center gap-3 p-3.5 rounded-lg mt-4"
      style={{
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        border: `1.5px solid rgba(37, 99, 235, 0.2)`,
      }}
    >
      {/* JIRA Icon */}
      <div
        className="w-5 h-5 rounded flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${loginColors.primary} 0%, ${loginColors.primaryHover} 100%)`,
        }}
      >
        <span className="text-white text-xs font-bold">J</span>
      </div>
      
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 500,
          color: loginColors.primaryLighter,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        Powered with JIRA Integration
      </span>
    </motion.div>
  );
}
