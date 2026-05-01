import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, fixedWeeks = true, numberOfMonths = 1, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fixedWeeks={fixedWeeks}
      numberOfMonths={numberOfMonths}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-gray-900 dark:text-gray-100",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:text-[var(--ds-text-brand, #2563eb)] dark:hover:text-[var(--ds-text-brand, #3b82f6)]",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-[var(--ds-text-brand, #2563eb)]/20 dark:[&:has([aria-selected].day-outside)]:bg-[var(--ds-text-brand, #3b82f6)]/20 [&:has([aria-selected])]:bg-[var(--ds-text-brand, #2563eb)]/10 dark:[&:has([aria-selected])]:bg-[var(--ds-text-brand, #3b82f6)]/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[var(--ds-text-brand, #2563eb)]/10 dark:hover:bg-[var(--ds-text-brand, #3b82f6)]/10 hover:text-[var(--ds-text-brand, #2563eb)] dark:hover:text-[var(--ds-text-brand, #3b82f6)]"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-[var(--ds-text-brand, #2563eb)] dark:bg-[var(--ds-text-brand, #3b82f6)] text-white hover:bg-[var(--ds-background-brand-bold-hovered, #1d4ed8)] dark:hover:bg-[var(--ds-text-brand, #2563eb)] hover:text-white focus:bg-[var(--ds-text-brand, #2563eb)] dark:focus:bg-[var(--ds-text-brand, #3b82f6)] focus:text-white",
        day_today: "border border-[var(--ds-text-brand, #2563eb)] dark:border-[var(--ds-text-brand, #3b82f6)] text-[var(--ds-text-brand, #2563eb)] dark:text-[var(--ds-text-brand, #3b82f6)] font-medium",
        day_outside:
          "day-outside text-gray-400 dark:text-gray-600 opacity-50 aria-selected:bg-[var(--ds-text-brand, #2563eb)]/20 dark:aria-selected:bg-[var(--ds-text-brand, #3b82f6)]/20 aria-selected:text-gray-500 dark:aria-selected:text-gray-400 aria-selected:opacity-30",
        day_disabled: "text-gray-400 dark:text-gray-600 opacity-50",
        day_range_middle: "aria-selected:bg-[var(--ds-text-brand, #2563eb)]/10 dark:aria-selected:bg-[var(--ds-text-brand, #3b82f6)]/10 aria-selected:text-gray-900 dark:aria-selected:text-gray-100",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
