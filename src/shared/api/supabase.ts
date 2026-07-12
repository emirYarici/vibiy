import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONFIGURATION ---
// Add your Supabase credentials here to connect to your live database.
// When left blank, the app runs in developer-friendly "Demo Mode" automatically.
export const SUPABASE_URL = 'https://hebhujwxosyirfjbmemz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlYmh1and4b3N5aXJmamJtZW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDczODcsImV4cCI6MjA5NzQyMzM4N30.LLjVqsBWpSfSbhgINAi8Mi9LxbLd12p9zGCaZkgCJu0';

export const isSupabaseConfigured = SUPABASE_URL.trim().length > 0 && SUPABASE_ANON_KEY.trim().length > 0;

// Initialize Client (uses placeholder values if unconfigured to prevent app startup crashes)
export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? SUPABASE_ANON_KEY : 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Uploads a profile photo from the device storage to Supabase Storage bucket 'profiles'.
 * If Supabase is unconfigured, it simulates a successful upload.
 * 
 * @param userId - Unique identifier of the user (e.g., supabase user ID).
 * @param imageUri - Local device URI of the selected photo.
 * @param mimeType - File MIME type.
 * @returns The public URL of the uploaded image (or simulated URL).
 */
// Pure JavaScript base64 to ArrayBuffer converter (essential for bare React Native uploads without file system packages)
function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  const len = standardBase64.length;
  let bufferLength = len * 0.75;
  
  if (standardBase64[len - 1] === '=') {
    bufferLength--;
    if (standardBase64[len - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);
  const lookup = new Uint8Array(256);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[standardBase64.charCodeAt(i)];
    const encoded2 = lookup[standardBase64.charCodeAt(i + 1)];
    const encoded3 = lookup[standardBase64.charCodeAt(i + 2)];
    const encoded4 = lookup[standardBase64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arrayBuffer;
}

/**
 * Uploads a profile photo from a base64 string to Supabase Storage bucket 'profiles'.
 * If Supabase is unconfigured, it simulates a successful upload.
 * 
 * @param userId - Unique identifier of the user (e.g., supabase user ID).
 * @param base64Data - Raw base64 string of the selected photo.
 * @param mimeType - File MIME type.
 * @returns The public URL of the uploaded image (or simulated URL).
 */
export const uploadProfilePhoto = async (
  userId: string,
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  if (!isSupabaseConfigured) {
    // Demo Mode simulation delay
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500';
  }

  try {
    const fileExtension = mimeType.split('/')[1] || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExtension}`;
    
    // Decode base64 data to ArrayBuffer
    const arrayBuffer = decodeBase64ToArrayBuffer(base64Data);

    const { error } = await supabase.storage
      .from('profiles')
      .upload(fileName, arrayBuffer, {
        cacheControl: '3600',
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Retrieve public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading profile photo to Supabase storage:', error);
    throw error;
  }
};
