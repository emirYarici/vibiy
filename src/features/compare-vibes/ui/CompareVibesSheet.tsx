import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import AppLoader from '../../../shared/ui/AppLoader/AppLoader';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { X, Play, Film } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS } from '../../../shared/theme';
import { CONFIG } from '../../../shared/config';
import { DBProfile, getMatchArchetype, ShareHistoryItem } from '../../../shared/types';
import { ArchetypeIcon } from '../../../entities/match/ui/ArchetypeBadge';
import SkeletonImage from '../../../shared/ui/SkeletonImage/SkeletonImage';
import { fetchUserShareHistory } from '../../../entities/video/api/useShareHistory';

interface CompareVibesSheetProps {
  visible: boolean;
  onClose: () => void;
  currentUserId?: string;
  partnerProfile: DBProfile | null;
  score?: number;
  isDemoMode?: boolean;
  onStartChatWithPrompt?: (prompt: string) => void;
}

const getThumbnailUri = (item: ShareHistoryItem) => {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.url) return `${CONFIG.API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(item.url)}`;
  return null;
};

export default function CompareVibesSheet({
  visible,
  onClose,
  partnerProfile,
  score = 0.85,
  isDemoMode = false,
  onStartChatWithPrompt,
}: CompareVibesSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const [loading, setLoading] = useState(false);
  const [partnerVideos, setPartnerVideos] = useState<ShareHistoryItem[]>([]);

  useEffect(() => {
    if (visible && partnerProfile) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, partnerProfile]);

  useEffect(() => {
    if (!visible || !partnerProfile) return;

    let isMounted = true;
    const loadRealVideos = async () => {
      try {
        setLoading(true);
        const partnerHistory = await fetchUserShareHistory(partnerProfile.id, isDemoMode);

        if (isMounted) {
          setPartnerVideos(partnerHistory);
        }
      } catch (err) {
        console.error('Error fetching partner videos for comparison:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRealVideos();

    return () => {
      isMounted = false;
    };
  }, [visible, partnerProfile?.id, isDemoMode]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.65}
        pressBehavior="close"
      />
    ),
    []
  );

  const archetype = getMatchArchetype(score);
  const partnerName = partnerProfile?.full_name?.split(' ')[0] || 'Match';

  const handleOpenReel = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleClose = () => {
    bottomSheetRef.current?.close();
    onClose();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={(index) => {
        if (index === -1) {
          onClose();
        }
      }}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handleIndicator}
    >
      {/* Header */}
      <View style={styles.sheetHeader}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.sheetTitle}>Shared Vibes</Text>
          <Text style={styles.sheetSubtitle}>
            {partnerName}’s Real Shared Reels
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleClose}
          activeOpacity={0.8}
        >
          <X size={20} color={COLORS.textDark} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Synergy & Archetype Banner */}
        <View style={styles.synergyCard}>
          <View style={styles.synergyHeaderRow}>
            <View style={[styles.archetypeBadge, { backgroundColor: archetype.bgColor }]}>
              <ArchetypeIcon type={archetype.type} size={13} color={archetype.textColor} />
              <Text style={[styles.archetypeBadgeText, { color: archetype.textColor }]}>
                {archetype.badgeText}
              </Text>
            </View>
          </View>

          <Text style={styles.synergyDescription}>
            {archetype.type === 'twin_flame' &&
              'Your shared video histories reflect matching humor, aesthetic taste, and mutual interests.'}
            {archetype.type === 'chemistry' &&
              'Harmonic balance between shared lifestyle reels and exciting discovery points.'}
            {archetype.type === 'opposites_attract' &&
              'Polar opposite video tastes creating an intriguing high-curiosity contrast match!'}
          </Text>
        </View>

        {/* 2. Portrait Reels (Horizontal Scroll) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>
            {partnerName.toUpperCase()}’S SHARED REELS ({partnerVideos.length})
          </Text>

          {loading ? (
            <View style={styles.loaderContainer}>
              <AppLoader size="small" color={COLORS.accent} />
              <Text style={styles.loaderText}>Loading reels...</Text>
            </View>
          ) : partnerVideos.length === 0 ? (
            <View style={styles.emptyVideoBlock}>
              <Film size={24} color={COLORS.textDarkSecondary} />
              <Text style={styles.emptyVideoText}>
                {partnerName} hasn't shared any reels yet today.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalReelsScroll}
            >
              {partnerVideos.map((v, i) => {
                const thumb = getThumbnailUri(v);
                return (
                  <TouchableOpacity
                    key={v.id || i}
                    style={styles.portraitReelCard}
                    activeOpacity={0.9}
                    onPress={() => handleOpenReel(v.url)}
                  >
                    <View style={styles.portraitThumbWrapper}>
                      {thumb ? (
                        <SkeletonImage source={{ uri: thumb }} style={styles.portraitVideoThumb} />
                      ) : (
                        <View style={styles.thumbFallback}>
                          <Play size={28} color={COLORS.accent} fill={COLORS.accent} />
                        </View>
                      )}

                      {/* Gradient Overlay for contrast */}
                      <View style={styles.videoGradientOverlay} />

                      {/* Top Creator Tag */}
                      {v.username && (
                        <View style={styles.usernamePill}>
                          <Text style={styles.usernamePillText}>@{v.username}</Text>
                        </View>
                      )}

                      {/* Bottom Play Badge */}
                      <View style={styles.bottomPlayBadge}>
                        <Play size={13} color={COLORS.white} fill={COLORS.white} />
                        <Text style={styles.watchText}>Watch</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.cardBgIvory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.lg,
  },
  handleIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitleGroup: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  /* Synergy Card */
  synergyCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  synergyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  archetypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  archetypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  synergyDescription: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    lineHeight: 18,
  },
  /* Section Container */
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDarkSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    fontWeight: '600',
  },
  emptyVideoBlock: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  emptyVideoText: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  /* Horizontal Portrait Reels */
  horizontalReelsScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  portraitReelCard: {
    width: 150,
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  portraitThumbWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  portraitVideoThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 5, 2, 0.35)',
  },
  usernamePill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  usernamePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  bottomPlayBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  watchText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
});
