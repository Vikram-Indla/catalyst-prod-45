import React from 'react';
import { EFDSession } from '../types/efd.types';
import { useEFDStore } from '../stores/useEFDStore';
import { Save, Trash2, History, Plus, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface EFDHeaderProps {
  session: EFDSession | null;
  onNewSession: () => void;
  isCreating: boolean;
}

export const EFDHeader: React.FC<EFDHeaderProps> = ({ session, onNewSession, isCreating }) => {
  const { isSaving, lastSaved } = useEFDStore();

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>PRODUCT</span>
            <span>/</span>
            <span>EF Designer</span>
          </div>
          <h1 className="text-xl font-semibold">Epic/Feature Designer</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Save Status */}
          {session && (
            <div className="flex items-center gap-2 text-sm">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">
                    Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
                  </span>
                </>
              ) : null}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onNewSession} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1">New</span>
            </Button>
            
            {session && (
              <>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4" />
                  <span className="ml-1">Audit Log</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
