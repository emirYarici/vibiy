import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate as reanimatedInterpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import AppLoader from '../shared/ui/AppLoader/AppLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heart, MessageCircle, Sparkles, Film, ArrowRight, ChevronRight } from 'lucide-react-native';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { DBProfile, MatchRecord, MessageRecord, getMatchArchetype } from '../shared/types';
import { ArchetypeIcon, ArchetypePillBadge } from '../entities/match/ui/ArchetypeBadge';
import SkeletonImage from '../shared/ui/SkeletonImage/SkeletonImage';
import DailyDropCountdown from '../widgets/DailyDropCountdown/DailyDropCountdown';
import DailyMatchCard, { DAILY_CARD_WIDTH } from '../entities/match/ui/DailyMatchCard';
import CompareVibesSheet from '../features/compare-vibes/ui/CompareVibesSheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { useMatches, MATCHES_QUERY_KEYS, MatchesData } from '../entities/match/api/useMatches';
import { useUnmatchUser } from '../features/safety/api/useSafety';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAILY_CARD_GAP = 14;
const DAILY_ITEM_SIZE = DAILY_CARD_WIDTH + DAILY_CARD_GAP;
const DAILY_CAROUSEL_PADDING_HORIZONTAL = (SCREEN_WIDTH - DAILY_CARD_WIDTH) / 2;
interface ConversationListItemProps {
  item: {
    matchId: string;
    profile: DBProfile;
    lastMessage: MessageRecord;
    score: number;
  };
  currentUserId: string;
  onPress: () => void;
  formatMessageTime: (iso: string) => string;
}

