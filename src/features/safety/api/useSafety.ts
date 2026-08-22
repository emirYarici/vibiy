import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../../shared/api/supabase';
import { MATCHES_QUERY_KEYS } from '../../../entities/match/api/useMatches';
import { MatchRecord, MessageRecord } from '../../../shared/types';

export interface ReportParams {
  reporterId: string;
  reportedUserId: string;
  matchId?: string;
  reason: string;
  details?: string;
  isDemoMode?: boolean;
}

export interface BlockParams {
  blockerId: string;
  blockedUserId: string;
  matchId?: string;
  isDemoMode?: boolean;
}

export function useReportUser() {
  return useMutation({
    mutationFn: async ({
      reporterId,
      reportedUserId,
      matchId,
      reason,
      details,
      isDemoMode = false,
    }: ReportParams) => {
      if (isDemoMode || !isSupabaseConfigured) {
        const localReports = await AsyncStorage.getItem('@demo_reports');
        const list = localReports ? JSON.parse(localReports) : [];
        list.push({
          id: 'demo-rep-' + Date.now(),
          reporterId,
          reportedUserId,
          matchId,
          reason,
          details,
          created_at: new Date().toISOString(),
        });
        await AsyncStorage.setItem('@demo_reports', JSON.stringify(list));
        return { success: true };
      }

      const { data, error } = await supabase.from('reports').insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        match_id: matchId || null,
        reason,
        details: details || null,
      });

      if (error) {
        console.warn('Supabase report insert error:', error);
        throw error;
      }
      return data;
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockerId,
      blockedUserId,
      matchId,
      isDemoMode = false,
    }: BlockParams) => {
      if (isDemoMode || !isSupabaseConfigured) {
        // Remove from demo matches
        if (matchId) {
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
        }
        return { success: true };
      }

      // 1. Insert into blocked_users table (if exists)
      try {
        await supabase.from('blocked_users').insert({
          blocker_id: blockerId,
          blocked_user_id: blockedUserId,
        });
      } catch (err) {
        console.warn('Note: blocked_users insert skipped or error:', err);
      }

      // 2. If there's an active match, purge messages & set match to unmatched
      if (matchId) {
        await supabase.from('messages').delete().eq('match_id', matchId);
        await supabase.from('matches').update({ status: 'unmatched' }).eq('id', matchId);
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: MATCHES_QUERY_KEYS.all(variables.blockerId),
      });
    },
  });
}

export interface UnmatchParams {
  userId: string;
  matchId: string;
  isDemoMode?: boolean;
}

export function useUnmatchUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, matchId, isDemoMode = false }: UnmatchParams) => {
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
        return { success: true };
      }

      await supabase.from('messages').delete().eq('match_id', matchId);
      await supabase.from('matches').delete().eq('id', matchId);

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: MATCHES_QUERY_KEYS.all(variables.userId),
      });
    },
  });
}
