import { useState } from "react";
import { User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const personas = [
  { id: "super-admin", label: "Super Admin", enabled: true },
  { id: "admin", label: "Admin", enabled: false },
  { id: "standard", label: "Standard User", enabled: false },
];

export function PersonasPopover() {
  const [open, setOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState("super-admin");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <User className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2 bg-popover z-50">
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Switch Persona
          </p>
        </div>
        {personas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => {
              if (persona.enabled) {
                setSelectedPersona(persona.id);
                setOpen(false);
              }
            }}
            disabled={!persona.enabled}
            className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
              persona.enabled
                ? "hover:bg-accent cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            <span>{persona.label}</span>
            {selectedPersona === persona.id && persona.enabled && (
              <Check className="h-4 w-4 text-primary" />
            )}
            {!persona.enabled && (
              <span className="text-xs text-muted-foreground">TODO</span>
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
