import React, { useState } from 'react';
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
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { ArrowLeft, ArrowRight, Check, Camera, MapPin } from 'lucide-react-native';
import Geolocation from 'react-native-geolocation-service';

import { uploadProfilePhoto, supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';

interface ProfileOnboardingProps {
  session: any;
  isDemoMode: boolean;
  onOnboardingComplete: () => void;
}

export default function ProfileOnboarding({
  session,
  isDemoMode,
  onOnboardingComplete,
}: ProfileOnboardingProps) {
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
      const parsedAge = parseInt(age.trim());
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
        // Save to Supabase profiles table
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: name.trim(),
            age: parsedAge,
            gender: gender,
            preference: preference,
            location: latitude && longitude ? `POINT(${longitude} ${latitude})` : null,
            bio: bio.trim(),
            photos: filteredPhotos,
          })
          .eq('id', session.user.id);

        if (error) throw error;
      }

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
        {[1, 2, 3, 4, 5].map((step) => (
          <View key={step} style={styles.stepIndicatorWrapper}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= step ? styles.activeStepCircle : styles.inactiveStepCircle,
              ]}
            >
              {currentStep > step ? (
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
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
            {step < 5 && (
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
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Who are you?</Text>
            <Text style={styles.stepSubtitle}>Let's start with the basics.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="What should we call you?"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Must be 18 or older"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                maxLength={3}
              />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Profile</Text>
            <Text style={styles.stepSubtitle}>Select your gender and who you want to match with.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>I am a</Text>
              <View style={styles.pillContainer}>
                {(['man', 'woman', 'non_binary'] as const).map((g) => {
                  const label = g === 'man' ? 'Man' : g === 'woman' ? 'Woman' : 'Non-binary';
                  const isSelected = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.pillButton, isSelected && styles.pillButtonActive]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Show me</Text>
              <View style={styles.pillContainer}>
                {(['men', 'women', 'everyone'] as const).map((p) => {
                  const label = p === 'men' ? 'Men' : p === 'women' ? 'Women' : 'Everyone';
                  const isSelected = preference === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pillButton, isSelected && styles.pillButtonActive]}
                      onPress={() => setPreference(p)}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Location</Text>
            <Text style={styles.stepSubtitle}>
              Vibiy uses your location to discover connections nearby.
            </Text>

            <View style={styles.locationContainer}>
              <View style={styles.locationCard}>
                <View style={styles.locationIconBg}>
                  <MapPin size={32} color={COLORS.accent} />
                </View>
                
                {latitude && longitude ? (
                  <>
                    <Text style={styles.locationSuccessTitle}>📍 Location Captured!</Text>
                    <Text style={styles.locationSuccessCoords}>
                      {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.locationPromptText}>
                      We need permission to access your device's location services.
                    </Text>
                    <TouchableOpacity
                      style={[styles.locationBtn, locating && styles.locationBtnDisabled]}
                      onPress={captureLocation}
                      disabled={locating}
                    >
                      {locating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.locationBtnText}>Enable Location</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tell us your vibe</Text>
            <Text style={styles.stepSubtitle}>Write a short bio so matches can get to know you.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Short Bio</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="What are your hobbies? What music do you listen to? Share your style..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={5}
                value={bio}
                onChangeText={setBio}
              />
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload your photos</Text>
            <Text style={styles.stepSubtitle}>
              Add a stunning primary cover photo, plus additional photos to complete your vibe.
            </Text>

            {/* Primary Cover Card */}
            <Text style={styles.slotSectionLabel}>PRIMARY COVER PHOTO</Text>
            <View style={styles.primaryCoverSlot}>
              {uploadingIndex === 0 ? (
                <View style={styles.slotLoader}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={styles.uploadingText}>Uploading photo...</Text>
                </View>
              ) : photos[0] ? (
                <View style={styles.slotImageContainer}>
                  <Image source={{ uri: photos[0] }} style={styles.slotImage} />
                  <View style={styles.primaryCoverBadge}>
                    <Text style={styles.primaryCoverBadgeText}>PRIMARY COVER</Text>
                  </View>
                  <View style={styles.coverActionButtons}>
                    <TouchableOpacity
                      style={styles.changeCoverBtn}
                      onPress={() => handlePhotoSelect(0)}
                    >
                      <Camera size={14} color="#FFFFFF" />
                      <Text style={styles.changeCoverBtnText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteCoverBtn}
                      onPress={() => handlePhotoDelete(0)}
                    >
                      <Text style={styles.deleteBadgeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.primaryUploadTrigger}
                  onPress={() => handlePhotoSelect(0)}
                  activeOpacity={0.8}
                >
                  <View style={styles.primaryUploadIconBg}>
                    <Camera size={28} color={COLORS.textDark} strokeWidth={2} />
                  </View>
                  <Text style={styles.primaryUploadTitle}>Add Primary Photo</Text>
                  <Text style={styles.primaryUploadSubtitle}>
                    This is the main portrait matches will see on your card
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Additional Photos Section */}
            <Text style={[styles.slotSectionLabel, { marginTop: 24 }]}>
              MORE PHOTOS ({photos.slice(1).filter(Boolean).length}/5)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.secondaryPhotosScroll}
            >
              {[1, 2, 3, 4, 5].map((index) => {
                const photoUri = photos[index];
                return (
                  <View key={index} style={styles.secondaryPhotoSlot}>
                    {uploadingIndex === index ? (
                      <View style={styles.slotLoader}>
                        <ActivityIndicator size="small" color={COLORS.accent} />
                      </View>
                    ) : photoUri ? (
                      <View style={styles.slotImageContainer}>
                        <Image source={{ uri: photoUri }} style={styles.slotImage} />
                        <TouchableOpacity
                          style={styles.secondaryDeleteBtn}
                          onPress={() => handlePhotoDelete(index)}
                        >
                          <Text style={styles.deleteBadgeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.secondaryUploadTrigger}
                        onPress={() => handlePhotoSelect(index)}
                        activeOpacity={0.7}
                      >
                        <Camera size={18} color={COLORS.textDarkSecondary} strokeWidth={1.8} />
                        <Text style={styles.secondaryUploadText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>VIBIY</Text>
          {renderStepIndicator()}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderStepContent()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 1 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={submitting}>
              <ArrowLeft size={20} color={COLORS.textPrimary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          {currentStep < 5 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.finishButton, submitting && styles.disabledBtn]}
              onPress={handleFinish}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Complete</Text>
                  <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '70%',
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
    borderWidth: 1.5,
  },
  activeStepCircle: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  inactiveStepCircle: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.cardBorder,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '800',
  },
  activeStepText: {
    color: '#FFFFFF',
  },
  inactiveStepText: {
    color: COLORS.textMuted,
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  activeStepLine: {
    backgroundColor: COLORS.accent,
  },
  inactiveStepLine: {
    backgroundColor: COLORS.cardBorder,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
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
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 18,
    color: COLORS.textPrimary,
    fontSize: 16,
    height: 52,
    ...SHADOWS.sm,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  slotSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDarkSecondary,
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
  primaryCoverBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  primaryCoverBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    paddingHorizontal: 16,
    gap: 8,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
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
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  pillButton: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 100,
    ...SHADOWS.sm,
  },
  pillButtonActive: {
    backgroundColor: COLORS.accent,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
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
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '800',
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
});