function ConversationListItem({
  item,
  currentUserId,
  onPress,
  formatMessageTime,
}: ConversationListItemProps) {
  const isMine = item.lastMessage?.sender_id === currentUserId;
  const parsed = parseReferredMessage(item.lastMessage?.content || '');
  const lastTextSnippet = parsed.isReferred
    ? `Shared a video: "${parsed.message || 'Instagram Reel'}"`
    : parsed.message || 'Started a conversation';
  const archetype = getMatchArchetype(item.score);
  const photoUri =
    item.profile.photos && item.profile.photos.length > 0
      ? item.profile.photos[0]
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';

  return (
    <TouchableOpacity
      style={styles.convoRowCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* Left Avatar with Badges */}
      <View style={styles.convoAvatarWrapper}>
        <SkeletonImage source={{ uri: photoUri }} style={styles.convoAvatarImg} />
        <View style={styles.convoOnlineDot} />
        <View style={[styles.convoRowArchetypeBadge, { backgroundColor: archetype.bgColor }]}>
          <ArchetypeIcon type={archetype.type} size={10} color={archetype.textColor} />
        </View>
      </View>

      {/* Middle Content */}
      <View style={styles.convoRowContent}>
        <View style={styles.convoRowHeader}>
          <Text style={styles.convoRowName} numberOfLines={1}>
            {item.profile.full_name}, <Text style={styles.convoRowAge}>{item.profile.age || 22}</Text>
          </Text>
          <Text style={styles.convoRowTime}>
            {formatMessageTime(item.lastMessage.created_at)}
          </Text>
        </View>

        <View style={styles.convoRowMessageLine}>
          <Text style={styles.convoRowMessageText} numberOfLines={1}>
            <Text style={styles.convoRowMessageAuthor}>
              {isMine ? 'You: ' : `${item.profile.full_name.split(' ')[0]}: `}
            </Text>
            {lastTextSnippet}
          </Text>
          {!isMine && <View style={styles.convoUnreadDot} />}
        </View>
      </View>

      {/* Right Side Archetype Pill & Chevron */}
      <View style={styles.convoRowRight}>
        <View style={[styles.convoRowScorePill, { backgroundColor: archetype.bgColor }]}>
          <Text style={[styles.convoRowScoreText, { color: archetype.textColor }]}>
            {Math.round(item.score * 100)}%
          </Text>
        </View>
        <ChevronRight size={16} color={COLORS.textDarkSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function MatchesPage({ session, isDemoMode, navigation }: MatchesPageProps) {
  const queryClient = useQueryClient();
  const currentUserId = session?.user?.id || 'demo-guest-user';

  const { data, isLoading } = useMatches(currentUserId, isDemoMode);

  const matches = data?.matches || [];
  const profiles = data?.profiles || {};
  const messages = data?.messages || [];
  const loading = isLoading;

  const [compareTarget, setCompareTarget] = useState<{ profile: DBProfile; score: number } | null>(null);

  const handleStartChat = (profile: DBProfile) => {
    const match = matches.find(
      (m) => m.user_a === profile.id || m.user_b === profile.id
    );
    if (match) {
      navigation.navigate('Chat', {
        matchId: match.id,
        session,
        isDemoMode,
      });
    }
  };

  const handleOpenProfile = (profile: DBProfile, score: number) => {
    const match = matches.find(
      (m) => m.user_a === profile.id || m.user_b === profile.id
    );
    navigation.navigate('ProfileDetails', {
      profile,
      score,
      session,
      isDemoMode,
      activeChatMatchId: match?.id || null,
      onChatNow: () => handleStartChat(profile),
      onCompareVibes: () => setCompareTarget({ profile, score }),
    });
  };

  const handleStartChatWithPrompt = (prompt: string) => {
    if (!compareTarget) return;
    const match = matches.find(
      (m) => m.user_a === compareTarget.profile.id || m.user_b === compareTarget.profile.id
    );
    if (match) {
      navigation.navigate('Chat', {
        matchId: match.id,
        session,
        isDemoMode,
        initialMessage: prompt,
      });
    }
  };

  // Scoped Supabase Realtime Listener for matches updates
  useEffect(() => {
    if (!isDemoMode && isSupabaseConfigured) {
      const channel = supabase
        .channel('matches_list_updates')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as MessageRecord;
            queryClient.setQueryData<MatchesData>(
              MATCHES_QUERY_KEYS.all(currentUserId),
              (old) => {
                if (!old) return old;
                const filtered = old.messages.filter((m) => m.id !== newMsg.id);
                return {
                  ...old,
                  messages: [...filtered, newMsg],
                };
              }
            );
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          (payload) => {
            // Invalidate to fetch profiles of new matches as well
            queryClient.invalidateQueries({
              queryKey: MATCHES_QUERY_KEYS.all(currentUserId),
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, isDemoMode, queryClient]);

  // Helper to check if match was created today
  const isMatchToday = (dateString?: string) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  // Group Matches and compile details
  const matchedUsers = matches
    .map((match) => {
      const otherUserId = match.user_a === currentUserId ? match.user_b : match.user_a;
      const otherProfile = profiles[otherUserId];
      const matchMessages = messages.filter((m) => m.match_id === match.id);
      const lastMessage = matchMessages[matchMessages.length - 1];

      return {
        matchId: match.id,
        createdAt: match.created_at,
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

  // Today's curated drops (matches created today)
  const todayDrops = matchedUsers.filter((item) => isMatchToday(item.createdAt));

  const newMatches = matchedUsers.filter((mu) => !mu.lastMessage);
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

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <AppLoader size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Finding your matches...</Text>
        </View>
      ) : matchedUsers.length === 0 ? (
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
          {/* 1. Daily Drop Countdown Header */}
          <DailyDropCountdown totalMatchesCount={matchedUsers.length} />

          {/* 2. New Match Drops Big Portrait Cards Section (Matches with no messages yet) */}
          {newMatches.length > 0 && (
            <View style={styles.dailyDropsSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTitleGroup}>
                  <Sparkles size={14} color={COLORS.accent} />
                  <Text style={styles.sectionHeaderTitle}>NEW MATCH DROPS</Text>
                </View>
                <View style={styles.cardCountBadge}>
                  <Text style={styles.cardCountText}>
                    {newMatches.length >= 3 ? '3/3 FULL' : `${newMatches.length} NEW`}
                  </Text>
                </View>
              </View>

              <FlatList
                data={newMatches}
                keyExtractor={(item) => item.matchId}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToOffsets={newMatches.map((_, i) => i * DAILY_ITEM_SIZE)}
                snapToAlignment="start"
                nestedScrollEnabled
                contentContainerStyle={[
                  styles.dailyDropsScroll,
                  { paddingHorizontal: DAILY_CAROUSEL_PADDING_HORIZONTAL },
                ]}
                renderItem={({ item, index }) => (
                  <View style={{ marginRight: index === newMatches.length - 1 ? 0 : DAILY_CARD_GAP }}>
                    <DailyMatchCard
                      matchId={item.matchId}
                      profile={item.profile}
                      score={item.score}
                      onOpenProfile={handleOpenProfile}
                      onCompareVibes={(prof, sc) => setCompareTarget({ profile: prof, score: sc })}
                      onStartChat={handleStartChat}
                    />
                  </View>
                )}
              />
            </View>
          )}

          {/* 4. Active Conversations Big Sliding Cards Carousel */}
          <View style={styles.convoSection}>
            <View style={styles.convoSectionHeader}>
              <View style={styles.convoSectionTitleGroup}>
                <MessageCircle size={15} color={COLORS.accent} />
                <Text style={styles.convoSectionTitle}>ACTIVE CONVERSATIONS</Text>
              </View>
              {conversations.length > 0 && (
                <View style={styles.convoCountPill}>
                  <Text style={styles.convoCountText}>{conversations.length}</Text>
                </View>
              )}
            </View>

            {conversations.length === 0 ? (
              <View style={styles.noChatsCard}>
                <MessageCircle size={28} color={COLORS.textMuted} strokeWidth={1.8} />
                <Text style={styles.noChatsText}>
                  Tap any match above to start your first conversation!
                </Text>
              </View>
            ) : (
              <View style={styles.convoVerticalList}>
                {conversations.map((item) => (
                  <ConversationListItem
                    key={item.matchId}
                    item={item}
                    currentUserId={currentUserId}
                    formatMessageTime={formatMessageTime}
                    onPress={() =>
                      navigation.navigate('Chat', {
                        matchId: item.matchId,
                        session,
                        isDemoMode,
                      })
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Compare Our Vibes Modal Sheet (Real DB Data) */}
      <CompareVibesSheet
        visible={compareTarget !== null}
        onClose={() => setCompareTarget(null)}
        currentUserId={currentUserId}
        partnerProfile={compareTarget?.profile || null}
        score={compareTarget?.score}
        isDemoMode={isDemoMode}
        onStartChatWithPrompt={handleStartChatWithPrompt}
      />
    </View>
  </BottomSheetModalProvider>
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
  /* Daily Drops Showcase */
  dailyDropsSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  cardCountBadge: {
    backgroundColor: 'rgba(255, 190, 84, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  cardCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
  },
  dailyDropsScroll: {
    paddingVertical: 6,
  },
  storiesSection: {
    marginBottom: 20,
  },
  storiesSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.6,
    paddingHorizontal: 24,
    marginBottom: 12,
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
  storyName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 4,
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
  convoSection: {
    marginTop: 10,
    marginBottom: 28,
  },
  convoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  convoSectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  convoSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.8,
  },
  convoCountPill: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  convoCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
  convoVerticalList: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  convoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.card,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...SHADOWS.sm,
  },
  convoAvatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  convoAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  convoOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },
  convoRowArchetypeBadge: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cardBg,
    ...SHADOWS.sm,
  },
  convoRowContent: {
    flex: 1,
    justifyContent: 'center',
  },
  convoRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  convoRowName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    flex: 1,
    marginRight: 6,
  },
  convoRowAge: {
    fontWeight: '500',
    color: COLORS.textDarkSecondary,
  },
  convoRowTime: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDarkSecondary,
  },
  convoRowMessageLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convoRowMessageText: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    flex: 1,
    marginRight: 6,
  },
  convoRowMessageAuthor: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  convoUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginLeft: 4,
  },
  convoRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  convoRowScorePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  convoRowScoreText: {
    fontSize: 11,
    fontWeight: '800',
  },
  noChatsCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...SHADOWS.md,
  },
  noChatsText: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
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
