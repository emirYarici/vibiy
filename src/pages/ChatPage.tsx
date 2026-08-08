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
  SafeAreaView,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Send, User, Trash2, X, ChevronDown, ChevronUp, ArrowLeft, Play } from 'lucide-react-native';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS } from '../shared/theme';
import { CONFIG } from '../shared/config';
import { DBProfile, MatchRecord, MessageRecord, ShareHistoryItem } from '../shared/types';
import {
  DEMO_PROFILES,
  DEFAULT_DEMO_MESSAGES,
  DEMO_PARTNER_HISTORY,
} from '../shared/mockData';
import { parseReferredMessage } from './MatchesPage'; // Re-use helper since it parses message reels cleanly

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
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.thumbFallback}>
          <Play size={Math.min(w, h) * 0.35} color={COLORS.textMuted} fill={COLORS.textMuted} />
        </View>
      </View>
      {thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      )}
    </View>
  );
};

export default function ChatPage({ route, navigation }: ChatPageProps) {
  const { matchId, session, isDemoMode } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<DBProfile | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [typedMessage, setTypedMessage] = useState('');

  // Liked/Shared Reels History
  const [partnerHistory, setPartnerHistory] = useState<ShareHistoryItem[]>([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [referredReel, setReferredReel] = useState<ShareHistoryItem | null>(null);

  const chatScrollViewRef = useRef<ScrollView>(null);
  const currentUserId = session?.user?.id || 'demo-guest-user';

  // Load chat profile details, message stream, and partner shared reels
  const fetchChatDetails = useCallback(async () => {
    try {
      setLoading(true);

      if (isDemoMode || !isSupabaseConfigured) {
        // --- DEMO MODE MOCKS ---
        const localMatchesStr = await AsyncStorage.getItem('@demo_matches');
        const localMatches: MatchRecord[] = localMatchesStr ? JSON.parse(localMatchesStr) : [];
        const activeMatch = localMatches.find((m) => m.id === matchId) || null;
        setMatch(activeMatch);

        if (activeMatch) {
          const partnerId = activeMatch.user_a === currentUserId ? activeMatch.user_b : activeMatch.user_a;
          const pProfile = DEMO_PROFILES.find((p) => p.id === partnerId) || null;
          setPartnerProfile(pProfile);

          // Fetch local demo messages
          const localMessagesStr = await AsyncStorage.getItem('@demo_messages');
          const allMessages: MessageRecord[] = localMessagesStr
            ? JSON.parse(localMessagesStr)
            : DEFAULT_DEMO_MESSAGES;
          const filteredMessages = allMessages.filter((m) => m.match_id === matchId);
          setMessages(filteredMessages);

          // Fetch partner liked history
          setPartnerHistory(DEMO_PARTNER_HISTORY[partnerId] || []);
        }
        setLoading(false);
        return;
      }

      // --- REAL DATABASE OPERATION ---
      // 1. Fetch match record
      const { data: dbMatch, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      setMatch(dbMatch);

      if (dbMatch) {
        const partnerId = dbMatch.user_a === currentUserId ? dbMatch.user_b : dbMatch.user_a;

        // 2. Fetch partner profile
        const { data: dbProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, age, bio, photos')
          .eq('id', partnerId)
          .single();

        if (profileError) throw profileError;
        setPartnerProfile(dbProfile);

        // 3. Fetch message log
        const { data: dbMessages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(dbMessages || []);

        // 4. Fetch partner shared Reels history
        const { data: historyData, error: historyError } = await supabase
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
          .eq('user_id', partnerId)
          .order('created_at', { ascending: false });

        if (historyError) throw historyError;

        if (historyData) {
          const formatted: ShareHistoryItem[] = historyData
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

              const timeStr = new Date(item.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return {
                id: video.id || item.id,
                url,
                timestamp: timeStr,
                type,
                shortcode,
                summary: video.summary || undefined,
                username: video.username || undefined,
                thumbnail_url: video.thumbnail_url || undefined,
              };
            });
          setPartnerHistory(formatted);
        }
      }
    } catch (err: any) {
      console.error('Failed to load chat details:', err.message);
      Alert.alert('Error', 'Unable to fetch conversation.');
    } finally {
      setLoading(false);
    }
  }, [matchId, currentUserId, isDemoMode]);

  useEffect(() => {
    fetchChatDetails();
  }, [fetchChatDetails]);

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

            setMessages((prev) => {
              // De-duplicate any optimistic local inserts
              const filtered = prev.filter(
                (m) =>
                  !(
                    m.id.startsWith('temp-') &&
                    m.sender_id === newMsg.sender_id &&
                    m.content === newMsg.content
                  )
              );
              if (filtered.some((m) => m.id === newMsg.id)) {
                return filtered;
              }
              return [...filtered, newMsg];
            });
          }
        )
        .subscribe((status) => {
          console.log(`🔌 Realtime message status for match ${matchId}: ${status}`);
        });

      return () => {
        console.log(`🔌 Unsubscribing from Supabase Realtime match channel: ${matchId}`);
        supabase.removeChannel(channel);
      };
    }
  }, [matchId, isDemoMode]);

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
            if (isDemoMode || !isSupabaseConfigured) {
              const localMatchesStr = await AsyncStorage.getItem('@demo_matches');
              const localMatches: MatchRecord[] = localMatchesStr ? JSON.parse(localMatchesStr) : [];
              const updatedMatches = localMatches.filter((m) => m.id !== matchId);
              await AsyncStorage.setItem('@demo_matches', JSON.stringify(updatedMatches));
              navigation.goBack();
              return;
            }

            const { error } = await supabase
              .from('matches')
              .update({ status: 'unmatched' })
              .eq('id', matchId);

            if (error) throw error;
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

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageRecord = {
      id: tempId,
      match_id: matchId,
      sender_id: currentUserId,
      content: messageContent,
      created_at: new Date().toISOString(),
    };

    // Optimistically update message bubble instantly
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      if (isDemoMode || !isSupabaseConfigured) {
        const localMessagesStr = await AsyncStorage.getItem('@demo_messages');
        const allMessages: MessageRecord[] = localMessagesStr
          ? JSON.parse(localMessagesStr)
          : DEFAULT_DEMO_MESSAGES;
        const updatedMessages = [...allMessages, optimisticMsg];
        await AsyncStorage.setItem('@demo_messages', JSON.stringify(updatedMessages));
        return;
      }

      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: currentUserId,
        content: messageContent,
      });

      if (error) {
        // Rollback state if database insert failed
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw error;
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
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
    <SafeAreaView style={styles.chatContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{ flex: 1 }}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatUserBtn}
            onPress={() => {
              if (partnerProfile) {
                navigation.navigate('ProfileDetails', {
                  profile: partnerProfile,
                  activeChatMatchId: matchId,
                  onChatNow: () => {},
                });
              }
            }}
          >
            {partnerProfile?.photos[0] ? (
              <Image source={{ uri: partnerProfile.photos[0] }} style={styles.chatHeaderAvatar} />
            ) : (
              <View style={styles.fallbackHeaderAvatar}>
                <User size={16} color={COLORS.textMuted} />
              </View>
            )}
            <View>
              <Text style={styles.chatHeaderName}>{partnerProfile?.full_name}</Text>
              <Text style={styles.chatHeaderStatus}>View Profile</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.chatHeaderActions}>
            {/* Match Score Badge */}
            {similarityScore > 0 && (
              <View style={styles.headerScoreBadge}>
                <Text style={styles.headerScoreText}>
                  {(similarityScore * 100).toFixed(0)}% Match
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.unmatchIconBtn} onPress={handleUnmatch}>
              <Trash2 size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Stream */}
        <ScrollView
          ref={chatScrollViewRef}
          style={styles.chatMessagesScroll}
          contentContainerStyle={styles.chatMessagesContent}
        >
          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            const parsed = parseReferredMessage(msg.content);
            const typeLabel = parsed.url?.includes('/reel/') ? 'REEL' : 'POST';
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
                          <Text style={styles.msgQuoteType} numberOfLines={1}>
                            🎬 SHARED {typeLabel}
                          </Text>
                        </View>
                        <InstagramThumbnail url={parsed.url} size={32} />
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
            <TouchableOpacity
              style={styles.likedContentHeader}
              onPress={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
            >
              <View style={styles.likedContentTitleRow}>
                <Text style={styles.likedContentEmoji}>🎬</Text>
                <Text style={styles.likedContentTitle}>
                  {partnerProfile?.full_name}'s Shared Reels ({partnerHistory.length})
                </Text>
              </View>
              {isHistoryCollapsed ? (
                <ChevronDown size={14} color={COLORS.textSecondary} />
              ) : (
                <ChevronUp size={14} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>

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
                        borderRadius={10}
                      />
                      <View style={styles.simpleThumbBadge}>
                        <Text style={styles.simpleThumbBadgeText}>
                          {item.type === 'reel' ? '🎬' : '📸'}
                        </Text>
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
              <X size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Chat Input Bar */}
        <View style={styles.chatInputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type your message..."
            placeholderTextColor={COLORS.textMuted}
            value={typedMessage}
            onChangeText={setTypedMessage}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !typedMessage.trim() && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!typedMessage.trim()}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    color: COLORS.textMuted,
    marginTop: 12,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
  },
  chatUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    marginRight: 10,
  },
  fallbackHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBgHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: '800',
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
    gap: 12,
  },
  headerScoreBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerScoreText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  unmatchIconBtn: {
    padding: 6,
  },
  chatMessagesScroll: {
    flex: 1,
    padding: 16,
  },
  chatMessagesContent: {
    paddingBottom: 24,
  },
  msgBubbleRow: {
    marginBottom: 12,
    maxWidth: '80%',
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
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  msgBubbleMine: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 2,
  },
  msgBubblePartner: {
    backgroundColor: COLORS.cardBgHover,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 18,
  },
  msgTextMine: {
    color: '#FFFFFF',
  },
  msgTextPartner: {
    color: COLORS.textPrimary,
  },
  msgTime: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: COLORS.textPrimary,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  likedContentPanel: {
    borderTopWidth: 1.5,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
  },
  likedContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  likedContentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likedContentEmoji: {
    fontSize: 14,
  },
  likedContentTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  likedCardsScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  simpleThumbWrapper: {
    position: 'relative',
    marginRight: 4,
    borderRadius: 10,
    backgroundColor: COLORS.cardBg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  simpleThumbBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(30, 31, 35, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simpleThumbBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  referredReelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBgHover,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  referredReelBannerLeft: {
    flex: 1,
    marginRight: 12,
  },
  referredReelBannerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  referredReelBannerClose: {
    padding: 4,
  },
  msgQuoteBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: RADIUS.sm,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  msgQuoteType: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.accent,
    marginBottom: 2,
    letterSpacing: 0.5,
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
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBgHover,
  },
  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBgHover,
  },
});
