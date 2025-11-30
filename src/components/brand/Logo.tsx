import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ variant = "dark", size = "md", className }: LogoProps) {
  const sizes = {
    sm: "text-xl",
    md: "text-[28px]",
    lg: "text-[32px]",
  };

  return (
    <div
      className={cn(
        "font-heading font-bold tracking-tight",
        sizes[size],
        variant === "light" ? "text-white" : "text-text-primary",
        className
      )}
    >
      <span className="text-brand-gold">C</span>
      atalyst
    </div>
  );
}
