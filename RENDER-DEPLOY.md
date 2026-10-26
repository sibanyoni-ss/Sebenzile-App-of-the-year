# Deploy LawCompass to Render

This repository is a single full-stack Node service: `backend/src/server.js` serves the API and the frontend files in the repository root. Deploy it as **one Render Web Service**, not as a separate Static Site.

## Render service settings

- **Service type:** Web Service
- **Runtime:** Node
- **Root Directory:** `backend`
- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

`backend/package-lock.json` is committed, so `npm ci` works only when the Root Directory is `backend`. If Root Directory is blank, Render runs `npm ci` in the repository root and fails because no root lockfile exists.

You may create the service with **New > Blueprint** after committing `render.yaml`, or enter these values manually in the Render Dashboard.

## Required production environment variables

Set these in Render's **Environment** tab. Do not commit them into `.env` or GitHub.

| Variable | Value / source |
|---|---|
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | The exact Render service URL, e.g. `https://lawcompass.onrender.com` (plus custom-domain URL after it is added) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key; backend only |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret |
| `SUPABASE_STORAGE_BUCKET` | `contracts` unless you intentionally use a different private bucket |
| `TURBOSMTP_CONSUMER_KEY` | TurboSMTP / ServerSMTP API consumer key |
| `TURBOSMTP_CONSUMER_SECRET` | TurboSMTP / ServerSMTP API consumer secret |
| `TURBOSMTP_FROM_EMAIL` | A verified sender address on your mail provider |

Optional integrations have additional variables: `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`, and `LEGAL_HELP_PROVIDER`.

## Why email verification currently fails

The signup route sends the verification code through TurboSMTP. Without the three `TURBOSMTP_*` values above—or if the sender address is not verified by the provider—the backend rejects the send and the browser shows “We could not send a verification code.”

## Before going live

1. Run the SQL in `supabase_schema.sql` in your Supabase project.
2. Create the private `contracts` storage bucket.
3. Add the environment variables in Render, save, and redeploy.
4. Open `https://YOUR-SERVICE.onrender.com/health`; it must return a JSON response with `status: "pass"`.
5. Register with a real email address and confirm the code arrives. Check provider logs if it does not.

The local test runner currently assumes a path without spaces, so do not add `npm test` to Render's build command until the test runner's Windows path handling is repaired. This does not affect normal startup or deployment.