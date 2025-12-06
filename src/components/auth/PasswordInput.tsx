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
 * Follows Catalyst styling patterns
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
        className="w-full transition-all outline-none pr-12"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          padding: "14px 18px",
          paddingRight: "48px",
          border: `2px solid ${hasError ? '#dc2626' : isFocused ? '#c69c6d' : 'rgba(26, 26, 26, 0.1)'}`,
          borderRadius: "10px",
          fontSize: "1rem",
          backgroundColor: "#feffff",
          boxShadow: isFocused ? "0 0 0 3px rgba(198, 156, 109, 0.1)" : "none",
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <button
        type="button"
        onClick={toggleVisibility}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md transition-colors hover:bg-gray-100"
        style={{
          color: "rgba(26, 26, 26, 0.5)",
        }}
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
