import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface Milestone {
  id: string;
  title: string;
  description?: string;
  startDate?: Date;
  dueDate?: Date;
  state: "not_started" | "in_progress" | "complete" | "blocked";
  category?: string;
}

interface MilestoneModalProps {
  open: boolean;
  onClose: () => void;
  milestone?: Milestone;
  onSave: (milestone: Omit<Milestone, "id"> & { id?: string }) => void;
}

const MILESTONE_STATES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
  { value: "blocked", label: "Blocked" },
] as const;

const MILESTONE_CATEGORIES = [
  "Regulatory Approval",
  "Market Launch",
  "Technical Milestone",
  "Business Review",
  "Quality Gate",
  "Customer Delivery",
  "Budget Review",
  "Other",
];

export function MilestoneModal({ open, onClose, milestone, onSave }: MilestoneModalProps) {
  const [title, setTitle] = useState(milestone?.title || "");
  const [description, setDescription] = useState(milestone?.description || "");
  const [startDate, setStartDate] = useState<Date | undefined>(milestone?.startDate);
  const [dueDate, setDueDate] = useState<Date | undefined>(milestone?.dueDate);
  const [state, setState] = useState<Milestone["state"]>(milestone?.state || "not_started");
  const [category, setCategory] = useState(milestone?.category || "");

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      ...(milestone?.id && { id: milestone.id }),
      title: title.trim(),
      description: description.trim() || undefined,
      startDate,
      dueDate,
      state,
      category: category || undefined,
    });

    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setTitle(milestone?.title || "");
    setDescription(milestone?.description || "");
    setStartDate(milestone?.startDate);
    setDueDate(milestone?.dueDate);
    setState(milestone?.state || "not_started");
    setCategory(milestone?.category || "");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Milestone Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., MVP Launch, Regulatory Approval"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this milestone..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={(value: Milestone["state"]) => setState(value)}>
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !dueDate}>
            {milestone ? "Update" : "Create"} Milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
