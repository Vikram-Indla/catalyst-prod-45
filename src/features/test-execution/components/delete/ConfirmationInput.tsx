/**
 * Module 3C-4: Type-to-Confirm Input
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ConfirmationInputProps {
  value: string;
  onChange: (value: string) => void;
  isValid: boolean;
}

export function ConfirmationInput({ value, onChange, isValid }: ConfirmationInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="confirm-delete" className="text-sm font-medium">
        Type <span className="font-bold text-destructive">DELETE</span> to confirm
      </Label>
      <Input
        id="confirm-delete"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type DELETE to confirm"
        className={cn(
          'font-mono uppercase',
          value.length > 0 && (isValid ? 'border-green-500' : 'border-destructive')
        )}
        autoComplete="off"
      />
      {value.length > 0 && !isValid && (
        <p className="text-xs text-destructive">
          Please type DELETE exactly to confirm
        </p>
      )}
    </div>
  );
}
