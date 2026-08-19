import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  Easing,
  TouchableWithoutFeedback,
  NativeModules,
  Image,
  Modal,
} from 'react-native';
import { Film, Camera, Play, Sparkles, Check, Flame, ExternalLink, XCircle, HelpCircle, Zap, X } from 'lucide-react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';

import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { ShareHistoryItem } from '../shared/types';
import { CONFIG } from '../shared/config';
import SkeletonImage from '../components/SkeletonImage';
import VideoAnalyzingOverlay from '../components/VideoAnalyzingOverlay';

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
      {thumbnailUrl ? (
        <SkeletonImage
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={styles.thumbFallback}>
          <Play size={Math.min(width, height) * 0.35} color={COLORS.textMuted} fill={COLORS.textMuted} />
        </View>
      )}
    </View>
  );
};

import { useShareHistoryQuery, useProcessVideoMutation, useDeleteShareHistoryMutation } from '../shared/queries/useShareHistory';

// ── Ordinal helper ────────────────────────────────────────────────────────────
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface SharePageProps {
  session?: any;
  initialSharedUrl?: string | null;
  onClearInitialUrl?: () => void;
  history?: ShareHistoryItem[];
  onUpdateHistory?: (history: ShareHistoryItem[]) => void;
  helpSheetRef?: React.RefObject<BottomSheetModal>;
}

