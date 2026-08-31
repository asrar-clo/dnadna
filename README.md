# VoiceDNA

Paste a link, text, PDF, or screenshot. Get a simple explanation of what actually matters.

One flow: Landing -> Login -> Paste/upload -> Explain -> Result -> (after 3 free/day) Pay with PayPal -> Continue.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Auth + Postgres) for users, profiles, usage
- Google Gemini API (`gemini-2.5-flash`) for the explanation itself, and for reading PDFs/images directly (no OCR library needed) - genuinely free tier, no credit card required
- PayPal Orders API (hosted checkout) for a single $9/month Pro unlock, verified server-side

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Create a Supabase project**, then run `supabase/schema.sql` in the SQL editor. This creates `profiles` + `usage` tables, RLS policies, and a trigger that auto-creates a profile row on signup.

   To enable Google login: Supabase dashboard -> Authentication -> Providers -> Google, and add your OAuth credentials. Email/password works with no extra setup.

3. **Get a Gemini API key** at aistudio.google.com/apikey - sign in with a Google account, no credit card or billing setup needed. This is a genuine free tier (not a trial): generous daily quota on `gemini-2.5-flash`, no expiry.

4. **Create a PayPal app** at developer.paypal.com (sandbox is fine for testing) to get a client ID/secret. Optionally add a webhook pointing at `/api/paypal/webhook` for the `PAYMENT.CAPTURE.COMPLETED` event as a safety net.

5. **Copy `.env.example` to `.env.local`** and fill in all values.

6. **Run it**
   ```
   npm run dev
   ```

## How payment works

- User hits the free limit (3/day) -> clicks "Pay with PayPal" -> we create a PayPal order server-side and redirect to PayPal's hosted checkout.
- PayPal redirects back to `/app?paypal=success&token=<orderId>`.
- The client calls `/api/paypal/capture` with that order id. The server captures the order directly against PayPal's API and only then marks the user `plan = 'pro'`, using the service-role key (the `profiles` table has no client-facing update policy, so this can only happen server-side).
- The client never gets to just say "I paid" - the plan flag is only ever set after PayPal itself confirms the capture.

## Notes on scope

This intentionally does not have: a dashboard, settings/profile pages, document history, credits/tokens system, or recurring PayPal subscriptions. Pro is a flat $9 one-time unlock per the spec; wire up PayPal Subscriptions later if recurring billing is needed - the capture route is the only place that would change.
