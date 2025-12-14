import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ReleaseVehicles() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Standardized Header - no toolbar */}
      <PageHeader title="Release Vehicles" />

      <div className="flex-1 overflow-auto p-6">
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
    </div>
  );
}
