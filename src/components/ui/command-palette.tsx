import * as React from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search, Home, Building2, Package, Briefcase, FolderKanban, Rocket, FileText, Target, Square, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Navigation shortcuts
const navigationItems = [
  { name: "Home", path: "/home", icon: Home },
  { name: "Enterprise", path: "/enterprise/strategy-room", icon: Building2 },
  { name: "Product", path: "/industry", icon: Package },
  { name: "Program", path: "/program", icon: Briefcase },
  { name: "Project", path: "/project", icon: FolderKanban },
  { name: "Release", path: "/release", icon: Rocket },
];

// Quick actions
const quickActions = [
  { name: "Create Business Request", path: "/industry?create=true", icon: FileText },
  { name: "Create Epic", path: "/items/epics?create=true", icon: Square },
  { name: "Create Objective", path: "/enterprise/okr-hub?create=true", icon: Target },
  { name: "Create Risk", path: "/enterprise/risks?create=true", icon: AlertTriangle },
];

// Unified focus ring class
const focusRingClass = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-1)]";

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, [open]);

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-[var(--bg-overlay,rgba(0,0,0,0.5))] backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-[640px] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          className={cn(
            "rounded-xl border shadow-2xl overflow-hidden",
            "bg-[var(--surface-1)] border-[var(--border-color)]"
          )}
          shouldFilter={true}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-[var(--divider)]">
            <Search className="h-4 w-4 text-[var(--icon-muted)]" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Search or type a command..."
              className={cn(
                "flex-1 h-12 bg-transparent text-sm text-[var(--text-1)]",
                "placeholder:text-[var(--text-3)]",
                "outline-none border-none",
                focusRingClass
              )}
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--border-color)] bg-[var(--surface-2)] px-1.5 text-[10px] font-medium text-[var(--text-3)]">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--text-3)]">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="mb-2">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                Navigation
              </div>
              {navigationItems.map((item) => (
                <Command.Item
                  key={item.path}
                  value={item.name}
                  onSelect={() => handleSelect(item.path)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer",
                    "text-[var(--text-1)]",
                    "aria-selected:bg-[var(--nav-hover-bg)]",
                    focusRingClass
                  )}
                >
                  <item.icon className="h-4 w-4 text-[var(--icon-default)]" />
                  <span className="text-sm">{item.name}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="mb-2">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
                Quick Actions
              </div>
              {quickActions.map((item) => (
                <Command.Item
                  key={item.path}
                  value={item.name}
                  onSelect={() => handleSelect(item.path)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer",
                    "text-[var(--text-1)]",
                    "aria-selected:bg-[var(--nav-hover-bg)]",
                    focusRingClass
                  )}
                >
                  <item.icon className="h-4 w-4 text-[var(--icon-default)]" />
                  <span className="text-sm">{item.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--divider)] bg-[var(--surface-2)]">
            <div className="flex items-center gap-4 text-[11px] text-[var(--text-3)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[10px]">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[10px]">Esc</kbd>
                Close
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
