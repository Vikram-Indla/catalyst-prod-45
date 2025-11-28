import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JiraAlignHeader } from "@/components/ja/JiraAlignHeader";

export default function CreateStub() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <JiraAlignHeader />
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="bg-card rounded-lg border p-8 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Create {type}</h1>
            <p className="text-muted-foreground">
              TODO (needs confirmation)
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-sm text-muted-foreground mb-6">
              This create form will be implemented based on Jira Align specifications.
              The exact fields and behaviors need to be confirmed from official documentation.
            </p>
            <div className="text-xs text-muted-foreground p-4 bg-muted/30 rounded">
              <p className="font-semibold mb-2">Implementation Note:</p>
              <p>Following the master prompt governance, this feature is stubbed until the exact form requirements are confirmed from Jira Align Help Center documentation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
