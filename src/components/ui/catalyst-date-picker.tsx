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
  // @atlaskit/DatePicker expects value as ISO date string ("YYYY-MM-DD"), not a Date object
  const selectedValue = React.useMemo(() => {
    if (!value) return '';
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0];
    }
    return value;
  }, [value]);

  const minDateStr = React.useMemo(() => {
    if (!minDate) return undefined;
    return isNaN(minDate.getTime()) ? undefined : minDate.toISOString().split('T')[0];
  }, [minDate]);

  const maxDateStr = React.useMemo(() => {
    if (!maxDate) return undefined;
    return isNaN(maxDate.getTime()) ? undefined : maxDate.toISOString().split('T')[0];
  }, [maxDate]);

  // Atlaskit onChange emits an ISO date string; convert to Date for callers expecting Date
  const handleChange = (isoString: string) => {
    if (isoString) {
      const parsed = new Date(isoString);
      onChange(isNaN(parsed.getTime()) ? null : parsed);
    } else {
      onChange(null);
    }
  };

  return (
    <DatePicker
      value={selectedValue}
      onChange={handleChange}
      isDisabled={disabled}
      minDate={minDateStr}
      maxDate={maxDateStr}
      locale="en-US"
      placeholder={placeholder}
    />
  );
}

CatalystDatePicker.displayName = "CatalystDatePicker";

export { CatalystDatePicker };
export type { CatalystDatePickerProps };
