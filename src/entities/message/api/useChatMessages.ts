import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../../../shared/api/supabase';
import { MessageRecord } from '../../../shared/types';
import { DEFAULT_DEMO_MESSAGES } from '../../../shared/mockData';

export const CHAT_QUERY_KEYS = {
  messages: (matchId: string) => ['chat_messages', matchId] as const,
};

export function useChatMessages(matchId: string, isDemoMode = false) {
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.messages(matchId),
    queryFn: async (): Promise<MessageRecord[]> => {
      if (!matchId) return [];

      // Demo fallback
      if (isDemoMode || !isSupabaseConfigured) {
        const localMessagesStr = await AsyncStorage.getItem('@demo_messages');
        const allMessages: MessageRecord[] = localMessagesStr
          ? JSON.parse(localMessagesStr)
          : DEFAULT_DEMO_MESSAGES;

        return allMessages.filter((m) => m.match_id === matchId);
      }

      // Live Supabase query
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!matchId,
    staleTime: 0, // transient messages always requested/synced live
  });
}

interface SendMessageParams {
  matchId: string;
  senderId: string;
  content: string;
  isDemoMode?: boolean;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, senderId, content, isDemoMode = false }: SendMessageParams) => {
      // Demo fallback
      if (isDemoMode || !isSupabaseConfigured) {
        const localMessagesStr = await AsyncStorage.getItem('@demo_messages');
        const allMessages: MessageRecord[] = localMessagesStr
          ? JSON.parse(localMessagesStr)
          : DEFAULT_DEMO_MESSAGES;

        const newMsg: MessageRecord = {
          id: `temp-${Date.now()}`,
          match_id: matchId,
          sender_id: senderId,
          content,
          created_at: new Date().toISOString(),
        };

        const updatedMessages = [...allMessages, newMsg];
        await AsyncStorage.setItem('@demo_messages', JSON.stringify(updatedMessages));
        return newMsg;
      }

      // Live Supabase insert
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: matchId,
          sender_id: senderId,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MessageRecord;
    },
    onMutate: async (newMsgParams) => {
      const { matchId, senderId, content } = newMsgParams;
      const queryKey = CHAT_QUERY_KEYS.messages(matchId);

      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<MessageRecord[]>(queryKey) || [];

      // Optimistically update message bubble instantly
      const optimisticMsg: MessageRecord = {
        id: `temp-${Date.now()}`,
        match_id: matchId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<MessageRecord[]>(queryKey, (old) => [
        ...(old || []),
        optimisticMsg,
      ]);

      // Return context with snapshot
      return { previousMessages, queryKey };
    },
    onError: (err, newMsgParams, context) => {
      if (context) {
        // Rollback state if database insert failed
        queryClient.setQueryData(context.queryKey, context.previousMessages);
      }
    },
    onSuccess: (data, variables) => {
      // Replace optimistic temp message with database confirmed message
      queryClient.setQueryData<MessageRecord[]>(
        CHAT_QUERY_KEYS.messages(variables.matchId),
        (old) => {
          if (!old) return [data];
          return old.map((m) => (m.id.startsWith('temp-') && m.content === data.content ? data : m));
        }
      );
    },
  });
}
