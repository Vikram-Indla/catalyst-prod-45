import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

const SIZE_MAP: Record<NonNullable<IconButtonProps['size']>, { box: number; pad: number }> = {
  sm: { box: 28, pad: 6 },
  md: { box: 32, pad: 7 },
  lg: { box: 36, pad: 8 },
};

export function IconButton({
  label,
  size = 'md',
  active = false,
  children,
  style,
  className,
  ...rest
}: IconButtonProps) {
  const { box, pad } = SIZE_MAP[size];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-cv2-active={active || undefined}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: box,
        height: box,
        padding: pad,
        background: active ? 'var(--cv2-bg-row-active)' : 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
        transition: `background ${'var(--cv2-transition-fast)'}, color ${'var(--cv2-transition-fast)'}`,
        ...style,
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-strong)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-subtle)';
        }
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
