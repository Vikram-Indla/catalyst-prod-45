// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SHARED INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { forwardRef } from 'react';

interface T10InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const T10Input = forwardRef<HTMLInputElement, T10InputProps>(
  ({ error = false, className = '', ...props }, ref) => {
    const errorClass = error ? 't10-input--error' : '';
    
    return (
      <input
        ref={ref}
        className={`t10-input ${errorClass} ${className}`.trim()}
        {...props}
      />
    );
  }
);

T10Input.displayName = 'T10Input';

export default T10Input;
