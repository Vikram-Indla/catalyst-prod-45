import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Impediments() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Impediments</h1>
          <p className="text-muted-foreground">Track and resolve blockers</p>
        </div>
      </div>

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
  );
}
