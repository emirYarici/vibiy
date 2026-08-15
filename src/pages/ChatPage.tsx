import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Send, User, Trash2, X, ChevronDown, ChevronUp, ArrowLeft, Play, Film, Camera, Sparkles } from 'lucide-react-native';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { CONFIG } from '../shared/config';
import { DBProfile, MatchRecord, MessageRecord, ShareHistoryItem, getMatchArchetype } from '../shared/types';
import { ArchetypeIcon, ArchetypePillBadge } from '../components/ArchetypeBadge';
import SkeletonImage from '../components/SkeletonImage';
import CompareVibesSheet from '../components/CompareVibesSheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  DEMO_PROFILES,
  DEFAULT_DEMO_MESSAGES,
  DEMO_PARTNER_HISTORY,
} from '../shared/mockData';
import { parseReferredMessage } from './MatchesPage'; // Re-use helper since it parses message reels cleanly
import { useQueryClient } from '@tanstack/react-query';
import { useMatches, useUnmatch } from '../shared/queries/useMatches';
import { useChatMessages, useSendMessage, CHAT_QUERY_KEYS } from '../shared/queries/useChatMessages';
import { usePartnerShareHistory } from '../shared/queries/useShareHistory';

interface ChatPageProps {
  route: any;
  navigation: any;
}

const getInstagramThumbnail = (url: string) => {
  if (!url) return null;
  return `${CONFIG.API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(url)}`;
};

const InstagramThumbnail = ({
  url,
  thumbnailUrl: directThumbnailUrl,
  size = 60,
  width,
  height,
  borderRadius = RADIUS.sm,
}: {
  url: string;
  thumbnailUrl?: string;
  size?: number;
  width?: number;
  height?: number;
  borderRadius?: number;
}) => {
  const [hasError, setHasError] = useState(false);
  const thumbnailUrl = !hasError
    ? directThumbnailUrl || (url ? getInstagramThumbnail(url) : null)
    : null;

  const w = width || size;
  const h = height || size;

  return (
    <View style={[styles.thumbContainer, { width: w, height: h, borderRadius }]}>
      {thumbnailUrl ? (
        <SkeletonImage
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={styles.thumbFallback}>
          <Play size={Math.min(w, h) * 0.35} color={COLORS.textMuted} fill={COLORS.textMuted} />
        </View>
      )}
    </View>
  );
};

