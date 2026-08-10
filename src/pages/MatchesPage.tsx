import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heart, Search, MessageCircle, Sparkles } from 'lucide-react-native';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { DBProfile, MatchRecord, MessageRecord, getMatchArchetype } from '../shared/types';
import { ArchetypeIcon, ArchetypePillBadge } from '../components/ArchetypeBadge';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

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
      const channel = supabase
        .channel('matches_list_updates')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as MessageRecord;
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
          full_name: 'Friend',
          age: 22,
          bio: '',
          photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'],
        },
        lastMessage,
        score: match.similarity_score,
      };
    })
    .filter((item) => item.profile !== undefined);

  // Filter with search if active
  const filteredUsers = matchedUsers.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const newMatches = filteredUsers.filter((mu) => !mu.lastMessage);
  const conversations = filteredUsers
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
        <Text style={styles.loadingText}>Finding your matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity
          style={styles.searchIconButton}
          onPress={() => setShowSearchInput(!showSearchInput)}
          activeOpacity={0.8}
        >
          <Search size={20} color={COLORS.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Search Input Bar (Expandable) */}
      {showSearchInput && (
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      )}

      {matchedUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Heart size={36} color={COLORS.accent} strokeWidth={2} fill={COLORS.accentLight} />
          </View>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            Share more Instagram Reels to compute similarity vectors and discover people who share your vibe!
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Horizontal Active Stories / New Matches */}
          {newMatches.length > 0 && (
            <View style={styles.storiesSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesScroll}
              >
                {newMatches.map((item) => {
                  const archetype = getMatchArchetype(item.score);
                  return (
                    <TouchableOpacity
                      key={item.matchId}
                      style={styles.storyItem}
                      activeOpacity={0.85}
                      onPress={() => {
                        navigation.navigate('ProfileDetails', {
                          profile: item.profile,
                          score: item.score,
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
                      <View style={styles.storyAvatarWrapper}>
                        <Image
                          source={{
                            uri:
                              (item.profile.photos && item.profile.photos[0]) ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
                          }}
                          style={styles.storyAvatar}
                        />
                        <View style={styles.onlineDot} />
                        {/* Lucide Archetype Icon Badge on Story Avatar */}
                        <View style={[styles.storyArchetypeBadge, { backgroundColor: archetype.bgColor }]}>
                          <ArchetypeIcon type={archetype.type} size={11} color={archetype.textColor} />
                        </View>
                      </View>
                      <Text style={styles.storyName} numberOfLines={1}>
                        {item.profile.full_name.split(' ')[0]}
                      </Text>
                      <Text style={styles.storyArchetypeLabel} numberOfLines={1}>
                        {archetype.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Main White Card for Active Conversations */}
          <View style={styles.chatsCard}>
            <Text style={styles.sectionLabel}>Active</Text>

            {conversations.length === 0 ? (
              <View style={styles.noChatsInner}>
                <MessageCircle size={28} color={COLORS.textMuted} strokeWidth={1.8} />
                <Text style={styles.noChatsText}>
                  Tap any match above to start your first conversation!
                </Text>
              </View>
            ) : (
              <View style={styles.conversationsList}>
                {conversations.map((item, index) => {
                  const isMine = item.lastMessage.sender_id === currentUserId;
                  const parsed = parseReferredMessage(item.lastMessage.content);
                  const lastTextSnippet = parsed.isReferred
                    ? `Shared ${parsed.url.includes('/reel/') ? 'Reel' : 'Post'}`
                    : parsed.message;
                  const archetype = getMatchArchetype(item.score);

                  return (
                    <TouchableOpacity
                      key={item.matchId}
                      style={[
                        styles.convoRow,
                        index < conversations.length - 1 && styles.convoRowDivider,
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('Chat', {
                          matchId: item.matchId,
                          session,
                          isDemoMode,
                        })
                      }
                    >
                      <View style={styles.convoAvatarWrapper}>
                        <Image
                          source={{
                            uri:
                              (item.profile.photos && item.profile.photos[0]) ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
                          }}
                          style={styles.convoAvatar}
                        />
                        <View style={styles.onlineDot} />
                        {/* Lucide Archetype Badge on Chat Avatar */}
                        <View style={[styles.convoArchetypeBadge, { backgroundColor: archetype.bgColor }]}>
                          <ArchetypeIcon type={archetype.type} size={9} color={archetype.textColor} />
                        </View>
                      </View>

                      <View style={styles.convoDetails}>
                        <View style={styles.convoTopLine}>
                          <View style={styles.convoNameRow}>
                            <Text style={styles.convoName}>{item.profile.full_name}</Text>
                            {/* Lucide Archetype Pill Tag */}
                            <ArchetypePillBadge archetype={archetype} size="sm" />
                          </View>
                          <Text style={styles.convoTime}>
                            {formatMessageTime(item.lastMessage.created_at)}
                          </Text>
                        </View>
                        <View style={styles.convoBottomLine}>
                          <Text style={styles.convoLastMsg} numberOfLines={1}>
                            {isMine ? 'You : ' : ''}
                            {lastTextSnippet}
                          </Text>
                          {!isMine && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadBadgeText}>1</Text>
                            </View>
                          )}
                        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  searchIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  searchBarContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  searchInput: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.sm,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 110,
  },
  storiesSection: {
    marginBottom: 20,
  },
  storiesScroll: {
    paddingHorizontal: 24,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 66,
  },
  storyAvatarWrapper: {
    position: 'relative',
    padding: 3,
    backgroundColor: COLORS.cardBg,
    borderRadius: 35,
    ...SHADOWS.sm,
  },
  storyAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2.5,
    borderColor: COLORS.cardBg,
  },
  storyArchetypeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cardBg,
    ...SHADOWS.sm,
  },
  storyArchetypeEmoji: {
    fontSize: 10,
  },
  storyArchetypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 2,
  },
  storyName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  chatsCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    marginHorizontal: 16,
    padding: 20,
    paddingTop: 16,
    ...SHADOWS.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noChatsInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  noChatsText: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },
  conversationsList: {
    gap: 6,
  },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  convoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 88, 115, 0.08)',
  },
  convoAvatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  convoAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  convoArchetypeBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBg,
  },
  convoArchetypeEmoji: {
    fontSize: 9,
  },
  convoDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  convoTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  convoName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  archetypePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archetypePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  convoTime: {
    fontSize: 11,
    color: COLORS.textDarkSecondary,
    fontWeight: '500',
  },
  convoBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convoLastMsg: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: COLORS.accent,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: COLORS.textDark,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cardBgIvory,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...SHADOWS.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
});
