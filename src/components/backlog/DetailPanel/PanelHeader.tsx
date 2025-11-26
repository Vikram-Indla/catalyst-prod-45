import { Check, Link, X, FileText, HelpCircle, Edit2 } from 'lucide-react';
import { EpicDetail } from '@/types/backlog.types';

interface PanelHeaderProps {
  epic: EpicDetail;
  onClose: () => void;
  onSave: () => void;
  hasChanges: boolean;
}

export function PanelHeader({ epic, onClose, onSave, hasChanges }: PanelHeaderProps) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/epic/${epic.id}`);
  };

  return (
    <div className="p-4 border-b border-border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] bg-primary rounded-sm flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Epic</span>
          <span className="text-sm font-semibold text-foreground">{epic.numericId}</span>
          <button
            onClick={handleCopyLink}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Link className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded transition-colors">
            <FileText className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={onSave}
            className={`px-4 py-1.5 text-sm rounded border transition-colors ${
              hasChanges
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-transparent border-border text-foreground hover:bg-muted'
            }`}
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 group">
        <h1 className="text-xl font-semibold text-foreground">{epic.title}</h1>
        <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all">
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