export default function ChatPage({ route, navigation }: ChatPageProps) {
  const { matchId, session, isDemoMode, initialMessage } = route.params || {};
  const queryClient = useQueryClient();
  const currentUserId = session?.user?.id || 'demo-guest-user';

  // Load matches, active chat messages, sending and unmatching mutations
  const { data: matchesData } = useMatches(currentUserId, isDemoMode);
  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(matchId, isDemoMode);
  
  const match = matchesData?.matches.find((m) => m.id === matchId) || null;
  const partnerId = match ? (match.user_a === currentUserId ? match.user_b : match.user_a) : '';
  const partnerProfile = match ? (matchesData?.profiles[partnerId] || null) : null;

  const { data: partnerHistory = [] } = usePartnerShareHistory(partnerId, isDemoMode);

  const sendMessageMutation = useSendMessage();
  const unmatchMutation = useUnmatch();

  const [typedMessage, setTypedMessage] = useState(initialMessage || '');
  const [showCompareSheet, setShowCompareSheet] = useState(false);

  // Collapsible Share Reels accordions
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [referredReel, setReferredReel] = useState<ShareHistoryItem | null>(null);

  const chatScrollViewRef = useRef<ScrollView>(null);
  const loading = messagesLoading;

  // Scoped Supabase Realtime Listener for messages in this match ID
  useEffect(() => {
    if (!isDemoMode && isSupabaseConfigured) {
      console.log(`🔌 Subscribing to Supabase Realtime messages for match: ${matchId}`);

      const channel = supabase
        .channel(`messages_match_${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const newMsg = payload.new as MessageRecord;
            console.log('🔥 [REALTIME TRIGGERED] New message received for match:', matchId, newMsg.content);

            queryClient.setQueryData<MessageRecord[]>(
              CHAT_QUERY_KEYS.messages(matchId),
              (old) => {
                if (!old) return [newMsg];
                if (old.some((m) => m.id === newMsg.id)) return old;
                // De-duplicate optimistic insertions
                const filtered = old.filter((m) => !(m.id.startsWith('temp-') && m.content === newMsg.content));
                return [...filtered, newMsg];
              }
            );
          }
        )
        .subscribe();

      return () => {
        console.log(`🔌 Unsubscribing from Supabase Realtime match channel: ${matchId}`);
        supabase.removeChannel(channel);
      };
    }
  }, [matchId, isDemoMode, queryClient]);

  // Scroll Chat to bottom when new messages load
  useEffect(() => {
    setTimeout(() => {
      chatScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleUnmatch = async () => {
    Alert.alert('Unmatch User', 'Are you sure you want to end this connection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: async () => {
          try {
            await unmatchMutation.mutateAsync({
              matchId,
              currentUserId,
              isDemoMode,
            });
            navigation.goBack();
            Alert.alert('Unmatched', 'You have successfully unmatched this user.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to unmatch.');
          }
        },
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!typedMessage.trim()) return;

    let messageContent = typedMessage.trim();
    if (referredReel) {
      messageContent = `${referredReel.url}\n\n${messageContent}`;
    }
    setTypedMessage('');
    setReferredReel(null);

    try {
      await sendMessageMutation.mutateAsync({
        matchId,
        senderId: currentUserId,
        content: messageContent,
        isDemoMode,
      });
    } catch (err: any) {
      Alert.alert('Failed to send', err.message || 'Check your internet connection.');
    }
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Opening chat room...</Text>
      </View>
    );
  }

  const similarityScore = match?.similarity_score || 0;

  return (
    <BottomSheetModalProvider>
      <View style={styles.chatContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{ flex: 1 }}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity style={styles.circularBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <ArrowLeft size={22} color={COLORS.primaryText} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatUserBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (partnerProfile) {
                navigation.navigate('ProfileDetails', {
                  profile: partnerProfile,
                  score: similarityScore,
                  session,
                  isDemoMode,
                  activeChatMatchId: matchId,
                  onChatNow: () => {},
                });
              }
            }}
          >
            <View style={styles.headerAvatarWrapper}>
              {partnerProfile?.photos[0] ? (
                <SkeletonImage source={{ uri: partnerProfile.photos[0] }} style={styles.chatHeaderAvatar} />
              ) : (
                <View style={styles.fallbackHeaderAvatar}>
                  <User size={18} color={COLORS.textDarkSecondary} />
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.chatHeaderName}>{partnerProfile?.full_name}</Text>
              <Text style={styles.chatHeaderStatus}>Online</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.chatHeaderActions}>
            {/* Dynamic Lucide Archetype Match Score Badge */}
            {(() => {
              const archetype = getMatchArchetype(similarityScore || 0.85);
              return <ArchetypePillBadge archetype={archetype} size="md" />;
            })()}

            <TouchableOpacity style={styles.unmatchIconBtn} onPress={handleUnmatch} activeOpacity={0.7}>
              <Trash2 size={18} color={COLORS.danger} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Stream */}
        <ScrollView
          ref={chatScrollViewRef}
          style={styles.chatMessagesScroll}
          contentContainerStyle={styles.chatMessagesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Lucide Archetype Match Intro Banner */}
          {(() => {
            const archetype = getMatchArchetype(similarityScore || 0.85);
            return (
              <View style={[styles.archetypeIntroBanner, { backgroundColor: archetype.bgColor }]}>
                <View style={styles.archetypeIntroTitleRow}>
                  <ArchetypeIcon type={archetype.type} size={14} color={archetype.textColor} />
                  <Text style={[styles.archetypeIntroTitle, { color: archetype.textColor }]}>
                    {archetype.label} Match
                  </Text>
                </View>
                <Text style={[styles.archetypeIntroDesc, { color: archetype.textColor }]}>
                  {archetype.type === 'twin_flame' &&
                    `You and ${partnerProfile?.full_name?.split(' ')[0] || 'your match'} shared high-vibe similar reels yesterday!`}
                  {archetype.type === 'chemistry' &&
                    `Great chemistry and shared aesthetic energy with ${partnerProfile?.full_name?.split(' ')[0] || 'your match'}.`}
                  {archetype.type === 'opposites_attract' &&
                    'Opposites attract! Your video tastes are totally different worlds — break the ice!'}
                </Text>
              </View>
            );
          })()}
          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            const parsed = parseReferredMessage(msg.content);
            const typeLabel = parsed.url?.includes('/reel/') ? 'Reel' : 'Post';
            return (
              <View
                key={msg.id}
                style={[
                  styles.msgBubbleRow,
                  isMine ? styles.msgBubbleRowMine : styles.msgBubbleRowPartner,
                ]}
              >
                <View
                  style={[
                    styles.msgBubble,
                    isMine ? styles.msgBubbleMine : styles.msgBubblePartner,
                  ]}
                >
                  {parsed.isReferred && (
                    <TouchableOpacity
                      style={styles.msgQuoteBlock}
                      onPress={() => {
                        if (parsed.url) {
                          Linking.openURL(parsed.url).catch(() =>
                            Alert.alert('Error', 'Cannot open Instagram link.')
                          );
                        }
                      }}
                    >
                      <View style={styles.msgQuoteContentRow}>
                        <View style={styles.msgQuoteTextWrapper}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Film size={12} color={COLORS.accent} />
                            <Text style={styles.msgQuoteType} numberOfLines={1}>
                              Shared {typeLabel}
                            </Text>
                          </View>
                        </View>
                        <InstagramThumbnail url={parsed.url} size={32} borderRadius={8} />
                      </View>
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextPartner]}>
                    {parsed.message}
                  </Text>
                </View>
                <Text style={styles.msgTime}>{formatMessageTime(msg.created_at)}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Collapsible Shared Reels Content panel */}
        {partnerHistory.length > 0 && (
          <View style={styles.likedContentPanel}>
            <View style={styles.likedContentHeader}>
              <TouchableOpacity
                style={styles.likedContentTitleRow}
                onPress={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                activeOpacity={0.7}
              >
                <Film size={15} color={COLORS.accent} />
                <Text style={styles.likedContentTitle} numberOfLines={1}>
                  {partnerProfile?.full_name}'s Shared Reels ({partnerHistory.length})
                </Text>
                {isHistoryCollapsed ? (
                  <ChevronDown size={14} color={COLORS.textDarkSecondary} />
                ) : (
                  <ChevronUp size={14} color={COLORS.textDarkSecondary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sparkleBtn}
                onPress={() => setShowCompareSheet(true)}
                activeOpacity={0.75}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Sparkles size={16} color={COLORS.primaryText} fill={COLORS.accent} />
              </TouchableOpacity>
            </View>

            {!isHistoryCollapsed && (
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.likedCardsScroll}
                >
                  {partnerHistory.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.simpleThumbWrapper}
                      onPress={() => setReferredReel(item)}
                      onLongPress={() => {
                        if (item.url) {
                          Linking.openURL(item.url).catch(() =>
                            Alert.alert('Error', 'Cannot open Instagram link.')
                          );
                        }
                      }}
                    >
                      <InstagramThumbnail
                        url={item.url}
                        thumbnailUrl={item.thumbnail_url}
                        width={70}
                        height={105}
                        borderRadius={12}
                      />
                      <View style={styles.simpleThumbBadge}>
                        {item.type === 'reel' ? (
                          <Film size={10} color={COLORS.white} />
                        ) : (
                          <Camera size={10} color={COLORS.white} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Referred Reel Banner */}
        {referredReel && (
          <View style={styles.referredReelBanner}>
            <InstagramThumbnail
              url={referredReel.url}
              thumbnailUrl={referredReel.thumbnail_url}
              size={28}
              borderRadius={6}
            />
            <View style={styles.referredReelBannerLeft}>
              <Text style={styles.referredReelBannerTitle} numberOfLines={1}>
                Replying to {referredReel.type === 'reel' ? 'Reel' : 'Post'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.referredReelBannerClose}
              onPress={() => setReferredReel(null)}
            >
              <X size={14} color={COLORS.textDarkSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Chat Input Bar */}
        <View style={styles.chatInputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textDarkSecondary}
            value={typedMessage}
            onChangeText={setTypedMessage}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !typedMessage.trim() && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!typedMessage.trim()}
            activeOpacity={0.8}
          >
            <Send size={18} color={COLORS.textDark} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Compare Our Vibes Modal Sheet (Real DB Data) */}
      <CompareVibesSheet
        visible={showCompareSheet}
        onClose={() => setShowCompareSheet(false)}
        currentUserId={currentUserId}
        partnerProfile={partnerProfile}
        score={similarityScore || 0.85}
        isDemoMode={isDemoMode}
        onStartChatWithPrompt={(prompt) => {
          setTypedMessage(prompt);
          setShowCompareSheet(false);
        }}
      />
    </View>
  </BottomSheetModalProvider>
);
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 12,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
  },
  circularBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...SHADOWS.sm,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
  },
  chatUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  chatHeaderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  fallbackHeaderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.cardBgIvory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chatHeaderStatus: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '700',
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerScoreBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  unmatchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBgIvory,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  chatMessagesScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatMessagesContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  archetypeIntroBanner: {
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 18,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  archetypeIntroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  archetypeIntroTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  archetypeIntroDesc: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  msgBubbleRow: {
    marginBottom: 12,
    maxWidth: '78%',
  },
  msgBubbleRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgBubbleRowPartner: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  msgBubbleMine: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
    ...SHADOWS.sm,
  },
  msgBubblePartner: {
    backgroundColor: COLORS.cardBgIvory,
    borderBottomLeftRadius: 4,
    ...SHADOWS.sm,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  msgTextMine: {
    color: COLORS.textDark,
    fontWeight: '500',
  },
  msgTextPartner: {
    color: COLORS.textDark,
  },
  msgTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginHorizontal: 4,
  },
  accordionRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: COLORS.bg,
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: COLORS.textDark,
    fontSize: 15,
    maxHeight: 100,
    ...SHADOWS.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  likedContentPanel: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.lg,
    marginHorizontal: 16,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  likedContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 16,
  },
  likedContentTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  likedContentEmoji: {
    fontSize: 14,
  },
  likedContentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  likedCardsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  simpleThumbWrapper: {
    position: 'relative',
    marginRight: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBg,
    ...SHADOWS.sm,
  },
  simpleThumbBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(35, 29, 56, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleThumbBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  referredReelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.md,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...SHADOWS.sm,
  },
  referredReelBannerLeft: {
    flex: 1,
    marginHorizontal: 8,
  },
  referredReelBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  referredReelBannerClose: {
    padding: 4,
  },
  msgQuoteBlock: {
    backgroundColor: 'rgba(35, 29, 56, 0.08)',
    borderRadius: RADIUS.sm,
    padding: 8,
    marginBottom: 8,
  },
  msgQuoteType: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  msgQuoteContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  msgQuoteTextWrapper: {
    flex: 1,
  },
  thumbContainer: {
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBgHover,
  },
  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBgHover,
  },
});
