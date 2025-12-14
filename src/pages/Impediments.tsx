import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Impediments() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Standardized Header - no toolbar */}
      <PageHeader title="Impediments" />

      <div className="flex-1 overflow-auto p-6">
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Impediment Management Coming Soon</h2>
            <p className="text-muted-foreground">
              Impediment tracking will be available here. Identify, track, and resolve blockers that are preventing teams from achieving their objectives.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
