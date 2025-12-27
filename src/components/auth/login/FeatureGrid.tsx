import { motion } from 'framer-motion';
import { featureWidgets, loginColors } from './constants';
import { FeatureWidget } from './FeatureWidget';

export function FeatureGrid() {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.5, 
        delay: prefersReducedMotion ? 0 : 0.9 
      }}
      className="grid grid-cols-2 gap-3.5"
      style={{ maxWidth: 520 }}
    >
      {featureWidgets.map((widget, index) => (
        <FeatureWidget
          key={widget.title}
          title={widget.title}
          description={widget.description}
          icon={widget.icon as any}
          bgGradient={widget.bgGradient}
          iconColor={widget.iconColor}
          index={index}
        />
      ))}
    </motion.div>
  );
}
