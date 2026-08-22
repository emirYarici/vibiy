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
  FlatList,
  Dimensions,
} from 'react-native';
import { Film, Camera, Play, Sparkles, Check, Flame, ExternalLink, XCircle, HelpCircle, Zap, X } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';

import AnimatedReanimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate as reanimatedInterpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';

import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { ShareHistoryItem } from '../shared/types';
import { CONFIG } from '../shared/config';
import VideoAnalyzingOverlay from '../features/share-video/ui/VideoAnalyzingOverlay';
import ShareSuccessModal from '../features/share-video/ui/ShareSuccessModal';
import ProcessConfirmSheet from '../features/share-video/ui/ProcessConfirmSheet';
import InvalidUrlSheet from '../features/share-video/ui/InvalidUrlSheet';
import HowToShareSheet from '../features/share-video/ui/HowToShareSheet';
import ShareProgressCard from '../widgets/ShareProgressCard/ShareProgressCard';

import SkeletonImage from '../shared/ui/SkeletonImage/SkeletonImage';
import InstagramThumbnail from '../shared/ui/InstagramThumbnail/InstagramThumbnail';

import { useShareHistoryQuery, useProcessVideoMutation, useDeleteShareHistoryMutation } from '../entities/video/api/useShareHistory';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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
      setShowSuccessModal(true);
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
    if (sharedCount >= 3) {
      Alert.alert(
        'All 3 Slots Filled! 🎉',
        "You've already filled all 3 daily video slots! Your curated match drop will happen tomorrow morning at 9:00 AM.",
        [{ text: 'Got It', style: 'default' }]
      );
      return;
    }
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
    if (sharedCount >= 3) {
      Alert.alert(
        'All 3 Slots Filled! 🎉',
        "You've already filled all 3 daily video slots! Your curated match drop will happen tomorrow morning at 9:00 AM.",
        [{ text: 'Got It', style: 'default' }]
      );
      return;
    }
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
      <ShareSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        sharedCount={sharedCount}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 🎯 "3 Videos to Unlock" Daily Progress Bar Card */}
        <ShareProgressCard
          isDropUnlocked={isDropUnlocked}
          sharedCount={sharedCount}
          todayItems={todayItems}
          handlePaste={handlePaste}
        />

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

      <ProcessConfirmSheet
        sheetRef={confirmSheetRef}
        reelLabel={reelLabel}
        sharedCount={sharedCount}
        pendingUrl={pendingUrl}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        renderBackdrop={renderBackdrop}
      />

      <InvalidUrlSheet
        sheetRef={invalidSheetRef}
        invalidUrl={invalidUrl}
        onDismiss={() => setInvalidUrl(null)}
        renderBackdrop={renderBackdrop}
      />

      <HowToShareSheet
        sheetRef={helpSheetRef}
        renderBackdrop={renderBackdrop}
      />
    </>
  );
}



const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 110,
    backgroundColor: COLORS.bg,
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
