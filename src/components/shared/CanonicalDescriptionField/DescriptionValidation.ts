export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  isRequired?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDescription(
  value: string,
  rules: ValidationRules
): ValidationResult {
  if (rules.isRequired && !value.trim()) {
    return {
      valid: false,
      error: 'Description is required',
    };
  }

  if (rules.minLength && value.length < rules.minLength) {
    return {
      valid: false,
      error: `Minimum ${rules.minLength} characters required`,
    };
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return {
      valid: false,
      error: `Maximum ${rules.maxLength} characters allowed`,
    };
  }

  return { valid: true };
}
