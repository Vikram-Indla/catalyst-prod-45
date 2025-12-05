import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Trash2, Link as LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { KnowledgeBaseCard } from "@/components/knowledge-hub/KnowledgeBaseCard";

interface LinksTabProps {
  epicId: string;
}

export function LinksTab({ epicId }: LinksTabProps) {
  const [showAddLink, setShowAddLink] = useState(false);

  const { data: dependencies, isLoading: loadingDeps } = useQuery({
    queryKey: ["epic-dependencies", epicId],
    queryFn: async () => {
      // Query features linked to this epic to find dependencies
      const { data: features, error } = await supabase
        .from("features")
        .select(`
          id,
          name,
          dependencies:dependencies!from_feature_id(
            id,
            to_feature_id,
            type,
            status,
            risk_level
          )
        `)
        .eq("epic_id", epicId);

      if (error) throw error;
      return features?.flatMap(f => f.dependencies || []) || [];
    },
  });

  const { data: relatedObjectives, isLoading: loadingObjectives } = useQuery({
    queryKey: ["epic-objectives", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objective_epic_links")
        .select(`
          id,
          objective:objectives(
            id,
            title,
            status
          )
        `)
        .eq("epic_id", epicId);

      if (error) throw error;
      return data || [];
    },
  });

  if (loadingDeps || loadingObjectives) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Dependencies */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Dependencies</h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddLink(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Dependency
          </Button>
        </div>

        {!dependencies || dependencies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
            No dependencies defined
          </p>
        ) : (
          <div className="space-y-2">
            {dependencies.map((dep: any) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 border rounded-md bg-card"
              >
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Feature Dependency</div>
                    <div className="text-xs text-muted-foreground">
                      Type: {dep.type} • Status: {dep.status}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Objectives */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Related Objectives</h3>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Link Objective
          </Button>
        </div>

        {!relatedObjectives || relatedObjectives.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-md">
            No linked objectives
          </p>
        ) : (
          <div className="space-y-2">
            {relatedObjectives.map((link: any) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 border rounded-md bg-card"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{link.objective?.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Status: {link.objective?.status || "Active"}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* External Links */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-3">External Links</h3>
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
          TODO (needs confirmation): External link management
        </p>
      </div>

      {/* Knowledge Base */}
      <div className="border-t pt-4">
        <KnowledgeBaseCard workItemId={epicId} workItemType="epic" />
      </div>
    </div>
  );
}
