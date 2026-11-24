# Habitat Background Push Setup (Supabase + Web Push)

Follow these steps once to enable true Lock Screen notifications on iPhone & Desktop even when Habitat is closed:

## 1. Generate VAPID Keys
Run once in your terminal:
```bash
npx web-push generate-vapid-keys
```
Save the **Public Key** and **Private Key**.

## 2. Create Supabase Project & Run Migration
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/migrations/20261124_web_push.sql`.

## 3. Deploy the Edge Function
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY" VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY" VAPID_SUBJECT="mailto:you@example.com"
npx supabase functions deploy send-due-reminders --no-verify-jwt
```

## 4. Enable Minute-by-Minute Cron
1. In Supabase Dashboard → **Database → Extensions**, enable **`pg_cron`** and **`pg_net`**.
2. Run the `cron.schedule(...)` SQL block at the bottom of `supabase/migrations/20261124_web_push.sql` (with your `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY`).

## 5. Add Frontend Env Vars (`.env` and Vercel)
Add these 3 variables to your local `.env` and **Vercel Project Settings → Environment Variables**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY`

Redeploy on Vercel, open Habitat from your iPhone Home Screen, and tap **Sync & Enable** (or create a task/habit reminder) to subscribe your device!

---

## 6. Enable Google Sign-In & Cloud Sync (Optional)
1. Run `supabase/migrations/20261125_cloud_sync.sql` in Supabase **SQL Editor**.
2. In Supabase Dashboard → **Authentication → Providers → Google**, toggle **Enabled** and paste your **Google OAuth Client ID** and **Client Secret** (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials), with Authorized redirect URI `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`).
3. In Supabase Dashboard → **Authentication → URL Configuration**, add your Vercel domain (`https://your-app.vercel.app/profile`) and `http://localhost:5173/profile` to **Redirect URLs**.
