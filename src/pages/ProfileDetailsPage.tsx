import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
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
} from 'lucide-react-native';
import { Linking } from 'react-native';

import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { DBProfile, getMatchArchetype } from '../shared/types';
import { ArchetypeIcon } from '../components/ArchetypeBadge';
import SkeletonImage from '../components/SkeletonImage';
import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { useProfile } from '../shared/queries/useProfile';
import { useMatchScore } from '../shared/queries/useMatches';
import { usePartnerShareHistory } from '../shared/queries/useShareHistory';

interface ProfileDetailsPageProps {
  route?: any;
  navigation?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileDetailsPage({ route, navigation }: ProfileDetailsPageProps) {
  const { profile: initialProfile, activeChatMatchId, onChatNow, score, session, isDemoMode } = route?.params || {};
  
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const currentUserId = session?.user?.id || 'demo-guest-user';
  const targetUserId = initialProfile?.id;

  const { data: profileFromQuery } = useProfile(targetUserId, isDemoMode);
  const { data: liveScore } = useMatchScore(currentUserId, targetUserId, isDemoMode);
  const { data: reelsHistory = [] } = usePartnerShareHistory(targetUserId, isDemoMode);

  const profile = profileFromQuery || initialProfile;
  const matchScore = typeof score === 'number' ? score : (liveScore ?? null);
  const archetype = matchScore !== null ? getMatchArchetype(matchScore) : null;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChatNow = () => {
    if (onChatNow) {
      onChatNow();
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
  const photosList = validPhotos.length > 0
    ? validPhotos
    : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'];

  const additionalPhotos = photosList.slice(1);

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.circularBackBtn} onPress={handleBack} activeOpacity={0.8}>
            <ArrowLeft size={22} color={COLORS.primaryText} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{firstName}'s Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Hero Photo Container */}
          <View style={styles.photoWrapper}>
            <SkeletonImage
              source={{ uri: photosList[activePhotoIndex] || photosList[0] }}
              style={styles.heroPhoto}
            />

            {/* Click Zones to flip hero photo */}
            {photosList.length > 1 && (
              <View style={styles.clickZones}>
                <TouchableOpacity
                  style={styles.clickZoneLeft}
                  onPress={() => {
                    if (activePhotoIndex > 0) {
                      setActivePhotoIndex(activePhotoIndex - 1);
                    } else {
                      setActivePhotoIndex(photosList.length - 1);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.clickZoneRight}
                  onPress={() => {
                    if (activePhotoIndex < photosList.length - 1) {
                      setActivePhotoIndex(activePhotoIndex + 1);
                    } else {
                      setActivePhotoIndex(0);
                    }
                  }}
                />
              </View>
            )}

            {/* Top Photo Indicators */}
            {photosList.length > 1 && (
              <View style={styles.indicators}>
                {photosList.map((_: any, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorPip,
                      activePhotoIndex === index && styles.activeIndicatorPip,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Archetype Floating Pill Badge */}
            {archetype && (
              <View style={[styles.archetypeBadge, { backgroundColor: archetype.bgColor }]}>
                <ArchetypeIcon type={archetype.type} size={13} color={archetype.textColor} />
                <Text style={[styles.archetypeBadgeText, { color: archetype.textColor }]}>
                  {archetype.badgeText}
                </Text>
              </View>
            )}
          </View>

          {/* Horizontal Gallery Thumbnails Strip (When user has 2+ photos) */}
          {photosList.length > 1 && (
            <View style={styles.thumbnailStripWrapper}>
              <View style={styles.thumbnailStripHeader}>
                <Camera size={13} color={COLORS.textDarkSecondary} />
                <Text style={styles.thumbnailStripTitle}>
                  PHOTOS ({photosList.length})
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailStripScroll}
              >
                {photosList.map((photoUri: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.thumbCard,
                      activePhotoIndex === idx && styles.activeThumbCard,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setActivePhotoIndex(idx)}
                  >
                    <SkeletonImage source={{ uri: photoUri }} style={styles.thumbImage} />
                    {activePhotoIndex === idx && (
                      <View style={styles.activeThumbOverlay}>
                        <Sparkles size={12} color={COLORS.white} fill={COLORS.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
          {activeChatMatchId === null && (
            <TouchableOpacity
              style={styles.chatActionBtn}
              onPress={handleChatNow}
              activeOpacity={0.85}
            >
              <MessageCircle size={20} color={COLORS.textDark} strokeWidth={2.2} />
              <Text style={styles.chatActionBtnText}>Start Conversation</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  /* Hero Photo */
  photoWrapper: {
    width: '100%',
    height: 420,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.cardBgIvory,
    ...SHADOWS.md,
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  clickZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  clickZoneLeft: {
    flex: 1,
  },
  clickZoneRight: {
    flex: 1,
  },
  indicators: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 6,
  },
  indicatorPip: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  activeIndicatorPip: {
    backgroundColor: COLORS.white,
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
    ...SHADOWS.sm,
  },
  archetypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  /* Thumbnail Gallery Strip */
  thumbnailStripWrapper: {
    marginTop: 12,
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.sm,
  },
  thumbnailStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  thumbnailStripTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textDarkSecondary,
    letterSpacing: 0.8,
  },
  thumbnailStripScroll: {
    gap: 10,
  },
  thumbCard: {
    width: 68,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.cardBg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbCard: {
    borderColor: COLORS.accent,
    ...SHADOWS.sm,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  activeThumbOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Editorial Card */
  editorialCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 24,
    padding: 20,
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
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
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
    borderRadius: RADIUS.pill,
    marginTop: 18,
    ...SHADOWS.md,
  },
  chatActionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
});
