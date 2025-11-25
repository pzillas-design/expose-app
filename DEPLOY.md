# 🚀 Deploy Your App to Vercel - Easy Guide

This guide will help you get your app online in **under 10 minutes**!

## What You'll Need
- GitHub account (free)
- Vercel account (free) 
- Your Gemini API Key from [ai.google.dev](https://ai.google.dev)

---

## Step 1: Set Up GitHub

### Option A: Using GitHub Desktop (Easiest for Non-Coders!)
1. Download [GitHub Desktop](https://desktop.github.com/)
2. Sign in with your GitHub account
3. Click **"File"** → **"Add Local Repository"**
4. Browse to this folder: `/Users/michaelpzillas/Projekte/expose main/app v3.0/exposé-2.7`
5. Click **"Create a repository"** if prompted
6. Name it `expose-app`
7. Click **"Publish repository"** (top right)
8. Choose **Public** or **Private** (your choice)
9. Click **"Publish"**

### Option B: Using Terminal (If You're Comfortable)
1. Open Terminal
2. Navigate to your project:
   ```bash
   cd "/Users/michaelpzillas/Projekte/expose main/app v3.0/exposé-2.7"
   ```
3. Run these commands (replace `YOUR_USERNAME` with your GitHub username):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - ready for deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/expose-app.git
   git push -u origin main
   ```

---

## Step 2: Deploy on Vercel

1. **Sign up at Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click **"Continue with GitHub"**
   - Authorize Vercel to access your GitHub

2. **Create New Project**
   - Click **"Add New..."** → **"Project"**
   - You'll see a list of your GitHub repositories
   - Find **`expose-app`** and click **"Import"**

3. **Configure Project**
   - Vercel will auto-detect it's a **Vite** project ✅
   - **Framework Preset**: Should say "Vite" (auto-detected)
   - **Root Directory**: Leave as `.` (default)
   - **Build Command**: Leave as `npm run build` (default)
   - **Output Directory**: Leave as `dist` (default)

4. **Add Environment Variable (IMPORTANT!)**
   - Scroll down to **"Environment Variables"**
   - Click to expand it
   - Add this variable:
     - **Name**: `GEMINI_API_KEY`
     - **Value**: (Paste your actual Gemini API key)
   - Click **"Add"**

5. **Deploy!**
   - Click the big **"Deploy"** button
   - Wait about 60 seconds ⏱️
   - You'll see confetti 🎉 when it's done!

6. **Visit Your Live App**
   - Click **"Visit"** or copy the URL
   - It will look like: `https://expose-app.vercel.app`
   - **That's your live app!** 🚀

---

## Step 3: Test Everything

✅ Upload an image  
✅ Try generating variations  
✅ Test all the features  

If something doesn't work, check:
- Did you add the `GEMINI_API_KEY` environment variable?
- Is your Gemini API key valid?
- Check the Vercel deployment logs for errors

---

## 🔒 Security Note

Your app uses a **secure API route** (`/api/generate.js`) so your Gemini API key is safely stored on Vercel's servers and never exposed to users in the browser. This is the professional, secure way to do it!

---

## 🎯 Next Steps (Optional)

### Custom Domain
Want `yourname.com` instead of `expose-app.vercel.app`?
1. Go to your Vercel project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Follow Vercel's instructions to update DNS

### Add Supabase Database
To save user data, images, and credits permanently:
- See the separate guide: **`SUPABASE_SETUP.md`** (coming next!)

---

## 💰 Cost

**Free!** Vercel's free tier includes:
- Unlimited deployments
- Automatic HTTPS
- Global CDN
- Perfect for hobby projects

You only pay if you need enterprise features or exceed the generous free limits.

---

## 🆘 Troubleshooting

### Build Failed?
- Check the deployment logs in Vercel
- Make sure all dependencies are in `package.json`
- Try running `npm install` and `npm run build` locally first

### API Key Not Working?
- Make sure you added it as `GEMINI_API_KEY` (exact spelling)
- No quotes around the value
- Redeploy after adding environment variables

### Need Help?
Just ask me! Describe what went wrong and I'll help you fix it.
