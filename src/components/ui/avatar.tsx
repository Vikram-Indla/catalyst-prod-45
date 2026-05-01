import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Catalyst V5 Avatar Component
 * Sizes: xs (24px), sm (28px), default (32px), lg (40px), xl (48px)
 */
const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",    // 24px
        sm: "h-7 w-7 text-[11px]",    // 28px
        default: "h-8 w-8 text-xs",    // 32px
        lg: "h-10 w-10 text-sm",       // 40px
        xl: "h-12 w-12 text-base",     // 48px
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const fallbackColors = [
  "bg-[#dbeafe] text-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))]", // Blue
  "bg-[#ccfbf1] text-[#0d9488]", // Teal
  "bg-[#d1fae5] text-[#059669]", // Green
  "bg-[#fee2e2] text-[var(--ds-text-danger,var(--ds-text-danger, #dc2626))]", // Red
  "bg-[#e0f2fe] text-[#0284c7]", // Sky
  "bg-[#fce7f3] text-[#db2777]", // Pink
];

function getColorFromName(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return fallbackColors[hash % fallbackColors.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  name?: string;
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image 
    ref={ref} 
    className={cn("aspect-square h-full w-full object-cover", className)} 
    {...props} 
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  name?: string;
}

/**
 * CANONICAL GUARDRAIL: All avatar fallbacks render a CircleUser face icon.
 * This ensures every avatar in Catalyst shows a face silhouette (never bare
 * initials or generic icons). The face icon inherits the deterministic color
 * from the user's name. Explicit children override the face icon for
 * special cases (AI Bot, System gear, +N overflow).
 */
const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, name, children, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full font-medium",
      name ? getColorFromName(name) : "bg-muted text-muted-foreground",
      className
    )}
    {...props}
  >
    {children ?? <CircleUser className="h-[70%] w-[70%]" strokeWidth={1.5} />}
  </AvatarPrimitive.Fallback>
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Avatar Group for stacking
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  children: React.ReactNode;
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 4, children, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    return (
      <div ref={ref} className={cn("flex -space-x-2", className)} {...props}>
        {visibleChildren}
        {remainingCount > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = "AvatarGroup";

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, avatarVariants };
