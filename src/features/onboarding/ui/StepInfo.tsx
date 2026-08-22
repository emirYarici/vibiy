import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../../shared/theme';

interface StepInfoProps {
  name: string;
  setName: (name: string) => void;
  age: string;
  setAge: (age: string) => void;
  styles: any;
}

export default function StepInfo({ name, setName, age, setAge, styles }: StepInfoProps) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Who are you?</Text>
      <Text style={styles.stepSubtitle}>Let's start with the basics.</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="What should we call you?"
          placeholderTextColor={COLORS.textDarkSecondary}
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
          placeholderTextColor={COLORS.textDarkSecondary}
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
          maxLength={3}
        />
      </View>
    </View>
  );
}
