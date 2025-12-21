# 🔧 Seeding Endpoint Troubleshooting

## ❌ "Not Found" Error - Step-by-Step Fix

### Step 1: Check SEED_SECRET Environment Variable

**In Railway Backend Service → Variables tab:**

**Add this variable:**
```
SEED_SECRET=kayi-seed-2025-secure-key-12345
```

**Important:** Use the **exact same secret** you're using in the curl command.

### Step 2: Force Redeploy

**In Railway Backend Service:**

1. Go to **"Settings"** → **"Deploy"**
2. Click **"Redeploy"** or **"Trigger Redeploy"**
3. Wait 2-3 minutes for redeployment
4. Check deployment logs to ensure it completed successfully

### Step 3: Verify Endpoint Exists

**Test with a simple GET request:**
```bash
curl https://api.kayicom.com/api/
```

**Should return:**
```json
{"detail":"Method Not Allowed"}
```
or a list of available endpoints (if any).

**If you get "Not Found":**
- The API router isn't loading properly
- Check Railway deployment logs for Python errors

### Step 4: Check Deployment Logs

**In Railway Backend Service → Deployments:**

1. Click on the latest deployment
2. Check **"View Logs"**
3. Look for errors like:
   - `ModuleNotFoundError`
   - `ImportError`
   - Python syntax errors
   - Database connection errors

### Step 5: Test with Correct Secret

**Make sure your curl command uses the exact secret from Railway:**
```bash
curl -X POST https://api.kayicom.com/api/__internal/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "kayi-seed-2025-secure-key-12345"}'
```

**Expected responses:**

**✅ Success:**
```json
{
  "success": true,
  "message": "Database seeding completed successfully",
  "results": {
    "admin_user": {...},
    "demo_products": {...},
    "game_configs": {...},
    "summary": {...}
  }
}
```

**❌ Wrong Secret:**
```json
{"detail":"Invalid seed secret"}
```

**❌ No Secret Variable:**
```json
{"detail":"SEED_SECRET environment variable not configured"}
```

**❌ Endpoint Not Found:**
```json
{"detail":"Not Found"}
```

## 🔍 Common Issues & Solutions

### Issue 1: SEED_SECRET Not Set
**Solution:** Add the environment variable in Railway Variables tab

### Issue 2: Service Not Redeployed
**Solution:** Force redeploy in Railway Settings → Deploy

### Issue 3: Code Not Pushed to GitHub
**Solution:**
```bash
git add .
git commit -m "Add seeding endpoint"
git push
```

### Issue 4: Import Errors in Code
**Solution:** Check Railway logs for Python errors and fix imports

### Issue 5: Database Connection Failed
**Solution:** Verify MONGO_URL is correct in Railway variables

## 🧪 Alternative Testing Method

**Test the endpoint exists:**
```bash
curl -X OPTIONS https://api.kayicom.com/api/__internal/seed \
  -H "Content-Type: application/json"
```

**Should return CORS headers if endpoint exists.**

## 📋 Complete Checklist

- [ ] SEED_SECRET added to Railway Backend variables
- [ ] Code pushed to GitHub and redeployed
- [ ] Railway deployment completed successfully
- [ ] No errors in deployment logs
- [ ] API base URL responds: `curl https://api.kayicom.com/api/`
- [ ] Using exact same secret in curl and Railway

## 🚀 After Successful Seeding

**Remove the endpoint for security:**

1. **Delete the seeding code** from `backend/server.py` (lines ~1190-1400)
2. **Delete SEED_SECRET** from Railway variables
3. **Redeploy** to remove the endpoint

## 🔄 If Still Not Working

**Check Railway deployment:**
1. Go to Railway → Backend service → Deployments
2. Click latest deployment → View build logs
3. Look for errors during Python app startup

**Test basic API:**
```bash
curl https://api.kayicom.com/api/stats/dashboard
```
Should return dashboard stats if API is working.

---

## 🎯 Quick Debug Commands

```bash
# Test if API is responding
curl https://api.kayicom.com/api/stats/dashboard

# Test if endpoint exists (should give method not allowed)
curl -X GET https://api.kayicom.com/api/__internal/seed

# Test seeding with correct secret
curl -X POST https://api.kayicom.com/api/__internal/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "kayi-seed-2025-secure-key-12345"}'
```

**Most likely issue:** SEED_SECRET not set in Railway variables or service not redeployed after code changes.

