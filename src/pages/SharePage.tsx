import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Clipboard,
  Animated,
  TouchableWithoutFeedback,
  NativeModules,
  Image,
} from 'react-native';
import { Film, Camera, Play, Sparkles, Check, Flame } from 'lucide-react-native';

import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { ShareHistoryItem } from '../shared/types';
import { CONFIG } from '../shared/config';

const getInstagramThumbnail = (url: string) => {
  if (!url) return null;
  return `${CONFIG.API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(url)}`;
};

const InstagramThumbnail = ({
  url,
  thumbnailUrl: directThumbnailUrl,
  width = 54,
  height = 70,
  borderRadius = RADIUS.sm,
}: {
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
}) => {
  const [hasError, setHasError] = useState(false);
  const thumbnailUrl = !hasError
    ? directThumbnailUrl || (url ? getInstagramThumbnail(url) : null)
    : null;

  return (
    <View style={[styles.thumbContainer, { width, height, borderRadius }]}>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.thumbFallback}>
          <Play size={Math.min(width, height) * 0.35} color={COLORS.textMuted} fill={COLORS.textMuted} />
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

import { useShareHistoryQuery, useProcessVideoMutation } from '../shared/queries/useShareHistory';

interface SharePageProps {
  session?: any;
  initialSharedUrl?: string | null;
  onClearInitialUrl?: () => void;
  history?: ShareHistoryItem[];
  onUpdateHistory?: (history: ShareHistoryItem[]) => void;
}

export default function SharePage({
  session,
  initialSharedUrl,
  onClearInitialUrl,
  history: propHistory,
  onUpdateHistory,
}: SharePageProps) {
  const [inputText, setInputText] = useState('');
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);

  // React Query Hook for Shared History & Daily Goal
  const {
    history: queryHistory,
    todayItems,
    todayCount: sharedCount,
    isDropUnlocked,
    progressPercent,
    isFetching,
    refetch,
  } = useShareHistoryQuery(session?.user?.id, !session?.user?.id);

  // Fallback to query history or prop history
  const activeHistory = queryHistory.length > 0 ? queryHistory : propHistory || [];

  // React Query Mutation for processing video
  const processVideoMutation = useProcessVideoMutation(session);
  const isProcessing = processVideoMutation.isPending;

  // Animated values for visual effects
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Listen to initialSharedUrl passed from root and process immediately
  useEffect(() => {
    if (initialSharedUrl) {
      processSharedUrl(initialSharedUrl);
      if (onClearInitialUrl) {
        onClearInitialUrl();
      }
    }
  }, [initialSharedUrl]);

  // Animate card entry when sharedUrl changes
  useEffect(() => {
    if (sharedUrl) {
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(cardScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sharedUrl]);

  const processSharedUrl = async (url: string) => {
    try {
      const result = await processVideoMutation.mutateAsync(url);
      setSharedUrl(url);

      if (onUpdateHistory) {
        onUpdateHistory(queryHistory);
      }

      Alert.alert('Success', 'Instagram video processed successfully!');
    } catch (err: any) {
      console.error('Error processing shared URL:', err);
      Alert.alert('Processing Failed', err.message || 'Unable to process Instagram video.');
    }
  };

  const handleManualSubmit = () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter or paste an Instagram URL.');
      return;
    }
    if (!inputText.includes('instagram.com')) {
      Alert.alert('Invalid URL', 'Please enter a valid Instagram URL (e.g., https://instagram.com/p/...)');
      return;
    }
    processSharedUrl(inputText.trim());
    setInputText('');
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePaste = async () => {
    const text = await Clipboard.getString();
    if (text.includes('instagram.com')) {
      setInputText(text);
    } else {
      Alert.alert('Clipboard Empty', 'Clipboard does not contain an Instagram link.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      {/* 🎯 "3 Videos to Unlock" Daily Progress Bar Card */}
      <View style={[styles.progressCard, isDropUnlocked && styles.progressCardUnlocked]}>
        <View style={styles.progressHeaderRow}>
          <View style={[styles.progressBadge, isDropUnlocked && styles.progressBadgeUnlocked]}>
            {isDropUnlocked ? (
              <Flame size={14} color={COLORS.textDark} fill={COLORS.textDark} />
            ) : (
              <Sparkles size={14} color={COLORS.textDark} />
            )}
            <Text style={styles.progressBadgeText}>
              {isDropUnlocked ? 'DROP UNLOCKED' : 'DAILY MATCH GOAL'}
            </Text>
          </View>
          <View style={[styles.progressPill, isDropUnlocked && styles.progressPillUnlocked]}>
            <Text style={[styles.progressPillText, isDropUnlocked && styles.progressPillTextUnlocked]}>
              {Math.min(sharedCount, 3)}/3
            </Text>
          </View>
        </View>

        <Text style={styles.progressTitle}>
          {isDropUnlocked
            ? "Tomorrow’s Vibe Drop Unlocked! 🔥"
            : `Share ${3 - Math.min(sharedCount, 3)} More Video${3 - Math.min(sharedCount, 3) === 1 ? '' : 's'} Today`}
        </Text>
        <Text style={styles.progressSubtitle}>
          {isDropUnlocked
            ? "You've unlocked tomorrow's 9:00 AM daily match drop. Your latest shared videos are computing your compatibility vectors!"
            : "Share at least 3 videos today so our AI can match you with people who share your humor & aesthetic."}
        </Text>

        {/* 3 Milestone Slots */}
        <View style={styles.milestonesRow}>
          {[0, 1, 2].map((idx) => {
            const item = todayItems[idx];
            const isCompleted = idx < sharedCount;
            return (
              <View
                key={idx}
                style={[
                  styles.milestoneSlot,
                  isCompleted && styles.milestoneSlotCompleted,
                ]}
              >
                {item ? (
                  <View style={styles.milestoneThumbContainer}>
                    <InstagramThumbnail
                      url={item.url}
                      thumbnailUrl={item.thumbnail_url}
                      width={86}
                      height={108}
                      borderRadius={12}
                    />
                    <View style={styles.milestoneCheckBadge}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.milestoneEmptyTrigger}
                    onPress={() => {
                      handlePaste();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.milestoneNumberBg}>
                      <Text style={styles.milestoneNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.milestoneSlotLabel}>Slot {idx + 1}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Progress Track */}
        <View style={styles.progressTrackBg}>
          <View style={[styles.progressTrackFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Input Card */}
      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Share Now!</Text>
        <Text style={styles.cardDescription}>
          Paste an Instagram URL or share directly from Instagram.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="https://www.instagram.com/p/..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {inputText ? (
            <TouchableOpacity onPress={() => setInputText('')} style={styles.clearInputButton}>
              <Text style={styles.clearInputText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handlePaste} style={styles.pasteButton}>
              <Text style={styles.pasteButtonText}>Paste</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableWithoutFeedback
          onPress={handleManualSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={[styles.primaryButton, { transform: [{ scale: buttonScale }] }]}>
            <Text style={styles.primaryButtonText}>
              {isProcessing ? 'Sharing...' : 'Share Now!'}
            </Text>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>

      {/* Shared URL Detail Card */}
      {sharedUrl && (() => {
        const activeItem = activeHistory.find((h: ShareHistoryItem) => h.url === sharedUrl);
        return (
          <Animated.View
            style={[
              styles.sharedCard,
              { opacity: cardOpacity, transform: [{ scale: cardScale }] },
            ]}
          >
            <View style={styles.sharedHeader}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ACTIVE SHARE</Text>
              </View>
              <TouchableOpacity onPress={() => setSharedUrl(null)}>
                <Text style={styles.closeCardText}>Dismiss</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sharedContent}>
              <View style={styles.sharedPreviewRow}>
                <InstagramThumbnail
                  url={sharedUrl}
                  thumbnailUrl={activeItem?.thumbnail_url}
                  width={64}
                  height={84}
                  borderRadius={10}
                />
                <View style={styles.sharedPreviewInfo}>
                  <Text style={styles.sharedUrlLabel}>Received URL</Text>
                  <Text style={styles.sharedUrlText} numberOfLines={2}>
                    {sharedUrl}
                  </Text>
                  {activeItem?.username && (
                    <Text style={styles.sharedAuthorText} numberOfLines={1}>
                      @{activeItem.username}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metaLabel}>Type</Text>
                  <View style={styles.metaTypeRow}>
                    {sharedUrl.includes('/reel/') ? (
                      <>
                        <Film size={14} color={COLORS.accent} />
                        <Text style={styles.metaValue}>Reel</Text>
                      </>
                    ) : (
                      <>
                        <Camera size={14} color={COLORS.accent} />
                        <Text style={styles.metaValue}>Post</Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metaLabel}>Shortcode</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {(() => {
                      const regex = /\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
                      const match = sharedUrl.match(regex);
                      return match ? match[1] : 'Unknown';
                    })()}
                  </Text>
                </View>
              </View>

              <View style={styles.actionBar}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionPrimary]}
                  onPress={() => {
                    Linking.openURL(sharedUrl).catch(() =>
                      Alert.alert('Error', 'Cannot open Instagram app.')
                    );
                  }}
                >
                  <Text style={styles.actionButtonText}>Open Instagram</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionSecondary]}
                  onPress={() => {
                    Clipboard.setString(sharedUrl);
                    Alert.alert('Copied', 'URL copied to clipboard.');
                  }}
                >
                  <Text style={[styles.actionButtonText, styles.actionSecondaryText]}>Copy Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        );
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 110,
    backgroundColor: COLORS.bg,
  },
  progressCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 22,
    marginBottom: 20,
    ...SHADOWS.md,
  },
  progressCardUnlocked: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  progressBadgeUnlocked: {
    backgroundColor: COLORS.accent,
  },
  progressBadgeText: {
    color: COLORS.textDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  progressPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  progressPillUnlocked: {
    backgroundColor: COLORS.accent,
  },
  progressPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  progressPillTextUnlocked: {
    color: COLORS.textDark,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  progressSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textDarkSecondary,
    marginBottom: 18,
  },
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  milestoneSlot: {
    flex: 1,
    height: 116,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneSlotCompleted: {
    borderStyle: 'solid',
    borderColor: COLORS.accent,
    ...SHADOWS.sm,
  },
  milestoneThumbContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.accent,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneEmptyTrigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  milestoneNumberBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDarkSecondary,
  },
  milestoneSlotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
  },
  progressTrackBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  glassCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 24,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.pill,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(94, 88, 115, 0.15)',
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  pasteButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
  },
  pasteButtonText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '800',
  },
  clearInputButton: {
    padding: 8,
  },
  clearInputText: {
    color: COLORS.textDarkSecondary,
    fontSize: 14,
  },
  primaryButton: {
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  primaryButtonText: {
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: '800',
  },
  sharedCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 24,
    marginTop: 20,
    ...SHADOWS.lg,
  },
  sharedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  badgeText: {
    color: COLORS.textDark,
    fontSize: 11,
    fontWeight: '900',
  },
  closeCardText: {
    color: COLORS.textDarkSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sharedContent: {
    width: '100%',
  },
  sharedPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  sharedPreviewInfo: {
    flex: 1,
  },
  sharedUrlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sharedUrlText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
    lineHeight: 18,
  },
  sharedAuthorText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    marginTop: 4,
  },
  metadataGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  metadataItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.textDarkSecondary,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metaTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaValue: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.sm,
  },
  actionSecondary: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(94, 88, 115, 0.15)',
  },
  actionButtonText: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '800',
  },
  actionSecondaryText: {
    color: COLORS.textDark,
  },
  summaryContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 18,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 19,
  },
  historySection: {
    marginTop: 32,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  emptyState: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 30,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  historyThumbWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  historyBadgeOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  historyBadgeText: {
    fontSize: 11,
  },
  thumbContainer: {
    backgroundColor: COLORS.cardBg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(94, 88, 115, 0.1)',
  },
  thumbFallback: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFallbackEmoji: {
    fontSize: 20,
  },
  historyDetails: {
    flex: 1,
  },
  historyShortcode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
  },
  historyArrow: {
    color: COLORS.textDarkSecondary,
    fontSize: 16,
    marginLeft: 8,
  },
});
