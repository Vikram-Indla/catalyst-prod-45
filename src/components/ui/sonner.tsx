/**
 * Catalyst V5 Toast / Notifications Styling
 * - Success: Light teal background (var(--ds-background-success)) with teal text (var(--ds-background-success-bold))
 * - Error: Light red background (var(--ds-background-danger)) with red text (var(--ds-text-danger))
 * - Warning: Light amber background (var(--ds-background-warning)) with amber text (var(--ds-text-warning))
 * - Info: Light blue background (var(--ds-background-selected)) with blue text (var(--ds-text-brand, var(--cp-workstream-catalyst-primary)))
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
      position="top-right"
      duration={5000}
      expand={true}
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Catalyst V5: Light semantic backgrounds with matching text
          success: "group-[.toast]:!bg-[var(--ds-background-success)] group-[.toast]:!text-[var(--ds-background-success-bold)] group-[.toast]:!border-[var(--ds-background-success)]",
          error: "group-[.toast]:!bg-[var(--ds-background-danger)] group-[.toast]:!text-[var(--ds-text-danger)] group-[.toast]:!border-[var(--ds-background-danger)]",
          warning: "group-[.toast]:!bg-[var(--ds-background-warning)] group-[.toast]:!text-[var(--ds-text-warning)] group-[.toast]:!border-[var(--ds-background-warning)]",
          info: "group-[.toast]:!bg-[var(--ds-background-selected)] group-[.toast]:!text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] group-[.toast]:!border-[var(--ds-background-information)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
