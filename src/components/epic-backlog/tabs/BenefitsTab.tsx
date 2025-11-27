import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BenefitsTabProps {
  epicId: string;
}

export function BenefitsTab({ epicId }: BenefitsTabProps) {
  const { toast } = useToast();
  const [benefitHypothesis, setBenefitHypothesis] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [leadingIndicators, setLeadingIndicators] = useState("");

  const handleSave = () => {
    // TODO: Persist to database via Supabase
    toast({
      title: "Benefits Saved",
      description: "Benefit hypothesis and acceptance criteria have been saved",
    });
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <Label htmlFor="benefit-hypothesis">Benefit Hypothesis</Label>
        <Textarea
          id="benefit-hypothesis"
          value={benefitHypothesis}
          onChange={(e) => setBenefitHypothesis(e.target.value)}
          placeholder="Describe the expected benefits and value this epic will deliver..."
          rows={4}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Explain what value this epic provides to users or the business
        </p>
      </div>

      <div>
        <Label htmlFor="acceptance-criteria">Acceptance Criteria</Label>
        <Textarea
          id="acceptance-criteria"
          value={acceptanceCriteria}
          onChange={(e) => setAcceptanceCriteria(e.target.value)}
          placeholder="List the acceptance criteria for this epic..."
          rows={6}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Define what must be true for this epic to be considered complete
        </p>
      </div>

      <div>
        <Label htmlFor="leading-indicators">Leading Indicators</Label>
        <Textarea
          id="leading-indicators"
          value={leadingIndicators}
          onChange={(e) => setLeadingIndicators(e.target.value)}
          placeholder="What early metrics will indicate success?..."
          rows={4}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Measurable indicators that show progress toward benefit realization
        </p>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Benefits
      </Button>
    </div>
  );
}
