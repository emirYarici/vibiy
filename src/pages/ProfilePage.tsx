import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';

import { uploadProfilePhoto } from '../shared/api/supabase';
import { COLORS, RADIUS } from '../shared/theme';
import { MainAppProps } from '../shared/types';

export default function ProfilePage({ session, onLogout }: MainAppProps) {
  const [userName, setUserName] = useState('');
  const [userBio, setUserBio] = useState('');
  const [userAge, setUserAge] = useState('');
  const [profilePhotos, setProfilePhotos] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Load cached profile data on mount
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const cachedName = await AsyncStorage.getItem('@profile_name');
        const cachedBio = await AsyncStorage.getItem('@profile_bio');
        const cachedAge = await AsyncStorage.getItem('@profile_age');
        const cachedPhotos = await AsyncStorage.getItem('@profile_photos');

        if (cachedName) setUserName(cachedName);
        if (cachedBio) setUserBio(cachedBio);
        if (cachedAge) setUserAge(cachedAge);
        if (cachedPhotos) {
          setProfilePhotos(JSON.parse(cachedPhotos));
        } else {
          // Default placeholder setup for demo feedback
          const defaultPhotos = [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
            null,
            null,
            null,
            null,
            null,
          ];
          setProfilePhotos(defaultPhotos);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      }
    };

    loadProfileData();
  }, []);

  const saveProfileData = async (name: string, bio: string, age: string, photosList: (string | null)[]) => {
    try {
      await AsyncStorage.setItem('@profile_name', name);
      await AsyncStorage.setItem('@profile_bio', bio);
      await AsyncStorage.setItem('@profile_age', age);
      await AsyncStorage.setItem('@profile_photos', JSON.stringify(photosList));
    } catch (err) {
      console.error('Failed to save profile cache:', err);
    }
  };

  const handlePhotoSelect = async (index: number) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedAsset = result.assets[0];
      if (!selectedAsset.uri) return;

      setUploadingIndex(index);

      // Perform upload
      const returnedUrl = await uploadProfilePhoto(
        session.user.id,
        selectedAsset.uri,
        selectedAsset.type || 'image/jpeg'
      );

      const updatedPhotos = [...profilePhotos];
      updatedPhotos[index] = returnedUrl;
      setProfilePhotos(updatedPhotos);
      await saveProfileData(userName, userBio, userAge, updatedPhotos);

      Alert.alert('Upload Successful', `Photo slot ${index + 1} updated successfully!`);
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Unable to upload photo.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handlePhotoDelete = async (index: number) => {
    Alert.alert('Delete Photo', 'Are you sure you want to remove this profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedPhotos = [...profilePhotos];
          updatedPhotos[index] = null;
          setProfilePhotos(updatedPhotos);
          await saveProfileData(userName, userBio, userAge, updatedPhotos);
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContentScroll}>
      {/* Upper Profile Info */}
      <View style={styles.profileHeaderCard}>
        <Text style={styles.profileHeaderTitle}>Setup Profile</Text>
        <Text style={styles.profileHeaderDescription}>
          Build your tinder-style profile grid. Tap any slot to add photos. The first slot represents your primary photo.
        </Text>
      </View>

      {/* Tinder-style Photo Grid */}
      <View style={styles.tinderGrid}>
        {profilePhotos.map((photoUri, index) => {
          const isPrimary = index === 0;
          return (
            <View
              key={index}
              style={[
                styles.photoSlot,
                isPrimary ? styles.primaryPhotoSlot : styles.standardPhotoSlot,
              ]}
            >
              {uploadingIndex === index ? (
                <View style={styles.slotLoader}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : photoUri ? (
                <View style={styles.slotImageContainer}>
                  <Image source={{ uri: photoUri }} style={styles.slotImage} />
                  {isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deleteBadge}
                    onPress={() => handlePhotoDelete(index)}
                  >
                    <Text style={styles.deleteBadgeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadTrigger}
                  onPress={() => handlePhotoSelect(index)}
                >
                  <Text style={styles.plusIcon}>+</Text>
                  <Text style={styles.uploadText}>{isPrimary ? 'Add Primary' : 'Add Photo'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Bio Details */}
      <View style={styles.profileForm}>
        <Text style={styles.formSectionTitle}>About Me</Text>

        <View style={styles.formInputGroup}>
          <Text style={styles.formLabel}>Name</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Liam, Jessica"
            placeholderTextColor={COLORS.textMuted}
            value={userName}
            onChangeText={(text) => {
              setUserName(text);
              saveProfileData(text, userBio, userAge, profilePhotos);
            }}
          />
        </View>

        <View style={styles.formInputRow}>
          <View style={[styles.formInputGroup, { flex: 1 }]}>
            <Text style={styles.formLabel}>Age</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. 25"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={userAge}
              onChangeText={(text) => {
                setUserAge(text);
                saveProfileData(userName, userBio, text, profilePhotos);
              }}
            />
          </View>
          <View style={[styles.formInputGroup, { flex: 2 }]}>
            <Text style={styles.formLabel}>Linked Account</Text>
            <View style={[styles.formInput, styles.disabledInput]}>
              <Text style={styles.disabledInputText} numberOfLines={1}>
                {session.user.email}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.formInputGroup}>
          <Text style={styles.formLabel}>Short Bio</Text>
          <TextInput
            style={[styles.formInput, styles.formTextArea]}
            placeholder="Tell others about yourself..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            value={userBio}
            onChangeText={(text) => {
              setUserBio(text);
              saveProfileData(userName, text, userAge, profilePhotos);
            }}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>Log Out Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContentScroll: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: COLORS.bg,
  },
  profileHeaderCard: {
    marginBottom: 24,
  },
  profileHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  profileHeaderDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  tinderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  photoSlot: {
    backgroundColor: COLORS.cardBgHover,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  primaryPhotoSlot: {
    width: '64%',
    aspectRatio: 0.78,
  },
  standardPhotoSlot: {
    width: '32%',
    aspectRatio: 0.78,
  },
  slotImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  slotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(16, 24, 40, 0.8)',
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  deleteBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  uploadTrigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  plusIcon: {
    fontSize: 28,
    color: COLORS.textMuted,
    fontWeight: '300',
    marginBottom: 4,
  },
  uploadText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileForm: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 20,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formInputGroup: {
    marginBottom: 16,
  },
  formInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  formInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    fontSize: 14,
    height: 48,
  },
  disabledInput: {
    justifyContent: 'center',
    opacity: 0.5,
  },
  disabledInputText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  formTextArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  logoutBtn: {
    height: 50,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.28,
  },
});
