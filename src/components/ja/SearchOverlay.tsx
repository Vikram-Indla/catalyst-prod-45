import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          // Would open via parent state
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-popover rounded-lg shadow-2xl border">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search (use # to search by ID e.g. '#123')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 focus-visible:ring-0 text-base bg-transparent"
              autoFocus
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40 border-0 focus:ring-0">
                <SelectValue placeholder="All Work Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Work Items</SelectItem>
                <SelectItem value="epics">Epics</SelectItem>
                <SelectItem value="features">Features</SelectItem>
                <SelectItem value="stories">Stories</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Results Area */}
          <div className="p-6 min-h-[200px]">
            {searchQuery ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                <p>No results found for "{searchQuery}"</p>
                <p className="text-xs mt-2">Try adjusting your search terms</p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                <p>Start typing to search...</p>
                <p className="text-xs mt-2">
                  Use <kbd className="px-2 py-1 bg-muted rounded text-xs">#</kbd> to search by ID
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-2 text-center text-xs text-white/60">
          Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">ESC</kbd> to close
        </div>
      </div>
    </div>
  );
}
