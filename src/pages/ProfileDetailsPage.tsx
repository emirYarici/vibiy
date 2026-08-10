import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { ArrowLeft, MapPin, Sparkles, MessageCircle, Heart } from 'lucide-react-native';

import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { getMatchArchetype } from '../shared/types';
import { ArchetypeIcon } from '../components/ArchetypeBadge';

interface ProfileDetailsPageProps {
  route?: any;
  navigation?: any;
}

export default function ProfileDetailsPage({ route, navigation }: ProfileDetailsPageProps) {
  const { profile, activeChatMatchId, onChatNow, score } = route?.params || {};
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const archetype = getMatchArchetype(score ?? 0.88);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChatNow = () => {
    if (onChatNow) {
      onChatNow();
    }
  };

  const name = profile?.full_name || 'Pete';
  const handle = `@${name.toLowerCase().replace(/\s+/g, '')}`;
  const bioText = profile?.bio || 'Marketing director, amateur photographer, traveller, family guy';

  // Dynamic tags/worlds/vibes based on profile or fallback
  const worldsList = ['Design', 'Entrepreneurship', 'Startups'];
  const vibesList = ['Ambitious', 'Adventurous', 'Skeptical'];
  const occupation = profile?.occupation || "I'm self-employed";

  const photosList = profile?.photos && profile.photos.length > 0
    ? profile.photos
    : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.circularBackBtn} onPress={handleBack} activeOpacity={0.8}>
            <ArrowLeft size={20} color={COLORS.textPrimary} strokeWidth={2.2} />
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
            <Image
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

            {/* Archetype Floating Pill Badge */}
            <View style={[styles.archetypeBadge, { backgroundColor: archetype.bgColor }]}>
              <ArchetypeIcon type={archetype.type} size={13} color={archetype.textColor} />
              <Text style={[styles.archetypeBadgeText, { color: archetype.textColor }]}>
                {archetype.badgeText}
              </Text>
            </View>
          </View>

          {/* Editorial Details Card */}
          <View style={styles.editorialCard}>
            {/* Name & Handle Row */}
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>
                {name} <Text style={styles.ageText}>{profile?.age || 26}</Text>
              </Text>
              <Text style={styles.handleText}>{handle}</Text>
            </View>

            {/* INTRO Section */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>INTRO</Text>
              <Text style={styles.introSerifText}>{bioText}</Text>
            </View>

            {/* OCCUPATION Section */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>OCCUPATION</Text>
              <View style={styles.occupationPill}>
                <Text style={styles.occupationPillText}>{occupation}</Text>
              </View>
            </View>

            {/* WORLDS & VIBES 2-Column Grid */}
            <View style={styles.gridColumnsRow}>
              <View style={styles.gridColumn}>
                <Text style={styles.sectionLabel}>WORLDS</Text>
                {worldsList.map((item, idx) => (
                  <Text key={idx} style={styles.columnItemText}>
                    {item}
                  </Text>
                ))}
              </View>

              <View style={styles.gridColumn}>
                <Text style={styles.sectionLabel}>VIBES</Text>
                {vibesList.map((item, idx) => (
                  <Text key={idx} style={styles.columnItemText}>
                    {item}
                  </Text>
                ))}
              </View>
            </View>

            {/* Archetype Match Insights */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  photoWrapper: {
    width: '100%',
    height: 420,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.cardBg,
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
    zIndex: 2,
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
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 6,
    zIndex: 5,
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
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    zIndex: 5,
    ...SHADOWS.sm,
  },
  archetypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editorialCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    ...SHADOWS.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  nameText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },
  ageText: {
    fontSize: 24,
    fontWeight: '400',
    color: COLORS.textDarkSecondary,
  },
  handleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDarkSecondary,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textDarkSecondary,
    marginBottom: 8,
  },
  introSerifText: {
    fontSize: 22,
    lineHeight: 30,
    color: COLORS.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
  },
  occupationPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  occupationPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  gridColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 22,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  gridColumn: {
    flex: 1,
  },
  columnItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
    lineHeight: 22,
  },
  insightBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: RADIUS.md,
    padding: 16,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textDarkSecondary,
    fontWeight: '500',
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    marginTop: 18,
    ...SHADOWS.floating,
  },
  chatActionBtnText: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: '800',
  },
});
