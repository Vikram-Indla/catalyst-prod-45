import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Feature } from '@/types/feature.types';

interface FeatureLinksTabProps {
  feature?: Feature;
}

interface Link {
  id: string;
  title: string;
  url: string;
  type: string;
}

export function FeatureLinksTab({ feature }: FeatureLinksTabProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [newLink, setNewLink] = useState({ title: '', url: '', type: 'documentation' });

  const handleAddLink = () => {
    if (!newLink.title || !newLink.url) {
      toast.error('Please provide both title and URL');
      return;
    }

    setLinks(prev => [...prev, {
      id: Math.random().toString(),
      ...newLink
    }]);

    setNewLink({ title: '', url: '', type: 'documentation' });
    toast.success('Link added');
  };

  const handleDeleteLink = (linkId: string) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
    toast.success('Link removed');
  };

  return (
    <div className="space-y-6">
      {/* Add New Link */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm">Add New Link</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="link-title">Title</Label>
            <Input
              id="link-title"
              value={newLink.title}
              onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Link title..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-type">Type</Label>
            <Select 
              value={newLink.type} 
              onValueChange={(value) => setNewLink(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger id="link-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="specification">Specification</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="link-url">URL</Label>
          <Input
            id="link-url"
            type="url"
            value={newLink.url}
            onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        <Button onClick={handleAddLink} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Link
        </Button>
      </div>

      {/* Links List */}
      {links.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {links.map((link) => (
            <div key={link.id} className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm">{link.title}</div>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {link.url}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <div className="text-xs text-muted-foreground mt-1">{link.type}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteLink(link.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No links added yet
        </div>
      )}
    </div>
  );
}
