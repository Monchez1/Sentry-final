# 🛡️ SENTRY — AI-Powered Crypto Trading Bot

> Autonomous futures trading bot with real-time portfolio monitoring, risk management, paper trading mode, and Telegram integration.

---

## 🏗️ Architecture

```
sentry-app/        → React + Vite frontend  (deploy to Vercel)
sentry-backend/    → FastAPI backend         (deploy to Render)
                     └── PostgreSQL DB       (host on Neon.tech — free)
```

---

## 🚀 Free Deployment Guide

### Step 1 — Database (Neon.tech — free PostgreSQL)
1. Go to [neon.tech](https://neon.tech) → Sign up free
2. Create a project → Copy the **Connection String**
3. It will look like: `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`

### Step 2 — Backend (Render.com — free tier)
1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **New → Web Service** → Connect `Monchez1/Sentry-final`
3. Set **Root Directory** → `sentry-backend`
4. Set **Build Command** → `pip install -r requirements.txt`
5. Set **Start Command** → `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `CORS_ORIGINS` | Your Vercel URL (add after Step 3) |
   | `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather |
7. Click **Deploy** → Copy your Render URL (e.g. `https://sentry-backend.onrender.com`)

### Step 3 — Frontend (Vercel — free)
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Add New Project** → Import `Monchez1/Sentry-final`
3. Set **Root Directory** → `sentry-app`
4. Add **Environment Variable**:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | Your Render backend URL from Step 2 |
5. Click **Deploy** → Your app is live! 🎉

### Step 4 — Initialize the Database
After Render deploys, open a **Shell** in your Render dashboard and run:
```bash
python database/migration.py
python database/create_tables.py
```

---

## 💻 Local Development

### Backend
```bash
cd sentry-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Fill in your values
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd sentry-app
npm install
npm run dev
```

---

## ⚙️ Features
- 📊 Real-time portfolio & equity tracking
- 🔄 Automated asset rotation with momentum signals
- 🛡️ Dynamic drawdown protection & risk controls
- 📱 Telegram bot integration for alerts & notifications
- 🧪 Paper trading mode for safe testing
- 📈 Trade history & activity logs
- 🔑 Multi-exchange API key management

---

## 🔐 Security
- Never commit `.env` files — use `.env.example` as a template
- Exchange API keys are stored encrypted in the database
- Telegram auth validates every API request

---

*Built with FastAPI · React · PostgreSQL · CCXT · Vite*
