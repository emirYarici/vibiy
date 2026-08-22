import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate as reanimatedInterpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  MessageCircle,
  Briefcase,
  User,
  Heart,
  MapPin,
  Sparkles,
  Camera,
  Film,
  Play,
  MoreVertical,
  ShieldAlert,
  UserX,
} from 'lucide-react-native';
import { Linking } from 'react-native';

import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { DBProfile, getMatchArchetype } from '../shared/types';
import { ArchetypeIcon } from '../entities/match/ui/ArchetypeBadge';
import SkeletonImage from '../shared/ui/SkeletonImage/SkeletonImage';
import ReportModal from '../features/safety/ui/ReportModal';
import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { useProfile } from '../entities/profile/api/useProfile';
import { useMatchScore, useMatches } from '../entities/match/api/useMatches';
import { usePartnerShareHistory } from '../entities/video/api/useShareHistory';
import { useBlockUser, useUnmatchUser } from '../features/safety/api/useSafety';

interface ProfileDetailsPageProps {
  route?: any;
  navigation?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Centered dimensions with peeking adjacent cards
const PHOTO_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.82);
const PHOTO_CARD_HEIGHT = 420;
const PHOTO_GAP = 14;
const PHOTO_ITEM_SIZE = PHOTO_CARD_WIDTH + PHOTO_GAP;
const PHOTO_CAROUSEL_PADDING_HORIZONTAL = (SCREEN_WIDTH - PHOTO_CARD_WIDTH) / 2;

interface MatchedProfileCarouselItemProps {
  photoUri: string;
  index: number;
  total: number;
  scrollX: SharedValue<number>;
  archetype?: any;
}

function MatchedProfileCarouselItem({
  photoUri,
  index,
  total,
  scrollX,
  archetype,
}: MatchedProfileCarouselItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * PHOTO_ITEM_SIZE,
      index * PHOTO_ITEM_SIZE,
      (index + 1) * PHOTO_ITEM_SIZE,
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
        styles.carouselCardWrapper,
        { marginRight: index === total - 1 ? 0 : PHOTO_GAP },
        animatedStyle,
      ]}
    >
      <View style={styles.photoSlotCard}>
        <SkeletonImage source={{ uri: photoUri }} style={styles.photoSlotImage} />

        {/* Counter Badge on Top Right */}
        {total > 1 && (
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>
              {index + 1} / {total}
            </Text>
          </View>
        )}

        {/* Secondary Photo Badge on Bottom Left */}
        {!isCover && (
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>Photo {index + 1}</Text>
          </View>
        )}

        {/* Archetype Floating Pill Badge on Cover Photo */}
        {isCover && archetype && (
          <View style={[styles.archetypeBadge, { backgroundColor: archetype.bgColor }]}>
            <ArchetypeIcon type={archetype.type} size={13} color={archetype.textColor} />
            <Text style={[styles.archetypeBadgeText, { color: archetype.textColor }]}>
              {archetype.badgeText}
            </Text>
          </View>
        )}
      </View>
    </AnimatedReanimated.View>
  );
}

