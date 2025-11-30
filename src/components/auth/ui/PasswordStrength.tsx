import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = (pwd: string) => {
    if (!pwd) return { level: 0, label: "" };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 1) return { level: 1, label: "Weak password" };
    if (strength <= 3) return { level: 2, label: "Medium strength" };
    return { level: 3, label: "Strong password" };
  };

  const { level, label } = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="h-1 bg-surface-gray-200 rounded overflow-hidden mb-1.5">
        <div
          className={cn(
            "h-full rounded transition-all duration-200",
            level === 1 && "w-1/3 bg-error",
            level === 2 && "w-2/3 bg-warning",
            level === 3 && "w-full bg-success"
          )}
        />
      </div>
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
    </div>
  );
}
