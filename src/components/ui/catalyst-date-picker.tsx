import * as React from "react";
import { DatePicker } from "@atlaskit/datetime-picker";

interface CatalystDatePickerProps {
  value?: Date | string | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  triggerClassName?: string;
  dateFormat?: string;
  showClearButton?: boolean;
  showTodayButton?: boolean;
}

function CatalystDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
  maxDate,
}: CatalystDatePickerProps) {
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [value]);

  const handleChange = (date: any) => {
    if (date) {
      onChange(date as Date);
    }
  };

  return (
    <DatePicker
      value={selectedDate}
      onChange={handleChange}
      isDisabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      locale="en-US"
      placeholder={placeholder}
    />
  );
}

CatalystDatePicker.displayName = "CatalystDatePicker";

export { CatalystDatePicker };
export type { CatalystDatePickerProps };
