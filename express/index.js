const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
 * Helper to generate 768-dim Gemini embedding and pad with 0s to 3072 dimensions
 */
async function generatePaddedEmbedding(text) {
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    if (Array.isArray(embedding)) {
      // Pad to exactly 3072 dimensions to match Supabase pgvector column definition
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
    // 1. Check if video already exists in supabase FIRST (before scraping)
    let existingVideo = null;
    let selectError = null;
    let hasNewColumns = true;

    try {
      const response = await supabase
        .from('videos')
        .select('id, url, summary, username, thumbnail_url')
        .or(`url.eq.${cleanUrl},url.eq.${cleanUrl}/`)
        .maybeSingle();
      
      existingVideo = response.data;
      selectError = response.error;

      if (selectError && selectError.message && (selectError.message.includes('column') || selectError.code === 'PGRST204')) {
        console.warn('⚠️ New columns (username/thumbnail_url) do not exist yet. Falling back to legacy query.');
        hasNewColumns = false;
        const fallbackResponse = await supabase
          .from('videos')
          .select('id, url, summary')
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
      console.log(`🚀 Video already exists in DB with ID: ${videoId}. Skipping scraper.`);
    } else {
      console.log('Video is new. Scraping details and generating embedding...');
      
      // 2. Scrape details using Python scraper
      const scraperOutput = await runScraper(url);
      const data = JSON.parse(scraperOutput);

      if (!data.success) {
        return res.status(400).json({ success: false, error: data.error || 'Failed to scrape video.' });
      }

      finalSummary = data.summary || 'Instagram Reel';
      finalUsername = data.username || null;
      
      // 3. Download and upload thumbnail to Supabase Storage if available
      if (data.thumbnail_url && hasNewColumns) {
        try {
          console.log(`Downloading thumbnail from: ${data.thumbnail_url}`);
          const imageRes = await axios.get(data.thumbnail_url, {
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
            finalThumbnailUrl = data.thumbnail_url; // Fallback to raw CDN URL
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('reels')
              .getPublicUrl(storagePath);
            finalThumbnailUrl = publicUrl;
            console.log(`✅ Permanent thumbnail URL: ${finalThumbnailUrl}`);
          }
        } catch (err) {
          console.warn('⚠️ Failed to store thumbnail to Supabase storage, using raw URL:', err.message);
          finalThumbnailUrl = data.thumbnail_url;
        }
      } else {
        finalThumbnailUrl = data.thumbnail_url || null;
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
        .insert(insertData)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
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

  try {
    // Scrape live to get fresh CDN image URL (avoiding expiration tokens)
    const scraperOutput = await runScraper(url);
    const data = JSON.parse(scraperOutput);

    if (data.success && data.thumbnail_url) {
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

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Vibiy Express Backend running on port ${PORT}`);
});
