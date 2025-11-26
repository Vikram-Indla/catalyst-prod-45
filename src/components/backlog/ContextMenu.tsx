import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";

interface ContextMenuItem {
  id: string;
  label: string;
  dividerAfter?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
  destructive?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  onAction: (actionId: string) => void;
}

export const ContextMenu = ({ x, y, items, onClose, onAction }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] min-w-[220px] bg-card border border-border rounded shadow-lg py-1"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <div key={item.id}>
          <div
            className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer ${
              item.destructive
                ? "text-destructive hover:bg-destructive/10"
                : "text-foreground hover:bg-muted"
            }`}
            onClick={() => {
              if (item.action) {
                item.action();
              } else if (!item.submenu) {
                onAction(item.id);
              }
            }}
          >
            <span>{item.label}</span>
            {item.submenu && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
          {item.dividerAfter && <div className="h-px bg-border my-1" />}
        </div>
      ))}
    </div>
  );
};
