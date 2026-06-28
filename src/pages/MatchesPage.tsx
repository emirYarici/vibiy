import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';

import { COLORS, RADIUS } from '../shared/theme';
import { MatchesTabProps, MatchProfile } from '../shared/types';

// Simulated Matched Users Profiles
const SIMULATED_MATCHES: MatchProfile[] = [
  {
    id: 'match-1',
    name: 'Sarah',
    age: 24,
    bio: 'Product Designer 🎨 • Travel addict ✈️ • Coffee enthusiast ☕. Let\'s exchange playlists!',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600',
    ],
    instagram: 'sarah_design',
  },
  {
    id: 'match-2',
    name: 'Liam',
    age: 26,
    bio: 'Software Engineer by day, Rock Climber by night 🧗‍♂️. Craft beer lover. Tell me your favorite travel destination!',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
    ],
    instagram: 'liam_codes',
  },
  {
    id: 'match-3',
    name: 'Chloe',
    age: 23,
    bio: 'Photography student 📸 • Dog lover 🐶 • Weekend hiker. Looking for someone to capture memories with.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600',
    ],
    instagram: 'chloe_captures',
  },
];

export default function MatchesPage({ userPhoto }: MatchesTabProps) {
  const [selectedMatch, setSelectedMatch] = useState<MatchProfile | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const openMatchGallery = (match: MatchProfile) => {
    setSelectedMatch(match);
    setActivePhotoIndex(0);
  };

  const closeMatchGallery = () => {
    setSelectedMatch(null);
  };

  return (
    <View style={styles.matchesContainer}>
      <ScrollView contentContainerStyle={styles.matchesScroll}>
        <View style={styles.matchesBar}>
          <Text style={styles.matchesSectionTitle}>Your Matches</Text>
          <Text style={styles.matchesSubtitle}>
            Here are other users you matched with. Tap on their profiles to see their uploaded photo galleries!
          </Text>
        </View>

        {SIMULATED_MATCHES.map((match) => (
          <TouchableOpacity
            key={match.id}
            style={styles.matchCard}
            onPress={() => openMatchGallery(match)}
          >
            <Image source={{ uri: match.photos[0] }} style={styles.matchAvatar} />
            <View style={styles.matchDetails}>
              <View style={styles.matchNameRow}>
                <Text style={styles.matchNameText}>{match.name}, {match.age}</Text>
                <Text style={styles.instaTag}>@{match.instagram}</Text>
              </View>
              <Text style={styles.matchBioPreview} numberOfLines={2}>
                {match.bio}
              </Text>
            </View>
            <Text style={styles.matchArrow}>➔</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Full-Screen Glassmorphic Match Gallery Modal */}
      {selectedMatch && (
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeMatchGallery}>
            <View style={styles.modalBackgroundBlur} />
          </TouchableWithoutFeedback>

          <View style={styles.galleryCardContainer}>
            {/* Gallery Top Navigation/Actions */}
            <View style={styles.galleryHeader}>
              <Text style={styles.galleryHeaderName}>
                {selectedMatch.name}, {selectedMatch.age}
              </Text>
              <TouchableOpacity style={styles.galleryCloseBtn} onPress={closeMatchGallery}>
                <Text style={styles.galleryCloseText}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            {/* Main Photo Gallery View */}
            <View style={styles.galleryImageWrapper}>
              <Image
                source={{ uri: selectedMatch.photos[activePhotoIndex] }}
                style={styles.galleryImage}
              />
              
              {/* Left/Right Click zones to change photos */}
              <View style={styles.galleryClickZones}>
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
                    if (activePhotoIndex < selectedMatch.photos.length - 1) {
                      setActivePhotoIndex(activePhotoIndex + 1);
                    }
                  }}
                />
              </View>

              {/* Photo Indicators/Pips */}
              <View style={styles.galleryIndicators}>
                {selectedMatch.photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorPip,
                      activePhotoIndex === index && styles.activeIndicatorPip,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Gallery User Bio details */}
            <ScrollView style={styles.galleryMetaScroll}>
              <Text style={styles.galleryBioTitle}>About</Text>
              <Text style={styles.galleryBioText}>{selectedMatch.bio}</Text>
              
              <View style={styles.instaConnectedRow}>
                <Text style={styles.instaLogoEmoji}>📸</Text>
                <Text style={styles.instaHandleText}>Connected Instagram: @{selectedMatch.instagram}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  matchesContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  matchesScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  matchesBar: {
    marginBottom: 24,
  },
  matchesSectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  matchesSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  matchAvatar: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    marginRight: 14,
  },
  matchDetails: {
    flex: 1,
  },
  matchNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  matchNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  instaTag: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchBioPreview: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  matchArrow: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  modalBackgroundBlur: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 24, 40, 0.6)',
  },
  galleryCardContainer: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    width: '100%',
    maxHeight: '90%',
    padding: 24,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.cardBorder,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  galleryHeaderName: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  galleryCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  galleryCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  galleryImageWrapper: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.cardBgHover,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  galleryClickZones: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  clickZoneLeft: {
    flex: 1,
  },
  clickZoneRight: {
    flex: 1,
  },
  galleryIndicators: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  indicatorPip: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: RADIUS.pill,
  },
  activeIndicatorPip: {
    backgroundColor: COLORS.primary,
  },
  galleryMetaScroll: {
    marginTop: 18,
    maxHeight: 150,
  },
  galleryBioTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  galleryBioText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 16,
  },
  instaConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  instaLogoEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  instaHandleText: {
    color: COLORS.accent,
    fontWeight: '800',
    fontSize: 13,
  },
});