export default function SharePage({
  session,
  initialSharedUrl,
  onClearInitialUrl,
  history: propHistory,
  onUpdateHistory,
  helpSheetRef: externalHelpSheetRef,
}: SharePageProps) {
  const [inputText, setInputText] = useState('');
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [invalidUrl, setInvalidUrl] = useState<string | null>(null);
  const confirmSheetRef = useRef<BottomSheetModal>(null);
  const invalidSheetRef = useRef<BottomSheetModal>(null);
  const localHelpSheetRef = useRef<BottomSheetModal>(null);
  const helpSheetRef = externalHelpSheetRef || localHelpSheetRef;

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

  const buttonScale = useRef(new Animated.Value(1)).current;

  // Listen to initialSharedUrl passed from root and process immediately
  useEffect(() => {
    if (initialSharedUrl) {
      if (!initialSharedUrl.includes('instagram.com')) {
        setInvalidUrl(initialSharedUrl);
        invalidSheetRef.current?.present();
      } else {
        processSharedUrl(initialSharedUrl);
      }
      if (onClearInitialUrl) {
        onClearInitialUrl();
      }
    }
  }, [initialSharedUrl]);

  // Actual processing — called only after user confirms
  const executeProcess = async (url: string) => {
    try {
      await processVideoMutation.mutateAsync(url);
      if (onUpdateHistory) {
        onUpdateHistory(queryHistory);
      }
      Alert.alert('Success', 'Instagram video added to your daily drop goal!');
    } catch (err: any) {
      console.error('Error processing shared URL:', err);
      Alert.alert('Processing Failed', err.message || 'Unable to process Instagram video.');
    }
  };

  // Opens confirmation sheet first
  const processSharedUrl = (url: string) => {
    setPendingUrl(url);
    confirmSheetRef.current?.present();
  };

  const handleConfirm = useCallback(() => {
    confirmSheetRef.current?.dismiss();
    if (pendingUrl) {
      executeProcess(pendingUrl);
      setPendingUrl(null);
    }
  }, [pendingUrl]);

  const handleCancel = useCallback(() => {
    confirmSheetRef.current?.dismiss();
    setPendingUrl(null);
  }, []);

  const handleManualSubmit = () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter or paste an Instagram URL.');
      return;
    }
    if (!inputText.includes('instagram.com')) {
      setInvalidUrl(inputText.trim());
      invalidSheetRef.current?.present();
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
    if (!text.trim()) {
      Alert.alert('Clipboard Empty', 'Nothing found in clipboard.');
      return;
    }
    if (text.includes('instagram.com')) {
      setInputText(text);
    } else {
      setInvalidUrl(text.trim());
      invalidSheetRef.current?.present();
    }
  };

  const reelNumber = Math.min(sharedCount + 1, 3);
  const reelLabel = getOrdinal(reelNumber);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
    []
  );

  return (
    <>
      <VideoAnalyzingOverlay visible={isProcessing} />
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
                    <TouchableOpacity
                      style={styles.milestoneThumbContainer}
                      activeOpacity={0.75}
                      onPress={() =>
                        Linking.openURL(item.url).catch(() =>
                          Alert.alert('Error', 'Cannot open Instagram.')
                        )
                      }
                    >
                      <InstagramThumbnail
                        url={item.url}
                        thumbnailUrl={item.thumbnail_url}
                        width={86}
                        height={108}
                        borderRadius={12}
                      />
                      {/* Check badge on top right */}
                      <View style={styles.milestoneCheckBadge}>
                        <Check size={11} color={COLORS.white} strokeWidth={3} />
                      </View>
                      {/* External link hint on bottom right */}
                      <View style={styles.milestoneTapHint}>
                        <ExternalLink size={10} color={COLORS.white} strokeWidth={2.5} />
                      </View>
                    </TouchableOpacity>
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
              placeholderTextColor={COLORS.textDarkSecondary}
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
      </ScrollView>

      {/* ── Confirmation Bottom Sheet ─────────────────────────────────── */}
      <BottomSheetModal
        ref={confirmSheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={confirmStyles.sheetBg}
        handleIndicatorStyle={confirmStyles.handle}
        enablePanDownToClose
      >
        <BottomSheetView style={confirmStyles.content}>
          {/* Icon */}
          <View style={confirmStyles.iconWrap}>
            <Sparkles size={28} color={COLORS.textDark} />
          </View>

          {/* Heading */}
          <Text style={confirmStyles.title}>Share This Reel?</Text>
          <Text style={confirmStyles.body}>
            You are sharing a video.{' '}
            <Text style={confirmStyles.highlight}>
              This will be your {reelLabel} reel of the day!
            </Text>
            {sharedCount < 3
              ? `\n\nYou need ${3 - sharedCount-1} more video${3 - sharedCount-1 === 1 ? '' : 's'} to unlock tomorrow's match drop. 🔥`
              : '\n\nYou\'ve already hit your daily goal! Bonus reel incoming. 🎉'}
          </Text>

          {/* URL pill */}
          {pendingUrl ? (
            <View style={confirmStyles.urlPill}>
              <Text style={confirmStyles.urlText} numberOfLines={1}>
                {pendingUrl.replace('https://www.instagram.com', 'instagram.com')}
              </Text>
            </View>
          ) : null}

          {/* Actions */}
          <View style={confirmStyles.actions}>
            <TouchableOpacity style={confirmStyles.cancelBtn} onPress={handleCancel} activeOpacity={0.75}>
              <Text style={confirmStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={confirmStyles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <Text style={confirmStyles.confirmText}>Share It! 🚀</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ── Invalid URL Bottom Sheet ───────────────────────────────────── */}
      <BottomSheetModal
        ref={invalidSheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={invalidStyles.sheetBg}
        handleIndicatorStyle={confirmStyles.handle}
        enablePanDownToClose
        onDismiss={() => setInvalidUrl(null)}
      >
        <BottomSheetView style={invalidStyles.content}>
          {/* Icon */}
          <View style={invalidStyles.iconWrap}>
            <XCircle size={30} color={COLORS.textDark} />
          </View>

          <Text style={invalidStyles.title}>Not an Instagram URL</Text>
          <Text style={invalidStyles.body}>
            This doesn't look like an Instagram reel link. Please share a URL from{' '}
            <Text style={invalidStyles.highlight}>instagram</Text>.
          </Text>

          {/* Bad URL pill */}
          {invalidUrl ? (
            <View style={invalidStyles.urlPill}>
              <Text style={invalidStyles.urlText} numberOfLines={2}>
                {invalidUrl}
              </Text>
            </View>
          ) : null}

          <Text style={invalidStyles.hint}>
            Example:{' '}
            <Text style={invalidStyles.hintCode}>instagram.com/reel/ABC123</Text>
          </Text>

          <TouchableOpacity
            style={invalidStyles.dismissBtn}
            onPress={() => invalidSheetRef.current?.dismiss()}
            activeOpacity={0.8}
          >
            <Text style={invalidStyles.dismissText}>Got it</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ── How to Share Help Bottom Sheet ─────────────────────────────── */}
      <BottomSheetModal
        ref={helpSheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={helpStyles.sheetBg}
        handleIndicatorStyle={confirmStyles.handle}
        enablePanDownToClose
      >
        <BottomSheetView style={helpStyles.content}>
          {/* Header Icon */}
          <View style={helpStyles.iconWrap}>
            <Zap size={28} color={COLORS.primaryText} fill={COLORS.accent} />
          </View>

          <Text style={helpStyles.title}>How to Share Reels</Text>
          <Text style={helpStyles.subtitle}>
            Share 3 Instagram Reels daily to teach our AI your humor & aesthetic and unlock tomorrow's 9:00 AM match drop!
          </Text>

          {/* Methods Guide */}
          <View style={helpStyles.methodsContainer}>
            {/* Method 1: Direct iOS Share Sheet */}
            <View style={helpStyles.methodCard}>
              <View style={helpStyles.methodHeader}>
                <View style={helpStyles.stepBadge}>
                  <Text style={helpStyles.stepBadgeText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={helpStyles.methodTitle}>Direct Share (Fastest ⚡)</Text>
                  <Text style={helpStyles.methodDesc}>
                    Tap <Text style={helpStyles.boldText}>Share ✈️</Text> on any Reel in Instagram → choose <Text style={helpStyles.boldText}>Share to...</Text> → tap <Text style={helpStyles.boldText}>Vibiy</Text>.
                  </Text>
                </View>
              </View>
            </View>

            {/* Method 2: Copy & Paste Link */}
            <View style={helpStyles.methodCard}>
              <View style={helpStyles.methodHeader}>
                <View style={helpStyles.stepBadge}>
                  <Text style={helpStyles.stepBadgeText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={helpStyles.methodTitle}>Copy & Paste Link 📋</Text>
                  <Text style={helpStyles.methodDesc}>
                    Tap <Text style={helpStyles.boldText}>Share → Copy link</Text> on Instagram, open Vibiy and tap <Text style={helpStyles.boldText}>Paste</Text>.
                  </Text>
                </View>
              </View>
            </View>

            {/* Pro Tip */}
            <View style={helpStyles.proTipCard}>
              <Text style={helpStyles.proTipTitle}>💡 iOS Share Sheet Pro-Tip</Text>
              <Text style={helpStyles.proTipText}>
                Don't see Vibiy in the share sheet? Scroll right, tap <Text style={helpStyles.boldText}>More (⋯)</Text>, and add <Text style={helpStyles.boldText}>Vibiy</Text> to your <Text style={helpStyles.boldText}>Favorites</Text> for 1-tap sharing!
              </Text>
            </View>
          </View>

          {/* Dismiss CTA */}
          <TouchableOpacity
            style={helpStyles.gotItBtn}
            onPress={() => helpSheetRef.current?.dismiss()}
            activeOpacity={0.85}
          >
            <Text style={helpStyles.gotItBtnText}>Got It! Let's Share ✨</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

const helpStyles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.cardBgIvory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 6,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  methodsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  methodCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  methodDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textDarkSecondary,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.textDark,
  },
  proTipCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  proTipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  proTipText: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textDarkSecondary,
  },
  gotItBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  gotItBtnText: {
    color: COLORS.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
});

const invalidStyles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.cardBgIvory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(228, 40, 31, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14,
  },
  highlight: {
    color: COLORS.textDark,
    fontWeight: '800',
  },
  urlPill: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(220,50,50,0.2)',
  },
  urlText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    marginBottom: 28,
    textAlign: 'center',
  },
  hintCode: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  dismissBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
});

const confirmStyles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.cardBgIvory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    width: 40,
  },
  content: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  highlight: {
    color: COLORS.textDark,
    fontWeight: '800',
  },
  urlPill: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 28,
    maxWidth: '100%',
  },
  urlText: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(94, 88, 115, 0.15)',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
});

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
  progressRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  helpQuestionMark: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryText,
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
    gap: 12,
    marginBottom: 16,
  },
  milestoneSlot: {
    flex: 1,
    height: 118,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(51, 16, 5, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  milestoneSlotCompleted: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.cardBg,
    ...SHADOWS.md,
  },
  milestoneThumbWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  milestoneThumbContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTapHint: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.accent,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  milestoneEmptyTrigger: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  milestoneNumberBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  milestoneNumberText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
  milestoneSlotLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  progressTrackBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(51, 16, 5, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  glassCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 24,
    ...SHADOWS.md,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    ...SHADOWS.sm,
  },
  inputHelpBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textDark,
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