export default function ProfileDetailsPage({ route, navigation }: ProfileDetailsPageProps) {
  const { profile: initialProfile, activeChatMatchId, onChatNow, score, session, isDemoMode } = route?.params || {};
  
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const photoScrollX = useSharedValue(0);
  const onPhotoScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      photoScrollX.value = event.contentOffset.x;
    },
  });

  const currentUserId = session?.user?.id || 'demo-guest-user';
  const targetUserId = initialProfile?.id;

  const { data: profileFromQuery } = useProfile(targetUserId, isDemoMode);
  const { data: liveScore } = useMatchScore(currentUserId, targetUserId, isDemoMode);
  const { data: userMatchesData } = useMatches(currentUserId, isDemoMode);
  const { data: reelsHistory = [] } = usePartnerShareHistory(targetUserId, isDemoMode);

  const profile = profileFromQuery || initialProfile;
  const matchScore = typeof score === 'number' ? score : (liveScore ?? null);
  const archetype = matchScore !== null ? getMatchArchetype(matchScore) : null;

  const resolvedMatchId = activeChatMatchId || userMatchesData?.matches?.find(
    (m: any) => m.user_a === targetUserId || m.user_b === targetUserId
  )?.id;

  const [showReportModal, setShowReportModal] = useState(false);
  const blockMutation = useBlockUser();
  const unmatchMutation = useUnmatchUser();

  const handleUnmatchUser = () => {
    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch with ${firstName}? This match will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            try {
              if (resolvedMatchId) {
                await unmatchMutation.mutateAsync({
                  userId: currentUserId,
                  matchId: resolvedMatchId,
                  isDemoMode,
                });
              }
              navigation.goBack();
              Alert.alert('Unmatched', `You have unmatched with ${firstName}.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to unmatch.');
            }
          },
        },
      ]
    );
  };

  const handleSafetyOptions = () => {
    Alert.alert(
      'Profile Options',
      `Manage profile for ${name}`,
      [
        {
          text: 'Unmatch User',
          style: 'destructive',
          onPress: handleUnmatchUser,
        },
        {
          text: 'Report Profile',
          style: 'destructive',
          onPress: () => setShowReportModal(true),
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: handleBlockUser,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBlockUser = async () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${name}? You will no longer match with them or see their profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockMutation.mutateAsync({
                blockerId: currentUserId,
                blockedUserId: targetUserId,
                matchId: activeChatMatchId,
                isDemoMode,
              });
              navigation.navigate('Dashboard');
              Alert.alert('User Blocked', 'This user has been blocked.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to block user.');
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChatNow = () => {
    if (onChatNow) {
      onChatNow();
    } else if (resolvedMatchId) {
      navigation.navigate('Chat', {
        matchId: resolvedMatchId,
        session,
        isDemoMode,
      });
    }
  };

  const name = profile?.full_name || 'Anonymous';
  const firstName = name.split(' ')[0];
  const handle = `@${firstName.toLowerCase().replace(/\s+/g, '')}`;
  const bioText = profile?.bio || '';
  const age = profile?.age;
  const occupation = profile?.occupation;
  const gender = profile?.gender;
  const preference = profile?.preference;

  // Filter valid photos
  const validPhotos = (profile?.photos || []).filter(
    (p: any) => typeof p === 'string' && p.trim().length > 0
  );
  const photosList = validPhotos;

  const additionalPhotos = photosList.slice(1);
  const snapOffsets = photosList.map((_: string, i: number) => i * PHOTO_ITEM_SIZE);

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.circularBackBtn} onPress={handleBack} activeOpacity={0.8}>
            <ArrowLeft size={22} color={COLORS.primaryText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{firstName}'s Profile</Text>
          <TouchableOpacity
            style={styles.circularBackBtn}
            onPress={handleSafetyOptions}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ShieldAlert size={19} color={COLORS.primaryText} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Photos Snapping Carousel */}
          <View style={styles.carouselWrapper}>
            {photosList.length > 0 ? (
              <AnimatedReanimated.FlatList
                data={photosList}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToOffsets={snapOffsets}
                decelerationRate="fast"
                nestedScrollEnabled
                contentContainerStyle={[
                  styles.carouselContent,
                  { paddingHorizontal: PHOTO_CAROUSEL_PADDING_HORIZONTAL },
                ]}
                onScroll={onPhotoScroll}
                scrollEventThrottle={16}
                renderItem={({ item: photoUri, index }) => (
                  <MatchedProfileCarouselItem
                    photoUri={photoUri}
                    index={index}
                    total={photosList.length}
                    scrollX={photoScrollX}
                    archetype={archetype}
                  />
                )}
              />
            ) : (
              <View style={[styles.carouselContent, { paddingHorizontal: PHOTO_CAROUSEL_PADDING_HORIZONTAL }]}>
                <View style={[styles.photoSlotCard, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Camera size={30} color={COLORS.textDark} strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.textDark }}>No Photos Added</Text>
                </View>
              </View>
            )}
          </View>

          {/* Main Editorial Details Card */}
          <View style={styles.editorialCard}>
            {/* Name, Age & Handle */}
            <View style={styles.nameRow}>
              <View>
                <Text style={styles.nameText}>
                  {name} {age ? <Text style={styles.ageText}>{age}</Text> : null}
                </Text>
                <Text style={styles.handleText}>{handle}</Text>
              </View>
            </View>

            {/* Basic Info Chips */}
            <View style={styles.chipsContainer}>
              {age && (
                <View style={styles.infoChip}>
                  <Text style={styles.infoChipText}>🎂 {age} years old</Text>
                </View>
              )}
              {gender && (
                <View style={styles.infoChip}>
                  <User size={13} color={COLORS.textDarkSecondary} />
                  <Text style={styles.infoChipText}>
                    {gender === 'man' ? 'Man' : gender === 'woman' ? 'Woman' : 'Non-binary'}
                  </Text>
                </View>
              )}
              {preference && (
                <View style={styles.infoChip}>
                  <Heart size={13} color={COLORS.textDarkSecondary} />
                  <Text style={styles.infoChipText}>
                    Interested in {preference === 'men' ? 'Men' : preference === 'women' ? 'Women' : 'Everyone'}
                  </Text>
                </View>
              )}
              {occupation && (
                <View style={styles.infoChip}>
                  <Briefcase size={13} color={COLORS.textDarkSecondary} />
                  <Text style={styles.infoChipText}>{occupation}</Text>
                </View>
              )}
            </View>

            {/* Real INTRO / Bio Section */}
            {bioText.trim() !== '' && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>ABOUT ME</Text>
                <Text style={styles.introSerifText}>{bioText}</Text>
              </View>
            )}

            {/* Shared Instagram Reels Section */}
            {reelsHistory.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={styles.sectionLabel}>RECENTLY SHARED REELS ({reelsHistory.length})</Text>
                  <Film size={14} color={COLORS.accent} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {reelsHistory.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.reelCard}
                      activeOpacity={0.85}
                      onPress={() => item.url && Linking.openURL(item.url)}
                    >
                      {item.thumbnail_url ? (
                        <SkeletonImage source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      ) : (
                        <View style={styles.reelFallbackBg}>
                          <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                      )}
                      <View style={styles.reelOverlay}>
                        <View style={styles.reelPlayBadge}>
                          <Play size={10} color="#1C0B05" fill="#1C0B05" />
                        </View>
                        {item.summary ? (
                          <Text style={styles.reelSummaryText} numberOfLines={2}>
                            {item.summary}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Archetype Match Insights */}
            {archetype && (
              <View style={styles.insightBox}>
                <View style={styles.insightTitleRow}>
                  <ArchetypeIcon type={archetype.type} size={14} color={COLORS.accent} />
                  <Text style={styles.insightTitle}>{archetype.label} Match</Text>
                </View>
                <Text style={styles.insightText}>
                  {archetype.type === 'twin_flame' &&
                    "You shared almost identical humor & aesthetic energy in yesterday's reels!"}
                  {archetype.type === 'chemistry' &&
                    'Great harmony and shared taste with plenty of exciting new discoveries.'}
                  {archetype.type === 'opposites_attract' &&
                    'Your video tastes are totally different worlds — sparks ready to fly!'}
                </Text>
              </View>
            )}
          </View>

          {/* Additional Photo Showcase Feed (Editorial Full Cards) */}
          {additionalPhotos.length > 0 && (
            <View style={styles.additionalPhotosSection}>
              <Text style={styles.sectionHeading}>
                MORE OF {firstName.toUpperCase()}
              </Text>
              {additionalPhotos.map((photoUri: string, index: number) => (
                <View key={index} style={styles.feedPhotoCard}>
                  <SkeletonImage source={{ uri: photoUri }} style={styles.feedPhotoImage} />
                </View>
              ))}
            </View>
          )}

          {/* Action Chat Button */}
          <TouchableOpacity
            style={styles.chatActionBtn}
            onPress={handleChatNow}
            activeOpacity={0.85}
          >
            <MessageCircle size={20} color={COLORS.textDark} strokeWidth={2.2} />
            <Text style={styles.chatActionBtnText}>Start Conversation</Text>
          </TouchableOpacity>

          {/* Unmatch Action Button (Placed directly below Start Conversation) */}
          <TouchableOpacity
            style={styles.unmatchProfileBtn}
            onPress={handleUnmatchUser}
            activeOpacity={0.75}
          >
            <UserX size={17} color={COLORS.danger || '#E4281F'} strokeWidth={2.2} />
            <Text style={styles.unmatchProfileBtnText}>Unmatch {firstName}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Safety Report & Block Modal */}
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          reporterId={currentUserId}
          reportedUserId={targetUserId}
          reportedUserName={name}
          matchId={activeChatMatchId}
          isDemoMode={isDemoMode}
          onReportSuccess={() => navigation.goBack()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  circularBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardBgIvory,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 90,
  },
  /* Snapping Carousel */
  carouselWrapper: {
    height: 440,
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'visible',
  },
  carouselContent: {
    alignItems: 'center',
    paddingVertical: 10,
    overflow: 'visible',
  },
  carouselCardWrapper: {
    width: PHOTO_CARD_WIDTH,
    height: PHOTO_CARD_HEIGHT,
  },
  photoSlotCard: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBgIvory,
    position: 'relative',
    ...SHADOWS.lg,
  },
  photoSlotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    resizeMode: 'cover',
  },
  counterBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    zIndex: 10,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  photoBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    zIndex: 10,
  },
  photoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  archetypeBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    zIndex: 10,
    ...SHADOWS.sm,
  },
  archetypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  /* Editorial Card */
  editorialCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.sm,
  },
  nameRow: {
    marginBottom: 14,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },
  ageText: {
    fontSize: 22,
    fontWeight: '400',
    color: COLORS.textDarkSecondary,
  },
  handleText: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  infoChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDarkSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  introSerifText: {
    fontSize: 17,
    color: COLORS.textDark,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  /* Reel Cards */
  reelCard: {
    width: 140,
    height: 190,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    ...SHADOWS.md,
  },
  reelFallbackBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(51, 16, 5, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 10,
    justifyContent: 'space-between',
  },
  reelPlayBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  reelSummaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  /* Match Insights */
  insightBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    marginTop: 4,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  insightText: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    lineHeight: 17,
  },
  /* Additional Photos Feed Section */
  additionalPhotosSection: {
    marginTop: 18,
    marginHorizontal: 16,
    gap: 14,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  feedPhotoCard: {
    width: '100%',
    height: 380,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBgIvory,
    ...SHADOWS.md,
  },
  feedPhotoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  /* Action Chat Button */
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.cardBgIvory,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: RADIUS.pill,
    marginTop: 18,
    ...SHADOWS.md,
  },
  chatActionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  /* Unmatch Profile Button */
  unmatchProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.cardBgIvory,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: RADIUS.pill,
    marginTop: 12,
    ...SHADOWS.md,
  },
  unmatchProfileBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.danger || '#E4281F',
  },
});
