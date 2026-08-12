import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ArrowLeft, MessageCircle, Sparkles } from 'lucide-react-native';

import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { getMatchArchetype } from '../shared/types';
import { ArchetypeIcon } from '../components/ArchetypeBadge';
import SkeletonImage from '../components/SkeletonImage';
import { supabase, isSupabaseConfigured } from '../shared/api/supabase';

interface ProfileDetailsPageProps {
  route?: any;
  navigation?: any;
}

export default function ProfileDetailsPage({ route, navigation }: ProfileDetailsPageProps) {
  const { profile, activeChatMatchId, onChatNow, score, session, isDemoMode } = route?.params || {};
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [matchScore, setMatchScore] = useState<number | null>(
    typeof score === 'number' ? score : null
  );

  const currentUserId = session?.user?.id || 'demo-guest-user';

  useEffect(() => {
    if (typeof score === 'number') {
      setMatchScore(score);
      return;
    }

    // Fetch match similarity score between currentUserId and profile.id if missing
    if (profile?.id && currentUserId && !isDemoMode && isSupabaseConfigured) {
      const fetchScore = async () => {
        try {
          const { data } = await supabase
            .from('matches')
            .select('similarity_score')
            .or(`and(user_a.eq.${currentUserId},user_b.eq.${profile.id}),and(user_a.eq.${profile.id},user_b.eq.${currentUserId})`)
            .maybeSingle();

          if (data?.similarity_score !== undefined && data?.similarity_score !== null) {
            setMatchScore(data.similarity_score);
          }
        } catch (err) {
          console.error('Error fetching profile match score:', err);
        }
      };
      fetchScore();
    }
  }, [score, profile?.id, currentUserId, isDemoMode]);

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
  const handle = `@${name.toLowerCase().replace(/\s+/g, '')}`;
  const bioText = profile?.bio || '';

  const photosList = profile?.photos && profile.photos.length > 0
    ? profile.photos
    : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'];

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.circularBackBtn} onPress={handleBack} activeOpacity={0.8}>
            <ArrowLeft size={22} color="#1C0B05" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{name.split(' ')[0]}'s Profile</Text>
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

            {/* Click Zones to flip photos */}
            {photosList.length > 1 && (
              <View style={styles.clickZones}>
                <TouchableOpacity
                  style={styles.clickZoneLeft}
                  onPress={() => {
                    if (activePhotoIndex > 0) {
                      setActivePhotoIndex(activePhotoIndex - 1);
                    }
                  }}
                />
                <TouchableOpacity
                  style={styles.clickZoneRight}
                  onPress={() => {
                    if (activePhotoIndex < photosList.length - 1) {
                      setActivePhotoIndex(activePhotoIndex + 1);
                    }
                  }}
                />
              </View>
            )}

            {/* Photo Indicators */}
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

            {/* Archetype Floating Pill Badge (Only if real match score exists) */}
            {archetype && (
              <View style={[styles.archetypeBadge, { backgroundColor: archetype.bgColor }]}>
                <ArchetypeIcon type={archetype.type} size={13} color={archetype.textColor} />
                <Text style={[styles.archetypeBadgeText, { color: archetype.textColor }]}>
                  {archetype.badgeText}
                </Text>
              </View>
            )}
          </View>

          {/* Editorial Details Card */}
          <View style={styles.editorialCard}>
            {/* Name & Handle Row */}
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>
                {name} {profile?.age ? <Text style={styles.ageText}>{profile.age}</Text> : null}
              </Text>
              <Text style={styles.handleText}>{handle}</Text>
            </View>

            {/* INTRO Section (Real bio) */}
            {bioText.trim() !== '' && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>INTRO</Text>
                <Text style={styles.introSerifText}>{bioText}</Text>
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
    paddingBottom: 40,
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeIndicatorPip: {
    backgroundColor: '#FFFFFF',
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
  /* Editorial Card */
  editorialCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 24,
    padding: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.sm,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    paddingBottom: 12,
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
    fontSize: 18,
    color: COLORS.textDark,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
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
    marginBottom: 10,
  },
  compareInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  compareInlineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#331005',
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
    marginTop: 14,
    ...SHADOWS.md,
  },
  chatActionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
});
