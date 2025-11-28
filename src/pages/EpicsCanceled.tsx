import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Search, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EpicsCanceled() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);

  const { data: canceledEpics, isLoading } = useQuery({
    queryKey: ["canceled-epics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epics")
        .select("*")
        .eq("status", "cancelled")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: selectedEpic } = useQuery({
    queryKey: ["epic", selectedEpicId],
    queryFn: async () => {
      if (!selectedEpicId) return null;
      
      const { data, error } = await supabase
        .from("epics")
        .select("*")
        .eq("id", selectedEpicId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEpicId,
  });

  const handleReactivate = async (epicId: string) => {
    const { error } = await supabase
      .from("epics")
      .update({ status: "proposed" })
      .eq("id", epicId);

    if (error) {
      toast.error("Failed to reactivate epic");
    } else {
      toast.success("Epic reactivated successfully");
      setSelectedEpicId(null);
    }
  };

  const filteredEpics = canceledEpics?.filter((epic) =>
    epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    epic.epic_key?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Canceled Epics</h1>
          <p className="text-muted-foreground">View and manage canceled epics</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search canceled epics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : filteredEpics?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No canceled epics found
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEpics?.map((epic) => (
                <TableRow key={epic.id}>
                  <TableCell className="font-mono text-sm">{epic.epic_key || epic.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{epic.name}</TableCell>
                  <TableCell className="capitalize">{epic.state?.replace("_", " ")}</TableCell>
                  <TableCell>
                    {epic.epic_type ? (
                      <Badge variant="outline">{epic.epic_type}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{epic.updated_at ? new Date(epic.updated_at).toLocaleDateString() : "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEpicId(epic.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={!!selectedEpicId} onOpenChange={() => setSelectedEpicId(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Canceled Epic Details</SheetTitle>
          </SheetHeader>
          
          {selectedEpic && (
            <div className="mt-6 space-y-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Epic ID</div>
                <div className="font-mono">{selectedEpic.epic_key || selectedEpic.id}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Name</div>
                <div className="font-medium">{selectedEpic.name}</div>
              </div>

              {selectedEpic.description && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Description</div>
                  <div className="text-sm">{selectedEpic.description}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">State</div>
                  <Badge>{selectedEpic.state?.replace("_", " ")}</Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <Badge variant="destructive">Canceled</Badge>
                </div>
              </div>

              {selectedEpic.epic_type && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Type</div>
                  <div>{selectedEpic.epic_type}</div>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  onClick={() => handleReactivate(selectedEpic.id)}
                  className="w-full"
                >
                  Reactivate Epic
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
