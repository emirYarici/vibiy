const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');
const { initializeApp: initFirebaseApp, cert } = require('firebase-admin/app');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initFirebaseApp({
      credential: cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized from serviceAccountKey.json');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initFirebaseApp({
      credential: cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT env');
  } else {
    console.warn(
      '⚠️ Firebase Admin not initialized: Please place serviceAccountKey.json in the express/ directory or set FIREBASE_SERVICE_ACCOUNT in .env'
    );
  }
} catch (err) {
  console.error('❌ Error initializing Firebase Admin SDK:', err.message);
}

// Enable CORS so the React Native client can talk to the backend
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase URL or Anon Key in env.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Gemini AI (if key is provided)
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('✅ Gemini AI client initialized.');
} else {
  console.warn('⚠️ GEMINI_API_KEY is not set. Embeddings will default to NULL.');
}

/**
 * Middleware to authenticate requests using Supabase session token
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  try {
    // Verify user identity with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, error: 'Internal Auth Error' });
  }
}

/**
 * Helper to run the python scraper
 */
function runScraper(url) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'scraper.py');
    const venvPythonPath = path.join(__dirname, 'venv', 'bin', 'python');
    
    // Call the venv Python binary first, fallback to python3/python if not present
    execFile(venvPythonPath, [scriptPath, url, '--json'], (error, stdout, stderr) => {
      if (error) {
        execFile('python3', [scriptPath, url, '--json'], (error2, stdout2, stderr2) => {
          if (error2) {
            execFile('python', [scriptPath, url, '--json'], (error3, stdout3, stderr3) => {
              if (error3) {
                reject(new Error(stderr3 || stderr2 || stderr || error3.message));
              } else {
                resolve(stdout3);
              }
            });
          } else {
            resolve(stdout2);
          }
        });
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Helper to generate a clean AI summary using Gemini
 */
async function generateAiSummary(rawCaption) {
  if (!genAI || !rawCaption || rawCaption.trim() === '' || rawCaption === 'Instagram Reel') {
    return rawCaption || 'Instagram Reel';
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const prompt = `You are an AI assistant for a social media matching and companion app.
Analyze the following Instagram Reel caption / text and produce a concise, high-quality 1-2 sentence description summarizing the topic, content, and vibe.
Do NOT include hashtags, engagement bait, or emojis spam. Output ONLY the clean summary text in the primary language of the content.

Raw caption:
"""
${rawCaption}
"""

Clean Summary:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();
    return summary || rawCaption;
  } catch (err) {
    console.error('Error generating Gemini AI summary:', err.message);
    return rawCaption;
  }
}

/**
 * Helper to generate 3072-dim Gemini multimodal embedding
 */
async function generatePaddedEmbedding(text) {
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    if (Array.isArray(embedding)) {
      if (embedding.length === 3072) {
        return embedding;
      }
      // Fallback padding if needed
      const padded = new Array(3072).fill(0.0);
      for (let i = 0; i < Math.min(embedding.length, 3072); i++) {
        padded[i] = embedding[i];
      }
      return padded;
    }
  } catch (err) {
    console.error('Error generating Gemini embedding:', err);
  }
  return null;
}

/**
 * POST /api/process-video
 * Scrapes Reels, generates embeddings, and stores in Supabase
 */
app.post('/api/process-video', authenticateToken, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'Instagram URL is required' });
  }

  // Normalize URL (strip query parameters and trailing slash)
  let cleanUrl = url.split('?')[0];
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }

  console.log(`Processing video url: ${cleanUrl} (original: ${url}) for user: ${req.user.id}`);

  try {
    // 0. Enforce Daily Limit: Maximum 3 videos per day per user
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { count: dailyCount, error: countError } = await supabase
      .from('userid_videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', startOfDay.toISOString());

    if (countError) {
      console.warn('⚠️ Error checking daily limit count:', countError.message);
    } else if (dailyCount !== null && dailyCount >= 3) {
      // Check if user already linked this exact video previously
      let alreadyLinked = false;
      const { data: existingVideoRecord } = await supabase
        .from('videos')
        .select('id')
        .or(`url.eq.${cleanUrl},url.eq.${cleanUrl}/`)
        .maybeSingle();

      if (existingVideoRecord) {
        const { data: linkRecord } = await supabase
          .from('userid_videos')
          .select('id')
          .eq('user_id', req.user.id)
          .eq('video_id', existingVideoRecord.id)
          .maybeSingle();
        if (linkRecord) {
          alreadyLinked = true;
        }
      }

      if (!alreadyLinked) {
        console.warn(`⛔ User ${req.user.id} reached daily limit (${dailyCount}/3 videos today).`);
        return res.status(429).json({
          success: false,
          error: 'Daily limit reached! You can only share up to 3 videos per day.',
          dailyLimit: 3,
          currentCount: dailyCount
        });
      }
    }

    // 1. Check if video already exists in supabase FIRST (before scraping)
    let existingVideo = null;
    let selectError = null;
    let hasNewColumns = true;

    try {
      const response = await supabase
        .from('videos')
        .select('id, url, summary, username, thumbnail_url, embedding')
        .or(`url.eq.${cleanUrl},url.eq.${cleanUrl}/`)
        .maybeSingle();
      
      existingVideo = response.data;
      selectError = response.error;

      if (selectError && selectError.message && (selectError.message.includes('column') || selectError.code === 'PGRST204')) {
        console.warn('⚠️ New columns (username/thumbnail_url) do not exist yet. Falling back to legacy query.');
        hasNewColumns = false;
        const fallbackResponse = await supabase
          .from('videos')
          .select('id, url, summary, embedding')
          .or(`url.eq.${cleanUrl},url.eq.${cleanUrl}/`)
          .maybeSingle();
        existingVideo = fallbackResponse.data;
        selectError = fallbackResponse.error;
      }
    } catch (err) {
      console.error('Error selecting existing video:', err);
    }

    if (selectError) {
      throw selectError;
    }

    let videoId;
    let finalSummary = '';
    let finalUsername = null;
    let finalThumbnailUrl = null;

    if (existingVideo) {
      videoId = existingVideo.id;
      finalSummary = existingVideo.summary || 'Instagram Reel';
      finalUsername = existingVideo.username || null;
      finalThumbnailUrl = existingVideo.thumbnail_url || null;
      console.log(`🚀 Video already exists in DB with ID: ${videoId}.`);

      // If thumbnail is missing or not yet uploaded to Supabase Storage, backfill it now!
      const isStoredInSupabase = finalThumbnailUrl && (
        finalThumbnailUrl.includes('supabase.co/storage') ||
        finalThumbnailUrl.includes('/storage/v1/object/public/')
      );

      if (!isStoredInSupabase && hasNewColumns) {
        try {
          const shortcodeMatch = cleanUrl.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
          const shortcode = shortcodeMatch ? shortcodeMatch[1] : `temp_${Date.now()}`;
          const storagePath = `${shortcode}.jpg`;
          const rawUrl = `${cleanUrl}/media/?size=l`;

          console.log(`Backfilling missing thumbnail to Supabase Storage: ${storagePath}`);
          const imageRes = await axios.get(rawUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Referer': 'https://www.instagram.com/'
            }
          });

          const buffer = Buffer.from(imageRes.data);
          const { error: uploadError } = await supabase.storage
            .from('reels')
            .upload(storagePath, buffer, {
              contentType: imageRes.headers['content-type'] || 'image/jpeg',
              upsert: true
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('reels')
              .getPublicUrl(storagePath);
            finalThumbnailUrl = publicUrl;
            await supabase
              .from('videos')
              .update({ thumbnail_url: publicUrl })
              .eq('id', videoId);
            console.log(`✅ Backfilled permanent thumbnail URL to DB: ${publicUrl}`);
          }
        } catch (err) {
          console.warn('⚠️ Backfill thumbnail to Supabase storage failed:', err.message);
        }
      }

      // If embedding was missing or summary needs AI processing, update it now
      if (!existingVideo.embedding && genAI) {
        console.log('Generating missing AI summary and embedding for existing video...');
        finalSummary = await generateAiSummary(existingVideo.summary);
        const newEmbedding = await generatePaddedEmbedding(finalSummary);
        if (newEmbedding) {
          await supabase
            .from('videos')
            .update({ summary: finalSummary, embedding: newEmbedding })
            .eq('id', videoId);
          console.log('✅ Updated existing video with AI summary and embedding.');
        }
      }
    } else {
      console.log('Video is new. Processing details and generating embedding...');
      
      const clientMetadata = req.body.clientMetadata;
      let rawSummary = 'Instagram Reel';
      let rawThumbnailUrl = null;
      let usernameCandidate = null;

      if (clientMetadata && (clientMetadata.thumbnail_url || clientMetadata.summary || clientMetadata.username)) {
        console.log('📱 Using client-extracted metadata (bypassing server scraper/proxy limits)...');
        rawSummary = clientMetadata.summary || 'Instagram Reel';
        rawThumbnailUrl = clientMetadata.thumbnail_url || null;
        usernameCandidate = clientMetadata.username || null;
      } else {
        console.log('🕷️ Client metadata not present. Running server Python scraper fallback...');
        const scraperOutput = await runScraper(url);
        const data = JSON.parse(scraperOutput);

        if (!data.success) {
          return res.status(400).json({ success: false, error: data.error || 'Failed to scrape video.' });
        }

        rawSummary = data.summary || 'Instagram Reel';
        rawThumbnailUrl = data.thumbnail_url || null;
        usernameCandidate = data.username || null;
      }

      console.log(`Raw caption: "${rawSummary}"`);

      // Generate AI Summary with Gemini
      finalSummary = await generateAiSummary(rawSummary);
      console.log(`✨ Gemini AI Summary: "${finalSummary}"`);
      
      finalUsername = usernameCandidate;
      
      // 3. Download and upload thumbnail to Supabase Storage if available
      if (!rawThumbnailUrl) {
        const baseUrl = cleanUrl.split('?')[0];
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        rawThumbnailUrl = `${cleanBase}media/?size=l`;
      }

      if (rawThumbnailUrl && hasNewColumns) {
        try {
          console.log(`Downloading thumbnail from CDN: ${rawThumbnailUrl}`);
          const imageRes = await axios.get(rawThumbnailUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Referer': 'https://www.instagram.com/'
            }
          });
          
          const buffer = Buffer.from(imageRes.data);
          const shortcodeMatch = cleanUrl.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
          const shortcode = shortcodeMatch ? shortcodeMatch[1] : `temp_${Date.now()}`;
          const storagePath = `${shortcode}.jpg`;

          console.log(`Uploading thumbnail to Supabase Storage bucket 'reels': ${storagePath}`);
          const { error: uploadError } = await supabase.storage
            .from('reels')
            .upload(storagePath, buffer, {
              contentType: imageRes.headers['content-type'] || 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.warn('⚠️ Supabase Storage upload error:', uploadError.message);
            finalThumbnailUrl = rawThumbnailUrl; // Fallback to raw CDN URL
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('reels')
              .getPublicUrl(storagePath);
            finalThumbnailUrl = publicUrl;
            console.log(`✅ Permanent thumbnail URL saved to Supabase storage: ${finalThumbnailUrl}`);
          }
        } catch (err) {
          console.warn('⚠️ Failed to store thumbnail to Supabase storage, using direct media URL fallback:', err.message);
          finalThumbnailUrl = rawThumbnailUrl;
        }
      } else {
        finalThumbnailUrl = rawThumbnailUrl;
      }

      // 4. Generate Gemini vector embedding with 3072 padding
      const embedding = await generatePaddedEmbedding(finalSummary);

      // 5. Save video to public.videos
      const insertData = {
        url: cleanUrl,
        summary: finalSummary,
        embedding: embedding
      };

      if (hasNewColumns) {
        insertData.username = finalUsername;
        insertData.thumbnail_url = finalThumbnailUrl;
      }

      const { data: newVideo, error: insertError } = await supabase
        .from('videos')
        .insert([insertData])
        .select()
        .single();

      if (insertError) {
        console.error('Supabase video insert error:', insertError);
        return res.status(500).json({ success: false, error: 'Database insert failed' });
      }
      videoId = newVideo.id;
      console.log(`Saved new video with ID: ${videoId}`);
    }

    // 6. Connect video to user in userid_videos
    const { data: existingLink, error: linkSelectError } = await supabase
      .from('userid_videos')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('video_id', videoId)
      .maybeSingle();

    if (linkSelectError) {
      throw linkSelectError;
    }

    if (!existingLink) {
      const { error: linkInsertError } = await supabase
        .from('userid_videos')
        .insert({
          user_id: req.user.id,
          video_id: videoId
        });

      if (linkInsertError) {
        throw linkInsertError;
      }
      console.log(`Linked video ${videoId} to user ${req.user.id}`);
    }

    return res.json({
      success: true,
      id: videoId,
      status: 'completed',
      summary: finalSummary,
      username: finalUsername,
      thumbnail_url: finalThumbnailUrl
    });

  } catch (error) {
    console.error('Error processing shared video:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

/**
 * GET /api/thumbnail
 * Scrapes the Reel and proxies the direct CDN image stream to the client
 */
app.get('/api/thumbnail', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('URL query parameter is required');
  }

  console.log('[EXPRESS_THUMBNAIL_REQ] Fetching thumbnail for URL:', url);
  try {
    // Scrape live to get fresh CDN image URL (avoiding expiration tokens)
    const scraperOutput = await runScraper(url);
    const data = JSON.parse(scraperOutput);

    if (data.success && data.thumbnail_url) {
      console.log('[EXPRESS_THUMBNAIL_SUCCESS] Proxying Instagram CDN stream:', data.thumbnail_url);
      // Fetch the image from Facebook/Instagram CDN as a stream
      const response = await axios.get(data.thumbnail_url, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.instagram.com/'
        }
      });

      // Stream the image content type and data directly to React Native client
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      response.data.pipe(res);
    } else {
      // Fallback redirect if scrape fails
      const baseUrl = url.split('?')[0];
      const cleanUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      res.redirect(`${cleanUrl}media/?size=m`);
    }
  } catch (error) {
    console.error('Thumbnail proxy failed:', error.message);
    res.status(500).send('Failed to fetch thumbnail image.');
  }
});

// ==========================================
// MATCHING API (Supabase PL/pgSQL Stored Procedures)
// ==========================================

/**
 * GET /api/matches/candidates
 * Finds top nearby candidates using 70/30 Hybrid Vector Matching:
 *  - 70% Spontaneous Daily Mood (last 3 videos)
 *  - 30% Rolling Core Persona (last 20 videos)
 * Leverages PostGIS GiST geo-indexing and pgvector cosine distance directly in PostgreSQL
 */
app.get('/api/matches/candidates', authenticateToken, async (req, res) => {
  const maxDistance = parseFloat(req.query.maxDistance || 50000); // 50 km default
  const minSimilarity = parseFloat(req.query.minSimilarity || 0.50); // 50% minimum vibe threshold
  const limit = parseInt(req.query.limit || 3, 10); // Top 3 matches per user

  try {
    const { data: candidates, error } = await supabase.rpc('find_vibe_matches_for_user', {
      p_user_id: req.user.id,
      p_max_distance_meters: maxDistance,
      p_similarity_threshold: minSimilarity,
      p_match_limit: limit
    });

    if (error) {
      console.error('Supabase RPC find_vibe_matches_for_user error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      candidates: candidates || []
    });

  } catch (err) {
    console.error('Error finding vibe match candidates:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
});

/**
 * POST /api/matches/generate-daily-batch
 * Automated batch matching engine for daily drops (cron jobs / admin trigger)
 * Evaluates all user pairs with 70% Mood + 30% Core Persona hybrid scoring (>=50% vibe threshold)
 */
app.post('/api/matches/generate-daily-batch', async (req, res) => {
  const maxDistance = parseFloat(req.body.maxDistance || 50000); // 50 km default
  const minSimilarity = parseFloat(req.body.minSimilarity || 0.50); // 50% minimum vibe threshold

  try {
    console.log('🔄 Running database-native daily vibe matching batch (50% threshold, max 3 per user)...');

    const { data: newMatchesCount, error } = await supabase.rpc('generate_daily_matches', {
      p_max_distance_meters: maxDistance,
      p_min_similarity: minSimilarity
    });

    if (error) {
      console.error('Supabase RPC generate_daily_matches error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`🎉 Daily batch completed! ${newMatchesCount} new match(es) created.`);
    return res.json({
      success: true,
      newMatchesCreated: newMatchesCount || 0
    });

  } catch (err) {
    console.error('Error running daily batch matching:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  }
});

/**
 * ==============================================================================
 * POST /api/webhooks/supabase-message
 * ==============================================================================
 * Triggered automatically by Supabase Database Webhook when a new message is inserted
 * into the `public.messages` table.
 *
 * It looks up the recipient's FCM device token and delivers a Push Notification
 * via Firebase Cloud Messaging (FCM).
 */
app.post('/api/webhooks/supabase-message', async (req, res) => {
  try {
    console.log('📩 [Supabase Webhook] Received message event:', JSON.stringify(req.body, null, 2));

    // Optional webhook secret verification if configured
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = req.headers['x-webhook-secret'] || req.headers['authorization'];
      if (incomingSecret !== webhookSecret && incomingSecret !== `Bearer ${webhookSecret}`) {
        console.warn('⛔ Unauthorized Supabase webhook attempt.');
        return res.status(401).json({ success: false, error: 'Unauthorized webhook secret' });
      }
    }

    // Extract message record (supports Supabase webhook format and direct test calls)
    const record = req.body.record || req.body;
    const { id: messageId, match_id: matchId, sender_id: senderId, content } = record;

    if (!matchId || !senderId || !content) {
      console.warn('⚠️ Webhook missing required fields (match_id, sender_id, content).');
      return res.status(400).json({ success: false, error: 'Missing match_id, sender_id, or content' });
    }

    // 1. Fetch match record to identify recipient
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, user_a, user_b, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found for webhook notification:', matchError?.message);
      return res.status(404).json({ success: false, error: 'Match not found' });
    }

    // Identify recipient ID
    const recipientId = match.user_a === senderId ? match.user_b : match.user_a;

    // 2. Fetch sender profile (for notification title) and recipient profile (for FCM token)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, fcm_token')
      .in('id', [senderId, recipientId]);

    if (profilesError || !profiles) {
      console.error('❌ Error fetching profiles for notification:', profilesError?.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch user profiles' });
    }

    const senderProfile = profiles.find((p) => p.id === senderId);
    const recipientProfile = profiles.find((p) => p.id === recipientId);

    const senderName = senderProfile?.full_name || 'Someone';
    const recipientFcmToken = recipientProfile?.fcm_token;

    if (!recipientFcmToken) {
      console.log(`ℹ️ User ${recipientId} does not have an FCM token registered. Skipping push notification.`);
      return res.json({
        success: true,
        message: 'Recipient has no FCM token registered',
      });
    }

    // 3. Format message snippet for the notification banner
    let notificationBody = content;
    const reelMatch = content.match(/^(https?:\/\/(?:www\.)?instagram\.com\/\S+)\n\n([\s\S]*)$/);
    if (reelMatch) {
      const type = reelMatch[1].includes('/reel/') ? 'Reel' : 'Post';
      notificationBody = reelMatch[2] ? `🎬 Shared a ${type}: ${reelMatch[2]}` : `🎬 Shared an Instagram ${type}`;
    } else if (content.startsWith('http://') || content.startsWith('https://')) {
      notificationBody = '🎬 Shared a link with you';
    }

    // Limit notification body length
    if (notificationBody.length > 120) {
      notificationBody = notificationBody.substring(0, 117) + '...';
    }

    // 4. Send FCM Push Notification
    if (!firebaseInitialized) {
      console.warn('⚠️ Cannot send FCM push: Firebase Admin SDK is not initialized.');
      return res.json({
        success: true,
        message: 'Firebase Admin not initialized on server, notification skipped',
        debug: { senderName, recipientId, notificationBody },
      });
    }

    const fcmMessage = {
      token: recipientFcmToken,
      notification: {
        title: senderName,
        body: notificationBody,
      },
      data: {
        matchId: String(matchId),
        senderId: String(senderId),
        messageId: String(messageId || ''),
        type: 'chat_message',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'messages',
        },
      },
    };

    const fcmResponse = await admin.messaging().send(fcmMessage);
    console.log(`🚀 [FCM SUCCESS] Notification sent to ${recipientId} (${senderName}):`, fcmResponse);

    return res.json({
      success: true,
      message: 'Push notification delivered successfully',
      messageId: fcmResponse,
    });
  } catch (err) {
    console.error('❌ Error processing Supabase message webhook:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal Webhook Error' });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Vibiy Express Backend running on port ${PORT}`);
});

