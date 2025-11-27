import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (milestone: {
    name: string;
    startDate: string | null;
    dueDate: string | null;
    description: string;
    state: 'Pending' | 'In Progress' | 'Complete' | 'Blocked';
    category: string | null;
  }) => void;
}

export function AddMilestoneModal({ isOpen, onClose, onSave }: AddMilestoneModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<'Pending' | 'In Progress' | 'Complete' | 'Blocked'>('Pending');
  const [category, setCategory] = useState<string>('');
  const [showError, setShowError] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setShowError(true);
      return;
    }

    onSave({
      name: name.trim(),
      startDate: startDate || null,
      dueDate: dueDate || null,
      description: description.trim(),
      state,
      category: category || null,
    });

    // Reset form
    setName('');
    setStartDate('');
    setDueDate('');
    setDescription('');
    setState('Pending');
    setCategory('');
    setShowError(false);
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setStartDate('');
    setDueDate('');
    setDescription('');
    setState('Pending');
    setCategory('');
    setShowError(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
      <div className="w-[800px] max-w-[95vw] bg-card rounded-lg shadow-2xl border border-primary">
        {/* Content */}
        <div className="p-6">
          {/* Name Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowError(false);
              }}
              placeholder="What is a name for your milestone?"
              className="w-full"
            />
            {showError && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <span className="font-semibold">!</span>
                <span>Enter a name to save your milestone</span>
              </div>
            )}
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start date <span className="text-muted-foreground">ⓘ</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="mm/dd/yyyy"
                  className="w-full pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Due date <span className="text-muted-foreground">ⓘ</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="mm/dd/yyyy"
                  className="w-full pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              className="w-full min-h-[100px]"
            />
          </div>

          {/* State and Category */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                State
              </label>
              <Select value={state} onValueChange={(value) => setState(value as 'Pending' | 'In Progress' | 'Complete' | 'Blocked')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category <span className="text-muted-foreground">ⓘ</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
