import { useState } from "react";
import { CatalystInput } from "./ui/CatalystInput";
import { CatalystPasswordInput } from "./ui/CatalystPasswordInput";
import { CatalystButton } from "./ui/CatalystButton";
import { CatalystCheckbox } from "./ui/CatalystCheckbox";
import { IntegrationBadge } from "@/components/brand/IntegrationBadge";

interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
}

export function SignInForm({ onSubmit, loading }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CatalystInput
        label="Email Address"
        type="email"
        placeholder="name@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <CatalystPasswordInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div className="flex items-center justify-between mb-5">
        <CatalystCheckbox
          label="Remember me"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <button
          type="button"
          className="font-body text-[13px] font-medium text-brand-gold hover:text-brand-gold-hover hover:underline transition-colors"
        >
          Forgot password?
        </button>
      </div>

      <CatalystButton type="submit" loading={loading}>
        Sign In
      </CatalystButton>

      <IntegrationBadge />
    </form>
  );
}
