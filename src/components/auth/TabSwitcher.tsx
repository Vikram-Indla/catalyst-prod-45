import { cn } from "@/lib/utils";

interface TabSwitcherProps {
  activeTab: "signin" | "signup";
  onTabChange: (tab: "signin" | "signup") => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex bg-surface-gray-100 rounded-lg p-1 mb-7">
      <button
        type="button"
        onClick={() => onTabChange("signin")}
        className={cn(
          "tab-btn",
          activeTab === "signin" && "active"
        )}
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={() => onTabChange("signup")}
        className={cn(
          "tab-btn",
          activeTab === "signup" && "active"
        )}
      >
        Sign Up
      </button>
    </div>
  );
}
