---
name: vibiy-app
description: Comprehensive architecture, feature guide, matching algorithms, backend scraping pipeline, database schema, and developer workflows for Vibiy (React Native + Supabase + Express + Gemini AI).
---

# 🎬 Vibiy — Video-First Social & Dating Application

## 1. Overview & Core Mission
**Vibiy** is a video-first dating and social connection mobile application. Instead of relying solely on static photos and superficial bios, Vibiy computes human compatibility directly from the short-form videos (Instagram Reels & Posts) that users consume and share daily.

### Key Value Propositions
- **Vibe Over Static Bio**: A user's humor, aesthetic taste, values, and cultural interests are reflected in the videos they share.
- **70/30 Hybrid AI Compatibility**: Matches are calculated by weighting spontaneous daily mood (70%) with a long-term core persona (30%).
- **Curated Daily Drops**: Instead of infinite swiping burnout, users receive up to 3 curated connections per day.
- **Explainable Connection Archetypes**: Matches are categorized as *Twin Flame*, *Good Chemistry*, or *Opposites Attract*.

---

## 2. Tech Stack & Architecture

### 📱 Frontend (Mobile App)
- **Framework**: React Native (CLI, TypeScript)
- **State & Data Fetching**: `@tanstack/react-query` (with caching & optimistic updates)
- **Backend-as-a-Service**: `@supabase/supabase-js` (Auth, PostgreSQL, Realtime channels, Storage)
- **Icons & UI**: `lucide-react-native`, `react-native-gesture-handler`, `react-native-safe-area-context`
- **Location**: `@react-native-community/geolocation` / Native Geolocation API
- **Push Notifications**: `@react-native-firebase/app`, `@react-native-firebase/messaging`

### ⚙️ Backend & AI Services (`express/`)
- **Web Server**: Node.js + Express (`express/index.js`)
- **Scraping Pipeline**: Python (`yt-dlp`, `requests`, `scraper.py`) for clean captions, usernames, and thumbnails
- **AI Models (Google Gemini)**:
  - `gemini-3.5-flash`: Cleans raw scraped captions into concise 1-2 sentence vibe summaries.
  - `gemini-embedding-2-preview`: Generates high-dimensional vector embeddings to encode taste and semantic meaning.
- **Push Notification Dispatcher**: `firebase-admin` handling FCM token delivery triggered by Supabase database webhooks.

### 🗄️ Database & Spatial Compute (Supabase PostgreSQL)
- **Geospatial Proximity**: PostGIS (`geography(Point, 4326)`) with `ST_DWithin` and `ST_Distance` accelerated by GiST indexing.
- **Vector Search**: `pgvector` extension for cosine distance (`<=>`) calculations directly in PL/pgSQL stored procedures.
- **Realtime Database**: Websocket channels listening to `INSERT` and `UPDATE` on `public.messages`.

---

## 3. Core Features & User Workflows

### 3.1. 🎥 Instagram Reel Ingestion & AI Embedding
1. User pastes an Instagram Reel / Post URL in `SharePage.tsx`.
2. App sends `POST /api/process-video` to Express backend.
3. Backend enforces the **Daily Limit** (maximum 3 videos per user per calendar day).
4. If video is new:
   - `scraper.py` executes `yt-dlp` to extract caption, creator handle, and CDN thumbnail.
   - Backend downloads the image and stores it permanently in the Supabase Storage bucket (`reels`).
   - Gemini AI generates a clean caption summary and computes vector embeddings.
   - Record is stored in `public.videos` and mapped in `public.userid_videos`.
5. If video was previously processed, it is instantly linked to the user.

### 3.2. 🧠 70/30 Hybrid Vector Matching Algorithm
Matches are computed inside PostgreSQL via PL/pgSQL stored procedures (`find_vibe_matches_for_user` and `generate_daily_matches`):
- **70% Weight — Spontaneous Daily Mood**:
  - Cosine distance across the user's **3 videos shared yesterday / recently**.
- **30% Weight — Rolling Core Persona**:
  - Cosine distance across the user's **rolling last 20 videos**.
