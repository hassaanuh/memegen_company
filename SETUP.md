# 🚀 GivingTuesday Meme Lab — Setup Guide

## Step 1 — Create a Firebase Project (free)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → Name it `givingtuesday-memelab` → Continue
3. Disable Google Analytics if you want (optional) → **Create project**

---

## Step 2 — Enable Authentication

1. In Firebase Console → left sidebar → **Build → Authentication**
2. Click **"Get started"**
3. Enable **Email/Password** (Sign-in providers tab → Email/Password → Enable → Save)
4. Also enable **Google** (click Google → Enable → add your support email → Save)

---

## Step 3 — Create Firestore Database

1. Left sidebar → **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll tighten rules later)
4. Pick a region close to you → **Enable**

---

## Step 4 — Enable Storage

1. Left sidebar → **Build → Storage**
2. Click **"Get started"** → Start in test mode → **Done**

---

## Step 5 — Get Your Config Keys

1. Go to **Project Settings** (gear icon, top left)
2. Scroll to **"Your apps"** → click **"</>** (Web)" icon
3. Register your app with any nickname → **Register app**
4. Copy the `firebaseConfig` object shown

---

## Step 6 — Paste Config into the App

Open `js/firebase-config.js` and replace the placeholder object:

```js
const firebaseConfig = {
  apiKey:            "AIza...",          // ← your key
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

---

## Step 7 — Set Firestore Security Rules (recommended)

In Firebase Console → Firestore → **Rules** tab, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /memes/{memeId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth.uid == resource.data.userId;
    }
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

Click **Publish**.

---

## Step 8 — Deploy to GitHub Pages

1. Create a new **public** GitHub repo (e.g. `givingtuesday-memelab`)
2. Upload all files keeping the folder structure:
   ```
   index.html
   css/style.css
   js/firebase-config.js
   js/app.js
   SETUP.md
   ```
3. Go to repo **Settings → Pages**
4. Source: **Deploy from branch** → branch: `main` → folder: `/ (root)`
5. Save → wait ~1 min → your site is live at:
   `https://yourusername.github.io/givingtuesday-memelab`

---

## Step 9 — Add Your Domain to Firebase Auth

So Google/Email login works on your GitHub Pages URL:

1. Firebase Console → Authentication → **Settings tab**
2. Scroll to **"Authorized domains"** → **Add domain**
3. Add: `yourusername.github.io`

---

## 🎉 You're live!

Your meme generator now has:
- ✅ Email + Google login
- ✅ Saved memes gallery (Firestore + Storage)
- ✅ Like system
- ✅ Leaderboard
- ✅ Username stamps on memes
- ✅ Moving text, emoji stickers, overlays, snarky starters

---

## Firestore free tier limits (plenty for a nonprofit!)
- **1 GB storage** (Storage)
- **10 GB/month** transfer
- **50,000 reads/day**, **20,000 writes/day**
- Well beyond what you'll need to start
