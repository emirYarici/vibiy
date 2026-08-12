# 🎬 Vibiy — Current Capabilities & MVP Strategic Roadmap

> **Vibiy** is a video-first dating and social connection mobile application where compatibility is computed from the Instagram Reels and short-form videos users share every day.

---

## 🌟 Part 1: What Vibiy Can Do Currently (Implemented Features)

### 1. 🎥 Instagram Reel Processing & AI Embedding Engine
* **Instant URL Processing**: Users paste an Instagram Reel or Post URL.
* **Backend Scraping Pipeline**: An Express + Python (`yt-dlp` / scraper) backend extracts clean captions, author usernames, and high-res thumbnail CDNs.
* **Gemini AI Embeddings**: Generates 768-dimensional semantic embeddings using Google Gemini AI to encode the user's humor, aesthetic taste, and interests.
* **Thumbnail Proxy**: Secure image streaming proxy (`/api/thumbnail`) to prevent Instagram CDN link expiry or CORS issues.
* **Video Share History**: Displays local and synced historical cards of all shared videos.

---

### 2. 🧠 Geospatial + 70/30 Hybrid Vector Matching Algorithm
* **PostgreSQL + PostGIS Proximity**: Filters candidates within a defined radius (e.g. 50 km) using `ST_DWithin` on GiST-indexed GPS coordinates.
* **70/30 Hybrid Vector Compatibility via `pgvector`**:
  * **70% Weight on Daily Mood**: Cosine distance across the **3 videos shared yesterday / recently**.
  * **30% Weight on Core Persona**: Cosine distance across the user's **rolling last 20 videos**.
  * **Cold-Start Resilient**: If a user has fewer than 20 videos, the algorithm gracefully weights available history without data skew.
* **Mutual Preference Enforcement**: Strict matching of gender and sexual preference filters.
* **Many-to-Many Daily Limit**: Evaluates candidates and caps matches to **Top 3 connections per user per day**.
* **50% Threshold Optimization**: Configured to capture strong connections while maintaining discovery opportunities.

---

### 3. 🧲 3-Tier Match Archetypes System
Instead of simple scores, matches are categorized with **Lucide vector badges** and psychological connection types:

| Archetype | Icon | Score | Purpose & Dynamic |
| :--- | :---: | :---: | :--- |
| **Twin Flame** | `<Flame />` | $\ge 75\%$ | Identical video energy, aesthetic, and humor. Instant familiarity. |
| **Good Chemistry** | `<Sparkles />` | $50\% - 74\%$ | Harmonic balance with shared interests and room to discover. |
| **Opposites Attract** | `<Magnet />` | $< 50\%$ | **The Contrast Match!** Polar opposite tastes creating natural curiosity and funny icebreakers. |

