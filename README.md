# Calorie AI 🍏

AI-powered calorie tracker integrated with Telegram Mini Apps.

## Features
- 📸 **AI Food Analysis**: Snap a photo to get calories, macros, and ingredients.
- 💬 **Telegram Integration**: Works seamlessly inside Telegram.
- 💳 **Subscription System**: Premium status management with admin approval flow.
- 📊 **History & Stats**: Track your daily progress.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **AI**: OpenAI Vision API

---

## 🚀 Deployment Guide (Production)

### 1. Database & Backend (Railway)
We recommend **Railway** because it provides both a PostgreSQL database and Node.js hosting easily.

1. **Sign up** at [Railway.app](https://railway.app/).
2. **Create a New Project** -> **Deploy from GitHub repo**.
3. Select this repository.
4. **Add a Database**:
   - In the project view, click "New" -> "Database" -> "PostgreSQL".
   - This will automatically provide a `DATABASE_URL` variable to your services.
5. **Configure Backend Service**:
   - Go to your imported repo service settings.
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `DATABASE_URL`: (Railway adds this automatically if you link the DB)
     - `OPENAI_API_KEY`: Your OpenAI key.
     - `TELEGRAM_BOT_TOKEN`: Your Telegram Bot Token.
     - `ADMIN_CHAT_ID`: Your Telegram Chat ID for receiving payment requests.
     - `FRONTEND_URL`: The URL of your deployed frontend (add this *after* deploying frontend).
     - `PORT`: `3000` (or let Railway assign it).

### 2. Frontend (Vercel)
We recommend **Vercel** for the frontend.

1. **Sign up** at [Vercel.com](https://vercel.com/).
2. **Add New Project** -> Import from GitHub.
3. Select this repository.
4. **Project Settings**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL`: The URL of your deployed backend (e.g., `https://backend-production.up.railway.app/api`).
     - *Note: Make sure to add `/api` at the end!*
6. **Deploy**.

---

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
# Needs .env file with DATABASE_URL, OPENAI_API_KEY, etc.
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
