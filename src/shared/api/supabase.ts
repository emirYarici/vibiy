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
export const uploadProfilePhoto = async (
  userId: string,
  imageUri: string,
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  if (!isSupabaseConfigured) {
    // Demo Mode simulation delay
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    return imageUri; // Return local path for instant visual feedback in profile grid
  }

  try {
    const fileExtension = mimeType.split('/')[1] || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExtension}`;
    
    // Prepare FormData for file upload
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: mimeType,
    } as any);

    const { data, error } = await supabase.storage
      .from('profiles')
      .upload(fileName, formData, {
        cacheControl: '3600',
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
