import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { loginColors } from './constants';

interface LoginButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  loading?: boolean;
  success?: boolean;
  children: ReactNode;
}

export const LoginButton = forwardRef<HTMLButtonElement, LoginButtonProps>(
  ({ variant = 'primary', loading, success, children, disabled, className, ...props }, ref) => {
    const isPrimary = variant === 'primary';

    const getBackgroundStyle = () => {
      if (success) {
        return `linear-gradient(135deg, ${loginColors.success} 0%, #0f766e 100%)`;
      }
      if (isPrimary) {
        return `linear-gradient(135deg, ${loginColors.primary} 0%, ${loginColors.primaryHover} 100%)`;
      }
      return 'transparent';
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className="relative w-full overflow-hidden transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
        style={{
          padding: '0.9375rem 1.5rem',
          background: getBackgroundStyle(),
          border: isPrimary ? 'none' : `2px solid ${loginColors.primary}`,
          borderRadius: 10,
          fontSize: '0.9375rem',
          fontWeight: 700,
          color: isPrimary ? '#fff' : loginColors.primaryLighter,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: isPrimary ? '0 4px 15px rgba(37, 99, 235, 0.3)' : 'none',
          transform: 'translateY(0)',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            if (isPrimary) {
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(37, 99, 235, 0.4)';
            } else {
              e.currentTarget.style.backgroundColor = loginColors.primary;
              e.currentTarget.style.color = '#fff';
            }
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          if (isPrimary) {
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.3)';
          } else {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = loginColors.primaryLighter;
          }
        }}
        {...props}
      >
        {/* Shimmer effect on hover */}
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            animation: 'shimmer-button 1.5s infinite',
          }}
          aria-hidden="true"
        />
        
        <span className="relative z-10">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : success ? (
            'Success!'
          ) : (
            children
          )}
        </span>

        <style>{`
          @keyframes shimmer-button {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </button>
    );
  }
);

LoginButton.displayName = 'LoginButton';
