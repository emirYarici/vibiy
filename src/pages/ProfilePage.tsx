import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate as reanimatedInterpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
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
import SkeletonImage from '../shared/ui/SkeletonImage/SkeletonImage';
import AppLoader from '../shared/ui/AppLoader/AppLoader';
import { useProfile, useUpdateProfile } from '../entities/profile/api/useProfile';
import ProfilePreview from '../widgets/ProfilePreview/ProfilePreview';
import ProfileEditor from '../widgets/ProfileEditor/ProfileEditor';



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

  const previewScrollX = useSharedValue(0);
  const onPreviewScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      previewScrollX.value = event.contentOffset.x;
    },
  });

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

  const activePhotos = profilePhotos.filter((p): p is string => p !== null && p.trim().length > 0);
  const previewList = activePhotos;
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
          <ProfilePreview
            previewList={previewList}
            displayName={displayName}
            userAge={userAge}
            displayHandle={displayHandle}
            displayBio={displayBio}
          />
        ) : (
          <ProfileEditor
            userName={userName}
            setUserName={setUserName}
            userAge={userAge}
            setUserAge={setUserAge}
            userBio={userBio}
            setUserBio={setUserBio}
            userOccupation={userOccupation}
            setUserOccupation={setUserOccupation}
            userGender={userGender}
            setUserGender={setUserGender}
            userPreference={userPreference}
            setUserPreference={setUserPreference}
            profilePhotos={profilePhotos}
            uploadingIndex={uploadingIndex}
            handlePhotoSelect={handlePhotoSelect}
            handlePhotoDelete={handlePhotoDelete}
            handleSaveProfile={handleSaveProfile}
            isSaving={isSaving}
            onLogout={onLogout}
            renderBackdrop={renderBackdrop}
            saveModalRef={saveModalRef}
            setActiveTab={setActiveTab}
          />
        )}
      </ScrollView>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  tabContentScroll: {
    paddingVertical: 16,
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: RADIUS.pill,
    padding: 4,
    marginHorizontal: 16,
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
});
