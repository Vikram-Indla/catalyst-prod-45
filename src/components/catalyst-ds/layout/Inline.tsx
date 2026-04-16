import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inlineVariants = cva('flex flex-row', {
  variants: {
    gap: {
      '0': 'gap-0',
      '1': 'gap-1',
      '2': 'gap-2',
      '3': 'gap-3',
      '4': 'gap-4',
      '6': 'gap-6',
      '8': 'gap-8',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
    wrap: {
      true: 'flex-wrap',
      false: 'flex-nowrap',
    },
  },
  defaultVariants: {
    gap: '2',
    align: 'center',
    justify: 'start',
    wrap: false,
  },
});

export interface InlineProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inlineVariants> {
  separator?: React.ReactNode;
}

const Inline = React.forwardRef<HTMLDivElement, InlineProps>(
  ({ className, gap, align, justify, wrap, separator, children, ...props }, ref) => {
    if (separator) {
      const items = React.Children.toArray(children);
      return (
        <div ref={ref} className={cn(inlineVariants({ gap, align, justify, wrap }), className)} {...props}>
          {items.map((child, i) => (
            <React.Fragment key={i}>
              {child}
              {i < items.length - 1 && separator}
            </React.Fragment>
          ))}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn(inlineVariants({ gap, align, justify, wrap }), className)} {...props} />
    );
  }
);
Inline.displayName = 'Inline';

export { Inline, inlineVariants };
