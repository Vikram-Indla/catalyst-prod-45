import React, { useState } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Validation schema
const versionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  startDate: z.date().nullable(),
  releaseDate: z.date().nullable(),
  driver: z.string().nullable(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
});

type VersionFormData = z.infer<typeof versionSchema>;

interface CreateVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (data: VersionFormData) => void;
}

// Mock users for driver selection
const mockUsers = [
  { id: '1', name: 'Vikram Indla', avatar: '' },
  { id: '2', name: 'Mohammed Hassan', avatar: '' },
  { id: '3', name: 'Faisal Paracha', avatar: '' },
  { id: '4', name: 'Yazeed Daraz', avatar: '' },
];

export function CreateVersionDialog({ open, onOpenChange, onSave }: CreateVersionDialogProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [driver, setDriver] = useState<string>('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [releaseDateOpen, setReleaseDateOpen] = useState(false);

  const resetForm = () => {
    setName('');
    setStartDate(undefined);
    setReleaseDate(undefined);
    setDriver('');
    setDescription('');
    setErrors({});
  };

  const handleSave = () => {
    // Validate form
    const formData = {
      name,
      startDate: startDate || null,
      releaseDate: releaseDate || null,
      driver: driver || null,
      description,
    };

    const result = versionSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Success
    onSave?.(result.data);
    toast.success('Version created successfully');
    resetForm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const selectedUser = mockUsers.find(u => u.id === driver);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] p-0 gap-0 bg-white"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-[20px] font-semibold text-[#172B4D]">
            Create version
          </DialogTitle>
        </DialogHeader>

        {/* Form Content */}
        <div className="px-6 pb-6 space-y-5">
          {/* Required fields notice */}
          <p className="text-[13px] text-[#6B778C]">
            Required fields are marked with an asterisk <span className="text-red-500">*</span>
          </p>

          {/* Name Field */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-[#172B4D]">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={cn(
                "h-10 text-[14px] border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-[#4C9AFF]",
                errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500"
              )}
              placeholder=""
            />
            {errors.name && (
              <p className="text-[12px] text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Date Fields Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-[#172B4D]">
                Start Date
              </Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-between text-left font-normal text-[14px] border-[#DFE1E6] hover:bg-[#F4F5F7]",
                      !startDate && "text-[#6B778C]"
                    )}
                  >
                    {startDate ? format(startDate, "M/d/yyyy") : "Select date"}
                    <CalendarIcon className="h-4 w-4 text-[#6B778C]" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setStartDateOpen(false);
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Release Date */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-[#172B4D]">
                Release date
              </Label>
              <Popover open={releaseDateOpen} onOpenChange={setReleaseDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-between text-left font-normal text-[14px] border-[#DFE1E6] hover:bg-[#F4F5F7]",
                      !releaseDate && "text-[#6B778C]"
                    )}
                  >
                    {releaseDate ? format(releaseDate, "M/d/yyyy") : "Select date"}
                    <CalendarIcon className="h-4 w-4 text-[#6B778C]" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={releaseDate}
                    onSelect={(date) => {
                      setReleaseDate(date);
                      setReleaseDateOpen(false);
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Driver Field */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-[#172B4D]">
              Driver
            </Label>
            <Select value={driver} onValueChange={setDriver}>
              <SelectTrigger className="h-10 text-[14px] border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-[#4C9AFF]">
                <SelectValue placeholder="Select driver">
                  {selectedUser && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedUser.avatar} />
                        <AvatarFallback className="text-[10px] bg-blue-600 text-white">
                          {getInitials(selectedUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedUser.name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mockUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-[10px] bg-blue-600 text-white">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[14px]">{user.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-[#172B4D]">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] text-[14px] border-[#DFE1E6] focus:border-[#4C9AFF] focus:ring-[#4C9AFF] resize-none"
              placeholder=""
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#DFE1E6] flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="h-9 px-4 text-[14px] font-medium text-[#42526E] hover:bg-[#F4F5F7]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="h-9 px-4 text-[14px] font-medium bg-[#0052CC] hover:bg-[#0747A6] text-white"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
