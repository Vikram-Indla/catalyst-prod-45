import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface RightDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tabs: Tab[];
}

export function RightDetailsPanel({ open, onClose, title, tabs }: RightDetailsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>{title}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue={tabs[0]?.id} className="flex-1 flex flex-col">
          <div className="border-b px-6">
            <TabsList className="h-12">
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            {tabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="m-0 p-6">
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
