import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Plus, Trash2, ExternalLink } from 'lucide-react';
import { BusinessRequest } from '@/types/business-request';

interface LinksViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function LinksViewTab({ data, onChange, onDirtyChange }: LinksViewTabProps) {
  const [newLink, setNewLink] = useState({ title: '', url: '' });

  // For now, store links in a simple format. In production, use a separate table.
  const links = data.links || [];

  const handleAddLink = () => {
    if (newLink.title && newLink.url) {
      const updatedLinks = [...links, { ...newLink, id: Date.now().toString() }];
      onChange('links', updatedLinks);
      setNewLink({ title: '', url: '' });
      onDirtyChange?.(true);
    }
  };

  const handleRemoveLink = (id: string) => {
    const updatedLinks = links.filter((l: any) => l.id !== id);
    onChange('links', updatedLinks);
    onDirtyChange?.(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Quick Links */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Links</h3>
        
        <div className="grid grid-cols-1 gap-3">
          {data.functional_spec_link && (
            <a
              href={data.functional_spec_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-brand-gold" />
              <span className="text-sm">Functional Specification</span>
            </a>
          )}
          
          {data.jira_epic_link && (
            <a
              href={data.jira_epic_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-brand-gold" />
              <span className="text-sm">Jira Epic</span>
            </a>
          )}
        </div>
      </div>

      {/* Add New Link */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Add Link</h3>
        
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Label className="text-xs">Title</Label>
            <Input
              value={newLink.title}
              onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Link title"
              className="bg-background"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label className="text-xs">URL</Label>
            <Input
              value={newLink.url}
              onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
              className="bg-background"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddLink} size="icon" className="bg-brand-gold hover:bg-brand-gold-hover">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Existing Links */}
      {links.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Attached Links</h3>
          
          <div className="space-y-2">
            {links.map((link: any) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-brand-gold transition-colors"
                >
                  <Link className="h-4 w-4" />
                  <span className="text-sm">{link.title}</span>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLink(link.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {links.length === 0 && !data.functional_spec_link && !data.jira_epic_link && (
        <div className="text-center py-8 text-muted-foreground">
          <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No links attached yet</p>
        </div>
      )}
    </div>
  );
}
