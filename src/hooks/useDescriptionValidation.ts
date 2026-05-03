import { useState, useCallback } from 'react';

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  isRequired?: boolean;
  customValidator?: (value: string) => string | null;
}

export function useDescriptionValidation(rules: ValidationRules) {
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (value: string): boolean => {
      if (rules.isRequired && !value.trim()) {
        setError('Description is required');
        return false;
      }

      if (rules.minLength && value.length < rules.minLength) {
        setError(`Minimum ${rules.minLength} characters required`);
        return false;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        setError(`Maximum ${rules.maxLength} characters allowed`);
        return false;
      }

      if (rules.customValidator) {
        const customError = rules.customValidator(value);
        if (customError) {
          setError(customError);
          return false;
        }
      }

      setError(null);
      return true;
    },
    [rules]
  );

  return { error, validate };
}
