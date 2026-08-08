# Testing the Instagram Share Flow with ngrok

This guide explains how to expose your local Express backend using **ngrok** and test the Instagram Reels/Posts share flow on a physical device or simulator.

---

## Prerequisites

1. **ngrok installed**: If you don't have ngrok installed, you can install it using Homebrew on macOS:
   ```bash
   brew install ngrok/ngrok/ngrok
   ```
   Or download it from the [official ngrok website](https://ngrok.com/download).
2. **ngrok Account**: You will need a free ngrok account. Connect your agent token by running:
   ```bash
   ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
   ```
3. **Backend Configuration**: Ensure you have configured the environment variables in `express/.env` (specifically `SUPABASE_URL` and `SUPABASE_ANON_KEY`).

---

## Step-by-Step Setup

### Step 1: Start the Local Express Backend

Open a terminal window and navigate to the `express/` folder of the project to start the server:

```bash
# Navigate to the express directory
cd express

# Install dependencies if you haven't already
npm install

# Start the server (runs on port 3000 by default)
npm start
```

You should see output similar to:
```text
✅ Supabase client initialized.
✅ Gemini AI client initialized.
🚀 Server running on port 3000
```

---

### Step 2: Start the ngrok Tunnel

Open a **new terminal window** (keep the backend server running in the first one) and tunnel port `3000`:

```bash
ngrok http 3000
```

ngrok will launch and display a console dashboard. Look for the **Forwarding** URL (it starts with `https://`):

```text
Forwarding      https://a1b2-34-56-78-90.ngrok-free.app -> http://localhost:3000
```

Copy this HTTPS URL (e.g., `https://a1b2-34-56-78-90.ngrok-free.app`).

---

### Step 3: Update React Native Configuration

In your React Native codebase, you need to point the app to the newly created ngrok tunnel.

1. Open the configuration file: [src/shared/config.ts](file:///Users/emiryarici/Desktop/projects/vibiy/src/shared/config.ts)
2. Replace the `API_BASE_URL` with your copied ngrok URL:

```typescript
export const CONFIG = {
  // Replace the old localtunnel url with your new ngrok tunnel URL
  API_BASE_URL: 'https://a1b2-34-56-78-90.ngrok-free.app', 
};
```

---

### Step 4: Run the React Native App

Start your Metro Bundler and launch the iOS or Android simulator (or physical device):

```bash
# Term 1: Start Metro
npm start

# Term 2: Run iOS Simulator
npm run ios

# OR Run Android Emulator
npm run android
```

---

### Step 5: Test the Instagram Share Flow

1. **Copy an Instagram URL**:
   - Open the **Instagram** app (on your phone or inside the simulator).
   - Find a public **Reel** or **Post**.
   - Tap the **Share** button and select **Copy Link** (e.g., `https://www.instagram.com/reel/C8rXa-vMx72/`).
2. **Open Vibiy App**:
   - Navigate to the **Share** page (the share tab in the bottom bar).
3. **Paste & Process**:
   - Tap the **Paste** button to retrieve the link from your clipboard (or type/paste it manually).
   - Tap **Process Instagram URL**.
4. **Observe the Flow**:
   - **App Side**: The button text should change to `Processing...`. Once completed, you should see a success alert and the Reel metadata (Title/Summary, Author Username, and Cover Thumbnail) rendered on the card below.
   - **Backend Terminal**: You will see active logs representing the scraping and embedding pipeline:
     ```text
     Processing video url: https://www.instagram.com/reel/C8rXa-vMx72 for user: ...
     Downloading thumbnail from: https://scontent.cdninstagram.com/...
     Uploading thumbnail to Supabase Storage bucket 'reels'...
     ✅ Permanent thumbnail URL: https://...
     ```

---

## Troubleshooting & Critical Gotchas

### ⚠️ Gotcha 1: The ngrok Browser Warning Page (Crucial)
Free tier ngrok accounts display a warning page ("*You are about to visit...*") when an HTTP request is made by a standard web client.
- **For API requests (`POST /api/process-video`)**: The React Native app's request header includes a custom User-Agent `VibiyApp/1.0` which bypasses this warning automatically.
- **For Proxied Images (`GET /api/thumbnail`)**: React Native's `<Image>` component fetches thumbnails from `/api/thumbnail?url=...`. If these fail to load:
  1. Open your browser on the simulator or testing device.
  2. Visit your ngrok URL directly (e.g., `https://a1b2-34-56-78-90.ngrok-free.app`).
  3. Click the **Visit Site** or **Accept** button on the ngrok warning landing page.
  4. This sets a cookie in the device's system browser session, allowing React Native's image components to fetch resources through the tunnel without being blocked.

### ⚠️ Gotcha 2: Scraper Python environment (`venv`)
If the backend returns an error during the processing stage:
- Ensure the Python dependencies are properly installed in the Express directory's virtual environment:
  ```bash
  cd express
  ./venv/bin/pip install curl-cffi parsel
  ```
- If the virtual environment does not exist, build it:
  ```bash
  python3 -m venv venv
  ./venv/bin/pip install curl-cffi parsel
  ```

### ⚠️ Gotcha 3: Missing Gemini Embeddings
If you process an Instagram video and notice the similarity matcher is not calculating distances or the console logs warn about embeddings:
- Make sure you have set a valid `GEMINI_API_KEY` in `express/.env`. Without it, embeddings default to `null`.
