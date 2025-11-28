import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface LinkedItemsTabProps {
  objectiveId: string;
}

export function LinkedItemsTab({ objectiveId }: LinkedItemsTabProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // Fetch linked items
  const { data: linkedItems = [] } = useQuery({
    queryKey: ["objective-linked-items", objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objective_linked_items")
        .select("*")
        .eq("objective_id", objectiveId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Create link mutation
  const createLinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("objective_linked_items").insert({
        objective_id: objectiveId,
        title: newTitle,
        url: newUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objective-linked-items", objectiveId] });
      toast.success("Link added");
      setIsAdding(false);
      setNewTitle("");
      setNewUrl("");
    },
    onError: () => {
      toast.error("Failed to add link");
    },
  });

  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("objective_linked_items")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objective-linked-items", objectiveId] });
      toast.success("Link removed");
    },
    onError: () => {
      toast.error("Failed to remove link");
    },
  });

  const handleAdd = () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.error("Title and URL are required");
      return;
    }
    createLinkMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Linked Items ({linkedItems.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Link
          </Button>
        </div>

        {isAdding && (
          <div className="space-y-3 mb-4 p-3 border rounded-lg bg-accent/50">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Link title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={createLinkMutation.isPending}>
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle("");
                  setNewUrl("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {linkedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No linked items. Add external links, documents, or references.
          </p>
        ) : (
          <div className="space-y-2">
            {linkedItems.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium">{item.title}</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground truncate max-w-xs"
                  >
                    {item.url}
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLinkMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
