import { useState, useEffect, useRef } from "react";
import { Tag } from "lucide-react";

export interface LabelConfig {
  displayMode: "full" | "abbreviated" | "hidden";
  showPITags: boolean;
  showCustomLabels: boolean;
  showThemeLabels: boolean;
}

interface LabelsDropdownProps {
  config: LabelConfig;
  onChange: (config: LabelConfig) => void;
}

export const LabelsDropdown = ({ config, onChange }: LabelsDropdownProps) => {
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

  return (
    <div className="relative ml-auto" ref={dropdownRef}>
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        Labels ▼
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-[220px] bg-card border border-border rounded shadow-lg z-[100] py-3">
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
            Show labels as:
          </div>
          <div className="px-4 pb-3">
            {(["full", "abbreviated", "hidden"] as const).map((mode) => (
              <div
                key={mode}
                className="flex items-center gap-2 py-1.5 text-sm text-foreground cursor-pointer"
                onClick={() => onChange({ ...config, displayMode: mode })}
              >
                <div
                  className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                    config.displayMode === mode ? "border-primary" : "border-border"
                  }`}
                >
                  {config.displayMode === mode && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <span className="capitalize">{mode}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
              Label colors:
            </div>
            <div className="px-4">
              {[
                { key: "showPITags", label: "PI tags" },
                { key: "showCustomLabels", label: "Custom labels" },
                { key: "showThemeLabels", label: "Theme labels" },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center gap-2.5 py-1.5 text-sm text-foreground hover:bg-muted cursor-pointer rounded px-2 -mx-2"
                  onClick={() =>
                    onChange({ ...config, [key]: !config[key as keyof LabelConfig] })
                  }
                >
                  <div
                    className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                      config[key as keyof LabelConfig]
                        ? "bg-primary border-primary"
                        : "border-border"
                    }`}
                  >
                    {config[key as keyof LabelConfig] && (
                      <span className="text-white text-[10px]">✓</span>
                    )}
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
