import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { loginColors } from './constants';

interface VisionBadgeProps {
  delay?: number;
}

export function VisionBadge({ delay = 0.3 }: VisionBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-6"
      style={{
        background: `linear-gradient(135deg, rgba(198, 156, 109, 0.15) 0%, rgba(198, 156, 109, 0.08) 100%)`,
        border: `1px solid rgba(198, 156, 109, 0.25)`,
      }}
    >
      <Star 
        size={20} 
        style={{ color: loginColors.brandLight }}
        strokeWidth={1.5}
      />
      <span 
        className="text-xs font-semibold tracking-wide"
        style={{ color: loginColors.brandLight }}
      >
        Enterprise Excellence
      </span>
    </motion.div>
  );
}
