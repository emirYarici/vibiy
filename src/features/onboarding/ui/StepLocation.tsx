import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { COLORS } from '../../../shared/theme';
import AppLoader from '../../../shared/ui/AppLoader/AppLoader';

interface StepLocationProps {
  latitude: number | null;
  longitude: number | null;
  locating: boolean;
  captureLocation: () => void;
  styles: any;
}

export default function StepLocation({
  latitude,
  longitude,
  locating,
  captureLocation,
  styles,
}: StepLocationProps) {
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
                  <AppLoader size="small" color={COLORS.primaryText} />
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
}
