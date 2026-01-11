import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function Defects() {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-auto p-6">
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Defect Tracking</h2>
            <p className="text-muted-foreground">
              Defect management and tracking for this context. Track bugs, issues, and quality concerns.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
