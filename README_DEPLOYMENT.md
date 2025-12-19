# 🚂 Railway Deployment - Quick Start

Your KayiCom application is now ready for Railway deployment!

## ⚡ Quick Deploy (5 minutes)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Railway deployment"
   git push
   ```

2. **Go to [railway.app](https://railway.app)** and create account

3. **Add MongoDB Database**
   - New Project → "+ New" → Database → MongoDB
   - Copy `MONGO_URL` from Variables tab

4. **Deploy Backend**
   - "+ New" → GitHub Repo → Select your repo
   - Set Root Directory: `backend`
   - Add Variables:
     - `MONGO_URL` (from MongoDB service)
     - `DB_NAME=kayicom`
     - `CORS_ORIGINS=https://your-frontend.up.railway.app`
     - `FRONTEND_URL=https://your-frontend.up.railway.app`
   - Set Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Copy Backend URL

5. **Deploy Frontend**
   - "+ New" → GitHub Repo → Same repo
   - Set Root Directory: `frontend`
   - Add Variables:
     - `REACT_APP_BACKEND_URL=<your-backend-url>`
   - Set Build Command: `npm install && npm run build`
   - Set Start Command: `npx serve -s build -l $PORT`
   - Copy Frontend URL

6. **Update Backend CORS**
   - Update `CORS_ORIGINS` with frontend URL
   - Update `FRONTEND_URL` with frontend URL

7. **Initialize Database**
   ```bash
   railway run python backend/create_admin.py
   railway run python backend/seed_demo_products.py
   railway run python backend/seed_games.py
   ```

8. **Done!** Visit your frontend URL 🎉

## 📖 Full Guide

See `RAILWAY_DEPLOYMENT.md` for detailed instructions.

## 🔑 Default Admin Credentials

- Email: `admin@kayicom.com`
- Password: `admin123`

⚠️ **Change password after first login!**

## 🔧 Files Added for Railway

- `railway.json` - Railway project config
- `backend/railway.toml` - Backend service config
- `backend/Procfile` - Backend start command
- `frontend/railway.toml` - Frontend service config
- `backend/create_admin.py` - Admin user creation script
- `.gitignore` - Git ignore rules
- `RAILWAY_DEPLOYMENT.md` - Full deployment guide

## ✅ Pre-Deployment Checklist

- [x] MongoDB connection handling improved
- [x] CORS configuration fixed for Railway
- [x] Environment variable handling improved
- [x] Health check endpoints added
- [x] Startup scripts created
- [x] Admin creation script ready
- [x] Frontend serve package added

Your app is production-ready! 🚀

