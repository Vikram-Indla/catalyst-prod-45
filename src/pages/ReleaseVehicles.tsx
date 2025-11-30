import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function ReleaseVehicles() {
  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center">
          <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Release Vehicles (Fix Versions)</h1>
          <p className="text-muted-foreground">Manage release vehicles and fix versions</p>
        </div>
      </div>

      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Release Vehicles Coming Soon</h2>
          <p className="text-muted-foreground">
            Release vehicle management will be available here. Define and track release vehicles (fix versions) that bundle features and stories for deployment.
          </p>
        </div>
      </Card>
    </div>
  );
}
