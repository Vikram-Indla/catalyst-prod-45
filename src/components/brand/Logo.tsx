import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
  imageSrc?: string;
}

export function Logo({ variant = "dark", size = "md", className, imageSrc }: LogoProps) {
  const sizes = {
    sm: "h-8",
    md: "h-10",
    lg: "h-12",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        className
      )}
    >
      {imageSrc ? (
        <img src={imageSrc} alt="Logo" className={cn("object-contain", sizes[size])} />
      ) : (
        <div className={cn(
          "bg-surface-gray-200 rounded flex items-center justify-center",
          sizes[size],
          "aspect-[3/1] px-4"
        )}>
          <span className="text-text-muted text-sm font-medium">Logo</span>
        </div>
      )}
    </div>
  );
}