- **Hard Constraints**:
  - **GPS Proximity**: Filters within configurable radius (default: 50 km) via PostGIS.
  - **Mutual Preference**: Strict bidirectional filter on gender and sexual preference (`man`, `woman`, `everyone`).
  - **Exclusion**: Never matches users who have an active or existing match record.
- **Matching Cap**: Maximum of 3 matches created per user per day with a minimum similarity threshold (default: $\ge 50\%$).

### 3.3. 🧲 3-Tier Match Archetypes
Matches are classified into three distinct psychological archetypes based on their final similarity score:

| Archetype | Icon | Score Range | Meaning & Dynamic |
| :--- | :---: | :---: | :--- |
| **Twin Flame** | `<Flame />` | $\ge 75\%$ | Identical video energy, humor, and aesthetics. Instant familiarity. |
| **Good Chemistry** | `<Sparkles />` | $50\% - 74\%$ | Harmonic balance with common ground and exciting differences. |
| **Opposites Attract** | `<Magnet />` | $< 50\%$ | Polar opposite tastes serving as an intriguing contrast match / wildcard. |

### 3.4. 💬 Realtime Chat & Reel Sharing
- Direct 1-on-1 messaging powered by Supabase Realtime channel subscriptions.
- Users can quote and share Instagram videos directly in conversation.
- Custom video cards in chat display thumbnail previews and deep-link directly into the Instagram app.
- Full connection management: unmatch options with safe cascade cleanup.

### 3.5. 📲 Push Notifications & Deep Linking
- Client captures FCM token upon login and persists it to `public.profiles.fcm_token`.
- Supabase Database Webhook fires on `messages` table `INSERT` $\rightarrow$ `POST /api/webhooks/supabase-message`.
- Express backend identifies the recipient, formats a clean preview banner, and dispatches an FCM payload.
- App handles:
  - **Foreground Banner**: In-app modal alert with a "View Chat" CTA.
  - **Background Tap**: Resumes app and pushes `ChatPage`.
  - **Cold Start Tap**: Launches app from closed state and navigates straight into the active conversation.

