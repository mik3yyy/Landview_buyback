# Landview Buyback — Production Deployment Guide

## Overview
- **Frontend** → Vercel (free)
- **Backend + Database** → Railway (~$5/month)

---

## STEP 1 — Generate Strong Secrets (do this first)

Run this command twice in your terminal — once for JWT_SECRET, once for JWT_REFRESH_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

Save both outputs — you'll paste them into Railway in Step 3.

---

## STEP 2 — Push Code to GitHub

1. Go to https://github.com/new
   - Name: `landview-buyback`
   - Visibility: **Private**
   - Do NOT add README or .gitignore
   - Click **Create repository**

2. In your terminal:

```bash
cd /Users/michael/Downloads/Landview_buyback

git remote set-url origin https://github.com/mik3yyy/landview-buyback.git

git add .
git commit -m "production ready"
git push -u origin main
```

---

## STEP 3 — Deploy Backend on Railway

1. Go to https://railway.app and sign in with GitHub

2. Click **New Project** → **Deploy from GitHub repo** → select `landview-buyback`
   - When asked for Root Directory, type: `backend`

3. After it appears, click **Add a Service** → **Database** → **PostgreSQL**
   - Wait for it to provision
   - Click the PostgreSQL service → **Variables** tab → copy the `DATABASE_URL` value

4. Click back on your backend service → **Variables** tab → add these one by one:

   | Variable              | Value                                              |
   |-----------------------|----------------------------------------------------|
   | DATABASE_URL          | (paste from PostgreSQL service above)              |
   | JWT_SECRET            | (first output from Step 1)                        |
   | JWT_REFRESH_SECRET    | (second output from Step 1)                       |
   | SENDGRID_API_KEY      | (your SendGrid API key — check backend/.env locally) |
   | FROM_EMAIL            | mike.senior.app.dev@gmail.com                     |
   | DEEPSEEK_API_KEY      | (your DeepSeek API key — check backend/.env locally) |
   | NODE_ENV              | production                                         |
   | FRONTEND_URL          | (fill in after Vercel deploy — Step 5 below)      |

5. Click **Deploy** (or it may auto-deploy)
   - Wait for the build to finish (2–3 minutes)
   - You'll see logs showing "Server running on port..."

6. Copy your Railway backend URL — it looks like:
   `https://landview-buyback-production.up.railway.app`

7. **Run the database seed** (creates the 3 user accounts):
   - In Railway, click your backend service → **Shell** tab
   - Run:
   ```bash
   npm run prisma:seed
   ```

---

## STEP 4 — Verify SendGrid Sender Email

Your FROM_EMAIL must be verified or emails will silently fail.

1. Go to https://app.sendgrid.com
2. Left menu → **Settings** → **Sender Authentication**
3. Click **Verify a Single Sender**
4. Fill in: `mike.senior.app.dev@gmail.com`
5. Check Gmail for the SendGrid confirmation email and click the link

---

## STEP 5 — Deploy Frontend on Vercel

1. Go to https://vercel.com and sign in with GitHub

2. Click **New Project** → import `landview-buyback`
   - Set **Root Directory** to: `frontend`
   - Framework Preset: Vite (auto-detected)

3. Before clicking Deploy, expand **Environment Variables** and add:

   | Variable       | Value                                                    |
   |----------------|----------------------------------------------------------|
   | VITE_API_URL   | (your Railway backend URL from Step 3, e.g. https://landview-buyback-production.up.railway.app) |

4. Click **Deploy**
   - Wait ~1 minute
   - Copy your Vercel URL, e.g. `https://landview-buyback.vercel.app`

---

## STEP 6 — Connect Frontend URL Back to Backend

1. Go back to Railway → your backend service → **Variables**
2. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL = https://landview-buyback.vercel.app
   ```
3. Railway will automatically redeploy with the new value

---

## STEP 7 — Test Everything

Open your Vercel URL and log in with:

| Role        | Email                      | Password            |
|-------------|----------------------------|---------------------|
| Super Admin | superadmin@landview.com    | SuperAdmin@2026!    |
| Admin       | admin@landview.com         | Admin@Landview2026! |
| Accountant  | accountant@landview.com    | Accountant@2026!    |

Test checklist:
- [ ] Login works for all 3 roles
- [ ] Dashboard loads with stats
- [ ] Create a new investment
- [ ] AI Upload works (upload a PDF)
- [ ] Email sends (mark an investment payment complete)
- [ ] Audit logs show activity

---

## STEP 8 — Custom Domain (Optional)

If you have a domain (e.g. `app.landviewproperties.com`):

1. In Vercel → your project → **Settings** → **Domains**
2. Add your domain and follow the DNS instructions Vercel gives you
3. Update `FRONTEND_URL` in Railway to match the custom domain

---

## Ongoing

- **Redeploy**: Just `git push` — Railway and Vercel both auto-deploy on push to `main`
- **View logs**: Railway → your service → **Logs** tab
- **Database GUI**: Run `npm run prisma:studio` locally (still connects to production DB if you set DATABASE_URL locally)
- **Add a new user**: Log in as Super Admin → Administration → User Management

---

## Credentials Reference (keep private)

- Railway dashboard: https://railway.app/dashboard
- Vercel dashboard: https://vercel.com/dashboard
- SendGrid dashboard: https://app.sendgrid.com
- GitHub repo: https://github.com/mik3yyy/landview-buyback
