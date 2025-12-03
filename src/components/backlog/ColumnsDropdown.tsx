import { useState, useEffect, useRef } from "react";
import { Columns3 } from "lucide-react";

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  default: boolean;
  width?: number;
}

interface ColumnsDropdownProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
}

export const ColumnsDropdown = ({ columns, onChange }: ColumnsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleColumn = (columnId: string) => {
    onChange(
      columns.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const resetToDefault = () => {
    onChange(columns.map((col) => ({ ...col, visible: col.default })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium h-9 px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Columns3 className="w-4 h-4" />
        Columns
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-card border border-border rounded shadow-lg z-[100] py-2">
          {columns.map((col) => (
            <div
              key={col.id}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted cursor-pointer"
              onClick={() => toggleColumn(col.id)}
            >
              <div
                className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                  col.visible
                    ? "bg-primary border-primary"
                    : "border-border"
                }`}
              >
                {col.visible && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span>{col.label}</span>
            </div>
          ))}
          <div className="h-px bg-border my-2" />
          <div
            className="px-4 py-2 text-sm text-primary hover:bg-muted cursor-pointer"
            onClick={resetToDefault}
          >
            Reset to Default
          </div>
        </div>
      )}
    </div>
  );
};
