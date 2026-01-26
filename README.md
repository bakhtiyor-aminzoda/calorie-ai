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

### 1. Database & Backend (Render.com)
We recommend **Render.com** because it offers a **completely free tier** for both Node.js and PostgreSQL.

### 1. Database (Neon.tech)
Since Render limits free databases, we recommend **Neon.tech** (generous free tier, fast, serverless).

1. **Sign up** at [neon.tech](https://neon.tech/).
2. **Create Project**:
   - Name: `calorie-ai`
   - Region: Select nearest to you (e.g., Frankfurt for EU).
3. **Get Connection String**:
   - On the Dashboard, copy the **Connection String** (it looks like `postgres://...`).
   - We will use this as `DATABASE_URL` in the next step.

### 2. Backend (Render.com)
We will host the Node.js server on Render.

1. **Sign up** at [render.com](https://render.com/).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository (`calorie-ai`).
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
   - **Environment Variables** (Add these in "Environment"):
     - `DATABASE_URL`: Paste the Internal DB URL you copied.
     - `OPENAI_API_KEY`: Your OpenAI key.
     - `TELEGRAM_BOT_TOKEN`: Your Telegram Bot Token.
     - `ADMIN_CHAT_ID`: Your Telegram Chat ID.
     - `PORT`: `10000` (Render default) or `3000`.
     - `FRONTEND_URL`: Your Vercel URL (add later).
4. **Deploy**.
   - Wait for it to go Live. Copy the service URL (e.g., `https://calorie-ai.onrender.com`).

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
