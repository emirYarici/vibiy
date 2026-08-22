import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Check, ExternalLink, Flame, Sparkles } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate as reanimatedInterpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SHADOWS } from '../../shared/theme';
import { ShareHistoryItem } from '../../shared/types';
import InstagramThumbnail from '../../shared/ui/InstagramThumbnail/InstagramThumbnail';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLOT_CARD_WIDTH = 160;
const SLOT_CARD_HEIGHT = 235;
const SLOT_GAP = 14;
const SLOT_ITEM_SIZE = SLOT_CARD_WIDTH + SLOT_GAP;
const CAROUSEL_PADDING_HORIZONTAL = Math.max(16, (SCREEN_WIDTH - 40 - SLOT_CARD_WIDTH) / 2);
const SNAP_OFFSETS = [0, 1, 2].map((i) => i * SLOT_ITEM_SIZE);

interface SlotCarouselItemProps {
  idx: number;
  index: number;
  scrollX: SharedValue<number>;
  item: ShareHistoryItem | undefined;
  isCompleted: boolean;
  onPaste: () => void;
}

function SlotCarouselItem({
  idx,
  index,
  scrollX,
  item,
  isCompleted,
  onPaste,
}: SlotCarouselItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SLOT_ITEM_SIZE,
      index * SLOT_ITEM_SIZE,
      (index + 1) * SLOT_ITEM_SIZE,
    ];

    // Makes current snapped item significantly bigger (scale 1.15 when centered vs 0.82 when off-center)
    const scale = reanimatedInterpolate(
      scrollX.value,
      inputRange,
      [0.82, 1.15, 0.82],
      Extrapolation.CLAMP
    );

    const rotateY = reanimatedInterpolate(
      scrollX.value,
      inputRange,
      [-24, 0, 24],
      Extrapolation.CLAMP
    );

    const rotateZ = reanimatedInterpolate(
      scrollX.value,
      inputRange,
      [-8, 0, 8],
      Extrapolation.CLAMP
    );

    const opacity = reanimatedInterpolate(
      scrollX.value,
      inputRange,
      [0.65, 1, 0.65],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { scale },
        { rotateY: `${rotateY}deg` },
        { rotate: `${rotateZ}deg` },
      ],
    };
  });

  return (
    <AnimatedReanimated.View
      style={[
        styles.carouselCardWrapper,
        { marginRight: index === 2 ? 0 : SLOT_GAP },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.milestoneSlot,
          isCompleted && styles.milestoneSlotCompleted,
        ]}
      >
        {item ? (
          <TouchableOpacity
            style={styles.milestoneThumbContainer}
            activeOpacity={0.8}
            onPress={() =>
              Linking.openURL(item.url).catch(() =>
                Alert.alert('Error', 'Cannot open Instagram.')
              )
            }
          >
            <InstagramThumbnail
              url={item.url}
              thumbnailUrl={item.thumbnail_url}
              width={SLOT_CARD_WIDTH}
              height={SLOT_CARD_HEIGHT}
              borderRadius={20}
            />
            {/* Slot Badge */}
            <View style={styles.milestoneSlotBadge}>
              <Text style={styles.milestoneSlotBadgeText}>Slot {idx + 1}</Text>
            </View>
            {/* Check badge on top right */}
            <View style={styles.milestoneCheckBadge}>
              <Check size={12} color={COLORS.white} strokeWidth={3} />
            </View>
            {/* Username Footer */}
            {item.username ? (
              <View style={styles.milestoneFooterOverlay}>
                <Text style={styles.milestoneFooterHandle} numberOfLines={1}>
                  @{item.username}
                </Text>
              </View>
            ) : null}
            {/* External link hint on bottom right */}
            <View style={styles.milestoneTapHint}>
              <ExternalLink size={12} color={COLORS.white} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.milestoneEmptyTrigger}
            onPress={onPaste}
            activeOpacity={0.75}
          >
            <View style={styles.milestoneNumberBg}>
              <Text style={styles.milestoneNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.milestoneSlotLabel}>Slot {idx + 1}</Text>
            <Text style={styles.milestoneSlotSubLabel}>Tap to paste Reel 📋</Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedReanimated.View>
  );
}

interface ShareProgressCardProps {
  isDropUnlocked: boolean;
  sharedCount: number;
  todayItems: (ShareHistoryItem | undefined)[];
  handlePaste: () => void;
}

export default function ShareProgressCard({
  isDropUnlocked,
  sharedCount,
  todayItems,
  handlePaste,
}: ShareProgressCardProps) {
  const carouselScrollX = useSharedValue(0);

  const onCarouselScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      carouselScrollX.value = event.contentOffset.x;
    },
  });

  return (
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

      {/* ⭕ Clean SVG Circular Progress Ring */}
      <View style={styles.circularProgressContainer}>
        <View style={styles.svgCircleWrapper}>
          <Svg width={96} height={96} viewBox="0 0 96 96">
            {/* Background Track Circle */}
            <Circle
              cx="48"
              cy="48"
              r="42"
              stroke="rgba(51, 16, 5, 0.1)"
              strokeWidth="8"
              fill="none"
            />
            {/* Active Progress Circle Arc */}
            <Circle
              cx="48"
              cy="48"
              r="42"
              stroke={COLORS.accent}
              strokeWidth="8"
              fill="none"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(sharedCount, 3) / 3)}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
            />
          </Svg>
          <View style={styles.svgCircleCenter}>
            <Text style={styles.svgCircleNumber}>{Math.min(sharedCount, 3)}/3</Text>
            <Text style={styles.svgCircleLabel}>
              {isDropUnlocked ? 'UNLOCKED' : 'GOAL'}
            </Text>
          </View>
        </View>
      </View>

      {/* 3 Milestone Slots Swipable Reanimated Carousel */}
      <View style={styles.carouselWrapper}>
        <AnimatedReanimated.FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => item.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToOffsets={SNAP_OFFSETS}
          decelerationRate="fast"
          nestedScrollEnabled
          contentContainerStyle={[
            styles.carouselContentContainer,
            { paddingHorizontal: CAROUSEL_PADDING_HORIZONTAL },
          ]}
          onScroll={onCarouselScroll}
          scrollEventThrottle={16}
          renderItem={({ item: idx, index }) => (
            <SlotCarouselItem
              idx={idx}
              index={index}
              scrollX={carouselScrollX}
              item={todayItems[idx]}
              isCompleted={idx < sharedCount}
              onPaste={handlePaste}
            />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  carouselWrapper: {
    marginHorizontal: -22,
    marginBottom: 20,
    marginTop: 8,
    height: 280,
    justifyContent: 'center',
  },
  carouselContentContainer: {
    alignItems: 'center',
  },
  carouselCardWrapper: {
    width: SLOT_CARD_WIDTH,
    height: SLOT_CARD_HEIGHT,
  },
  milestoneSlot: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(51, 16, 5, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  milestoneSlotCompleted: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.cardBg,
    ...SHADOWS.lg,
  },
  milestoneThumbContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneSlotBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    zIndex: 2,
  },
  milestoneSlotBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  milestoneTapHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  milestoneCheckBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.accent,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...SHADOWS.sm,
  },
  milestoneFooterOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 1,
  },
  milestoneFooterHandle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  milestoneEmptyTrigger: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  milestoneNumberBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  milestoneNumberText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
  milestoneSlotLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  milestoneSlotSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginTop: 0,
  },
  svgCircleWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svgCircleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgCircleNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  svgCircleLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textDarkSecondary,
    letterSpacing: 0.5,
  },
});
