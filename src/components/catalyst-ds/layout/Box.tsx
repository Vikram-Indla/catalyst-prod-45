import * as React from 'react';
import { cn } from '@/lib/utils';

type BoxElement = 'div' | 'section' | 'article' | 'aside' | 'main' | 'nav' | 'header' | 'footer';

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: BoxElement;
  padding?: string;
  paddingX?: string;
  paddingY?: string;
}

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
  ({ as: Tag = 'div', className, padding, paddingX, paddingY, style, ...props }, ref) => {
    const spacingStyle: React.CSSProperties = {
      ...style,
      ...(padding && { padding }),
      ...(paddingX && { paddingLeft: paddingX, paddingRight: paddingX }),
      ...(paddingY && { paddingTop: paddingY, paddingBottom: paddingY }),
    };

    return <Tag ref={ref as any} className={cn(className)} style={spacingStyle} {...props} />;
  }
);
Box.displayName = 'Box';

export { Box };
