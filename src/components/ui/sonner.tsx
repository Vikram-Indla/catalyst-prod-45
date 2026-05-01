/**
 * Catalyst V5 Toast / Notifications Styling
 * - Success: Light teal background (#f0fdfa) with teal text (#0d9488)
 * - Error: Light red background (var(--ds-background-danger, #fef2f2)) with red text (var(--ds-text-danger, #dc2626))
 * - Warning: Light amber background (#fffbeb) with amber text (var(--ds-text-warning, #d97706))
 * - Info: Light blue background (var(--ds-background-selected, #eff6ff)) with blue text (var(--ds-text-brand, #2563eb))
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
          success: "group-[.toast]:!bg-[#f0fdfa] group-[.toast]:!text-[#0d9488] group-[.toast]:!border-[#99f6e4]",
          error: "group-[.toast]:!bg-[var(--ds-background-danger,#fef2f2)] group-[.toast]:!text-[var(--ds-text-danger,#dc2626)] group-[.toast]:!border-[#fecaca]",
          warning: "group-[.toast]:!bg-[#fffbeb] group-[.toast]:!text-[var(--ds-text-warning,#d97706)] group-[.toast]:!border-[#fde68a]",
          info: "group-[.toast]:!bg-[var(--ds-background-selected,#eff6ff)] group-[.toast]:!text-[var(--ds-text-brand,#2563eb)] group-[.toast]:!border-[#bfdbfe]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
