# Vibiy Express Backend & Reels Scraper

This folder contains the custom Express.js backend API and a standalone Python-based Instagram Reels/Post scraper that extracts metadata (captions, images, video streams) without requiring a login.

## Features

- **Auth Verification**: Verifies incoming client requests securely using Supabase JWT tokens (`supabase.auth.getUser()`).
- **Gemini Embeddings**: Automatically generates 768-dimensional text embeddings for Reel captions using Gemini's `text-embedding-004` model, then pads it to 3072 dimensions to match your Supabase pgvector database index automatically (no migrations required).
- **Thumbnail Proxy**: Bypasses Instagram's aggressive CORS and hotlinking blocks by scraping the cover image URL server-side and streaming it directly to the React Native app.
- **Standalone Downloader**: Can be run from the command line to download individual reels or a list of reels from a text file.

---

## Setup & Installation

### 1. Configure Python Virtual Environment
To bypass macOS PEP 668 restrictions and keep your system clean, create a local Python virtual environment inside this folder:

```bash
# Create the virtual environment
python3 -m venv venv

# Install the dependencies
./venv/bin/pip install curl-cffi parsel
```

### 2. Configure Node.js Backend
Install the Node.js packages for the Express server:

```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root of the `express/` directory (a template has already been created for you):

```env
PORT=3000
SUPABASE_URL=https://your-supabase-url.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-google-gemini-api-key
```

*Note: If `GEMINI_API_KEY` is left blank, generated video embeddings will default to `null` to prevent crashes.*

---

## Running the Backend

### Start Server
To start the Express server locally:

```bash
npm start
```
The server will start listening on `http://localhost:3000`.

---

## Standalone Scraper CLI Usage

You can also use the scraper script directly using the virtual environment's Python binary:

### 1. Query Metadata as JSON
Returns direct CDN media URLs and summaries:
```bash
./venv/bin/python scraper.py "https://www.instagram.com/reel/DPNLrqlDaxV/" --json
```

### 2. Download a Single Reel
Downloads the `.mp4` file directly to a local `downloads/` folder:
```bash
./venv/bin/python scraper.py "https://www.instagram.com/reel/DPNLrqlDaxV/"
```

### 3. Bulk Download Reels from a Text File
Create a text file (e.g., `urls.txt`) containing one Instagram Reel URL per line:
```bash
./venv/bin/python scraper.py urls.txt
```
The script will iterate through the list and download all videos sequentially to the `downloads/` folder.
