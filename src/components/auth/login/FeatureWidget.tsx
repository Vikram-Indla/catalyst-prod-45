import { motion } from 'framer-motion';
import { 
  LayoutGrid, 
  Share2, 
  Users, 
  PieChart, 
  Sparkles, 
  Calendar 
} from 'lucide-react';
import { loginColors } from './constants';

const iconMap = {
  LayoutGrid,
  Share2,
  Users,
  PieChart,
  Sparkles,
  Calendar,
};

interface FeatureWidgetProps {
  title: string;
  description: string;
  icon: keyof typeof iconMap;
  bgGradient: string;
  iconColor: string;
  index: number;
}

export function FeatureWidget({ 
  title, 
  description, 
  icon, 
  bgGradient, 
  iconColor,
  index 
}: FeatureWidgetProps) {
  const IconComponent = iconMap[icon];
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.5, 
        delay: prefersReducedMotion ? 0 : 0.9 + index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={prefersReducedMotion ? {} : { 
        y: -6, 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="group relative p-5 rounded-2xl cursor-pointer transition-all duration-300"
      style={{
        background: loginColors.surfaceCard,
        border: `1px solid ${loginColors.borderSubtle}`,
      }}
    >
      {/* Hover background */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${loginColors.borderMedium}`,
        }}
      />
      
      {/* Header row with icon and title aligned */}
      <div className="relative flex items-center gap-3.5 mb-3">
        {/* Icon container */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
          style={{ background: bgGradient }}
        >
          <IconComponent 
            size={22} 
            style={{ color: iconColor }}
            strokeWidth={1.75}
          />
        </div>
        
        {/* Title - directly in the flex row */}
        <span 
          className="text-[0.9375rem] font-bold leading-tight"
          style={{ 
            color: loginColors.textPrimary,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {title}
        </span>
      </div>
      
      {/* Description - below header row with left padding */}
      <p 
        className="text-[0.8125rem] leading-relaxed pl-[58px]"
        style={{ color: loginColors.textMuted }}
      >
        {description}
      </p>
    </motion.div>
  );
}
