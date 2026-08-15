# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users
Gen-Z and young adults who are heavy consumers of short-form video content (Instagram/TikTok) and are looking for dating or social connections. They want to connect over real daily humor, aesthetic taste, and culture rather than swiping based on static bios and superficial photos.

## Product Purpose
Vibiy is a video-first dating and social connection mobile application that computes compatibility from shared Instagram Reels and short-form videos. It exists to remove swiping burnout and create meaningful, explainable connections. Success means high daily active engagement (DAU), active conversation rates, and higher satisfaction from match interactions.

## Positioning
Unlike traditional dating apps, Vibiy matches users based on their active daily media consumption. It uses a 70/30 Hybrid Vector matching algorithm (70% weight on daily/recent mood, 30% weight on core persona vector) to curate a daily drop of at most 3 highly relevant connections categorized under distinct archetypes (Twin Flame, Good Chemistry, Opposites Attract).

## Operating Context
Users interact with Vibiy on their mobile phones (prioritizing iOS). They submit video URLs from Instagram to build their taste profile, view daily curated match drops, and converse in realtime chat rooms where they can quote and share Reels. The matching also strictly filters by location (PostGIS 50km radius) and mutual preferences.

## Capabilities and Constraints
- **Reel Ingestion**: Express backend processes URLs, scrapes captions and thumbnails via Python/yt-dlp, and stores them in Supabase bucket.
- **AI Vector Embeddings**: Gemini API generates 768-dimensional semantic embeddings for humor and taste analysis.
- **Proximity Search**: PostGIS filters matches within a 50 km radius.
- **pgvector Cosine Distance**: Database-level hybrid 70/30 vector compatibility logic.
- **Match Archetypes**: Lucide-badged Twin Flame (>=75%), Good Chemistry (50-74%), Opposites Attract (<50%).
- **Realtime Chat**: Supabase realtime messaging channels with in-chat Reel sharing.
- **Push Notifications**: Firebase Cloud Messaging (FCM) webhook receiver.
- **Daily Sharing Rule**: Users must share 3 videos to unlock tomorrow's match drop.
- **iOS First**: Strict design compliance with iOS Safe Area, HIG navigation (Tab bar, sheets, system navigation), and SF Symbols.

## Brand Commitments
- **Name**: Vibiy
- **Themes**: Rojo (Crimson/Amber), Pear (Lime/Indigo), Pastel, Midnight (Dark). Switched dynamically via `src/shared/themeConfig.ts`.
- **Identity Constraints**: High rounded card radius (28px), frosted glass elements, and floating tab navigation.
- **Primary Asset**: `vibiy_app_icon.png`.

## Evidence on Hand
- React Native CLI mobile project with Supabase Auth, React Query, and Navigation.
- Express API server under `/express` with Python scraper (`scraper.py`) and schema SQL (`schema_hybrid_matching.sql`).

## Product Principles
1. **Taste Over Resume**: Let humor and aesthetics (videos) reveal personality, not curated text bios.
2. **Quality Curation**: Restrict options to a daily drop of 3 matches to combat user fatigue.
3. **Conversational Sparks**: Categorize matches into clear archetypes (e.g., Twin Flame, Opposites Attract) to give immediate context and icebreakers.
4. **Active Contribution**: Require continuous daily sharing (3-video goal) to maintain fresh profiles and active matching state.

## Accessibility & Inclusion
- Strict bidirectional gender and sexual preference filters (man, woman, everyone).
- Dynamic Type support to match iOS text sizing preferences.
- Standard touch target sizes (44x44 pt minimum) and clean text-to-background contrast across all four themes.
