import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MessageCircle, Film, Sparkles } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS } from '../../../shared/theme';
import { DBProfile, getMatchArchetype } from '../../../shared/types';
import { ArchetypeIcon } from './ArchetypeBadge';
import SkeletonImage from '../../../shared/ui/SkeletonImage/SkeletonImage';

interface DailyMatchCardProps {
  matchId: string;
  profile: DBProfile;
  score: number;
  onOpenProfile: (profile: DBProfile, score: number) => void;
  onCompareVibes: (profile: DBProfile, score: number) => void;
  onStartChat: (profile: DBProfile) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const DAILY_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.84);
export const DAILY_CARD_HEIGHT = 470;

export default function DailyMatchCard({
  matchId,
  profile,
  score,
  onOpenProfile,
  onCompareVibes,
  onStartChat,
}: DailyMatchCardProps) {
  const archetype = getMatchArchetype(score);
  const photoUri =
    profile.photos && profile.photos.length > 0
      ? profile.photos[0]
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';

  const firstName = profile.full_name?.split(' ')[0] || 'Friend';
  const matchPercent = Math.round(score * 100);

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.touchableArea}
        activeOpacity={0.92}
        onPress={() => onOpenProfile(profile, score)}
      >
        {/* Background Image */}
        <SkeletonImage source={{ uri: photoUri }} style={styles.cardImage} />

        {/* Top Badges Row */}
        <View style={styles.topBadgesRow}>
          {/* Unified Match Rate & Type Pill */}
          <View style={[styles.archetypePill, { backgroundColor: archetype.bgColor }]}>
            <ArchetypeIcon type={archetype.type} size={12} color={archetype.textColor} />
            <Text style={[styles.archetypePillText, { color: archetype.textColor }]}>
              {matchPercent}% {archetype.label}
            </Text>
          </View>
        </View>

        {/* Bottom Profile Details */}
        <View style={styles.bottomContent}>
          {/* Big Typography Name & Age */}
          <View style={styles.nameAgeRow}>
            <Text style={styles.heroName} numberOfLines={1}>
              {firstName} <Text style={styles.heroAge}>{profile.age || 24}</Text>
            </Text>
          </View>

          {/* Bio Description Snippet */}
          <Text style={styles.bioSnippet} numberOfLines={2} ellipsizeMode="tail">
            {profile.bio || 'Hey there! Lets connect and share our favorite reels.'}
          </Text>

          {/* Quick Actions Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.comparePillBtn}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                onCompareVibes(profile, score);
              }}
            >
              <Film size={13} color={COLORS.white} />
              <Text style={styles.comparePillText}>Compare Vibes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatPillBtn}
              activeOpacity={0.85}
              onPress={(e) => {
                e.stopPropagation();
                onStartChat(profile);
              }}
            >
              <MessageCircle size={14} color={COLORS.primaryText} strokeWidth={2.5} />
              <Text style={styles.chatPillText}>Chat Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: DAILY_CARD_WIDTH,
    height: DAILY_CARD_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
    position: 'relative',
    ...SHADOWS.lg,
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'space-between',
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  topBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 14,
    zIndex: 10,
  },
  archetypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    ...SHADOWS.sm,
  },
  archetypePillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  bottomContent: {
    padding: 18,
    paddingBottom: 16,
    zIndex: 10,
  },
  nameAgeRow: {
    marginBottom: 4,
  },
  heroName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 6,
  },
  heroAge: {
    fontSize: 22,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.92)',
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 6,
  },
  bioSnippet: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparePillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FF7A29',
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    ...SHADOWS.sm,
  },
  comparePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chatPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    ...SHADOWS.sm,
  },
  chatPillText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
});
