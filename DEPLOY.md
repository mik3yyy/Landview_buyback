# Landview Buyback — Production Deployment Guide

## Overview
- **Frontend** → Vercel (free)
- **Backend** → Render (free tier with cold starts, or $7/mo always-on)
- **Database** → Neon (free serverless Postgres)

---

## STEP 1 — Generate Strong Secrets (do this first)

Run this command twice in your terminal — once for JWT_SECRET, once for JWT_REFRESH_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

Save both outputs — you'll paste them into Render in Step 4.

---

## STEP 2 — Push Code to GitHub

1. Go to https://github.com/new
   - Name: `landview-buyback`
   - Visibility: **Private**
   - Do NOT add README or .gitignore
   - Click **Create repository**

2. In your terminal:

```bash
git remote set-url origin https://github.com/mik3yyy/landview-buyback.git
git add .
git commit -m "production ready"
git push -u origin main
```

---

## STEP 3 — Set Up Database on Neon (free)

1. Go to https://neon.tech and sign up / sign in with GitHub

2. Click **New Project**
   - Name: `landview-buyback`
   - Region: choose the one closest to you
   - Click **Create Project**

3. On the project dashboard, find **Connection Details**
   - Select **Prisma** from the "Connection string" dropdown
   - Copy the connection string — it looks like:
     `postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - Save this as your `DATABASE_URL`

---

## STEP 4 — Deploy Backend on Render

1. Go to https://render.com and sign in with GitHub

2. Click **New** → **Web Service**
   - Connect your `landview-buyback` GitHub repo
   - Fill in:

   | Field            | Value                  |
   |------------------|------------------------|
   | Root Directory   | `backend`              |
   | Environment      | Node                   |
   | Build Command    | `npm install && npm run build` |
   | Start Command    | `npm start`            |

3. Scroll to **Environment Variables** and add these one by one:

   | Variable              | Value                                              |
   |-----------------------|----------------------------------------------------|
   | DATABASE_URL          | (your Neon connection string from Step 3)          |
   | JWT_SECRET            | (first output from Step 1)                         |
   | JWT_REFRESH_SECRET    | (second output from Step 1)                        |
   | SENDGRID_API_KEY      | (your SendGrid API key — check backend/.env locally) |
   | FROM_EMAIL            | mike.senior.app.dev@gmail.com                      |
   | DEEPSEEK_API_KEY      | (your DeepSeek API key — check backend/.env locally) |
   | NODE_ENV              | production                                         |
   | FRONTEND_URL          | (fill in after Vercel deploy — Step 6 below)       |

4. Click **Create Web Service**
   - Build takes 2–3 minutes
   - Logs will show "Server running on port..."

5. Copy your Render backend URL — it looks like:
   `https://landview-buyback.onrender.com`

6. **Run the database seed** (creates the 3 default user accounts):
   - In Render, click your service → **Shell** tab
   - Run:
   ```bash
   npm run prisma:seed
   ```

---

## STEP 5 — Verify SendGrid Sender Email

Your FROM_EMAIL must be verified or emails will silently fail.

1. Go to https://app.sendgrid.com
2. Left menu → **Settings** → **Sender Authentication**
3. Click **Verify a Single Sender**
4. Fill in: `mike.senior.app.dev@gmail.com`
5. Check Gmail for the SendGrid confirmation email and click the link

---

## STEP 6 — Deploy Frontend on Vercel

1. Go to https://vercel.com and sign in with GitHub

2. Click **New Project** → import `landview-buyback`
   - Set **Root Directory** to: `frontend`
   - Framework Preset: Vite (auto-detected)

3. Before clicking Deploy, expand **Environment Variables** and add:

   | Variable       | Value                                                          |
   |----------------|----------------------------------------------------------------|
   | VITE_API_URL   | (your Render backend URL from Step 4, e.g. https://landview-buyback.onrender.com) |

4. Click **Deploy**
   - Wait ~1 minute
   - Copy your Vercel URL, e.g. `https://landview-buyback.vercel.app`

---

## STEP 7 — Connect Frontend URL Back to Backend

1. Go to Render → your backend service → **Environment**
2. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL = https://landview-buyback.vercel.app
   ```
3. Render will automatically redeploy with the new value

---

## STEP 8 — Test Everything

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

## STEP 9 — Custom Domain (Optional)

If you have a domain (e.g. `app.landviewproperties.com`):

1. In Vercel → your project → **Settings** → **Domains**
2. Add your domain and follow the DNS instructions Vercel gives you
3. Update `FRONTEND_URL` in Render to match the custom domain

---

## Ongoing

- **Redeploy**: Just `git push` — Render and Vercel both auto-deploy on push to `main`
- **View logs**: Render → your service → **Logs** tab
- **Database GUI**: Run `npm run prisma:studio` locally (set DATABASE_URL in backend/.env to your Neon connection string)
- **Add a new user**: Log in as Super Admin → Administration → User Management

> **Note on Render free tier**: The free tier spins down after 15 minutes of inactivity — the first request after idle takes ~30 seconds to wake. Upgrade to the $7/mo Starter plan for always-on.

---

## Credentials Reference (keep private)

- Render dashboard: https://dashboard.render.com
- Neon dashboard: https://console.neon.tech
- Vercel dashboard: https://vercel.com/dashboard
- SendGrid dashboard: https://app.sendgrid.com
- GitHub repo: https://github.com/mik3yyy/landview-buyback
