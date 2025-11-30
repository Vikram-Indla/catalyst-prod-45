// Risk Links Section - Manage external links for risks
// Source: Implementation Spec Section 5

import { useState } from "react";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Link {
  id: string;
  title: string;
  url: string;
}

interface RiskLinksSectionProps {
  links: Link[];
  onChange: (links: Link[]) => void;
}

export function RiskLinksSection({ links, onChange }: RiskLinksSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState({ title: "", url: "" });

  const handleAddLink = () => {
    if (newLink.title && newLink.url) {
      onChange([
        ...links,
        { id: crypto.randomUUID(), title: newLink.title, url: newLink.url },
      ]);
      setNewLink({ title: "", url: "" });
      setIsAddDialogOpen(false);
    }
  };

  const handleRemoveLink = (id: string) => {
    onChange(links.filter((link) => link.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-text-primary">Links</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      </div>

      {links.length > 0 ? (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ExternalLink className="h-4 w-4 text-text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {link.title}
                  </p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-gold hover:underline truncate block"
                  >
                    {link.url}
                  </a>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveLink(link.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No links added yet.</p>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Add an external link related to this risk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-title">Title</Label>
              <Input
                id="link-title"
                placeholder="e.g., Jira Ticket"
                value={newLink.title}
                onChange={(e) =>
                  setNewLink({ ...newLink, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={newLink.url}
                onChange={(e) =>
                  setNewLink({ ...newLink, url: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewLink({ title: "", url: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLink}
              disabled={!newLink.title || !newLink.url}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              Add Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
