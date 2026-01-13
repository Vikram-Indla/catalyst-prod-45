import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrimarySearchRowProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function PrimarySearchRow({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: PrimarySearchRowProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "flex items-center gap-2 h-9 px-3 rounded-lg transition-all",
        "bg-[var(--surface-2)] border border-[var(--border-color)]",
        isFocused && "border-[var(--border-accent)] ring-1 ring-[var(--border-accent)]",
        className
      )}
    >
      {/* Search Icon */}
      <Search className="h-4 w-4 shrink-0 text-[var(--icon-muted)]" />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "flex-1 bg-transparent text-sm text-foreground",
          "placeholder:text-muted-foreground placeholder:opacity-70",
          "outline-none border-none min-w-0"
        )}
      />

      {/* Clear or Keyboard Shortcut */}
      {value ? (
        <button
          onClick={() => onChange("")}
          className="p-1 rounded hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5 text-[var(--icon-muted)]" />
        </button>
      ) : (
        <kbd
          className={cn(
            "hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
            "bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--border-color)]"
          )}
        >
          {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}K
        </kbd>
      )}
    </div>
  );
}
