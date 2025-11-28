import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, RotateCcw, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function EpicsRecycleBin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: deletedEpics, isLoading, refetch } = useQuery({
    queryKey: ["deleted-epics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epics")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleRestore = async (epicId: string) => {
    const { error } = await supabase
      .from("epics")
      .update({ deleted_at: null })
      .eq("id", epicId);

    if (error) {
      toast.error("Failed to restore epic");
    } else {
      toast.success("Epic restored successfully");
      refetch();
    }
    setRestoreId(null);
  };

  const handlePermanentDelete = async (epicId: string) => {
    const { error } = await supabase
      .from("epics")
      .delete()
      .eq("id", epicId);

    if (error) {
      toast.error("Failed to permanently delete epic");
    } else {
      toast.success("Epic permanently deleted");
      refetch();
    }
    setDeleteId(null);
  };

  const filteredEpics = deletedEpics?.filter((epic) =>
    epic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    epic.epic_key?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recycle Bin</h1>
          <p className="text-muted-foreground">Deleted epics can be restored or permanently deleted</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deleted epics..."
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
          No deleted epics found
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Deleted At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEpics?.map((epic) => (
                <TableRow key={epic.id}>
                  <TableCell className="font-mono text-sm">{epic.epic_key || epic.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{epic.name}</TableCell>
                  <TableCell className="capitalize">{epic.state?.replace("_", " ")}</TableCell>
                  <TableCell>{epic.deleted_at ? new Date(epic.deleted_at).toLocaleDateString() : "N/A"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRestoreId(epic.id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(epic.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!restoreId} onOpenChange={() => setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Epic?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the epic and make it visible in the main epics list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreId && handleRestore(restoreId)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Epic?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The epic will be permanently deleted from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handlePermanentDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
