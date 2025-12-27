import { motion } from 'framer-motion';
import { loginColors, welcomeContent, UserType, AuthType } from './constants';

interface WelcomeSectionProps {
  userType: UserType;
  authType: AuthType;
  delay?: number;
}

export function WelcomeSection({ userType, authType, delay = 0.55 }: WelcomeSectionProps) {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const content = userType === 'external' 
    ? welcomeContent.external 
    : welcomeContent.existing[authType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.5, 
        delay: prefersReducedMotion ? 0 : delay 
      }}
      className="text-center mb-6"
    >
      <h2
        style={{
          fontSize: '1.375rem',
          fontWeight: 700,
          color: loginColors.textPrimary,
          marginBottom: 4,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {content.title}
      </h2>
      <p
        style={{
          fontSize: '0.9375rem',
          color: loginColors.textSecondary,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {content.subtitle}
      </p>
    </motion.div>
  );
}
