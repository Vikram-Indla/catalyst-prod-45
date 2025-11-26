import { Card } from "@/components/ui/card";
import { Box } from "lucide-react";

export default function Capabilities() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded bg-amber-500 flex items-center justify-center">
          <Box className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Capabilities</h1>
          <p className="text-muted-foreground">Manage portfolio-level capabilities</p>
        </div>
      </div>

      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
            <Box className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Capabilities Coming Soon</h2>
          <p className="text-muted-foreground">
            Portfolio-level capabilities will be available here. Capabilities represent significant business solutions that span multiple PIs and require collaboration across multiple teams.
          </p>
        </div>
      </Card>
    </div>
  );
}
