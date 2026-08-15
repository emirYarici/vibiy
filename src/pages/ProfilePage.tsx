import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { Camera, Eye, Edit3, Check } from 'lucide-react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';

import { uploadProfilePhoto, supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { MainAppProps } from '../shared/types';
import SkeletonImage from '../components/SkeletonImage';
import { useProfile, useUpdateProfile } from '../shared/queries/useProfile';

export default function ProfilePage({ session, onLogout, isDemoMode = false }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [userName, setUserName] = useState('');
  const [userBio, setUserBio] = useState('');
  const [userAge, setUserAge] = useState('');
  const [userOccupation, setUserOccupation] = useState("I'm self-employed");
  const [userGender, setUserGender] = useState<'man' | 'woman' | 'non_binary' | null>(null);
  const [userPreference, setUserPreference] = useState<'men' | 'women' | 'everyone' | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const saveModalRef = useRef<BottomSheetModal>(null);

  const worldsList = ['Design', 'Entrepreneurship', 'Startups'];
  const vibesList = ['Ambitious', 'Adventurous', 'Skeptical'];

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const userId = session?.user?.id || (isDemoMode ? 'demo-guest-user' : '');
  const { data: profile } = useProfile(userId, isDemoMode);
  const updateProfileMutation = useUpdateProfile();

  // Load coordinates from cache on mount
  useEffect(() => {
    const loadLocation = async () => {
      const cachedLat = await AsyncStorage.getItem('@profile_latitude');
      const cachedLng = await AsyncStorage.getItem('@profile_longitude');
      if (cachedLat) setLatitude(Number(cachedLat));
      if (cachedLng) setLongitude(Number(cachedLng));
    };
    loadLocation();
  }, []);

  // Sync profile data to local inputs when query returns
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setUserName(profile.full_name);
      if (profile.bio) setUserBio(profile.bio);
      if (profile.age) setUserAge(String(profile.age));
      if (profile.occupation) setUserOccupation(profile.occupation);
      if (profile.gender) setUserGender(profile.gender as any);
      if (profile.preference) setUserPreference(profile.preference as any);
      if (profile.photos && profile.photos.length > 0) {
        const padded: (string | null)[] = [...profile.photos];
        while (padded.length < 6) padded.push(null);
        setProfilePhotos(padded);
      }
      if (profile.location && typeof profile.location === 'object' && profile.location.coordinates) {
        setLatitude(profile.location.coordinates[1]);
        setLongitude(profile.location.coordinates[0]);
      }
    }
  }, [profile]);

  const saveProfileData = async (
    name: string,
    bio: string,
    age: string,
    occupationVal: string,
    genderVal: 'man' | 'woman' | 'non_binary' | null,
    preferenceVal: 'men' | 'women' | 'everyone' | null,
    latVal: number | null,
    lngVal: number | null,
    photosList: (string | null)[]
  ) => {
    await updateProfileMutation.mutateAsync({
      userId,
      name,
      bio,
      age,
      occupation: occupationVal,
      gender: genderVal,
      preference: preferenceVal,
      photos: photosList,
      latitude: latVal,
      longitude: lngVal,
    });
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await saveProfileData(
        userName,
        userBio,
        userAge,
        userOccupation,
        userGender,
        userPreference,
        latitude,
        longitude,
        profilePhotos
      );
      saveModalRef.current?.present();
    } catch (err: any) {
      Alert.alert('Save Error', err?.message || 'Unable to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSelect = async (index: number) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedAsset = result.assets[0];
      if (!selectedAsset.uri) return;

      setUploadingIndex(index);

      let returnedUrl = selectedAsset.uri;

      if (isSupabaseConfigured && !isDemoMode) {
        if (!selectedAsset.base64) {
          throw new Error('No base64 data returned from image picker.');
        }
        returnedUrl = await uploadProfilePhoto(
          session?.user?.id || 'demo-user',
          selectedAsset.base64,
          selectedAsset.type || 'image/jpeg'
        );
      }

      const updatedPhotos = [...profilePhotos];
      updatedPhotos[index] = returnedUrl;
      setProfilePhotos(updatedPhotos);
      await saveProfileData(userName, userBio, userAge, userOccupation, userGender, userPreference, latitude, longitude, updatedPhotos);

      Alert.alert('Success', `Photo ${index + 1} updated!`);
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Unable to upload photo.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handlePhotoDelete = async (index: number) => {
    Alert.alert('Delete Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedPhotos = [...profilePhotos];
          updatedPhotos[index] = null;
          setProfilePhotos(updatedPhotos);
          await saveProfileData(userName, userBio, userAge, userOccupation, userGender, userPreference, latitude, longitude, updatedPhotos);
        },
      },
    ]);
  };

  const activePhotos = profilePhotos.filter((p): p is string => p !== null);
  const displayName = userName.trim() || profile?.full_name || 'Anonymous';
  const displayHandle = `@${displayName.toLowerCase().replace(/\s+/g, '')}`;
  const displayBio = userBio.trim() || profile?.bio || 'No bio provided yet.';

  return (
    <BottomSheetModalProvider>
      <ScrollView contentContainerStyle={styles.tabContentScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Top Mode Segmented Bar */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'preview' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('preview')}
          >
            <Eye size={16} color={activeTab === 'preview' ? COLORS.textDark : COLORS.textPrimary} />
            <Text style={[styles.segmentBtnText, activeTab === 'preview' && styles.segmentBtnTextActive]}>
              Preview Card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'edit' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('edit')}
          >
            <Edit3 size={16} color={activeTab === 'edit' ? COLORS.textDark : COLORS.textPrimary} />
            <Text style={[styles.segmentBtnText, activeTab === 'edit' && styles.segmentBtnTextActive]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'preview' ? (
          /* EDITORIAL PREVIEW CARD (MATCHING USER SCREENSHOT) */
          <View style={styles.previewContainer}>
            {/* Main Photo Card */}
            <View style={styles.editorialPhotoWrapper}>
              <SkeletonImage
                source={{
                  uri: activePhotos[previewPhotoIndex] || activePhotos[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
                }}
                style={styles.editorialHeroPhoto}
              />

              {activePhotos.length > 1 && (
                <View style={styles.previewClickZones}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (previewPhotoIndex > 0) setPreviewPhotoIndex(previewPhotoIndex - 1);
                    }}
                  />
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (previewPhotoIndex < activePhotos.length - 1) {
                        setPreviewPhotoIndex(previewPhotoIndex + 1);
                      }
                    }}
                  />
                </View>
              )}

              {activePhotos.length > 1 && (
                <View style={styles.previewIndicators}>
                  {activePhotos.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.previewPip,
                        previewPhotoIndex === idx && styles.previewPipActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Editorial Content Surface */}
            <View style={styles.editorialDetailsCard}>
              {/* Name & Handle */}
              <View style={styles.editorialNameRow}>
                <Text style={styles.editorialName}>
                  {displayName} <Text style={styles.editorialAge}>{userAge || '26'}</Text>
                </Text>
                <Text style={styles.editorialHandle}>{displayHandle}</Text>
              </View>

              {/* INTRO */}
              <View style={styles.editorialSection}>
                <Text style={styles.editorialLabel}>INTRO</Text>
                <Text style={styles.editorialIntroText}>{displayBio}</Text>
              </View>
            </View>
          </View>
        ) : (
          /* EDIT PROFILE & PHOTOS */
          <View style={styles.editSection}>
            {/* Primary Cover Slot */}
            <Text style={styles.editSectionHeading}>PRIMARY COVER PHOTO</Text>
            <View style={styles.primaryCoverBox}>
              {uploadingIndex === 0 ? (
                <View style={styles.slotLoader}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
              ) : profilePhotos[0] ? (
                <View style={styles.coverImageContainer}>
                  <SkeletonImage source={{ uri: profilePhotos[0] }} style={styles.coverImage} />
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>PRIMARY COVER</Text>
                  </View>
                  <View style={styles.coverBtnsRow}>
                    <TouchableOpacity
                      style={styles.changeBtn}
                      onPress={() => handlePhotoSelect(0)}
                    >
                      <Camera size={14} color={COLORS.white} />
                      <Text style={styles.changeBtnText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handlePhotoDelete(0)}
                    >
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.emptyCoverTrigger}
                  onPress={() => handlePhotoSelect(0)}
                  activeOpacity={0.8}
                >
                  <View style={styles.emptyCoverIconBg}>
                    <Camera size={26} color={COLORS.textDark} />
                  </View>
                  <Text style={styles.emptyCoverTitle}>Add Primary Photo</Text>
                  <Text style={styles.emptyCoverSub}>Your main portrait on cards</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Additional Photos Horizontal Strip */}
            <Text style={[styles.editSectionHeading, { marginTop: 24 }]}>
              ADDITIONAL PHOTOS ({profilePhotos.slice(1).filter(Boolean).length}/5)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.additionalPhotosScroll}
            >
              {[1, 2, 3, 4, 5].map((index) => {
                const photoUri = profilePhotos[index];
                return (
                  <View key={index} style={styles.additionalSlot}>
                    {uploadingIndex === index ? (
                      <View style={styles.slotLoader}>
                        <ActivityIndicator size="small" color={COLORS.accent} />
                      </View>
                    ) : photoUri ? (
                      <View style={styles.slotImageContainer}>
                        <SkeletonImage source={{ uri: photoUri }} style={styles.slotImage} />
                        <TouchableOpacity
                          style={styles.additionalDeleteBtn}
                          onPress={() => handlePhotoDelete(index)}
                        >
                          <Text style={styles.deleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.additionalUploadTrigger}
                        onPress={() => handlePhotoSelect(index)}
                        activeOpacity={0.7}
                      >
                        <Camera size={18} color={COLORS.textDarkSecondary} strokeWidth={1.8} />
                        <Text style={styles.additionalUploadText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Profile Form Details */}
            <View style={styles.profileFormCard}>
              <Text style={styles.formCardHeading}>About You</Text>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Pete, Sarah"
                  placeholderTextColor={COLORS.textDarkSecondary}
                  value={userName}
                  onChangeText={setUserName}
                />
              </View>

              {/* Age */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="25"
                  placeholderTextColor={COLORS.textDarkSecondary}
                  keyboardType="numeric"
                  value={userAge}
                  onChangeText={setUserAge}
                />
              </View>

              {/* Bio / Intro */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Intro Bio</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Write an intro in your own voice..."
                  placeholderTextColor={COLORS.textDarkSecondary}
                  multiline
                  numberOfLines={4}
                  value={userBio}
                  onChangeText={setUserBio}
                />
              </View>

              {/* Gender Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>I am a</Text>
                <View style={styles.pillContainer}>
                  {(['man', 'woman', 'non_binary'] as const).map((g) => {
                    const label = g === 'man' ? 'Man' : g === 'woman' ? 'Woman' : 'Non-binary';
                    const isSelected = userGender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[styles.pillButton, isSelected && styles.pillButtonActive]}
                        onPress={() => setUserGender(g)}
                      >
                        <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Preference Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Interested in</Text>
                <View style={styles.pillContainer}>
                  {(['men', 'women', 'everyone'] as const).map((p) => {
                    const label = p === 'men' ? 'Men' : p === 'women' ? 'Women' : 'Everyone';
                    const isSelected = userPreference === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[styles.pillButton, isSelected && styles.pillButtonActive]}
                        onPress={() => setUserPreference(p)}
                      >
                        <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Save Profile Button */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Check size={18} color={COLORS.white} strokeWidth={2.5} />
                    <Text style={styles.saveBtnText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <Text style={styles.logoutBtnText}>Log Out Session</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Saved! Confirmation Bottom Sheet Modal ────────────────────── */}
      <BottomSheetModal
        ref={saveModalRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.savedSheetBg}
        handleIndicatorStyle={styles.savedSheetHandle}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.savedSheetContent}>
          {/* Animated/Glow Icon Circle */}
          <View style={styles.savedIconCircle}>
            <Check size={32} color={COLORS.white} strokeWidth={3} />
          </View>

          {/* Heading */}
          <Text style={styles.savedSheetTitle}>Saved!</Text>
          <Text style={styles.savedSheetSubtitle}>
            Your profile details, photos, and preferences have been updated successfully.
          </Text>

          {/* Profile Snapshot Card */}
          <View style={styles.savedPreviewCard}>
            {profilePhotos[0] ? (
              <SkeletonImage source={{ uri: profilePhotos[0] }} style={styles.savedAvatar} />
            ) : (
              <View style={[styles.savedAvatar, styles.savedAvatarFallback]}>
                <Text style={styles.savedAvatarFallbackText}>
                  {(userName || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.savedPreviewInfo}>
              <Text style={styles.savedPreviewName} numberOfLines={1}>
                {userName.trim() || 'Pete'}{userAge.trim() ? `, ${userAge.trim()}` : ''}
              </Text>
              <Text style={styles.savedPreviewOccupation} numberOfLines={1}>
                {userOccupation.trim() || "I'm self-employed"}
              </Text>
              {userBio.trim() ? (
                <Text style={styles.savedPreviewBio} numberOfLines={1}>
                  {userBio.trim()}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.savedActions}>
            <TouchableOpacity
              style={styles.savedPreviewBtn}
              onPress={() => {
                saveModalRef.current?.dismiss();
                setActiveTab('preview');
              }}
              activeOpacity={0.85}
            >
              <Eye size={16} color={COLORS.textDark} strokeWidth={2.2} />
              <Text style={styles.savedPreviewBtnText}>View Preview Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.savedDoneBtn}
              onPress={() => saveModalRef.current?.dismiss()}
              activeOpacity={0.75}
            >
              <Text style={styles.savedDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  tabContentScroll: {
    padding: 16,
    paddingBottom: 110,
    backgroundColor: COLORS.bg,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.cardBgIvory,
    ...SHADOWS.sm,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  segmentBtnTextActive: {
    color: COLORS.textDark,
    fontWeight: '800',
  },
  previewContainer: {
    marginBottom: 20,
  },
  editorialPhotoWrapper: {
    width: '100%',
    height: 420,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.cardBg,
    ...SHADOWS.md,
  },
  editorialHeroPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewClickZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 2,
  },
  previewIndicators: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 6,
    zIndex: 5,
  },
  previewPip: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  previewPipActive: {
    backgroundColor: COLORS.white,
  },
  editorialDetailsCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    ...SHADOWS.sm,
  },
  editorialNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  editorialName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },
  editorialAge: {
    fontSize: 24,
    fontWeight: '400',
    color: COLORS.textDarkSecondary,
  },
  editorialHandle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDarkSecondary,
  },
  editorialSection: {
    marginBottom: 22,
  },
  editorialLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textDarkSecondary,
    marginBottom: 8,
  },
  editorialIntroText: {
    fontSize: 22,
    lineHeight: 30,
    color: COLORS.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '400',
  },
  editorialPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  editorialPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  editorialGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  editorialColumn: {
    flex: 1,
  },
  editorialItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
    lineHeight: 22,
  },
  editSection: {
    marginBottom: 20,
  },
  editSectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  primaryCoverBox: {
    width: '100%',
    height: 320,
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderStyle: 'dashed',
    ...SHADOWS.md,
  },
  coverImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  coverBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  coverBtnsRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  changeBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCoverTrigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyCoverIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  emptyCoverTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptyCoverSub: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
  },
  additionalPhotosScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  additionalSlot: {
    width: 96,
    height: 132,
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderStyle: 'dashed',
    ...SHADOWS.sm,
  },
  additionalUploadTrigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  additionalUploadText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
  },
  additionalDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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
  slotLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileFormCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: 24,
    padding: 22,
    marginTop: 20,
    ...SHADOWS.sm,
  },
  formCardHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDarkSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    color: COLORS.textDark,
    fontSize: 15,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(94, 88, 115, 0.12)',
  },
  textArea: {
    height: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  pillButton: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(94, 88, 115, 0.12)',
  },
  pillButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
  },
  pillTextActive: {
    color: COLORS.textDark,
    fontWeight: '900',
  },
  logoutBtn: {
    height: 50,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardBgIvory,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...SHADOWS.sm,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    ...SHADOWS.sm,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  savedSheetBg: {
    backgroundColor: COLORS.cardBgIvory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  savedSheetHandle: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    width: 44,
    height: 4,
  },
  savedSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    alignItems: 'center',
  },
  savedIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...SHADOWS.md,
  },
  savedSheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  savedSheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  savedPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.card,
    padding: 12,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...SHADOWS.sm,
  },
  savedAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  savedAvatarFallback: {
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAvatarFallbackText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  savedPreviewInfo: {
    flex: 1,
  },
  savedPreviewName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  savedPreviewOccupation: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDarkSecondary,
    marginBottom: 2,
  },
  savedPreviewBio: {
    fontSize: 11,
    color: COLORS.textDarkSecondary,
    fontStyle: 'italic',
  },
  savedActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  savedPreviewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    ...SHADOWS.sm,
  },
  savedPreviewBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  savedDoneBtn: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedDoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
});
