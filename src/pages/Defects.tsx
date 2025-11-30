import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Defects() {
  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 rounded bg-destructive flex items-center justify-center flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-destructive-foreground" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Defects</h1>
          <p className="text-sm text-muted-foreground">Track and manage defects across teams</p>
        </div>
      </div>

      <Card className="p-4 sm:p-6 md:p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Defect Tracking Coming Soon</h2>
          <p className="text-muted-foreground">
            Defect management and tracking will be available here. Track bugs, issues, and quality concerns across your delivery pipeline.
          </p>
        </div>
      </Card>
    </div>
  );
}
