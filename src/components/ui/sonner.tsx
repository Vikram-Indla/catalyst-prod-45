/**
 * FIX E: Toast / Notifications Token Enforcement
 * - All severity colors use semantic tokens: hsl(var(--success)), hsl(var(--warning)), etc.
 * - No raw Tailwind colors (emerald, red, amber)
 * - Consistent placement, stacking, duration (5000ms)
 */
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      duration={5000}
      expand={true}
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // FIX E: Use semantic tokens ONLY - no raw Tailwind colors
          success: "group-[.toast]:!bg-[hsl(var(--success)/0.1)] group-[.toast]:!text-[hsl(var(--success))] group-[.toast]:!border-[hsl(var(--success)/0.2)]",
          error: "group-[.toast]:!bg-[hsl(var(--destructive)/0.1)] group-[.toast]:!text-[hsl(var(--destructive))] group-[.toast]:!border-[hsl(var(--destructive)/0.2)]",
          warning: "group-[.toast]:!bg-[hsl(var(--warning)/0.1)] group-[.toast]:!text-[hsl(var(--warning))] group-[.toast]:!border-[hsl(var(--warning)/0.2)]",
          info: "group-[.toast]:!bg-[hsl(var(--info)/0.1)] group-[.toast]:!text-[hsl(var(--info))] group-[.toast]:!border-[hsl(var(--info)/0.2)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
