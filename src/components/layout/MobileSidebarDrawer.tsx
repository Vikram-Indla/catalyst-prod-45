import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileSidebarDrawer({ isOpen, onClose, children }: MobileSidebarDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-card shadow-lg border-r lg:hidden overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-base">Menu</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="tap-target"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </aside>
    </>
  );
}
