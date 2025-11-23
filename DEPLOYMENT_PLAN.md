# DocClock Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the DocClock MVP to production using free tier services.

**Stack:**
- **Frontend:** Netlify (React + TypeScript + Vite)
- **Backend:** Render (FastAPI + Python)
- **Database:** Supabase (PostgreSQL)

**Total Cost:** $0/month (all free tiers)

---

## Prerequisites

Before deploying, ensure:
- ✅ Code is committed to GitHub main branch
- ✅ Backend runs locally without errors
- ✅ Frontend runs locally without errors
- ✅ Database migration is complete (PostgreSQL/Supabase)

---

## Step 1: Database Setup (Supabase)

**Status:** ✅ Already configured

Your Supabase database is already set up and working:
- Database URL: `postgresql+psycopg://postgres.zqswpdgbljaztuhzvkol:...@aws-0-us-west-2.pooler.supabase.com:5432/postgres`
- Tables: `users`, `appointments` (created via Alembic migrations)
- Connection pooler: Session mode (recommended for serverless)

**Supabase Free Tier:**
- 500MB database storage
- Unlimited API requests
- Automatic backups
- Never expires

**No action needed** - database is production-ready.

---

## Step 2: Backend Deployment (Render)

### 2.1 Create Render Account

1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub (recommended for easy deploys)
3. Verify your email

### 2.2 Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your repository: `uva-ebus4810-group08-mvp`
4. Configure the service:

   **Basic Settings:**
   - Name: `docclock-api` (or your choice)
   - Region: `Oregon (US West)` (or closest to you)
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: `Python 3`

   **Build & Deploy:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

   **Instance Type:**
   - Select **"Free"** (750 hours/month, sleeps after 15 min inactivity)

5. Click **"Advanced"** to add environment variables

### 2.3 Set Environment Variables

Add these environment variables in Render dashboard:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgresql+psycopg://[USER]:[PASSWORD]@[HOST]:5432/postgres` | Get from Supabase Dashboard → Settings → Database → Connection string (Session mode) |
| `CORS_ORIGINS` | `https://your-app.netlify.app` | Update after deploying frontend (Step 3) |

**Important:** Use the **Session pooler** connection string from Supabase (not the Transaction pooler) for better compatibility with Render's free tier.

### 2.4 Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repo
   - Install dependencies
   - Start your FastAPI app
   - Provide a public URL: `https://docclock-api.onrender.com`

3. **First deploy takes 3-5 minutes**

### 2.5 Verify Backend Works

Once deployed, test your API:

```bash
# Health check
curl https://docclock-api.onrender.com/health

# Should return:
# {"status":"healthy","appointments_count":N,"users_count":N}
```

**Note:** First request may take 30-60 seconds if service was sleeping.

### 2.6 Run Database Migrations on Render

Your backend needs to run Alembic migrations on first deploy:

1. In Render dashboard, go to your web service
2. Click **"Shell"** tab (or use SSH)
3. Run:
   ```bash
   alembic upgrade head
   ```

This creates the database tables in Supabase if they don't exist.

---

## Step 3: Frontend Deployment (Netlify)

### 3.1 Create Netlify Account

