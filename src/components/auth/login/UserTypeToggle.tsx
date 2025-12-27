import { motion } from 'framer-motion';
import { UserType, loginColors } from './constants';

interface UserTypeToggleProps {
  userType: UserType;
  onChange: (type: UserType) => void;
  delay?: number;
}

export function UserTypeToggle({ userType, onChange, delay = 0.4 }: UserTypeToggleProps) {
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
      className="flex justify-center mb-6"
      role="tablist"
      aria-label="User type selection"
    >
      <div 
        className="relative inline-flex p-1 rounded-full"
        style={{
          backgroundColor: loginColors.surfaceCard,
          border: `1px solid ${loginColors.borderSubtle}`,
        }}
      >
        {/* Sliding Pill */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-full"
          style={{
            width: 'calc(50% - 4px)',
            backgroundColor: loginColors.primary,
          }}
          animate={{
            x: userType === 'existing' ? 0 : '100%',
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          aria-hidden="true"
        />

        {/* Buttons */}
        <button
          type="button"
          role="tab"
          aria-selected={userType === 'existing'}
          onClick={() => onChange('existing')}
          className="relative z-10 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200"
          style={{
            color: userType === 'existing' ? '#fff' : loginColors.textMuted,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Existing User
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={userType === 'external'}
          onClick={() => onChange('external')}
          className="relative z-10 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors duration-200"
          style={{
            color: userType === 'external' ? '#fff' : loginColors.textMuted,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          External User
        </button>
      </div>
    </motion.div>
  );
}
