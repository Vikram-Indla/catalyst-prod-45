import { Card } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function Tasks() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded bg-primary flex items-center justify-center">
          <CheckSquare className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage individual tasks and work items</p>
        </div>
      </div>

      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Task Management Coming Soon</h2>
          <p className="text-muted-foreground">
            Task management will be available here. Break down stories into actionable tasks and track progress at the most granular level.
          </p>
        </div>
      </Card>
    </div>
  );
}