1. Go to [https://netlify.com](https://netlify.com)
2. Sign up with GitHub (recommended)
3. Verify your email

### 3.2 Create New Site

1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Authorize Netlify to access your repositories
4. Select `uva-ebus4810-group08-mvp`

### 3.3 Configure Build Settings

**Build settings:**
- Branch to deploy: `main`
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/dist`

**Environment variables:**

Add these in **"Site configuration"** → **"Environment variables"**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://docclock-api.onrender.com` |

Replace `docclock-api.onrender.com` with your actual Render URL from Step 2.

### 3.4 Deploy

1. Click **"Deploy site"**
2. Netlify will:
   - Install npm dependencies
   - Build your React app (`npm run build`)
   - Deploy to CDN
   - Provide a URL: `https://random-name-123.netlify.app`

3. **First deploy takes 2-3 minutes**

### 3.5 Update Site Name (Optional)

1. Go to **"Site configuration"** → **"General"** → **"Site details"**
2. Click **"Change site name"**
3. Choose a better name: `docclock` → URL becomes `https://docclock.netlify.app`

---

## Step 4: Update CORS Settings

Now that frontend is deployed, update backend CORS:

1. Go to Render dashboard
2. Open your web service (`docclock-api`)
3. Go to **"Environment"** tab
4. Update `CORS_ORIGINS` to your Netlify URL:
   ```
   https://docclock.netlify.app
   ```

5. Click **"Save Changes"**
6. Render will automatically redeploy

---

## Step 5: Test End-to-End

1. **Open your Netlify URL** in browser: `https://docclock.netlify.app`

2. **Test Patient Portal:**
   - Click "Patient Portal"
   - Click "Fill demo credentials"
   - Sign in with demo account
   - Verify appointments load
   - Try creating a new appointment

3. **Test Provider Portal:**
   - Sign out
   - Click "Provider Portal"
   - Click "Fill demo credentials"
   - Sign in with demo account
   - Verify appointments load
   - Try updating an appointment status

4. **Test Account Creation:**
   - Sign out
   - Click "Create account"
   - Fill in details
   - Should create account and auto-login

**If everything works:** 🎉 **You're deployed!**

---

## Deployment Checklist

- [ ] Supabase database is running and connected
- [ ] Render backend deployed successfully
- [ ] Alembic migrations run on Render
- [ ] Netlify frontend deployed successfully
- [ ] Environment variables set correctly on both platforms
- [ ] CORS configured with Netlify URL
- [ ] Health check endpoint returns 200 OK
- [ ] Patient portal login works
- [ ] Provider portal login works
- [ ] Account creation works
- [ ] Appointments CRUD operations work

---

## Monitoring & Maintenance

### Render (Backend)

**Free tier limitations:**
- Service sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- 750 hours/month (31.25 days) - enough for 24/7 if it's your only service

**Monitoring:**
- View logs: Render dashboard → your service → "Logs" tab
- Check metrics: "Metrics" tab shows CPU, memory, requests
- Set up email alerts: "Notifications" tab

**Manual restart:**
If service crashes, go to dashboard and click "Manual Deploy" → "Clear build cache & deploy"

### Netlify (Frontend)

**Free tier limitations:**
- 100GB bandwidth/month (very generous)
- 300 build minutes/month
- Unlimited sites

**Monitoring:**
- View deploys: Netlify dashboard → "Deploys" tab
- Check analytics: "Analytics" tab (requires upgrade)
- Logs: Click on any deploy to see build logs

**Automatic deploys:**
Every push to `main` branch triggers automatic redeploy (both Render and Netlify)

### Supabase (Database)

**Free tier limitations:**
- 500MB database storage
- Pauses after 7 days of inactivity (auto-resumes on first request)
- Automatic daily backups (kept for 7 days)

**Monitoring:**
- Database size: Supabase dashboard → "Database" → "Usage"
- View tables: "Table Editor" tab
- Run queries: "SQL Editor" tab
- Check logs: "Logs" tab

---

## Troubleshooting

### Frontend can't connect to backend

**Symptoms:**
- Frontend loads but shows "Unable to reach scheduling API" error
- Network errors in browser console

**Solutions:**
1. Check `VITE_API_URL` is set correctly in Netlify environment variables
2. Verify Render backend is running (check Render dashboard)
3. Check CORS settings on backend include your Netlify URL
4. Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

### Backend returns 500 errors

**Check Render logs:**
1. Go to Render dashboard → your service → "Logs"
2. Look for Python exceptions or database errors

**Common issues:**
- Database connection failed: Check `DATABASE_URL` is correct
- Missing environment variable: Add it in Render dashboard
- Import error: Check `requirements.txt` is complete

### Database connection errors

**Error message examples:**
- "could not connect to server"
- "password authentication failed"
- "SSL connection required"

**Solutions:**
1. Verify `DATABASE_URL` in Render includes correct password
2. Check Supabase database is running (not paused)
3. Ensure using **Session pooler** connection string (not Transaction pooler)
4. Check if Supabase project is paused (free tier pauses after 7 days inactivity)

### Render service keeps sleeping

**This is normal for free tier.** To minimize wake-up time:
1. Use Session pooler (not Transaction pooler) for database connections
2. Consider upgrading to paid tier ($7/month) for always-on service
3. Add external uptime monitor (like UptimeRobot) to ping your API every 5 minutes

### Build failures on Netlify

**Check build logs:**
1. Netlify dashboard → "Deploys" → click failed deploy → view logs

**Common issues:**
- Missing `VITE_API_URL`: Add in environment variables
- `npm install` fails: Check `package.json` and `package-lock.json` are committed
- TypeScript errors: Run `npm run build` locally first to catch errors

### Migrations not applied

**Symptom:** Backend starts but returns "relation 'users' does not exist"

**Solution:**
1. Go to Render dashboard → your service → "Shell" tab
2. Run: `alembic upgrade head`
3. Or add to Render build command: `pip install -r requirements.txt && alembic upgrade head`

---

## Updating After Deployment

### Making Code Changes

1. Make changes locally and test
2. Commit to `main` branch: `git add . && git commit -m "Description"`
3. Push to GitHub: `git push origin main`
4. **Automatic deploys trigger:**
   - Render rebuilds backend (3-5 minutes)
   - Netlify rebuilds frontend (2-3 minutes)

### Database Schema Changes

If you modify SQLAlchemy models:

1. **Locally:**
   ```bash
   cd backend
   alembic revision --autogenerate -m "Description of change"
   git add alembic/versions/*
   git commit -m "Add migration: description"
   git push
   ```

2. **On Render:**
   - After auto-deploy completes, go to Shell tab
   - Run: `alembic upgrade head`

### Environment Variable Changes

**Backend (Render):**
1. Dashboard → your service → "Environment" tab
2. Add/edit variables
3. Click "Save Changes" (triggers redeploy)

**Frontend (Netlify):**
1. Dashboard → your site → "Site configuration" → "Environment variables"
2. Add/edit variables
3. Click "Save"
4. Trigger redeploy: "Deploys" → "Trigger deploy" → "Deploy site"

---

## Cost Breakdown

| Service | Free Tier | Sufficient For |
|---------|-----------|----------------|
| **Supabase** (Database) | 500MB storage, unlimited API requests | ✅ Small to medium MVP (thousands of appointments) |
| **Render** (Backend) | 750 hrs/month, sleeps after 15min | ✅ MVP with moderate traffic (wakes in 30-60s) |
| **Netlify** (Frontend) | 100GB bandwidth/month | ✅ MVP with thousands of monthly users |

**Total: $0/month**

### When to Upgrade

**Render ($7/month for always-on):**
- Service sleeping is annoying for demos
- Need faster response times
- Regular traffic makes sleeping wasteful

**Supabase ($25/month for 8GB):**
- Approaching 500MB database size
- Need point-in-time recovery
- Want dedicated resources

**Netlify ($19/month Pro):**
- Exceeding 100GB bandwidth
- Need password protection
- Want analytics

---

## Production-Ready Checklist

For a real production deployment, consider:

- [ ] Custom domain (purchase from Namecheap, Google Domains, etc.)
- [ ] SSL certificate (automatic with custom domain on Netlify/Render)
- [ ] Environment-specific configs (staging vs production)
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Database backups (Supabase auto-backups in free tier)
- [ ] Rate limiting on API endpoints
- [ ] Input validation and sanitization
- [ ] Security headers (Netlify provides basic headers)
- [ ] Analytics (Google Analytics, Plausible)

---

## Next Steps

After successful deployment:

1. **Share your app:** Send the Netlify URL to your team/instructor
2. **Monitor usage:** Check Render/Netlify dashboards for traffic
3. **Gather feedback:** Test with real users and iterate
4. **Plan features:** What's next for DocClock?

**Your deployed URLs:**
- Frontend: `https://docclock.netlify.app` (or your chosen name)
- Backend: `https://docclock-api.onrender.com` (or your chosen name)
- Database: Managed in Supabase dashboard

---

## Support

**Platform Documentation:**
- [Render Docs](https://render.com/docs)
- [Netlify Docs](https://docs.netlify.com/)
- [Supabase Docs](https://supabase.com/docs)

**Community Support:**
- Render Community: [https://community.render.com](https://community.render.com)
- Netlify Community: [https://answers.netlify.com](https://answers.netlify.com)
- Supabase Discord: [https://discord.supabase.com](https://discord.supabase.com)

**Common Issues:**
- Check platform status pages first
- Review logs in respective dashboards
- Verify environment variables are set correctly
- Ensure CORS is configured properly
