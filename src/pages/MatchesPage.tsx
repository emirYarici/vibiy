import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heart } from 'lucide-react-native';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS } from '../shared/theme';
import { DBProfile, MatchRecord, MessageRecord } from '../shared/types';
import {
  DEMO_PROFILES,
  DEMO_MATCHES,
  DEFAULT_DEMO_MESSAGES,
} from '../shared/mockData';

interface MatchesPageProps {
  session: any;
  isDemoMode: boolean;
  onProfileSheetToggle?: (isOpen: boolean) => void;
  navigation?: any;
}

export const parseReferredMessage = (content: string) => {
  const match = content.match(/^(https?:\/\/(?:www\.)?instagram\.com\/\S+)\n\n([\s\S]*)$/);
  if (match) {
    return {
      isReferred: true,
      url: match[1],
      message: match[2],
    };
  }
  return {
    isReferred: false,
    url: '',
    message: content,
  };
};

export default function MatchesPage({ session, isDemoMode, navigation }: MatchesPageProps) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [profiles, setProfiles] = useState<Record<string, DBProfile>>({});
  const [messages, setMessages] = useState<MessageRecord[]>([]);

  const currentUserId = session?.user?.id || 'demo-guest-user';

  // Load Matches, Profiles, and Message log (to show snippet of last message)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (isDemoMode || !isSupabaseConfigured) {
        const localMatches = await AsyncStorage.getItem('@demo_matches');
        const localMessages = await AsyncStorage.getItem('@demo_messages');

        if (localMatches) {
          setMatches(JSON.parse(localMatches));
        } else {
          setMatches(DEMO_MATCHES);
          await AsyncStorage.setItem('@demo_matches', JSON.stringify(DEMO_MATCHES));
        }

        if (localMessages) {
          setMessages(JSON.parse(localMessages));
        } else {
          setMessages(DEFAULT_DEMO_MESSAGES);
          await AsyncStorage.setItem('@demo_messages', JSON.stringify(DEFAULT_DEMO_MESSAGES));
        }

        const profileMap: Record<string, DBProfile> = {};
        DEMO_PROFILES.forEach((p) => {
          profileMap[p.id] = p;
        });
        setProfiles(profileMap);
        setLoading(false);
        return;
      }

      // Fetch Real active matches
      const { data: dbMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`)
        .eq('status', 'active');

      if (matchesError) throw matchesError;

      if (!dbMatches || dbMatches.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      setMatches(dbMatches);

      // Extract unique matched user IDs
      const matchedIds = dbMatches.map((m) =>
        m.user_a === currentUserId ? m.user_b : m.user_a
      );

      // Fetch Profiles of matched users
      const { data: dbProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, age, bio, photos')
        .in('id', matchedIds);

      if (profilesError) throw profilesError;

      const profileMap: Record<string, DBProfile> = {};
      dbProfiles?.forEach((p: any) => {
        profileMap[p.id] = {
          id: p.id,
          full_name: p.full_name || 'Anonymous',
          age: p.age || 18,
          bio: p.bio || '',
          photos: p.photos || [],
        };
      });
      setProfiles(profileMap);

      // Fetch Messages for these matches to show last message snippets
      const matchIds = dbMatches.map((m) => m.id);
      const { data: dbMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(dbMessages || []);

    } catch (err: any) {
      console.error('Error fetching matches/messages:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isDemoMode]);

  useEffect(() => {
    fetchData();

    if (!isDemoMode && isSupabaseConfigured) {
      console.log('🔌 Subscribing to Supabase Realtime for matches list...');
      
      // Explicitly listen to target tables to avoid wildcard public schema broadcasts
      const channel = supabase
        .channel('matches_list_updates')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as MessageRecord;
            console.log('🔥 [REALTIME TRIGGERED] New message in inbox:', newMsg.content);
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== newMsg.id);
              return [...filtered, newMsg];
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          (payload) => {
            console.log('🔥 [REALTIME TRIGGERED] Match event in matches list:', payload.eventType);
            if (payload.eventType === 'UPDATE') {
              const updatedMatch = payload.new as MatchRecord;
              if (updatedMatch.status !== 'active') {
                setMatches((prev) => prev.filter((m) => m.id !== updatedMatch.id));
              }
            } else if (payload.eventType === 'INSERT') {
              const newMatch = payload.new as MatchRecord;
              if (newMatch.user_a === currentUserId || newMatch.user_b === currentUserId) {
                setMatches((prev) => {
                  if (prev.some((m) => m.id === newMatch.id)) return prev;
                  return [...prev, newMatch];
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        console.log('🔌 Unsubscribing from matches list Supabase Realtime channel');
        supabase.removeChannel(channel);
      };
    }
  }, [fetchData, isDemoMode]);

  // Group Matches and compile details
  const matchedUsers = matches
    .map((match) => {
      const otherUserId = match.user_a === currentUserId ? match.user_b : match.user_a;
      const otherProfile = profiles[otherUserId];
      const matchMessages = messages.filter((m) => m.match_id === match.id);
      const lastMessage = matchMessages[matchMessages.length - 1];

      return {
        matchId: match.id,
        profile: otherProfile || {
          id: otherUserId,
          full_name: 'Loading User...',
          age: 20,
          bio: '',
          photos: ['https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'],
        },
        lastMessage,
        score: match.similarity_score,
      };
    })
    .filter((item) => item.profile !== undefined);

  // Blended Lists:
  // "New Matches" have no messages exchanged
  const newMatches = matchedUsers.filter((mu) => !mu.lastMessage);
  // "Conversations" have at least one message
  const conversations = matchedUsers
    .filter((mu) => !!mu.lastMessage)
    .sort((a, b) => {
      const timeA = new Date(a.lastMessage!.created_at).getTime();
      const timeB = new Date(b.lastMessage!.created_at).getTime();
      return timeB - timeA;
    });

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Connecting to matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {matchedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart size={48} color={COLORS.cardBorder} strokeWidth={1.5} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            Share more Instagram Reels on the Home tab to compute similarity vectors and find matches!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. Horizontal New Matches Carousel */}
          {newMatches.length > 0 && (
            <View style={styles.newMatchesSection}>
              <Text style={styles.sectionTitle}>New Matches</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newMatchesScroll}>
                {newMatches.map((item) => (
                  <TouchableOpacity
                    key={item.matchId}
                    style={styles.newMatchItem}
                    onPress={() => {
                      navigation.navigate('ProfileDetails', {
                        profile: item.profile,
                        activeChatMatchId: null,
                        onChatNow: () => {
                          const match = matches.find(
                            (m) => m.user_a === item.profile.id || m.user_b === item.profile.id
                          );
                          if (match) {
                            navigation.replace('Chat', {
                              matchId: match.id,
                              session,
                              isDemoMode,
                            });
                          }
                        },
                      });
                    }}
                  >
                    <View style={styles.avatarWrapper}>
                      <Image source={{ uri: item.profile.photos[0] }} style={styles.newMatchAvatar} />
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>{(item.score * 100).toFixed(0)}%</Text>
                      </View>
                    </View>
                    <Text style={styles.newMatchName} numberOfLines={1}>
                      {item.profile.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 2. Conversations List */}
          <View style={styles.conversationsSection}>
            <Text style={styles.sectionTitle}>Messages</Text>
            {conversations.length === 0 ? (
              <View style={styles.noChatsCard}>
                <Text style={styles.noChatsText}>No messages yet. Tap a new match above to start chatting!</Text>
              </View>
            ) : (
              <View style={styles.conversationsList}>
                {conversations.map((item) => {
                  const isMine = item.lastMessage.sender_id === currentUserId;
                  const parsed = parseReferredMessage(item.lastMessage.content);
                  const lastTextSnippet = parsed.isReferred
                    ? `🎬 Shared ${parsed.url.includes('/reel/') ? 'Reel' : 'Post'}`
                    : parsed.message;

                  return (
                    <TouchableOpacity
                      key={item.matchId}
                      style={styles.convoCard}
                      onPress={() =>
                        navigation.navigate('Chat', {
                          matchId: item.matchId,
                          session,
                          isDemoMode,
                        })
                      }
                    >
                      <Image source={{ uri: item.profile.photos[0] }} style={styles.convoAvatar} />
                      <View style={styles.convoDetails}>
                        <View style={styles.convoRow}>
                          <Text style={styles.convoName}>{item.profile.full_name}</Text>
                          <Text style={styles.convoTime}>
                            {formatMessageTime(item.lastMessage.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.convoLastMsg} numberOfLines={1}>
                          {isMine ? 'You: ' : ''}
                          {lastTextSnippet}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  newMatchesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  newMatchesScroll: {
    flexDirection: 'row',
  },
  newMatchItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 68,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  newMatchAvatar: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  scoreBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.bg,
  },
  scoreText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  newMatchName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  conversationsSection: {
    flex: 1,
  },
  noChatsCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    padding: 20,
    alignItems: 'center',
  },
  noChatsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  conversationsList: {
    gap: 12,
  },
  convoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  convoAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    marginRight: 14,
  },
  convoDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  convoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  convoName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  convoTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  convoLastMsg: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
