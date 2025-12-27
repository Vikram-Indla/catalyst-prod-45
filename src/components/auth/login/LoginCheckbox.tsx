import { forwardRef, InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { loginColors } from './constants';

interface LoginCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const LoginCheckbox = forwardRef<HTMLInputElement, LoginCheckboxProps>(
  ({ label, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <label 
        htmlFor={inputId}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="peer sr-only"
            {...props}
          />
          <div 
            className="w-[18px] h-[18px] rounded transition-all duration-150 border-2 peer-checked:border-transparent peer-focus:ring-2"
            style={{
              borderColor: loginColors.borderMedium,
              backgroundColor: 'transparent',
            }}
          />
          <div 
            className="absolute inset-0 rounded flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity"
            style={{ backgroundColor: loginColors.primary }}
          >
            <Check size={12} color="#fff" strokeWidth={3} />
          </div>
        </div>
        <span
          style={{
            fontSize: '0.8125rem',
            color: loginColors.textSecondary,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {label}
        </span>
      </label>
    );
  }
);

LoginCheckbox.displayName = 'LoginCheckbox';
