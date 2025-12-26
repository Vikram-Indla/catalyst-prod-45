import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  imageSrc?: string;
  showWordmark?: boolean;
}

/**
 * Catalyst Logo Component
 * 
 * Logo specification:
 * - "Cata" = Pure black #0a0a0a (light mode) or white #ffffff (dark mode)
 * - "lyst" = Brand gold #c69c6d (light mode) or #d4b896 (dark mode)
 * 
 * Gold #c69c6d appears ONLY in the logo. Nowhere else in the UI.
 */
export function Logo({ 
  variant = "dark", 
  size = "md", 
  className, 
  imageSrc,
  showWordmark = true 
}: LogoProps) {
  const sizes = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
    xl: "h-12",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  // If custom image provided, use that
  if (imageSrc) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img src={imageSrc} alt="Logo" className={cn("object-contain", sizes[size])} />
      </div>
    );
  }

  // Wordmark logo with proper brand colors
  if (showWordmark) {
    return (
      <div className={cn("flex items-center", className)}>
        <span className={cn(
          "font-extrabold tracking-tight",
          textSizes[size]
        )}>
          {/* "Cata" in black (light) or white (dark) */}
          <span className={cn(
            variant === "light" 
              ? "text-white" 
              : "text-[#0a0a0a] dark:text-white"
          )}>
            Cata
          </span>
          {/* "lyst" in brand gold - ONLY place gold appears in UI */}
          <span className={cn(
            variant === "light"
              ? "text-[#d4b896]"
              : "text-[#c69c6d] dark:text-[#d4b896]"
          )}>
            lyst
          </span>
        </span>
      </div>
    );
  }

  // Fallback placeholder if no wordmark
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
    >
      <div className={cn(
        "bg-surface-gray-200 rounded flex items-center justify-center",
        sizes[size],
        "aspect-[3/1] px-4"
      )}>
        <span className="text-text-muted text-sm font-medium">Logo</span>
      </div>
    </div>
  );
}
