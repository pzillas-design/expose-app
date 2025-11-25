# 🗄️ Supabase Database Setup Guide

This guide will help you add permanent cloud storage to your app so users can access their images from any device.

> [!NOTE]
> **Do this AFTER your app is deployed on Vercel!** Get the app live first, then add database features.

---

## Why Supabase?

- **Free tier is generous**: 500MB database, 1GB storage, 50k monthly users
- **Built-in authentication**: User accounts handled for you
- **Fast CDN**: Images load quickly worldwide
- **Easy to use**: Simple API, great documentation

---

## Part 1: Create Supabase Project

### Step 1: Sign Up / Sign In
1. Go to [supabase.com](https://supabase.com)
2. You mentioned you already have an account - **sign in!**
3. Click **"New Project"**

### Step 2: Configure Your Project
1. **Name**: `expose-app` (or whatever you prefer)
2. **Database Password**: Choose a strong password and **save it somewhere safe!**
3. **Region**: Choose closest to your users (e.g., Europe West for Europe)
4. **Pricing Plan**: Select **Free** (perfect to start)
5. Click **"Create new project"**

Wait about 2 minutes for the project to be ready ⏱️

---

## Part 2: Set Up Database Tables

### Step 1: Open SQL Editor
1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**

### Step 2: Create Tables
Copy and paste this SQL script and click **"Run"**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  credits INTEGER DEFAULT 10 NOT NULL,
  settings JSONB DEFAULT '{}',
  CONSTRAINT credits_positive CHECK (credits >= 0)
);

-- Images table
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  -- For image lineage tracking
  parent_id UUID REFERENCES images(id) ON DELETE SET NULL,
  generation_prompt TEXT,
  
  CONSTRAINT width_positive CHECK (width > 0),
  CONSTRAINT height_positive CHECK (height > 0)
);

-- Annotations table
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mask_path', 'stamp')),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate bookmarks
  UNIQUE(user_id, image_id)
);

-- Prompt templates table (for user's custom prompts)
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  emoji TEXT,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_created_at ON images(created_at DESC);
CREATE INDEX idx_annotations_image_id ON annotations(image_id);
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_prompt_templates_user_id ON prompt_templates(user_id);

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Images policies
CREATE POLICY "Users can view own images" ON images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON images
  FOR DELETE USING (auth.uid() = user_id);

-- Annotations policies
CREATE POLICY "Users can view annotations of own images" ON annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM images 
      WHERE images.id = annotations.image_id 
      AND images.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert annotations to own images" ON annotations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM images 
      WHERE images.id = annotations.image_id 
      AND images.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update annotations of own images" ON annotations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM images 
      WHERE images.id = annotations.image_id 
      AND images.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete annotations of own images" ON annotations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM images 
      WHERE images.id = annotations.image_id 
      AND images.user_id = auth.uid()
    )
  );

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Prompt templates policies
CREATE POLICY "Users can view own templates" ON prompt_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates" ON prompt_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON prompt_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON prompt_templates
  FOR DELETE USING (auth.uid() = user_id);
```

✅ You should see **"Success. No rows returned"** - that's good!

---

## Part 3: Set Up Storage for Images

### Step 1: Create Storage Bucket
1. In Supabase dashboard, click **"Storage"** in the left sidebar
2. Click **"Create a new bucket"**
3. **Name**: `user-images`
4. **Public bucket**: Toggle **ON** (so images can be viewed via CDN)
5. Click **"Create bucket"**

### Step 2: Set Storage Policies
1. Click on the `user-images` bucket
2. Click **"Policies"** tab
3. Click **"New Policy"**
4. Select **"For full customization"**
5. Use this policy:

**Policy Name**: `Users can upload own images`

```sql
-- Allow users to upload images to their own folder
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own images (and CDN public access)
CREATE POLICY "Public image access"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-images');

-- Allow users to update own images
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Part 4: Enable Authentication

### Step 1: Configure Auth Providers
1. Click **"Authentication"** → **"Providers"** in the left sidebar
2. Enable **Email** (already enabled by default)
3. Optional: Enable **Google** or **GitHub** for social login

### Step 2: Configure Email Templates (Optional)
1. Click **"Authentication"** → **"Email Templates"**
2. Customize the welcome email, password reset, etc.
3. Or leave the defaults - they work fine!

---

## Part 5: Get Your API Keys

### Step 1: Find Your Keys
1. Click **"Settings"** (gear icon) → **"API"**
2. You'll see:
   - **Project URL**: Like `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
   - **service_role key**: Another long string (keep this secret!)

### Step 2: Add to Vercel
1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add these two new variables:
   - **Name**: `VITE_SUPABASE_URL`  
     **Value**: (your Project URL)
   - **Name**: `VITE_SUPABASE_ANON_KEY`  
     **Value**: (your anon public key)
4. Click **"Save"**

### Step 3: Add to Local Development
Create/update the `.env.local` file in your project:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your...anon...key
GEMINI_API_KEY=your_gemini_key
```

---

## Part 6: Install Supabase Client

In your terminal, navigate to your project and install Supabase:

```bash
cd "/Users/michaelpzillas/Projekte/expose main/app v3.0/exposé-2.7"
npm install @supabase/supabase-js
```

---

## ✅ You're Ready!

Your Supabase database is now set up! The next step is to integrate it into your app code.

**I can help you with that integration when you're ready.** Just let me know!

---

## 📊 Monitor Your Usage

1. Go to Supabase dashboard → **"Settings"** → **"Usage"**
2. You can see:
   - Database size
   - Storage used
   - API requests
   - Active users

The free tier is very generous - you'll be fine for a while!

---

## 💰 Cost Reminder

**Free tier includes:**
- 500 MB database space
- 1 GB file storage  
- Unlimited API requests
- 50,000 monthly active users
- 2 GB bandwidth per month

**Paid plans start at $25/month** (only if you grow beyond free tier)

---

## 🆘 Need Help?

If you get stuck at any step, just ask me! I can:
- Help debug SQL errors
- Explain any step in more detail
- Help you integrate Supabase into your app code
