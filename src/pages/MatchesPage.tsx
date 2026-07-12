import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Send, User, Trash2, X, Heart, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react-native';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS } from '../shared/theme';
import { ShareHistoryItem } from '../shared/types';

interface MatchesPageProps {
  session: any;
  isDemoMode: boolean;
  onProfileSheetToggle?: (isOpen: boolean) => void;
}

interface MatchRecord {
  id: string;
  user_a: string;
  user_b: string;
  similarity_score: number;
  status: string;
  created_at: string;
}

interface DBProfile {
  id: string;
  full_name: string;
  age: number;
  bio: string;
  photos: string[];
}

interface MessageRecord {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// --- DEMO MODE MOCKS ---
const DEMO_PROFILES: DBProfile[] = [
  {
    id: 'demo-u1',
    full_name: 'Sarah',
    age: 24,
    bio: 'Product Designer 🎨 • Travel addict ✈️ • Coffee enthusiast ☕. Let\'s exchange playlists!',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600',
    ],
  },
  {
    id: 'demo-u2',
    full_name: 'Liam',
    age: 26,
    bio: 'Software Engineer by day, Rock Climber by night 🧗‍♂️. Craft beer lover. Tell me your favorite travel destination!',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600',
    ],
  },
  {
    id: 'demo-u3',
    full_name: 'Chloe',
    age: 23,
    bio: 'Photography student 📸 • Dog lover 🐶 • Weekend hiker. Looking for someone to capture memories with.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600',
    ],
  },
];

