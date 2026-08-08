import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import { COLORS, RADIUS } from '../shared/theme';

interface ProfileDetailsPageProps {
  route?: any;
  navigation?: any;
}

export default function ProfileDetailsPage({ route, navigation }: ProfileDetailsPageProps) {
  const { profile, activeChatMatchId, onChatNow } = route?.params || {};
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChatNow = () => {
    onChatNow();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.detailsContainer}>
        {/* Header */}
        <View style={styles.detailsHeader}>
          <TouchableOpacity style={styles.detailsBackBtn} onPress={handleBack}>
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.detailsHeaderTitle}>Profile Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailsScroll}>
          {/* Photo Container */}
          <View style={styles.detailsPhotoWrapper}>
            <Image
              source={{
                uri:
                  (profile.photos && profile.photos[activePhotoIndex]) ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
              }}
              style={styles.detailsImage}
            />

            {/* Click Zones */}
            <View style={styles.detailsClickZones}>
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
                  if (profile.photos && activePhotoIndex < profile.photos.length - 1) {
                    setActivePhotoIndex(activePhotoIndex + 1);
                  }
                }}
              />
            </View>

            {/* Photo Indicator Pips */}
            <View style={styles.detailsIndicators}>
              {profile.photos &&
                profile.photos.map((_: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.detailsPip,
                      activePhotoIndex === index && styles.detailsActivePip,
                    ]}
                  />
                ))}
            </View>
          </View>

          {/* Profile Card */}
          <View style={styles.detailsMetaCard}>
            <Text style={styles.detailsName}>
              {profile.full_name}, <Text style={styles.detailsAge}>{profile.age}</Text>
            </Text>

            <Text style={styles.detailsBioLabel}>About Me</Text>
            <Text style={styles.detailsBioText}>
              {profile.bio || 'No bio added yet.'}
            </Text>

            {activeChatMatchId === null && (
              <TouchableOpacity style={styles.detailsChatBtn} onPress={handleChatNow}>
                <Text style={styles.detailsChatBtnText}>Send Message</Text>
              </TouchableOpacity>
            )}
          </View>
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
  detailsContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.cardBorder,
  },
  detailsBackBtn: {
    padding: 8,
  },
  detailsHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsScroll: {
    paddingBottom: 40,
  },
  detailsPhotoWrapper: {
    width: '100%',
    aspectRatio: 0.9,
    position: 'relative',
    backgroundColor: '#000000',
  },
  detailsImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailsClickZones: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  clickZoneLeft: {
    flex: 1,
  },
  clickZoneRight: {
    flex: 1,
  },
  detailsIndicators: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 6,
  },
  detailsPip: {
    flex: 1,
    height: 3,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  detailsActivePip: {
    backgroundColor: '#FFFFFF',
  },
  detailsMetaCard: {
    padding: 24,
    gap: 16,
  },
  detailsName: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  detailsAge: {
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  detailsBioLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  detailsBioText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  detailsChatBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  detailsChatBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
