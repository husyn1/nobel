# Deploying Nobel — Step-by-Step (Railway, Free)

**Railway** is the easiest free option. One platform, deploys both services, includes a free PostgreSQL database.

---

## Step 1 — Push to GitHub

```bash
cd /Users/hussein/Desktop/FPL-Backboard/Insightclass
git init
git add .
git commit -m "Initial Nobel commit"
# Create a new GitHub repo at github.com/new, then:
git remote add origin https://github.com/YOUR_USERNAME/nobel.git
git push -u origin main
```

---

## Step 2 — Deploy on Railway (free)

1. Go to **[railway.app](https://railway.app)** → sign up with GitHub
2. Click **New Project → Deploy from GitHub repo** → select your Nobel repo

### Deploy the backend

3. Click **Add Service → GitHub Repo** → choose `nobel` → set **Root Directory** to `backend`
4. Railway auto-detects Python and installs `requirements.txt`
5. Add a **PostgreSQL** database: click **New → Database → PostgreSQL**
6. Railway automatically injects `DATABASE_URL` into your backend

Set these **environment variables** on the backend service:

| Variable | Value |
|---|---|
| `SECRET_KEY` | Run `python3 -c "import secrets; print(secrets.token_hex(32))"` and paste result |
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | `https://YOUR-FRONTEND.up.railway.app` (fill in after step below) |
| `OPENAI_API_KEY` | `test` |
| `LLM_BASE_URL` | `https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1` |
| `LLM_MODEL` | `openai/gpt-oss-120b` |

### Deploy the frontend

7. Click **New Service → GitHub Repo** → same repo → set **Root Directory** to `frontend`
8. Set these environment variables on the frontend service:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-BACKEND.up.railway.app` |

9. Go back to the backend service → update `ALLOWED_ORIGINS` with the frontend URL

### Seed demo data

10. In the backend service terminal (Railway dashboard → service → Shell):

```bash
python seed_demo.py
```

---

## Step 3 — Your app is live

| | URL |
|---|---|
| Frontend | `https://YOUR-FRONTEND.up.railway.app` |
| Backend | `https://YOUR-BACKEND.up.railway.app` |

---

## Free tier limits (Railway)

- $5 free credit/month — enough for low-traffic apps
- PostgreSQL included
- No cold starts (unlike Render's free tier which sleeps after 15 min)

---

## Security checklist (already done)

- [x] `SECRET_KEY` generated via `secrets.token_hex(32)`
- [x] CORS restricted to your frontend domain in production
- [x] API docs (`/docs`) hidden in production
- [x] Global error handler prevents stack traces leaking
- [x] JWT tokens expire after 7 days
- [x] Passwords hashed with bcrypt
- [x] No secrets hardcoded — all via environment variables
