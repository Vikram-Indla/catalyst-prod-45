import { useState } from "react";
import { CatalystInput } from "./ui/CatalystInput";
import { CatalystPasswordInput } from "./ui/CatalystPasswordInput";
import { PasswordStrength } from "./ui/PasswordStrength";
import { CatalystButton } from "./ui/CatalystButton";
import { CatalystCheckbox } from "./ui/CatalystCheckbox";
import { IntegrationBadge } from "@/components/brand/IntegrationBadge";

interface SignUpFormProps {
  onSubmit: (email: string, password: string, fullName: string) => Promise<void>;
  loading: boolean;
}

export function SignUpForm({ onSubmit, loading }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = "You must agree to the terms";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(formData.email, formData.password, formData.name);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CatalystInput
        label="Full Name"
        placeholder="Enter your full name"
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
        required
      />

      <CatalystInput
        label="Work Email"
        type="email"
        placeholder="name@company.com"
        value={formData.email}
        onChange={(e) => handleChange("email", e.target.value)}
        required
      />

      <CatalystInput
        label="Company Name"
        placeholder="Your organization name"
        value={formData.company}
        onChange={(e) => handleChange("company", e.target.value)}
        required
      />

      <div className="mb-4">
        <CatalystPasswordInput
          label="Password"
          placeholder="Create a password"
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          required
        />
        <PasswordStrength password={formData.password} />
      </div>

      <CatalystPasswordInput
        label="Confirm Password"
        placeholder="Confirm your password"
        value={formData.confirmPassword}
        onChange={(e) => handleChange("confirmPassword", e.target.value)}
        error={errors.confirmPassword}
        required
      />

      <div className="mb-5">
        <CatalystCheckbox
          label={
            <span className="text-xs text-text-secondary leading-relaxed">
              I agree to the{" "}
              <a href="#" className="font-medium text-brand-gold hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="font-medium text-brand-gold hover:underline">
                Privacy Policy
              </a>
            </span>
          }
          checked={formData.agreeTerms}
          onChange={(e) => handleChange("agreeTerms", e.target.checked)}
        />
        {errors.agreeTerms && (
          <p className="mt-1 text-xs text-error">{errors.agreeTerms}</p>
        )}
      </div>

      <CatalystButton type="submit" loading={loading}>
        Create Account
      </CatalystButton>

      <IntegrationBadge />
    </form>
  );
}