const DEMO_MATCHES: MatchRecord[] = [
  {
    id: 'demo-m1',
    user_a: 'demo-guest-user',
    user_b: 'demo-u1',
    similarity_score: 0.89,
    status: 'active',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-m2',
    user_a: 'demo-guest-user',
    user_b: 'demo-u2',
    similarity_score: 0.82,
    status: 'active',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-m3',
    user_a: 'demo-guest-user',
    user_b: 'demo-u3',
    similarity_score: 0.77,
    status: 'active',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
];

const DEFAULT_DEMO_MESSAGES: MessageRecord[] = [
  {
    id: 'dm-msg1',
    match_id: 'demo-m1',
    sender_id: 'demo-u1',
    content: "Hey! Loved your Instagram reels! Let's match up?",
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'dm-msg2',
    match_id: 'demo-m1',
    sender_id: 'demo-guest-user',
    content: 'Thanks Sarah! Your design style is super cool too!',
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'dm-msg3',
    match_id: 'demo-m2',
    sender_id: 'demo-u2',
    content: 'Are you down for coffee this week? ☕',
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
];

const DEMO_PARTNER_HISTORY: Record<string, ShareHistoryItem[]> = {
  'demo-u1': [
    {
      id: 'h-s1',
      url: 'https://www.instagram.com/reel/C8rXa-vMx72/',
      timestamp: 'Yesterday',
      type: 'reel',
      shortcode: 'C8rXa-vMx72',
      summary: 'Aesthetic travel vlog of Amalfi coast, showing lemons, cliffside towns, and crystal clear Mediterranean waters. 🍋🇮🇹'
    },
    {
      id: 'h-s2',
      url: 'https://www.instagram.com/p/C9Pzm-tsoP2/',
      timestamp: '3 days ago',
      type: 'post',
      shortcode: 'C9Pzm-tsoP2',
      summary: 'Design trends for 2026: focusing on dark mode gradients, clean typography, and interactive interfaces. 🎨✨'
    }
  ],
  'demo-u2': [
    {
      id: 'h-l1',
      url: 'https://www.instagram.com/reel/C7pXx-vMb89/',
      timestamp: '2 days ago',
      type: 'reel',
      shortcode: 'C7pXx-vMb89',
      summary: 'Insane climbing route beta! Climbing a V8 dyno route in a neon bouldering gym. 🧗‍♂️⚡'
    },
    {
      id: 'h-l2',
      url: 'https://www.instagram.com/reel/C6pXx-vMb89/',
      timestamp: '5 days ago',
      type: 'reel',
      shortcode: 'C6pXx-vMb89',
      summary: 'Reviewing top craft breweries in Denver, focusing on citrus notes and rich, foggy IPAs. 🍺🌾'
    }
  ],
  'demo-u3': [
    {
      id: 'h-c1',
      url: 'https://www.instagram.com/p/C8oXa-vMs55/',
      timestamp: 'Yesterday',
      type: 'post',
      shortcode: 'C8oXa-vMs55',
      summary: 'Golden hour portraits shot on 35mm film in Portland, featuring warm lighting and soft grain. 📸🌅'
    },
    {
      id: 'h-c2',
      url: 'https://www.instagram.com/reel/C5oXa-vMs55/',
      timestamp: '1 week ago',
      type: 'reel',
      shortcode: 'C5oXa-vMs55',
      summary: 'Cinematic hike compilation through Yosemite, reaching Glacier Point at sunrise. 🌲🏔️'
    }
  ]
};

export default function MatchesPage({ session, isDemoMode, onProfileSheetToggle, navigation }: MatchesPageProps) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [profiles, setProfiles] = useState<Record<string, DBProfile>>({});
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  
  // Modals & Navigation
  const [activeChatMatchId, setActiveChatMatchId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState('');
  
  // Liked/Shared Reels History
  const [partnerHistory, setPartnerHistory] = useState<ShareHistoryItem[]>([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);

  const chatScrollViewRef = useRef<ScrollView>(null);

  const currentUserId = session?.user?.id || 'demo-guest-user';

  // Load Matches, Profiles, and Messages
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (isDemoMode || !isSupabaseConfigured) {
        // Load from demo constants / local storage
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
        DEMO_PROFILES.forEach(p => {
          profileMap[p.id] = p;
        });
        setProfiles(profileMap);
        setLoading(false);
        return;
      }

      // Fetch Real Matches
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

      // Fetch Messages for these matches
      const matchIds = dbMatches.map(m => m.id);
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
      // Subscribe to real-time messages
      const channel = supabase
        .channel('realtime:messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as MessageRecord;
            setMessages((prev) => {
              // Clean up local optimistic message duplicate if exists
              const filtered = prev.filter(
                (m) => !(m.id.startsWith('temp-') && m.sender_id === newMsg.sender_id && m.content === newMsg.content)
              );
              if (filtered.some((m) => m.id === newMsg.id)) {
                return filtered;
              }
              return [...filtered, newMsg];
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'matches' },
          (payload) => {
            const updatedMatch = payload.new as MatchRecord;
            if (updatedMatch.status !== 'active') {
              // Remove matches that got unmatched in real-time
              setMatches((prev) => prev.filter(m => m.id !== updatedMatch.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchData, isDemoMode]);

  // Scroll Chat to bottom
  useEffect(() => {
    if (activeChatMatchId) {
      setTimeout(() => {
        chatScrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeChatMatchId, messages]);

  // Load partner liked/shared reels when activeChatMatchId changes
  useEffect(() => {
    const fetchPartnerHistory = async () => {
      if (!activeChatMatchId) {
        setPartnerHistory([]);
        return;
      }

      // Find the partner ID
      const match = matches.find((m) => m.id === activeChatMatchId);
      const partnerId = match
        ? match.user_a === currentUserId
          ? match.user_b
          : match.user_a
        : null;

      if (!partnerId) {
        setPartnerHistory([]);
        return;
      }

      if (isDemoMode || !isSupabaseConfigured) {
        // Load from mock data
        setPartnerHistory(DEMO_PARTNER_HISTORY[partnerId] || []);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('userid_videos')
          .select(`
            id,
            created_at,
            videos (
              id,
              url,
              summary
            )
          `)
          .eq('user_id', partnerId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const formatted: ShareHistoryItem[] = data
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

              const timeStr = new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

              return {
                id: video.id || item.id,
                url,
                timestamp: timeStr,
                type,
                shortcode,
                summary: video.summary || undefined,
              };
            });
          setPartnerHistory(formatted);
        }
      } catch (err) {
        console.error('Failed to load partner shared history:', err);
      }
    };

    fetchPartnerHistory();
    setIsHistoryCollapsed(true); // reset collapse state for new chat
  }, [activeChatMatchId, matches, currentUserId, isDemoMode]);

  const handleUnmatch = async (matchId: string) => {
    Alert.alert('Unmatch User', 'Are you sure you want to end this connection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isDemoMode || !isSupabaseConfigured) {
              const updatedMatches = matches.filter(m => m.id !== matchId);
              setMatches(updatedMatches);
              await AsyncStorage.setItem('@demo_matches', JSON.stringify(updatedMatches));
              setActiveChatMatchId(null);
              setSelectedProfile(null);
              return;
            }

            const { error } = await supabase
              .from('matches')
              .update({ status: 'unmatched' })
              .eq('id', matchId);

            if (error) throw error;

            setMatches(prev => prev.filter(m => m.id !== matchId));
            setActiveChatMatchId(null);
            setSelectedProfile(null);
            Alert.alert('Unmatched', 'You have successfully unmatched this user.');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to unmatch.');
          }
        },
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!typedMessage.trim() || !activeChatMatchId) return;

    const messageContent = typedMessage.trim();
    setTypedMessage('');

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageRecord = {
      id: tempId,
      match_id: activeChatMatchId,
      sender_id: currentUserId,
      content: messageContent,
      created_at: new Date().toISOString(),
    };

    // Optimistically update message bubble instantly
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      if (isDemoMode || !isSupabaseConfigured) {
        // Save locally to demo cache
        const updatedMessages = [...messages, optimisticMsg];
        setMessages(updatedMessages);
        await AsyncStorage.setItem('@demo_messages', JSON.stringify(updatedMessages));
        return;
      }

      const { error } = await supabase.from('messages').insert({
        match_id: activeChatMatchId,
        sender_id: currentUserId,
        content: messageContent,
      });

      if (error) {
        // Rollback state if database insert failed
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw error;
      }
    } catch (err: any) {
      // Rollback state if database insert failed
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Failed to send', err.message || 'Check your internet connection.');
    }
  };

  // Group Matches
  const matchedUsers = matches.map((match) => {
    const otherUserId = match.user_a === currentUserId ? match.user_b : match.user_a;
    const otherProfile = profiles[otherUserId];
    const matchMessages = messages.filter(m => m.match_id === match.id);
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
  }).filter(item => item.profile !== undefined);

  // Blended Lists:
  // "New Matches" have no messages exchanged
  const newMatches = matchedUsers.filter(mu => !mu.lastMessage);
  // "Conversations" have at least one message
  const conversations = matchedUsers
    .filter(mu => !!mu.lastMessage)
    .sort((a, b) => {
      const timeA = new Date(a.lastMessage!.created_at).getTime();
      const timeB = new Date(b.lastMessage!.created_at).getTime();
      return timeB - timeA;
    });

  const getChatPartner = () => {
    if (!activeChatMatchId) return null;
    const match = matchedUsers.find(mu => mu.matchId === activeChatMatchId);
    return match ? match.profile : null;
  };

  const getActiveChatMessages = () => {
    return messages.filter(m => m.match_id === activeChatMatchId);
  };

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



  const activeChatPartner = getChatPartner();
  const activeChatMessages = getActiveChatMessages();

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
                            setActiveChatMatchId(match.id);
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
                {conversations.map((item) => (
                  <TouchableOpacity
                    key={item.matchId}
                    style={styles.convoCard}
                    onPress={() => setActiveChatMatchId(item.matchId)}
                  >
                    <Image source={{ uri: item.profile.photos[0] }} style={styles.convoAvatar} />
                    <View style={styles.convoDetails}>
                      <View style={styles.convoRow}>
                        <Text style={styles.convoName}>{item.profile.full_name}</Text>
                        <Text style={styles.convoTime}>
                          {formatMessageTime(item.lastMessage!.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.convoLastMsg} numberOfLines={1}>
                        {item.lastMessage!.sender_id === currentUserId ? 'You: ' : ''}
                        {item.lastMessage!.content}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* --- CHAT MODAL OVERLAY --- */}
      <Modal
        visible={activeChatMatchId !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveChatMatchId(null)}
      >
        <SafeAreaView style={styles.chatContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <TouchableOpacity
                style={styles.chatUserBtn}
                onPress={() => {
                  if (activeChatPartner) {
                    navigation.navigate('ProfileDetails', {
                      profile: activeChatPartner,
                      activeChatMatchId,
                      onChatNow: () => {},
                    });
                  }
                }}
              >
                {activeChatPartner?.photos[0] ? (
                  <Image source={{ uri: activeChatPartner.photos[0] }} style={styles.chatHeaderAvatar} />
                ) : (
                  <View style={styles.fallbackHeaderAvatar}>
                    <User size={16} color={COLORS.textMuted} />
                  </View>
                )}
                <View>
                  <Text style={styles.chatHeaderName}>{activeChatPartner?.full_name}</Text>
                  <Text style={styles.chatHeaderStatus}>View Profile</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.chatHeaderActions}>
                <TouchableOpacity
                  style={styles.unmatchIconBtn}
                  onPress={() => activeChatMatchId && handleUnmatch(activeChatMatchId)}
                >
                  <Trash2 size={18} color={COLORS.danger} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeChatBtn}
                  onPress={() => setActiveChatMatchId(null)}
                >
                  <X size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

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
                      {activeChatPartner?.full_name}'s Shared Reels ({partnerHistory.length})
                    </Text>
                  </View>
                  {isHistoryCollapsed ? (
                    <ChevronDown size={16} color={COLORS.textSecondary} />
                  ) : (
                    <ChevronUp size={16} color={COLORS.textSecondary} />
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
                        <View key={item.id} style={styles.likedContentCard}>
                          <View style={styles.likedCardHeader}>
                            <Text style={styles.likedCardBadge}>
                              {item.type === 'reel' ? '🎬 REEL' : '📸 POST'}
                            </Text>
                            <Text style={styles.likedCardTime}>{item.timestamp}</Text>
                          </View>
                          <Text style={styles.likedCardSummary} numberOfLines={3}>
                            {item.summary || 'Analyzing shared content...'}
                          </Text>
                          <TouchableOpacity
                            style={styles.likedCardBtn}
                            onPress={() => {
                              if (item.url) {
                                Linking.openURL(item.url).catch(() =>
                                  Alert.alert('Error', 'Cannot open Instagram link.')
                                );
                              }
                            }}
                          >
                            <Text style={styles.likedCardBtnText}>Open Instagram</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Message Stream */}
            <ScrollView
              ref={chatScrollViewRef}
              style={styles.chatMessagesScroll}
              contentContainerStyle={styles.chatMessagesContent}
            >
              {activeChatMessages.map((msg) => {
                const isMine = msg.sender_id === currentUserId;
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
                      <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextPartner]}>
                        {msg.content}
                      </Text>
                    </View>
                    <Text style={styles.msgTime}>{formatMessageTime(msg.created_at)}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Chat Input Bar */}
            <View style={styles.chatInputBar}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type your message..."
                placeholderTextColor={COLORS.textMuted}
                value={typedMessage}
                onChangeText={setTypedMessage}
                multiline
                maxHeight={100}
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
      </Modal>
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
    fontWeight: '950',
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

  // --- CHAT MODAL STYLES ---
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    gap: 16,
  },
  unmatchIconBtn: {
    padding: 6,
  },
  closeChatBtn: {
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

  // --- GALLERY MODAL STYLES ---
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalBackgroundBlur: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 24, 40, 0.6)',
  },
  galleryCardContainer: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    width: '100%',
    maxHeight: '90%',
    padding: 24,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.cardBorder,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  galleryHeaderName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  galleryCloseBtn: {
    padding: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
  },
  galleryImageWrapper: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.cardBgHover,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  galleryClickZones: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  clickZoneLeft: {
    flex: 1,
  },
  clickZoneRight: {
    flex: 1,
  },
  galleryIndicators: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  indicatorPip: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: RADIUS.pill,
  },
  activeIndicatorPip: {
    backgroundColor: COLORS.accent,
  },
  galleryMetaScroll: {
    marginTop: 18,
    maxHeight: 180,
  },
  galleryBioTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  galleryBioText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 20,
  },
  galleryChatNowBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  galleryChatNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  likedContentPanel: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
  },
  likedContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  likedContentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likedContentEmoji: {
    fontSize: 16,
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
    paddingBottom: 16,
    gap: 12,
  },
  likedContentCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    padding: 12,
    width: 250,
  },
  likedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  likedCardBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  likedCardTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  likedCardSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
    height: 48,
  },
  likedCardBtn: {
    backgroundColor: COLORS.cardBgHover,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 6,
    alignItems: 'center',
  },
  likedCardBtnText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.cardBorder,
  },
  detailsBackBtn: {
    padding: 8,
  },
  detailsHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsScroll: {
    paddingBottom: 40,
  },
  detailsPhotoWrapper: {
    width: '100%',
    aspectRatio: 0.9,
    position: 'relative',
    backgroundColor: '#000000',
  },
  detailsImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailsClickZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  detailsIndicators: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 6,
  },
  detailsPip: {
    flex: 1,
    height: 3,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  detailsActivePip: {
    backgroundColor: '#FFFFFF',
  },
  detailsMetaCard: {
    padding: 24,
    gap: 16,
  },
  detailsName: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  detailsAge: {
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  detailsBioLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  detailsBioText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  detailsChatBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  detailsChatBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
