import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OBJECTIVE_TIERS, OBJECTIVE_STATUSES, OBJECTIVE_HEALTH, OBJECTIVE_CATEGORIES, OBJECTIVE_TYPES } from "../../constants/objectiveConstants";
import type { ObjectiveTier, ObjectiveStatus } from "../../types/objective.types";

// Schema only allows 'portfolio' and 'program' tiers
const objectiveFormSchema = z.object({
  summary: z.string().min(3, "Summary must be at least 3 characters").max(500),
  description: z.string().optional(),
  tier: z.enum(['portfolio', 'program'] as const),
  status: z.enum(['pending', 'in_progress', 'on_track', 'at_risk', 'off_track', 'paused', 'completed', 'canceled', 'missed'] as const).default('pending'),
  health: z.enum(['good', 'fair', 'poor', 'at_risk'] as const).optional(),
  category: z.enum(['critical_path', 'stretch_goal'] as const).optional(),
  type: z.enum(['feature_finisher', 'non_code', 'incremental_delivery', 'event'] as const).optional(),
  start_date: z.date().optional(),
  due_date: z.date().optional(),
  planned_value: z.number().min(0).max(100).optional(),
  delivered_value: z.number().min(0).max(100).optional(),
  is_blocked: z.boolean().default(false),
  notes: z.string().optional(),
  portfolio_id: z.string().optional(),
  program_id: z.string().optional(),
}).refine((data) => {
  // Portfolio tier requires portfolio_id
  if (data.tier === 'portfolio' && !data.portfolio_id) {
    return false;
  }
  // Program tier requires program_id
  if (data.tier === 'program' && !data.program_id) {
    return false;
  }
  return true;
}, {
  message: "Please select a Portfolio for Portfolio-tier or Program for Program-tier objectives",
  path: ["portfolio_id"], // This will show the error on portfolio_id field
});

export type ObjectiveFormValues = z.infer<typeof objectiveFormSchema>;

interface ObjectiveFormProps {
  initialValues?: Partial<ObjectiveFormValues>;
  onSubmit: (values: ObjectiveFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  tier?: ObjectiveTier;
}

export function ObjectiveForm({ initialValues, onSubmit, onCancel, isSubmitting = false, tier }: ObjectiveFormProps) {
  const form = useForm<ObjectiveFormValues>({
    resolver: zodResolver(objectiveFormSchema),
    defaultValues: {
      summary: "",
      description: "",
      tier: tier || "portfolio",
      status: "pending",
      is_blocked: false,
      portfolio_id: undefined,
      program_id: undefined,
      ...initialValues,
    },
  });

  const watchedTier = form.watch("tier");

  // Fetch portfolios for Portfolio-tier objectives
  const { data: portfolios = [] } = useQuery({
    queryKey: ["portfolios-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch programs for Program-tier objectives
  const { data: programs = [] } = useQuery({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-[var(--s6)]">
        {/* Summary */}
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary *</FormLabel>
              <FormControl>
                <Input placeholder="Enter objective summary..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Provide detailed description of this objective..." 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tier, Status, Health - Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s4)]">
          <FormField
            control={form.control}
            name="tier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tier *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OBJECTIVE_TIERS.map((tierOption) => (
                      <SelectItem key={tierOption.value} value={tierOption.value}>
                        {tierOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OBJECTIVE_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="health"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Health</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select health" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OBJECTIVE_HEALTH.map((health) => (
                      <SelectItem key={health.value} value={health.value}>
                        {health.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Portfolio dropdown - shown for Portfolio tier */}
        {watchedTier === 'portfolio' && (
          <FormField
            control={form.control}
            name="portfolio_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portfolio *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {portfolios.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Program dropdown - shown for Program tier */}
        {watchedTier === 'program' && (
          <FormField
            control={form.control}
            name="program_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {programs.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Category & Type - Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s4)]">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OBJECTIVE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OBJECTIVE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dates - Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--s4)]">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes..." 
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-[var(--s3)] pt-[var(--s4)] border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Objective"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
