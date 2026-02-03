// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SHARED BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { forwardRef } from 'react';

interface T10ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const T10Button = forwardRef<HTMLButtonElement, T10ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const variantClass = `t10-btn--${variant}`;
    const sizeClass = size !== 'md' ? `t10-btn--${size}` : '';
    
    return (
      <button
        ref={ref}
        className={`t10-btn ${variantClass} ${sizeClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

T10Button.displayName = 'T10Button';

export default T10Button;
