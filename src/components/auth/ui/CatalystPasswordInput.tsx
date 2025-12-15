import { useState, forwardRef, InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalystPasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const CatalystPasswordInput = forwardRef<HTMLInputElement, CatalystPasswordInputProps>(
  ({ label, error, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="mb-4">
        {label && (
          <label className="block mb-1.5 font-body text-sm font-medium" style={{ color: 'var(--text-1)' }}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={cn(
              "w-full transition-all outline-none font-body text-base py-3.5 px-4 pr-12 rounded-[10px] border-2 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/10",
              error && "border-destructive",
              className
            )}
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: error ? 'hsl(var(--destructive))' : 'var(--input-border)',
              color: 'var(--input-text)',
            }}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--icon-default)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--icon-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--icon-default)'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

CatalystPasswordInput.displayName = "CatalystPasswordInput";
