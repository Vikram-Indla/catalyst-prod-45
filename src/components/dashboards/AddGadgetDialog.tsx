import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GADGET_DEFINITIONS, GadgetType } from '@/types/dashboard.types';
import { Search, Plus, LayoutDashboard } from 'lucide-react';

interface AddGadgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddGadget: (type: GadgetType) => void;
  existingGadgets: GadgetType[];
}

export function AddGadgetDialog({ open, onOpenChange, onAddGadget, existingGadgets }: AddGadgetDialogProps) {
  const [search, setSearch] = useState('');

  const gadgetList = Object.entries(GADGET_DEFINITIONS)
    .filter(([type, def]) => 
      def.name.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Gadget</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gadgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gadgetList.map(([type, def]) => {
              const isAdded = existingGadgets.includes(type as GadgetType);

              return (
                <div
                  key={type}
                  className={`p-4 border rounded-lg transition-colors ${
                    isAdded 
                      ? 'bg-muted/50 opacity-60' 
                      : 'hover:border-brand-gold hover:bg-brand-gold/5 cursor-pointer'
                  }`}
                  onClick={() => !isAdded && onAddGadget(type as GadgetType)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-brand-gold/10">
                      <LayoutDashboard className="h-5 w-5 text-brand-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{def.name}</h4>
                        {isAdded ? (
                          <span className="text-xs text-muted-foreground">Added</span>
                        ) : (
                          <Plus className="h-4 w-4 text-brand-gold" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {def.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
