# P Suman & Associates — Marketing Website

A premium, McKinsey/KPMG-tier marketing website for **P Suman & Associates** (Chartered Accountancy · Audit · Risk · Advisory).

**Stack:** React 19 (CRA + Tailwind) · FastAPI · MongoDB · Motor (async)

---

## 📁 Repository Structure

```
psa-website/
├── frontend/              # React app (deploys to Vercel)
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vercel.json        # Vercel deployment config (SPA rewrites)
│   ├── .env.example       # Copy → .env, set REACT_APP_BACKEND_URL
│   └── .gitignore
│
├── backend/               # FastAPI app (deploys to Railway or Render)
│   ├── server.py
│   ├── requirements.txt
│   ├── Procfile           # Railway / Heroku / Render fallback start command
│   ├── railway.json       # Railway deployment config
│   ├── render.yaml        # Render blueprint config
│   ├── runtime.txt        # Pins Python 3.11.9
│   ├── .env.example       # Copy → .env, fill MONGO_URL + CORS_ORIGINS
│   └── .gitignore
│
├── README.md
└── .gitignore
```

---

## 🏗️ Deployment Stack (All Free Tier)

| Layer       | Service              | Free Tier Limit                            |
| ----------- | -------------------- | ------------------------------------------ |
| Frontend    | **Vercel**           | Unlimited static sites, 100 GB bandwidth   |
| Backend     | **Railway** *(rec.)* | $5 free credit/month, sleeps after idle    |
| Backend alt | **Render**           | 750 hrs/month, cold-starts after 15 min    |
| Database    | **MongoDB Atlas**    | M0 cluster — 512 MB, free forever          |

> **Why Railway > Render for this app?** Railway has faster cold-starts and a more generous free credit model. Render is fine but cold-starts can hit 30 s — bad for first impressions. Use Render only if you've used up Railway's $5.

---

## 🚀 Quick Deployment (15 minutes)

### Step 1 · Set Up MongoDB Atlas (Free)

