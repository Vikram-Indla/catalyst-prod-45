import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

// Import both logo variants
import logoLight from "@/assets/catalyst-logo-dark.svg"; // Blue logo for light backgrounds
import logoDark from "@/assets/catalyst-logo-white.svg"; // White logo for dark backgrounds

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  imageSrc?: string;
  showWordmark?: boolean;
  useGold?: boolean; // Use gold color for "lyst" instead of teal
}

/**
 * Catalyst Logo Component
 * 
 * Logo specification:
 * - Light mode: Blue convergence hub logo (catalyst-logo-dark.svg)
 * - Dark mode: White convergence hub logo (catalyst-logo-white.svg)
 * - Wordmark: "Cata" in primary text, "lyst" in brand teal or gold
 */
export function Logo({ 
  variant = "dark", 
  size = "md", 
  className, 
  imageSrc,
  showWordmark = true,
  useGold = false
}: LogoProps) {
  const { isDark } = useTheme();
  
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

  // Select logo based on current theme
  const currentLogo = isDark ? logoDark : logoLight;

  // If custom image provided, use that
  if (imageSrc) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img src={imageSrc} alt="Logo" className={cn("object-contain", sizes[size])} />
      </div>
    );
  }

  // Default: show the theme-aware convergence hub logo
  if (!showWordmark) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img 
          src={currentLogo} 
          alt="Catalyst Logo" 
          className={cn("object-contain", sizes[size])} 
        />
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
          {/* "Cata" in primary text color */}
          <span className={cn(
            variant === "light" 
              ? "text-white" 
              : "text-[#0a0a0a] dark:text-white"
          )}>
            Cata
          </span>
          {/* "lyst" in brand gold or teal */}
          <span className={useGold ? "text-[#C69C6D]" : "text-[#0d9488]"}>
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
