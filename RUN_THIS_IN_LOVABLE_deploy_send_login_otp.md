# Deploy send-login-otp edge function

## What this does
Deploys the branded OTP sign-in email function so Catalyst sends
sign-in codes via Resend (same pipeline as user invitations) instead
of Supabase's default email provider.

The function file already exists at:
  `supabase/functions/send-login-otp/index.ts`

---

## Step 1 — Deploy via Lovable

Paste this prompt into the **Lovable chat**:

```
Deploy the edge function at supabase/functions/send-login-otp/index.ts
to our Supabase project (ref: mqgshobotcvcjouzxdbi).
The function already exists in the repo. Just deploy it.
Do not modify the file.
```

---

## Step 2 — Verify in Supabase Dashboard

After Lovable deploys, open the Supabase dashboard → Edge Functions.
You should see `send-login-otp` listed as Active.

---

## Step 3 — Add GitHub Secret (for future auto-deploys)

So CI auto-deploys functions on every push:

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SUPABASE_ACCESS_TOKEN`
4. Value: your Supabase personal access token
   (Supabase dashboard → Account → Access tokens → Generate new token)
5. Save

The workflow at `.github/workflows/deploy-functions.yml` will then
auto-deploy all edge functions whenever `supabase/functions/**` changes.

---

## Fallback (already live in auth.tsx)

`src/lib/auth.tsx` already has a fallback: if the edge function is
unavailable, OTP delivery falls back to Supabase's native
`signInWithOtp`. So OTP login works right now — deploying this
function just upgrades to the branded Resend email template.
