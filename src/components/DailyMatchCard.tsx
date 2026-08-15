import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { MessageCircle, Film } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { DBProfile, getMatchArchetype } from '../shared/types';
import { ArchetypeIcon } from './ArchetypeBadge';
import SkeletonImage from './SkeletonImage';

interface DailyMatchCardProps {
  matchId: string;
  profile: DBProfile;
  score: number;
  onOpenProfile: (profile: DBProfile, score: number) => void;
  onCompareVibes: (profile: DBProfile, score: number) => void;
  onStartChat: (profile: DBProfile) => void;
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 300;

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
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.touchableArea}
        activeOpacity={0.92}
        onPress={() => onOpenProfile(profile, score)}
      >
        {/* Background Image */}
        <SkeletonImage source={{ uri: photoUri }} style={styles.cardImage} />

        {/* Dark Gradient Overlay for text contrast */}
        <View style={styles.gradientOverlay} />

        {/* Archetype Floating Pill Badge */}
        <View style={[styles.archetypeBadge, { backgroundColor: archetype.bgColor }]}>
          <ArchetypeIcon type={archetype.type} size={11} color={archetype.textColor} />
          <Text style={[styles.archetypeBadgeText, { color: archetype.textColor }]}>
            {archetype.badgeText}
          </Text>
        </View>

        {/* Bottom Profile Details */}
        <View style={styles.revealedContent}>
          <Text style={styles.nameText} numberOfLines={1}>
            {profile.full_name}, <Text style={styles.ageText}>{profile.age || 24}</Text>
          </Text>
          <Text style={styles.bioSnippet} numberOfLines={2}>
            {profile.bio || 'Shares your humor and aesthetic taste in reels.'}
          </Text>

          {/* Quick Action Pills */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.comparePillBtn}
              activeOpacity={0.8}
              onPress={() => onCompareVibes(profile, score)}
            >
              <Film size={12} color={COLORS.accent} />
              <Text style={styles.comparePillText}>Compare Vibes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatPillBtn}
              activeOpacity={0.8}
              onPress={() => onStartChat(profile)}
            >
              <MessageCircle size={12} color={COLORS.primaryText} strokeWidth={2.5} />
              <Text style={styles.chatPillText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: 14,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
    ...SHADOWS.md,
  },
  touchableArea: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 5, 2, 0.45)',
  },
  archetypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    zIndex: 5,
    ...SHADOWS.sm,
  },
  archetypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  revealedContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 14,
    backgroundColor: 'rgba(28, 11, 5, 0.88)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 2,
  },
  ageText: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bioSnippet: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 15,
    marginBottom: 10,
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
    gap: 4,
    backgroundColor: 'rgba(255, 190, 84, 0.15)',
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 190, 84, 0.3)',
  },
  comparePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  chatPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  chatPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryText,
  },
});
