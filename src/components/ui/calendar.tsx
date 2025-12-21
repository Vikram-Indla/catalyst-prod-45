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
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:text-[#c69c6d] dark:hover:text-[#d4a855]",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-[#c69c6d]/20 dark:[&:has([aria-selected].day-outside)]:bg-[#d4a855]/20 [&:has([aria-selected])]:bg-[#c69c6d]/10 dark:[&:has([aria-selected])]:bg-[#d4a855]/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#c69c6d]/10 dark:hover:bg-[#d4a855]/10 hover:text-[#c69c6d] dark:hover:text-[#d4a855]"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#c69c6d] dark:bg-[#d4a855] text-white hover:bg-[#b8894d] dark:hover:bg-[#c69c6d] hover:text-white focus:bg-[#c69c6d] dark:focus:bg-[#d4a855] focus:text-white",
        day_today: "border border-[#c69c6d] dark:border-[#d4a855] text-[#c69c6d] dark:text-[#d4a855] font-medium",
        day_outside:
          "day-outside text-gray-400 dark:text-gray-600 opacity-50 aria-selected:bg-[#c69c6d]/20 dark:aria-selected:bg-[#d4a855]/20 aria-selected:text-gray-500 dark:aria-selected:text-gray-400 aria-selected:opacity-30",
        day_disabled: "text-gray-400 dark:text-gray-600 opacity-50",
        day_range_middle: "aria-selected:bg-[#c69c6d]/10 dark:aria-selected:bg-[#d4a855]/10 aria-selected:text-gray-900 dark:aria-selected:text-gray-100",
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
