import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DesignAsset {
  id: string;
  name: string;
  url: string;
  type: "wireframe" | "mockup" | "prototype";
  description?: string;
}

interface DesignTabProps {
  epicId: string;
}

export function DesignTab({ epicId }: DesignTabProps) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [newAsset, setNewAsset] = useState({
    name: "",
    url: "",
    type: "wireframe" as const,
    description: "",
  });

  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.url) {
      toast({
        title: "Validation Error",
        description: "Name and URL are required",
        variant: "destructive",
      });
      return;
    }

    const asset: DesignAsset = {
      id: `asset-${Date.now()}`,
      ...newAsset,
    };

    setAssets([...assets, asset]);
    setNewAsset({ name: "", url: "", type: "wireframe", description: "" });
    
    toast({
      title: "Design Asset Added",
      description: "The design asset has been added successfully",
    });
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
    toast({
      title: "Design Asset Removed",
      description: "The design asset has been removed",
    });
  };

  return (
    <div className="space-y-6 p-4">
      {/* Existing Design Assets */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Design Assets</h3>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No design assets yet. Add wireframes, mockups, or prototypes below.</p>
        ) : (
          <div className="space-y-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 border rounded-md bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{asset.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {asset.type}
                    </span>
                  </div>
                  {asset.description && (
                    <p className="text-xs text-muted-foreground mt-1">{asset.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(asset.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAsset(asset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Design Asset */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-3">Add Design Asset</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="asset-name">Asset Name</Label>
            <Input
              id="asset-name"
              value={newAsset.name}
              onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              placeholder="e.g., Homepage Wireframe"
            />
          </div>
          <div>
            <Label htmlFor="asset-url">URL</Label>
            <Input
              id="asset-url"
              value={newAsset.url}
              onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="asset-type">Type</Label>
            <select
              id="asset-type"
              value={newAsset.type}
              onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value as any })}
              className="w-full h-10 px-3 rounded-md border border-border bg-background"
            >
              <option value="wireframe">Wireframe</option>
              <option value="mockup">Mockup</option>
              <option value="prototype">Prototype</option>
            </select>
          </div>
          <div>
            <Label htmlFor="asset-description">Description (Optional)</Label>
            <Textarea
              id="asset-description"
              value={newAsset.description}
              onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
              placeholder="Brief description of this design asset"
              rows={2}
            />
          </div>
          <Button onClick={handleAddAsset} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Design Asset
          </Button>
        </div>
      </div>
    </div>
  );
}
