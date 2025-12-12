import { useState } from "react";
import { CatalystInput } from "./ui/CatalystInput";
import { CatalystPasswordInput } from "./ui/CatalystPasswordInput";
import { PasswordStrength } from "./ui/PasswordStrength";
import { CatalystButton } from "./ui/CatalystButton";
import { CatalystCheckbox } from "./ui/CatalystCheckbox";
import { IntegrationBadge } from "@/components/brand/IntegrationBadge";
import catalystToast from "@/lib/catalystToast";

interface SignUpFormProps {
  onSubmit: (email: string, password: string, fullName: string) => Promise<void>;
  loading: boolean;
}

export function SignUpForm({ onSubmit, loading: externalLoading }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    // Honeypot field - hidden from users, bots will fill it
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
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

    setLoading(true);
    setSuccessMessage(null);

    try {
      // Use direct fetch to properly handle non-2xx responses without throwing
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/signup-with-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          fullName: formData.name.trim(),
          company: formData.company.trim() || undefined,
          website: formData.website, // Honeypot field
        }),
      });

      // Safely parse JSON response
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // Response is not JSON
        setErrors({ email: 'Something went wrong. Please try again.' });
        setLoading(false);
        return;
      }

      // Handle server errors (5xx)
      if (response.status >= 500) {
        setErrors({ email: data?.error || 'Something went wrong. Please try again.' });
        setLoading(false);
        return;
      }

      // Check success flag in response (edge function returns 200 with success: false for validation errors)
      if (data?.success === false) {
        const errorCode = data?.code || '';
        const errorMessage = data?.error || 'An error occurred';
        
        // Map error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          'EMAIL_EXISTS_APPROVED': 'This email is already registered.',
          'EMAIL_EXISTS_PENDING': 'Your registration is pending approval.',
          'EMAIL_EXISTS_REJECTED_COOLDOWN': 'Your request was rejected. Please try again later.',
          'CAPTCHA_FAILED': 'CAPTCHA verification failed. Please try again.',
          'RATE_LIMITED': 'Too many attempts. Please try again later.',
        };
        
        const userMessage = errorMessages[errorCode] || errorMessage;
        setErrors({ email: userMessage });
        setLoading(false);
        return;
      }

      // Success case
      if (data?.success === true) {
        setSuccessMessage(data.message);
        catalystToast.success("Registration submitted", "Your account is pending approval.");
        // Clear form
        setFormData({
          name: "",
          email: "",
          company: "",
          password: "",
          confirmPassword: "",
          agreeTerms: false,
          website: "",
        });
      }
    } catch (err: any) {
      // Only true network errors reach here
      console.error("Signup network error:", err);
      setErrors({ email: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-green/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-secondary-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Registration Submitted</h3>
        <p className="text-sm text-muted-foreground">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <CatalystInput
        label="Full Name"
        placeholder="Enter your full name"
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
        error={errors.name}
        required
      />

      <CatalystInput
        label="Work Email"
        type="email"
        placeholder="name@company.com"
        value={formData.email}
        onChange={(e) => handleChange("email", e.target.value)}
        error={errors.email}
        required
      />

      <CatalystInput
        label="Company Name"
        placeholder="Your organization name"
        value={formData.company}
        onChange={(e) => handleChange("company", e.target.value)}
      />

      {/* Honeypot field - hidden from users */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(e) => handleChange("website", e.target.value)}
        />
      </div>

      <div className="mb-4">
        <CatalystPasswordInput
          label="Password"
          placeholder="Create a password"
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          error={errors.password}
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

      <CatalystButton type="submit" loading={loading || externalLoading}>
        Create Account
      </CatalystButton>

      <IntegrationBadge />
    </form>
  );
}