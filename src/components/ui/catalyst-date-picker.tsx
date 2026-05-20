import * as React from "react";
import { format } from "date-fns";
import { DatePicker } from "@atlaskit/datetime-picker";
import { token } from "@atlaskit/tokens";

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

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function CatalystDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
  maxDate,
  className,
  triggerClassName,
  dateFormat = "dd/MM/yyyy",
  showClearButton = true,
  showTodayButton = true,
}: CatalystDatePickerProps) {
  // Parse value to Date
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

  const handleClear = () => {
    onChange(null);
  };

  const handleToday = () => {
    const today = new Date();
    onChange(today);
  };

  // Apply ADS token-based styling
  const datePickerStyles = `
    .catalyst-date-picker {
      --ds-text: var(--ds-text, #292A2E);
      --ds-text-subtlest: var(--ds-text-subtlest, #626F86);
      --ds-text-disabled: var(--ds-text-disabled, #8993A5);
      --ds-border: var(--ds-border, rgba(11,18,14,0.14));
      --ds-border-focused: var(--ds-border-focused, #388BFF);
      --ds-background-selected-bold: var(--ds-background-selected-bold, #0052CC);
      --ds-icon-subtle: var(--ds-icon-subtle, #6B778C);
      --ds-elevation-shadow-overlay: 0 4px 8px -2px rgba(9,30,66,0.13), 0 0 1px rgba(9,30,66,0.13);
    }

    .catalyst-date-picker input {
      font-size: 14px;
      font-weight: 400;
      color: var(--ds-text);
      border-color: transparent;
      min-height: 44px;
      padding: 8px 12px;
    }

    .catalyst-date-picker input::placeholder {
      color: var(--ds-text-subtlest);
      font-weight: 400;
    }

    .catalyst-date-picker input:focus {
      outline: 2px solid var(--ds-border-focused);
      border-color: var(--ds-border-focused);
      box-shadow: 0 0 0 2px rgba(56,139,255,0.08);
    }

    .catalyst-date-picker [role="button"] {
      box-shadow: var(--ds-elevation-shadow-overlay);
      width: 290px;
    }

    .catalyst-date-picker [role="gridcell"] button {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 400;
      color: var(--ds-text);
      border: none;
      background: transparent;
      cursor: pointer;
      transition: background 150ms;
    }

    .catalyst-date-picker [role="gridcell"] button:hover:not(:disabled) {
      background: rgba(9,30,66,0.06);
    }

    .catalyst-date-picker [role="gridcell"] button:focus {
      outline: 2px solid var(--ds-border-focused);
      outline-offset: -2px;
    }

    .catalyst-date-picker [role="gridcell"] button[aria-selected="true"] {
      background: var(--ds-background-selected-bold);
      color: white;
      font-weight: 500;
    }

    .catalyst-date-picker [role="gridcell"] button[aria-disabled="true"] {
      color: var(--ds-text-disabled);
      cursor: not-allowed;
      opacity: 0.4;
    }

    .catalyst-date-picker label {
      font-size: 12px;
      font-weight: 600;
      color: var(--ds-text-subtlest);
      text-transform: none;
    }

    /* Responsive mobile: full-width calendar */
    @media (max-width: 479px) {
      .catalyst-date-picker [role="button"] {
        width: 100%;
        max-width: 100vw;
      }
    }

    /* Responsive desktop: compact layout */
    @media (min-width: 768px) {
      .catalyst-date-picker [role="button"] {
        width: 290px;
        position: absolute;
      }
    }
  `;

  return (
    <div className={`catalyst-date-picker ${className || ''}`}>
      <style>{datePickerStyles}</style>
      <DatePicker
        value={selectedDate}
        onChange={handleChange}
        isDisabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        locale="en-US"
        placeholder={placeholder}
      />
      {(showClearButton || showTodayButton) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: `1px solid var(--ds-border)` }}>
          {showClearButton && (
            <button
              onClick={handleClear}
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--ds-border-focused)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Clear
            </button>
          )}
          {showTodayButton && (
            <button
              onClick={handleToday}
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--ds-border-focused)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                marginLeft: 'auto',
              }}
            >
              Today
            </button>
          )}
        </div>
      )}
    </div>
  );
}

CatalystDatePicker.displayName = "CatalystDatePicker";

export { CatalystDatePicker };
export type { CatalystDatePickerProps };
