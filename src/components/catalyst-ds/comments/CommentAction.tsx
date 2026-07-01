import * as React from 'react';

export interface CommentActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

const CommentAction = React.forwardRef<HTMLButtonElement, CommentActionProps>(
  ({ style, icon, children, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const [hovered, setHovered] = React.useState(false);
    return (
      <button
        ref={ref}
        type="button"
        onMouseEnter={(e) => { setHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setHovered(false); onMouseLeave?.(e); }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          fontWeight: 500,
          color: hovered ? 'var(--ds-text)' : 'var(--ds-text-subtlest)',
          textDecoration: hovered ? 'underline' : 'none',
          transition: 'color 150ms',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          ...style,
        }}
        {...props}
      >
        {icon && <span style={{ flexShrink: 0, lineHeight: 0 }}>{icon}</span>}
        {children}
      </button>
    );
  }
);
CommentAction.displayName = 'CommentAction';

export { CommentAction };