### 3.6. 🎨 Centralized Design System & Theming
- Centralized configuration in [`src/shared/themeConfig.ts`](file:///Users/emiryarici/Desktop/projects/vibiy/src/shared/themeConfig.ts) and [`src/shared/theme.ts`](file:///Users/emiryarici/Desktop/projects/vibiy/src/shared/theme.ts).
- Switchable themes:
  - `ROJO_DUTCH_XANTHOUS` (warm crimson & amber)
  - `PEAR_INDIGO_IVORY` (electric lime & deep indigo)
  - `MINDATE_PASTEL` (soft modern aesthetic)
  - `MIDNIGHT_DARK` (sleek dark mode)
- Component tokens: 28px hero card corner radii, frosted glass navigation bars, and skeleton loaders (`SkeletonImage.tsx`).

---

## 4. Codebase Directory Structure

```
vibiy/
├── App.tsx                       # Root app wrapper (GestureHandler, QueryClientProvider)
├── index.js                      # React Native entry point
├── src/
│   ├── app/
│   │   └── AppContainer.tsx      # Main state machine, tab navigation, deep link handler
│   ├── components/
│   │   ├── ArchetypeBadge.tsx    # Visual pill badges for match archetypes
│   │   ├── SkeletonImage.tsx     # Animated shimmer loader for remote images
│   │   └── TabBar.tsx            # Floating capsule bottom navigation bar
│   ├── pages/
│   │   ├── LoginPage.tsx         # Supabase Auth, OTP, Apple login, Demo bypass
│   │   ├── ProfileOnboarding.tsx # Multi-step onboarding (Photos, Bio, GPS, Preferences)
│   │   ├── SharePage.tsx         # Video URL submission, progress bar, share history
│   │   ├── MatchesPage.tsx       # Daily matches list, archetype filters, chat triggers
│   │   ├── ChatPage.tsx          # Realtime chat, reel quoting, unmatch actions
│   │   ├── ProfileDetailsPage.tsx# Candidate profile review & Vibe Insight breakdown
│   │   └── ProfilePage.tsx       # User profile editing, photo grid, settings
│   ├── shared/
│   │   ├── api/supabase.ts       # Supabase client singleton & auth helpers
│   │   ├── queries/              # React Query hooks (e.g. useShareHistory.ts)
│   │   ├── theme.ts              # Dynamic style generator from theme tokens
│   │   ├── themeConfig.ts        # Color palettes and global theme constants
│   │   └── types.ts              # TypeScript interfaces for Profiles, Videos, Matches
│   └── types/                    # Extended TypeScript declarations
├── express/
│   ├── index.js                  # Express API server (process-video, matches, webhooks)
│   ├── scraper.py                # Python yt-dlp scraping script
│   ├── schema_hybrid_matching.sql# PostgreSQL stored procedures & PostGIS definitions
│   ├── Dockerfile & docker-compose.yml
│   └── package.json
└── assets/                       # App icons, splash screens, and illustrations
```

---

## 5. Key Database Tables & Schema Reference

### `public.profiles`
- `id` (uuid, primary key $\rightarrow$ `auth.users.id`)
- `full_name` (text), `age` (int), `bio` (text), `gender` (text), `preference` (text)
- `photos` (text array of URLs)
- `location` (`geography(Point, 4326)` for PostGIS distance queries)
- `fcm_token` (text, for push notification dispatch)

### `public.videos`
- `id` (uuid, primary key)
- `url` (text, unique Instagram URL)
- `summary` (text, Gemini AI refined summary)
- `username` (text, creator handle)
- `thumbnail_url` (text, Supabase Storage permanent URL)
- `embedding` (`vector(3072)` / padded Gemini vector)

### `public.userid_videos`
- `id` (uuid, primary key)
- `user_id` (uuid $\rightarrow$ `profiles.id`)
- `video_id` (uuid $\rightarrow$ `videos.id`)
- `created_at` (timestamptz)

### `public.matches`
- `id` (uuid, primary key)
- `user_a` (uuid $\rightarrow$ `profiles.id`)
- `user_b` (uuid $\rightarrow$ `profiles.id`)
- `similarity_score` (float)
- `archetype` (text: `'twin_flame'`, `'good_chemistry'`, `'opposites_attract'`)
- `status` (text: `'active'`, `'unmatched'`, `'expired'`)

### `public.messages`
- `id` (uuid, primary key)
- `match_id` (uuid $\rightarrow$ `matches.id`)
- `sender_id` (uuid $\rightarrow$ `profiles.id`)
- `content` (text)
- `created_at` (timestamptz)

---

## 6. Developer Guidelines & Common Workflows

### 6.1. Running the Express Backend
```bash
cd express
# Ensure Python virtual environment with yt-dlp is active
source venv/bin/activate
pip install -r requirements.txt
npm install
npm start
```
Make sure `.env` contains:
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or service role key)
- `GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT` (or `serviceAccountKey.json` present in directory)

### 6.2. Running the React Native Mobile Client
```bash
# Install dependencies
npm install

# Start Metro bundler
npm start

# In a separate terminal:
npm run ios     # Run on iOS Simulator
npm run android # Run on Android Emulator
```

### 6.3. Modifying Match Algorithms & SQL Procedures
When updating the 70/30 matching logic:
1. Edit [`express/schema_hybrid_matching.sql`](file:///Users/emiryarici/Desktop/projects/vibiy/express/schema_hybrid_matching.sql).
2. Execute the migration in the Supabase SQL Editor.
3. Test candidate matching directly via `GET /api/matches/candidates`.

### 6.4. Changing App Aesthetics
To adjust color schemes or typography across the entire application:
1. Open [`src/shared/themeConfig.ts`](file:///Users/emiryarici/Desktop/projects/vibiy/src/shared/themeConfig.ts).
2. Set `ACTIVE_THEME` to any of the predefined themes or add custom tokens.
3. All components consuming `useTheme()` or `theme` tokens will automatically reflect the change.
