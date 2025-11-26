import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface DetailTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface SlideOutDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  tabs?: DetailTab[];
  children?: ReactNode;
  width?: 'default' | 'wide' | 'full';
}

export function SlideOutDetailsPanel({
  open,
  onClose,
  title,
  subtitle,
  tabs,
  children,
  width = 'default'
}: SlideOutDetailsPanelProps) {
  const widthClass = {
    default: 'sm:max-w-2xl',
    wide: 'sm:max-w-4xl',
    full: 'sm:max-w-full'
  }[width];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className={`w-full ${widthClass} p-0 flex flex-col`}
      >
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{title}</SheetTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 ml-4">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {tabs && tabs.length > 0 ? (
          <Tabs defaultValue={tabs[0]?.id} className="flex-1 flex flex-col min-h-0">
            <div className="border-b px-6">
              <TabsList className="h-12">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              {tabs.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="m-0 p-6">
                  {tab.content}
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6">
              {children}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
