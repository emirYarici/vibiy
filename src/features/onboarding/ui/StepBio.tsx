import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { COLORS } from '../../../shared/theme';

interface StepBioProps {
  bio: string;
  setBio: (bio: string) => void;
  styles: any;
}

export default function StepBio({ bio, setBio, styles }: StepBioProps) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tell us your vibe</Text>
      <Text style={styles.stepSubtitle}>Write a short bio so matches can get to know you.</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Short Bio</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="What are your hobbies? What music do you listen to? Share your style..."
          placeholderTextColor={COLORS.textDarkSecondary}
          multiline
          numberOfLines={5}
          value={bio}
          onChangeText={setBio}
        />
      </View>
    </View>
  );
}
