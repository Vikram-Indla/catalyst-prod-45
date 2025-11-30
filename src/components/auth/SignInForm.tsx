import { useState } from "react";
import { CatalystInput } from "./ui/CatalystInput";
import { CatalystPasswordInput } from "./ui/CatalystPasswordInput";
import { CatalystButton } from "./ui/CatalystButton";
import { CatalystCheckbox } from "./ui/CatalystCheckbox";
import { IntegrationBadge } from "@/components/brand/IntegrationBadge";
import { Lock } from "lucide-react";

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
        <a 
          href="#" 
          className="text-sm text-[hsl(var(--catalyst-gold))] hover:text-[hsl(var(--catalyst-gold))]/80 transition-colors font-medium"
        >
          Forgot password?
        </a>
      </div>

      <CatalystButton 
        type="submit" 
        loading={loading}
        className="w-full bg-[hsl(var(--catalyst-gold))] hover:bg-[hsl(var(--catalyst-gold))]/90 text-white font-medium"
      >
        Sign in
      </CatalystButton>
    </form>
  );
}
