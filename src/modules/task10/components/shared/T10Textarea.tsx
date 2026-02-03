// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ SHARED TEXTAREA COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { forwardRef } from 'react';

interface T10TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const T10Textarea = forwardRef<HTMLTextAreaElement, T10TextareaProps>(
  ({ error = false, className = '', ...props }, ref) => {
    const errorClass = error ? 't10-textarea--error' : '';
    
    return (
      <textarea
        ref={ref}
        className={`t10-textarea ${errorClass} ${className}`.trim()}
        {...props}
      />
    );
  }
);

T10Textarea.displayName = 'T10Textarea';

export default T10Textarea;
