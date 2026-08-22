import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../api/supabase';
import { DBProfile, MatchRecord, MessageRecord } from '../types';
import { DEMO_PROFILES, DEMO_MATCHES, DEFAULT_DEMO_MESSAGES } from '../mockData';

export const MATCHES_QUERY_KEYS = {
  all: (currentUserId: string) => ['matches', currentUserId] as const,
  score: (userA: string, userB: string) => ['match_score', userA, userB] as const,
};

export interface MatchesData {
  matches: MatchRecord[];
  profiles: Record<string, DBProfile>;
  messages: MessageRecord[];
}

export function useMatches(currentUserId: string, isDemoMode = false) {
  return useQuery({
    queryKey: MATCHES_QUERY_KEYS.all(currentUserId),
    queryFn: async (): Promise<MatchesData> => {
      if (!currentUserId) {
        return { matches: [], profiles: {}, messages: [] };
      }

      // Demo fallback
      if (isDemoMode || !isSupabaseConfigured) {
        const localMatches = await AsyncStorage.getItem('@demo_matches');
        const localMessages = await AsyncStorage.getItem('@demo_messages');

        const matches: MatchRecord[] = localMatches ? JSON.parse(localMatches) : DEMO_MATCHES;
        const messages: MessageRecord[] = localMessages ? JSON.parse(localMessages) : DEFAULT_DEMO_MESSAGES;

        if (!localMatches) {
          await AsyncStorage.setItem('@demo_matches', JSON.stringify(DEMO_MATCHES));
        }
        if (!localMessages) {
          await AsyncStorage.setItem('@demo_messages', JSON.stringify(DEFAULT_DEMO_MESSAGES));
        }

        const profiles: Record<string, DBProfile> = {};
        DEMO_PROFILES.forEach((p) => {
          profiles[p.id] = p;
        });

        return { matches, profiles, messages };
      }

      // Live Supabase query
      // 1. Fetch active matches
      const { data: dbMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)
        .eq('status', 'active');

      if (matchesError) throw matchesError;

      if (!dbMatches || dbMatches.length === 0) {
        return { matches: [], profiles: {}, messages: [] };
      }

      // 2. Fetch profiles of matched users
      const matchedIds = dbMatches.map((m) =>
        m.user_a === currentUserId ? m.user_b : m.user_a
      );

      const { data: dbProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, age, bio, photos')
        .in('id', matchedIds);

      if (profilesError) throw profilesError;

      const profiles: Record<string, DBProfile> = {};
      dbProfiles?.forEach((p: any) => {
        profiles[p.id] = {
          id: p.id,
          full_name: p.full_name || 'Anonymous',
          age: p.age || 18,
          bio: p.bio || '',
          photos: p.photos || [],
        };
      });

      // 3. Fetch messages for active matches
      const matchIds = dbMatches.map((m) => m.id);
      const { data: dbMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      return {
        matches: dbMatches,
        profiles,
        messages: dbMessages || [],
      };
    },
    enabled: !!currentUserId,
    staleTime: 0, // transient matches always requested/synced live
  });
}

export function useMatchScore(userA: string, userB: string, isDemoMode = false) {
  return useQuery({
    queryKey: MATCHES_QUERY_KEYS.score(userA, userB),
    queryFn: async (): Promise<number | null> => {
      if (!userA || !userB) return null;

      if (isDemoMode || !isSupabaseConfigured) {
        const match = DEMO_MATCHES.find(
          (m) => (m.user_a === userA && m.user_b === userB) || (m.user_a === userB && m.user_b === userA)
        );
        return match ? match.similarity_score : 0.85;
      }

      const { data, error } = await supabase
        .from('matches')
        .select('similarity_score')
        .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`) // fallback safely
        .maybeSingle();

      if (error) throw error;
      return data?.similarity_score ?? null;
    },
    enabled: !!userA && !!userB,
    staleTime: 0, // always fresh match score
  });
}

interface UnmatchParams {
  matchId: string;
  currentUserId: string;
  isDemoMode?: boolean;
}

export function useUnmatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, currentUserId, isDemoMode = false }: UnmatchParams) => {
      if (isDemoMode || !isSupabaseConfigured) {
        const localMatchesStr = await AsyncStorage.getItem('@demo_matches');
        const localMatches: MatchRecord[] = localMatchesStr ? JSON.parse(localMatchesStr) : [];
        const updatedMatches = localMatches.filter((m) => m.id !== matchId);
        await AsyncStorage.setItem('@demo_matches', JSON.stringify(updatedMatches));

        const localMessagesStr = await AsyncStorage.getItem('@demo_messages');
        if (localMessagesStr) {
          const localMessages: MessageRecord[] = JSON.parse(localMessagesStr);
          const updatedMessages = localMessages.filter((m) => m.match_id !== matchId);
          await AsyncStorage.setItem('@demo_messages', JSON.stringify(updatedMessages));
        }
        return;
      }

      // 1. Delete all messages for this match to free database storage
      const { error: deleteMsgError } = await supabase
        .from('messages')
        .delete()
        .eq('match_id', matchId);

      if (deleteMsgError) {
        console.warn('⚠️ Warning: Failed to purge messages for match:', deleteMsgError);
      }

      // 2. Keep the match record with status 'unmatched' to prevent re-matching
      const { error: matchError } = await supabase
        .from('matches')
        .update({ status: 'unmatched' })
        .eq('id', matchId);

      if (matchError) throw matchError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: MATCHES_QUERY_KEYS.all(variables.currentUserId),
      });
    },
  });
}
