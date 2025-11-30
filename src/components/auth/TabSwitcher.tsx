import { cn } from "@/lib/utils";

interface TabSwitcherProps {
  activeTab: "signin" | "signup";
  onTabChange: (tab: "signin" | "signup") => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex bg-surface-gray-100 rounded-xl p-1.5 mb-8">
      <button
        type="button"
        onClick={() => onTabChange("signin")}
        className={cn(
          "flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200",
          activeTab === "signin" 
            ? "bg-white text-text-primary shadow-sm" 
            : "text-text-muted hover:text-text-secondary"
        )}
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={() => onTabChange("signup")}
        className={cn(
          "flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200",
          activeTab === "signup" 
            ? "bg-white text-text-primary shadow-sm" 
            : "text-text-muted hover:text-text-secondary"
        )}
      >
        Sign Up
      </button>
    </div>
  );
}
