import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { loginColors } from './constants';

interface LoginInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export const LoginInput = forwardRef<HTMLInputElement, LoginInputProps>(
  ({ label, error, isPassword = false, className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="mb-4">
        <label 
          htmlFor={inputId}
          className="block mb-1.5"
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: loginColors.textSecondary,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
            className="w-full outline-none transition-all duration-200"
            style={{
              padding: '0.875rem 1rem',
              paddingRight: isPassword ? '3rem' : '1rem',
              backgroundColor: loginColors.surfaceCard,
              border: `1.5px solid ${error ? '#ef4444' : loginColors.borderMedium}`,
              borderRadius: 10,
              fontSize: '0.9375rem',
              color: loginColors.textPrimary,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = loginColors.primary;
              e.target.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
              e.target.style.boxShadow = `0 0 0 4px ${loginColors.focusRing}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? '#ef4444' : loginColors.borderMedium;
              e.target.style.backgroundColor = loginColors.surfaceCard;
              e.target.style.boxShadow = 'none';
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
              style={{ color: loginColors.textMuted }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-1 text-xs"
            style={{ color: '#ef4444' }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

LoginInput.displayName = 'LoginInput';
