import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PROFILE_QUERY_KEYS } from '../entities/profile/api/useProfile';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { ArrowLeft, ArrowRight, Check, Camera, MapPin, Sparkles, Send, Flame, Zap, Share2 } from 'lucide-react-native';
import Geolocation from 'react-native-geolocation-service';

import { uploadProfilePhoto, supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import SkeletonImage from '../shared/ui/SkeletonImage/SkeletonImage';
import AppLoader from '../shared/ui/AppLoader/AppLoader';
import StepInfo from '../features/onboarding/ui/StepInfo';
import StepGender from '../features/onboarding/ui/StepGender';
import StepLocation from '../features/onboarding/ui/StepLocation';
import StepBio from '../features/onboarding/ui/StepBio';
import StepPhotos from '../features/onboarding/ui/StepPhotos';
import StepIntro from '../features/onboarding/ui/StepIntro';

interface ProfileOnboardingProps {
  session: any;
  isDemoMode: boolean;
  onOnboardingComplete: () => void;
  onLogout?: () => void;
}

export default function ProfileOnboarding({
  session,
  isDemoMode,
  onOnboardingComplete,
  onLogout,
}: ProfileOnboardingProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'man' | 'woman' | 'non_binary' | null>(null);
  const [preference, setPreference] = useState<'men' | 'women' | 'everyone' | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      try {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        return auth === 'granted';
      } catch (err) {
        console.error('iOS Geolocation authorization error:', err);
        return false;
      }
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Vibiy needs access to your location to find matches near you.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const captureLocation = async () => {
    try {
      setLocating(true);
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Please enable location services in your device settings to use Vibiy.');
        setLocating(false);
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocating(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          if (isDemoMode) {
            // Ankara fallback coordinates for debugging on simulator
            setLatitude(39.9334);
            setLongitude(32.8597);
          } else {
            Alert.alert(
              'Location Error',
              'Failed to retrieve coordinates. Please ensure location services are enabled on your device.'
            );
          }
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (err) {
      console.error(err);
      setLocating(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!name.trim()) {
        Alert.alert('Required', 'Please enter your name.');
        return;
      }
      const parsedAge = parseInt(age.trim(), 10);
      if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 120) {
        Alert.alert('Required', 'Please enter a valid age (18 or older).');
        return;
      }
    } else if (currentStep === 2) {
      if (!gender) {
        Alert.alert('Required', 'Please select your gender.');
        return;
      }
      if (!preference) {
        Alert.alert('Required', 'Please select your match preference.');
        return;
      }
    } else if (currentStep === 3) {
      if (!latitude || !longitude) {
        Alert.alert('Required', 'Please allow permission and capture your location.');
        return;
      }
    } else if (currentStep === 5) {
      if (!photos[0]) {
        Alert.alert('Required', 'Please upload a primary profile photo (slot 1).');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
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

      let finalUrl = selectedAsset.uri;

      // Upload if live DB is configured and we are not in guest/demo mode
      if (isSupabaseConfigured && !isDemoMode) {
        if (!selectedAsset.base64) {
          throw new Error('No base64 data returned from image picker.');
        }
        finalUrl = await uploadProfilePhoto(
          session.user.id,
          selectedAsset.base64,
          selectedAsset.type || 'image/jpeg'
        );
      }

      const updatedPhotos = [...photos];
      updatedPhotos[index] = finalUrl;
      setPhotos(updatedPhotos);
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Unable to load photo.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handlePhotoDelete = (index: number) => {
    const updatedPhotos = [...photos];
    updatedPhotos[index] = null;
    setPhotos(updatedPhotos);
  };

  const handleFinish = async () => {
    // Primary photo (index 0) must be present
    if (!photos[0]) {
      Alert.alert('Required', 'Please upload a primary profile photo (slot 1).');
      return;
    }

    try {
      setSubmitting(true);

      const parsedAge = parseInt(age.trim());
      const filteredPhotos = photos.filter((p): p is string => p !== null);

      // Save locally to AsyncStorage for all modes (speeds up initial renders)
      await AsyncStorage.setItem('@profile_name', name.trim());
      await AsyncStorage.setItem('@profile_age', age.trim());
      await AsyncStorage.setItem('@profile_gender', gender || '');
      await AsyncStorage.setItem('@profile_preference', preference || '');
      await AsyncStorage.setItem('@profile_latitude', latitude ? String(latitude) : '');
      await AsyncStorage.setItem('@profile_longitude', longitude ? String(longitude) : '');
      await AsyncStorage.setItem('@profile_bio', bio.trim());
      await AsyncStorage.setItem('@profile_photos', JSON.stringify(photos));

      if (isSupabaseConfigured && !isDemoMode) {
        // Upsert to Supabase profiles table
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            full_name: name.trim(),
            age: parsedAge,
            gender: gender,
            preference: preference,
            location: latitude && longitude ? `POINT(${longitude} ${latitude})` : null,
            bio: bio.trim(),
            photos: filteredPhotos,
          }, { onConflict: 'id' });

        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.detail(session.user.id) });
      onOnboardingComplete();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepperContainer}>
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <View key={step} style={styles.stepIndicatorWrapper}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= step ? styles.activeStepCircle : styles.inactiveStepCircle,
              ]}
            >
              {currentStep > step ? (
                <Check size={13} color={COLORS.primaryText} strokeWidth={3.5} />
              ) : (
                <Text
                  style={[
                    styles.stepText,
                    currentStep >= step ? styles.activeStepText : styles.inactiveStepText,
                  ]}
                >
                  {step}
                </Text>
              )}
            </View>
            {step < 6 && (
              <View
                style={[
                  styles.stepLine,
                  currentStep > step ? styles.activeStepLine : styles.inactiveStepLine,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepInfo
            name={name}
            setName={setName}
            age={age}
            setAge={setAge}
            styles={styles}
          />
        );
      case 2:
        return (
          <StepGender
            gender={gender}
            setGender={setGender}
            preference={preference}
            setPreference={setPreference}
            styles={styles}
          />
        );
      case 3:
        return (
          <StepLocation
            latitude={latitude}
            longitude={longitude}
            locating={locating}
            captureLocation={captureLocation}
            styles={styles}
          />
        );
      case 4:
        return (
          <StepBio
            bio={bio}
            setBio={setBio}
            styles={styles}
          />
        );
      case 5:
        return (
          <StepPhotos
            photos={photos}
            uploadingIndex={uploadingIndex}
            handlePhotoSelect={handlePhotoSelect}
            handlePhotoDelete={handlePhotoDelete}
            styles={styles}
          />
        );
      case 6:
        return (
          <StepIntro
            styles={styles}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
            <Text style={styles.headerTitle}>VIBIY</Text>
            {onLogout && (
              <TouchableOpacity onPress={onLogout} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
                <Text style={{ color: COLORS.textDark, fontSize: 12, fontWeight: '700' }}>Log Out</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderStepIndicator()}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderStepContent()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 1 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={submitting} activeOpacity={0.75}>
              <ArrowLeft size={18} color={COLORS.white} strokeWidth={2.5} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          {currentStep < 6 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <ArrowRight size={20} color={COLORS.primaryText} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.finishButton, submitting && styles.disabledBtn]}
              onPress={handleFinish}
              disabled={submitting}
            >
              {submitting ? (
                <AppLoader size="small" color={COLORS.primaryText} />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Let's Vibe!</Text>
                  <Sparkles size={20} color={COLORS.primaryText} strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 3,
    marginBottom: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    justifyContent: 'center',
  },
  stepIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  activeStepCircle: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  inactiveStepCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '900',
  },
  activeStepText: {
    color: COLORS.primaryText,
  },
  inactiveStepText: {
    color: COLORS.white,
  },
  stepLine: {
    width: 22,
    height: 3,
    borderRadius: 1.5,
  },
  activeStepLine: {
    backgroundColor: COLORS.accent,
  },
  inactiveStepLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  stepContent: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 18,
    color: COLORS.textDark,
    fontSize: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    ...SHADOWS.sm,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    color: COLORS.textDark,
    textAlignVertical: 'top',
  },
  slotSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  primaryCoverSlot: {
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
  primaryUploadTrigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  primaryUploadIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  primaryUploadTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  primaryUploadSubtitle: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
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
  coverActionButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  changeCoverBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteCoverBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryPhotosScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  secondaryPhotoSlot: {
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
  secondaryUploadTrigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryUploadText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
  },
  secondaryDeleteBtn: {
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
  slotLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDarkSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: COLORS.bg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    gap: 6,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: RADIUS.pill,
    gap: 8,
    ...SHADOWS.floating,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: RADIUS.pill,
    gap: 8,
    ...SHADOWS.floating,
  },
  nextButtonText: {
    color: COLORS.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pillButton: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...SHADOWS.sm,
  },
  pillButtonActive: {
    backgroundColor: COLORS.accent,
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
  locationContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCard: {
    width: '100%',
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 30,
    alignItems: 'center',
    gap: 16,
    ...SHADOWS.md,
  },
  locationIconBg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPromptText: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 8,
  },
  locationBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: 14,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.floating,
  },
  locationBtnDisabled: {
    opacity: 0.5,
  },
  locationBtnText: {
    color: COLORS.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
  locationSuccessTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 8,
  },
  locationSuccessCoords: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    fontWeight: '600',
  },
  locationSuccessSubtitle: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    textAlign: 'center',
  },
  shareHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.cardBgIvory,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  shareHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textDark,
    letterSpacing: 0.8,
  },
  shareGuideContainer: {
    marginTop: 16,
    gap: 12,
  },
  shareStepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...SHADOWS.md,
  },
  shareStepNumberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  shareStepNumberText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
  shareStepBody: {
    flex: 1,
  },
  shareStepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shareStepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  shareStepDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textDarkSecondary,
  },
  proTipCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...SHADOWS.md,
  },
  proTipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  proTipText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textDarkSecondary,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.textDark,
  },
  ruleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    ...SHADOWS.md,
  },
  ruleFlameIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(228, 40, 31, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  ruleBannerSub: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textDarkSecondary,
  },
});