1. Sign up at **https://www.mongodb.com/cloud/atlas/register**
2. Create a free **M0** cluster (any region close to your backend's region)
3. **Database Access** → Add user (username + auto-generated password — save it)
4. **Network Access** → Add IP `0.0.0.0/0` (allow from anywhere) — required because Railway/Render IPs are dynamic
5. **Connect → Drivers → Python** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<user>` and `<password>` with the real values. **Save this string.**

---

### Step 2 · Push Code to GitHub

```bash
cd psa-website
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/psa-website.git
git push -u origin main
```

The two `.gitignore` files already protect `.env`, `node_modules`, and `__pycache__`.

---

### Step 3 · Deploy Backend to Railway

1. Sign up at **https://railway.com** (GitHub login is easiest)
2. **New Project → Deploy from GitHub repo → select `psa-website`**
3. Railway will detect a monorepo. In the service settings:
   - **Root Directory:** `backend`
   - **Watch Paths:** `backend/**`
4. **Variables** tab → add:
   ```
   MONGO_URL       = mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   DB_NAME         = psuman_associates
   CORS_ORIGINS    = https://<your-vercel-app>.vercel.app
   ```
   *(You'll know the Vercel URL after Step 4 — set it as a placeholder for now and update after frontend deploy.)*
5. **Settings → Networking → Generate Domain** — you'll get e.g. `https://psa-backend-production.up.railway.app`
6. **Copy this backend URL — you'll need it for Vercel.**

✅ Verify backend is up: open `https://<railway-url>/api/` — should return `{"firm":"P Suman & Associates","status":"operational"}`

**Alternative — Render:**
1. https://dashboard.render.com → **New + → Blueprint** → connect repo
2. Render auto-reads `backend/render.yaml`
3. Set `MONGO_URL` and `CORS_ORIGINS` when prompted
4. Get URL like `https://psa-backend.onrender.com`

---

### Step 4 · Deploy Frontend to Vercel

1. Sign up at **https://vercel.com** with GitHub
2. **Add New → Project → Import `psa-website` repo**
3. Configure:
   - **Framework Preset:** Create React App *(auto-detected)*
   - **Root Directory:** `frontend`
   - **Build Command:** `yarn build` *(auto)*
   - **Output Directory:** `build` *(auto)*
4. **Environment Variables** — add:
   ```
   REACT_APP_BACKEND_URL = https://psa-backend-production.up.railway.app
   ```
   *(Use the URL from Step 3 — no trailing slash.)*
5. **Deploy**
6. You'll get e.g. `https://psa-website.vercel.app`

---

### Step 5 · Wire Frontend ↔ Backend CORS

1. Go back to Railway → **Variables**
2. Update `CORS_ORIGINS` to your real Vercel URL:
   ```
   CORS_ORIGINS = https://psa-website.vercel.app
   ```
3. Railway redeploys automatically (~30 seconds)
4. **Test on the live site:**
   - Submit the contact form → should show success state
   - Subscribe to newsletter → should show "Subscribed ✓"
   - Verify records in MongoDB Atlas → Collections → `psuman_associates.contact_submissions` & `newsletter_subscriptions`

✅ **You're live.**

---

## 🌐 Adding a Custom Domain (e.g. www.psumanassociates.com)

### On Vercel (Frontend)
1. **Project → Settings → Domains → Add**
2. Enter `psumanassociates.com` and `www.psumanassociates.com`
3. Vercel shows DNS records to configure with your registrar (e.g. GoDaddy, Hostinger)
4. After DNS propagates (5–30 min), SSL is auto-provisioned

### Update CORS
- Once your custom domain is live, update Railway → `CORS_ORIGINS`:
  ```
  CORS_ORIGINS = https://psumanassociates.com,https://www.psumanassociates.com
  ```

---

## 💻 Local Development

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then edit .env with your Atlas URL
uvicorn server:app --reload --port 8001
```
API will be at `http://localhost:8001/api/`

### Frontend
```bash
cd frontend
cp .env.example .env              # leave REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```
Open `http://localhost:3000`

---

## 🔧 API Reference

All endpoints prefixed with `/api`.

| Method | Path                  | Purpose                                  |
| ------ | --------------------- | ---------------------------------------- |
| GET    | `/api/`               | Health check                             |
| POST   | `/api/newsletter`     | Subscribe email (idempotent)             |
| GET    | `/api/newsletter`     | List subscribers *(admin — gate later)*  |
| POST   | `/api/contact`        | Submit contact form                      |
| GET    | `/api/contact`        | List submissions *(admin — gate later)*  |

**⚠️ Before going public:** add auth to the two `GET` endpoints — they expose PII.

---

## 📦 What's Configured for You

**Vercel (`frontend/vercel.json`)**
- CRA framework preset
- SPA rewrites so React Router routes don't 404 on direct visits
- Long cache for `/static/*` assets

**Railway (`backend/railway.json`)**
- Nixpacks Python builder (auto-detects from `requirements.txt`)
- `$PORT` injection
- Health check on `/api/`
- Restart on failure (max 3 retries)

**Render (`backend/render.yaml`)**
- Blueprint for one-click deploy
- Python free tier
- Health check on `/api/`

**Procfile** — fallback for any platform that auto-detects (Heroku-compatible).

---

## ✅ Pre-Launch Checklist

- [ ] MongoDB Atlas cluster live and IP-whitelisted (`0.0.0.0/0`)
- [ ] Backend deployed to Railway/Render with `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`
- [ ] `/api/` returns operational JSON
- [ ] Frontend deployed to Vercel with `REACT_APP_BACKEND_URL`
- [ ] Test contact form on live site
- [ ] Test newsletter signup
- [ ] Verify data lands in Atlas
- [ ] Custom domain configured (optional)
- [ ] `CORS_ORIGINS` includes all production domains
- [ ] LinkedIn URL in `frontend/src/data/site.js` is correct
- [ ] LinkedIn URL works in footer + contact page
- [ ] Replace founder portrait URL (currently `customer-assets.emergentagent.com`) by uploading to your own asset host or `frontend/public/founder.jpg` and update the `src` in `frontend/src/pages/About.jsx`

---

## 🆘 Troubleshooting

| Symptom                                | Likely Cause / Fix                                                       |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `CORS` error in browser console        | `CORS_ORIGINS` on Railway/Render doesn't match Vercel URL exactly        |
| `Failed to fetch` on forms             | `REACT_APP_BACKEND_URL` wrong on Vercel; needs rebuild after change      |
| Backend `500` on Mongo write           | `MONGO_URL` invalid, or Atlas IP whitelist missing `0.0.0.0/0`           |
| Vercel 404 on `/services` etc.         | `vercel.json` rewrites missing — re-deploy with the file in `frontend/`  |
| Railway sleeps / slow first request    | Free tier behaviour — upgrade to $5/mo Hobby for always-on               |
| Founder portrait broken                | Asset URL points to Emergent — replace with `/founder.jpg` in `public/`  |

---

## 📄 License

Proprietary — © P Suman & Associates. All rights reserved.
