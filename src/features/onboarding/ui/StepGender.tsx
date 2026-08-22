import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface StepGenderProps {
  gender: 'man' | 'woman' | 'non_binary' | null;
  setGender: (g: 'man' | 'woman' | 'non_binary') => void;
  preference: 'men' | 'women' | 'everyone' | null;
  setPreference: (p: 'men' | 'women' | 'everyone') => void;
  styles: any;
}

export default function StepGender({
  gender,
  setGender,
  preference,
  setPreference,
  styles,
}: StepGenderProps) {
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
}