* **UI Highlights**:
  * Story avatar mini-badges & conversation row capsule tags in [`MatchesPage.tsx`](file:///Users/emiryarici/Desktop/projects/vibiy/src/pages/MatchesPage.tsx).
  * Vibe Insight Explanation Card in [`ProfileDetailsPage.tsx`](file:///Users/emiryarici/Desktop/projects/vibiy/src/pages/ProfileDetailsPage.tsx).
  * Header capsule and conversation starter banner in [`ChatPage.tsx`](file:///Users/emiryarici/Desktop/projects/vibiy/src/pages/ChatPage.tsx).

---

### 4. 💬 Realtime Chat & Interactive Messaging
* **Supabase Realtime Subscriptions**: Instant bi-directional messaging with optimistic UI updates.
* **Reel Share in Chat**: Ability to attach and quote a shared Instagram video with live preview thumbnails that open the Instagram app when tapped.
* **Connection Management**: Full unmatch flow that safely removes conversations.

---

### 5. 📲 Push Notifications & Deep Linking
* **FCM Token Registration**: Captures device tokens on login and syncs them to `public.profiles.fcm_token`.
* **Express Webhook Receiver (`POST /api/webhooks/supabase-message`)**:
  * Triggered automatically on database `messages` `INSERT`.
  * Auto-identifies recipient from `matches` table (`user_a === sender_id ? user_b : user_a`).
  * Delivers system push banners with sender's name and formatted message previews.
* **Deep Linking Navigation**:
  * **Background Tap**: Minimized app brings itself to foreground and navigates to the active conversation.
  * **Cold Start Tap**: Closed/quit app boots up and deep-links directly into the chat.
  * **In-App Banner**: In-app alert with a "View Chat" action button.

---

### 6. 🎨 Centralized Theme & Customization Engine
* **Single Config File ([`themeConfig.ts`](file:///Users/emiryarici/Desktop/projects/vibiy/src/shared/themeConfig.ts))**: 1-click theme switching (`ROJO_DUTCH_XANTHOUS`, `PEAR_INDIGO_IVORY`, `MINDATE_PASTEL`, `MIDNIGHT_DARK`).
* **Zero Hardcoded Colors**: 100% dynamic token consumption across all pages.
* **Modern Aesthetic**: Rounded hero cards (`radius: 28`), frosted glass overlays, and floating capsule bottom tab bar.

---

### 7. 👤 Authentication & Onboarding
* **Authentication**: Supabase Auth (Email + OTP / Magic Link), Apple Sign In, and instant Demo bypass mode.
* **4-Step Onboarding**: Name, multi-photo grid with primary badge, bio + interests, and high-accuracy GPS location capture.

---

## 🚀 Part 2: Strategic Recommendations for MVP Launch

To transform Vibiy from a working build into an addictive, viral social product, here are the top recommendations categorized by impact:

---

### 🥇 Tier 1: High-Impact Daily Habits (Do First)

#### 1. ⏳ "Daily Drop" Countdown Timer & Reveal Screen
* **The Problem**: If matches appear randomly, users don't have a specific daily habit to open the app.
* **The Solution**: Add a countdown timer on the **Chats** screen: *"Next Vibe Drop in 04:18:22"*.
* **The Experience**: At 09:00 AM every day, send a push notification: *"Your 3 daily vibe matches just dropped! 🔥"*. When opened, play a smooth card flip animation revealing their 3 matches.

#### 2. 🎯 "3 Videos to Unlock" Daily Progress Bar
* **The Problem**: Users might forget to share videos consistently.
* **The Solution**: On the **Share** screen, show a `1/3`, `2/3`, `3/3` daily progress circle.
* **The Rule**: Users must share **at least 3 videos today** to be eligible for tomorrow's match drop. This creates high daily active engagement (DAU).

---

### 🥈 Tier 2: Conversation & Retention Boosters

#### 3. ⏱️ 24-Hour Ephemeral Match Timer (Anti-Ghosting)
* **The Concept**: When a match is created, a **24-hour countdown** starts.
* If neither person sends a message within 24 hours, the match quietly expires and dissolves.
* **Why it works**: Urgency dramatically boosts first-message rates and prevents inactive matches from cluttering the inbox.

#### 4. 🎬 "Compare Our Vibes" Side-by-Side Sheet
* In [`ProfileDetailsPage.tsx`](file:///Users/emiryarici/Desktop/projects/vibiy/src/pages/ProfileDetailsPage.tsx) or in the chat room, allow users to tap a button to see **"What We Both Watched Yesterday"**.
* Shows the 3 thumbnails of User A alongside the 3 thumbnails of User B with their AI similarity breakdown (e.g. *"Both shared: Japanese Street Food & Cyberpunk Aesthetics"*).

---

### 🥉 Tier 3: Safety, Polish & Monetization Ready

#### 5. 🛡️ User Safety & Moderation (Required for App Store)
* **Block & Report**: Add a 3-dot menu in `ChatPage` with "Block User" and "Report Inappropriate Behavior".
* **Photo Content Check**: Basic NSFW detection on profile photo uploads before publishing.

#### 6. 💎 Premium "Vibiy+" Features (For Future Monetization)
* **Double Drop**: Unlock 3 additional matches per day.
* **Passport Mode**: Change your GPS location to match with people in Tokyo, London, or New York based on global video trends.
* **Re-Roll Contrast**: Reroll your daily "Opposites Attract" match if you want a different wildcard.

---

## 🛠️ Summary Checklist for Production Deployment

- [x] Instagram Video Scraper & Proxy
- [x] Gemini AI 768-dim Embedding Engine
- [x] PostGIS Proximity + pgvector Cosine Distance Algorithm
- [x] 3 Match Archetypes (Twin Flame, Good Chemistry, Opposites Attract)
- [x] Realtime Bi-directional Chat & Reel Sharing
- [x] Express Webhook for FCM Push Notifications
- [x] App-quit and background notification deep-linking
- [x] Centralized Theme Configuration & Modern UI
- [ ] Place production `serviceAccountKey.json` in `express/`
- [ ] Set up daily scheduled cron (`0 9 * * *`) in `express/index.js`
- [ ] Add Daily Drop Countdown & 3-Video Progress Indicator
