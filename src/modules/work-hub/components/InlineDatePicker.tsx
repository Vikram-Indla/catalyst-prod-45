import React from 'react';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { format } from 'date-fns';

interface InlineDatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

export function InlineDatePicker({ value, onChange }: InlineDatePickerProps) {
  const handleChange = (date: Date | null) => {
    if (date) {
      onChange(date.toISOString().split('T')[0]);
    } else {
      onChange(null);
    }
  };

  return (
    <CatalystDatePicker
      value={value}
      onChange={handleChange}
      placeholder="-"
      dateFormat="MMM d, yyyy"
      triggerClassName="h-auto py-0.5 px-1 -mx-1 min-w-[100px] text-[13px] border-0 bg-transparent hover:bg-muted/50"
      showClearButton={true}
      showTodayButton={true}
    />
  );
}
