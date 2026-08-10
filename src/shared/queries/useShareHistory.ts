import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../api/supabase';
import { ShareHistoryItem } from '../types';
import { CONFIG } from '../config';

export const SHARE_QUERY_KEYS = {
  all: ['share_history'] as const,
  user: (userId?: string) => ['share_history', userId || 'demo'] as const,
};

export const isSameDay = (dateStr?: string) => {
  if (!dateStr) return true;
  const itemDate = new Date(dateStr);
  const today = new Date();
  return (
    itemDate.getDate() === today.getDate() &&
    itemDate.getMonth() === today.getMonth() &&
    itemDate.getFullYear() === today.getFullYear()
  );
};

export async function fetchUserShareHistory(userId?: string, isDemoMode = false): Promise<ShareHistoryItem[]> {
  try {
    if (userId && !isDemoMode && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('userid_videos')
        .select(`
          id,
          created_at,
          videos (
            id,
            url,
            summary,
            username,
            thumbnail_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const dbHistory: ShareHistoryItem[] = data
          .filter((item: any) => item.videos !== null)
          .map((item: any) => {
            const video = item.videos;
            const url = video.url;

            let type: 'post' | 'reel' | 'other' = 'other';
            let shortcode = 'N/A';
            if (url.includes('/p/')) {
              type = 'post';
              const parts = url.split('/p/');
              if (parts[1]) shortcode = parts[1].split('/')[0] || 'N/A';
            } else if (url.includes('/reel/')) {
              type = 'reel';
              const parts = url.split('/reel/');
              if (parts[1]) shortcode = parts[1].split('/')[0] || 'N/A';
            }

            const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return {
              id: video.id || item.id,
              url,
              timestamp: timeStr,
              type,
              shortcode,
              summary: video.summary || undefined,
              username: video.username || undefined,
              thumbnail_url: video.thumbnail_url || undefined,
              created_at: item.created_at,
            };
          });

        await AsyncStorage.setItem('@share_history', JSON.stringify(dbHistory));
        return dbHistory;
      }
    }

    // Fallback to local storage
    const cached = await AsyncStorage.getItem('@share_history');
    return cached ? JSON.parse(cached) : [];
  } catch (err) {
    console.error('fetchUserShareHistory error:', err);
    const cached = await AsyncStorage.getItem('@share_history');
    return cached ? JSON.parse(cached) : [];
  }
}

export function useShareHistoryQuery(userId?: string, isDemoMode = false) {
  const query = useQuery({
    queryKey: SHARE_QUERY_KEYS.user(userId),
    queryFn: () => fetchUserShareHistory(userId, isDemoMode),
    staleTime: 1000 * 60 * 2, // 2 mins cache
  });

  const history = query.data || [];
  const todayItems = history.filter((item) => isSameDay(item.created_at));
  const todayCount = todayItems.length;
  const targetVideos = 3;
  const isDropUnlocked = todayCount >= targetVideos;
  const progressPercent = Math.min((todayCount / targetVideos) * 100, 100);

  return {
    ...query,
    history,
    todayItems,
    todayCount,
    targetVideos,
    isDropUnlocked,
    progressPercent,
  };
}

export function useProcessVideoMutation(session?: any) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      let type: 'post' | 'reel' | 'other' = 'other';
      let shortcode = 'N/A';

      if (url.includes('/p/')) {
        type = 'post';
        const parts = url.split('/p/');
        if (parts[1]) shortcode = parts[1].split('/')[0] || 'N/A';
      } else if (url.includes('/reel/')) {
        type = 'reel';
        const parts = url.split('/reel/');
        if (parts[1]) shortcode = parts[1].split('/')[0] || 'N/A';
      }

      const baseUrl = CONFIG.API_BASE_URL;
      const requestBody = {
        url,
        type,
        shortcode,
        userId: session?.user?.id,
        auth_id: session?.user?.id,
      };

      const response = await fetch(`${baseUrl}/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'bypass-tunnel-reminder': 'true',
          'User-Agent': 'VibiyApp/1.0',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let serverErrorMsg = `Server returned ${response.status}: ${response.statusText}`;
        try {
          const errBody = await response.json();
          if (errBody && errBody.error) serverErrorMsg = errBody.error;
        } catch (_) {}
        throw new Error(serverErrorMsg);
      }

      const responseData = await response.json();
      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to process video vector.');
      }

      return {
        responseData,
        url,
        type,
        shortcode,
      };
    },
    onSuccess: async (result) => {
      // Invalidate query to trigger seamless background refetch from Supabase
      await queryClient.invalidateQueries({
        queryKey: SHARE_QUERY_KEYS.user(session?.user?.id),
      });
    },
  });
}
