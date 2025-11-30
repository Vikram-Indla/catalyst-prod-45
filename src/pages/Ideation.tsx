import { Card } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function Ideation() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
          <Lightbulb className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Ideation</h1>
          <p className="text-muted-foreground">Capture and evaluate new ideas</p>
        </div>
      </div>

      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Ideation Board Coming Soon</h2>
          <p className="text-muted-foreground">
            Ideation management will be available here. Capture innovative ideas, evaluate them, and promote the best ones into your backlog.
          </p>
        </div>
      </Card>
    </div>
  );
}
