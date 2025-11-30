import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";

export default function SuccessCriteria() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
          <Award className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Success Criteria</h1>
          <p className="text-muted-foreground">Define and track success metrics</p>
        </div>
      </div>

      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <Award className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Success Criteria Coming Soon</h2>
          <p className="text-muted-foreground">
            Success criteria management will be available here. Define measurable success criteria and track achievement across initiatives and objectives.
          </p>
        </div>
      </Card>
    </div>
  );
}
