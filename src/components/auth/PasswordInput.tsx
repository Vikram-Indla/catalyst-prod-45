import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  hasError?: boolean;
}

/**
 * Reusable Password Input with visibility toggle
 * Follows Catalyst styling patterns with dark mode support
 */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "Enter your password",
  required = false,
  hasError = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const toggleVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full transition-all outline-none pr-12 font-body text-base py-3.5 px-4 rounded-[10px] border-2 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10"
        style={{
          backgroundColor: 'var(--input-bg)',
          borderColor: hasError ? 'hsl(var(--destructive))' : isFocused ? 'hsl(var(--brand-gold))' : 'var(--input-border)',
          color: 'var(--input-text)',
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <button
        type="button"
        onClick={toggleVisibility}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md transition-colors"
        style={{
          color: 'var(--icon-default)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--icon-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--icon-default)'}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
