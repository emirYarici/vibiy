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
import { COLORS, RADIUS } from '../shared/theme';

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
              Tap slots to upload photos. Slot 1 will be your primary profile photo.
            </Text>

            <View style={styles.tinderGrid}>
              {photos.map((photoUri, index) => {
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
                        <ActivityIndicator size="small" color={COLORS.accent} />
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
                        <Camera size={20} color={COLORS.textMuted} strokeWidth={1.5} />
                        <Text style={styles.uploadText}>{isPrimary ? 'Add Primary' : 'Add'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
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
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 32,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  textInput: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
    height: 52,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  tinderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
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
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  primaryBadgeText: {
    fontSize: 8,
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
    gap: 6,
  },
  uploadText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
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
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.sm,
    gap: 8,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.sm,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  pillButton: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 100,
  },
  pillButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  locationContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCard: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    padding: 30,
    alignItems: 'center',
    gap: 16,
  },
  locationIconBg: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardBgHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  locationPromptText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 8,
  },
  locationBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
  },
  locationBtnDisabled: {
    opacity: 0.5,
  },
  locationBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationSuccessTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  locationSuccessCoords: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
