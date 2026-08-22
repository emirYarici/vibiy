import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Camera } from 'lucide-react-native';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate as reanimatedInterpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SHADOWS } from '../../shared/theme';
import SkeletonImage from '../../shared/ui/SkeletonImage/SkeletonImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.82);
const PREVIEW_CARD_HEIGHT = 420;
const PREVIEW_GAP = 14;
const PREVIEW_ITEM_SIZE = PREVIEW_CARD_WIDTH + PREVIEW_GAP;
const PREVIEW_CAROUSEL_PADDING_HORIZONTAL = (SCREEN_WIDTH - PREVIEW_CARD_WIDTH) / 2;

interface PreviewPhotoCarouselItemProps {
  photoUri: string;
  index: number;
  total: number;
  scrollX: SharedValue<number>;
}

function PreviewPhotoCarouselItem({
  photoUri,
  index,
  total,
  scrollX,
}: PreviewPhotoCarouselItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * PREVIEW_ITEM_SIZE,
      index * PREVIEW_ITEM_SIZE,
      (index + 1) * PREVIEW_ITEM_SIZE,
    ];

    const scale = reanimatedInterpolate(
      scrollX.value,
      inputRange,
      [0.90, 1, 0.90],
      Extrapolation.CLAMP
    );

    const rotateY = reanimatedInterpolate(
      scrollX.value,
      inputRange,
      [-14, 0, 14],
      Extrapolation.CLAMP
    );

    const opacity = reanimatedInterpolate(
      scrollX.value,
      inputRange,
      [0.7, 1, 0.7],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { scale },
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  const isCover = index === 0;

  return (
    <AnimatedReanimated.View
      style={[
        styles.previewCarouselCardWrapper,
        { marginRight: index === total - 1 ? 0 : PREVIEW_GAP },
        animatedStyle,
      ]}
    >
      <View style={styles.previewSlotCard}>
        <SkeletonImage source={{ uri: photoUri }} style={styles.previewSlotImage} />

        {/* Counter Badge on Top Right */}
        {total > 1 && (
          <View style={styles.previewCounterBadge}>
            <Text style={styles.previewCounterText}>
              {index + 1} / {total}
            </Text>
          </View>
        )}

        {/* Secondary Photo Badge on Bottom Left */}
        {!isCover && (
          <View style={styles.previewSlotBadge}>
            <Text style={styles.previewSlotBadgeText}>Photo {index + 1}</Text>
          </View>
        )}
      </View>
    </AnimatedReanimated.View>
  );
}

interface ProfilePreviewProps {
  previewList: string[];
  displayName: string;
  userAge: string;
  displayHandle: string;
  displayBio: string;
}

export default function ProfilePreview({
  previewList,
  displayName,
  userAge,
  displayHandle,
  displayBio,
}: ProfilePreviewProps) {
  const previewScrollX = useSharedValue(0);
  const onPreviewScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      previewScrollX.value = event.contentOffset.x;
    },
  });

  const previewSnapOffsets = previewList.map((_, i) => i * PREVIEW_ITEM_SIZE);

  return (
    <View style={styles.previewContainer}>
      {/* Photos Snapping Carousel or Empty Placeholder */}
      <View style={styles.previewCarouselWrapper}>
        {previewList.length > 0 ? (
          <AnimatedReanimated.FlatList
            data={previewList}
            keyExtractor={(_, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToOffsets={previewSnapOffsets}
            decelerationRate="fast"
            nestedScrollEnabled
            contentContainerStyle={[
              styles.previewCarouselContent,
              { paddingHorizontal: PREVIEW_CAROUSEL_PADDING_HORIZONTAL },
            ]}
            onScroll={onPreviewScroll}
            scrollEventThrottle={16}
            renderItem={({ item: photoUri, index }) => (
              <PreviewPhotoCarouselItem
                photoUri={photoUri}
                index={index}
                total={previewList.length}
                scrollX={previewScrollX}
              />
            )}
          />
        ) : (
          <View style={styles.emptyPreviewWrapper}>
            <View style={styles.emptyPreviewCard}>
              <View style={styles.emptyPreviewIconBg}>
                <Camera size={34} color={COLORS.textDark} strokeWidth={2} />
              </View>
              <Text style={styles.emptyPreviewTitle}>No Photos Uploaded</Text>
              <Text style={styles.emptyPreviewSub}>Add photos in the Edit Profile tab to preview your card</Text>
            </View>
          </View>
        )}
      </View>

      {/* Editorial Content Surface */}
      <View style={styles.editorialDetailsCard}>
        {/* Name & Handle */}
        <View style={styles.editorialNameRow}>
          <Text style={styles.editorialName}>
            {displayName} <Text style={styles.editorialAge}>{userAge || '26'}</Text>
          </Text>
          <Text style={styles.editorialHandle}>{displayHandle}</Text>
        </View>

        {/* INTRO */}
        <View style={styles.editorialSection}>
          <Text style={styles.editorialLabel}>INTRO</Text>
          <Text style={styles.editorialIntroText}>{displayBio}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    width: '100%',
    paddingBottom: 40,
  },
  previewCarouselWrapper: {
    height: PREVIEW_CARD_HEIGHT + 20,
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyPreviewWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PREVIEW_CAROUSEL_PADDING_HORIZONTAL,
  },
  emptyPreviewCard: {
    width: PREVIEW_CARD_WIDTH,
    height: PREVIEW_CARD_HEIGHT,
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 2,
    borderColor: 'rgba(51, 16, 5, 0.12)',
    borderStyle: 'dashed',
    ...SHADOWS.md,
  },
  emptyPreviewIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  emptyPreviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyPreviewSub: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  previewCarouselContent: {
    alignItems: 'center',
  },
  previewCarouselCardWrapper: {
    width: PREVIEW_CARD_WIDTH,
    height: PREVIEW_CARD_HEIGHT,
  },
  previewSlotCard: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  previewSlotImage: {
    width: '100%',
    height: '100%',
  },
  previewCounterBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(51, 16, 5, 0.82)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  previewCounterText: {
    color: COLORS.cardBgIvory,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  previewSlotBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(51, 16, 5, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    zIndex: 2,
  },
  previewSlotBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  editorialDetailsCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 2,
    borderColor: 'rgba(51, 16, 5, 0.08)',
    ...SHADOWS.md,
  },
  editorialNameRow: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 16, 5, 0.08)',
    paddingBottom: 16,
  },
  editorialName: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textDark,
    letterSpacing: -0.8,
  },
  editorialAge: {
    fontSize: 22,
    fontWeight: '300',
    color: COLORS.textDarkSecondary,
  },
  editorialHandle: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: '800',
    marginTop: 4,
  },
  editorialSection: {
    marginBottom: 6,
  },
  editorialLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textDarkSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  editorialIntroText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textDark,
    fontWeight: '500',
  },
});
