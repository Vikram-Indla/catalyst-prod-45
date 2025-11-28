import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface ConfidenceScoreModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (score: number, note: string) => void;
  currentScore?: number | null;
}

export function ConfidenceScoreModal({
  open,
  onClose,
  onSubmit,
  currentScore,
}: ConfidenceScoreModalProps) {
  const [score, setScore] = useState(currentScore ? currentScore * 100 : 50);
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    onSubmit(score / 100, note);
    onClose();
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Confidence Score</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Confidence Score: {score}%</Label>
            <Slider
              value={[score]}
              onValueChange={(value) => setScore(value[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this confidence update..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update Score</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
