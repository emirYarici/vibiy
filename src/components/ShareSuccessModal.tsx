import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import LottieLoader from './LottieLoader';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';

interface ShareSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  sharedCount: number;
}

export const ShareSuccessModal: React.FC<ShareSuccessModalProps> = ({
  visible,
  onClose,
  sharedCount,
}) => {
  if (!visible) return null;

  const remaining = Math.max(0, 3 - sharedCount);
  const isUnlocked = sharedCount >= 3;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Celebration Lottie Animation */}
              <View style={styles.animationContainer}>
                <LottieLoader
                  source={require('../../assets/success.json')}
                  size={190}
                  loop={true}
                  autoPlay={true}
                />
              </View>

              {/* Title & Headline */}
              <Text style={styles.title}>
                {isUnlocked ? 'Drop Unlocked! 🔥' : 'Reel Shared! 🎉'}
              </Text>

              {/* Dynamic Body Text */}
              <Text style={styles.body}>
                {isUnlocked ? (
                  <>
                    Awesome! You've shared{' '}
                    <Text style={styles.boldHighlight}>3/3 reels</Text> today.
                    {'\n\n'}
                    Tomorrow's 9:00 AM match drop is fully unlocked!
                  </>
                ) : (
                  <>
                    Great taste! You've shared{' '}
                    <Text style={styles.boldHighlight}>{sharedCount}/3 reels</Text> today.
                    {'\n\n'}
                    Share <Text style={styles.boldHighlight}>{remaining} more video{remaining === 1 ? '' : 's'}</Text> to unlock tomorrow's 9:00 AM match drop!
                  </>
                )}
              </Text>

              {/* Progress Counter Pill */}
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>
                  Today's Progress: {Math.min(sharedCount, 3)}/3 Shared
                </Text>
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>
                  {isUnlocked ? 'Awesome! ✨' : 'Keep Vibing ✨'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 16, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#181822',
    borderRadius: RADIUS.xl,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...SHADOWS.lg,
  },
  animationContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: -10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14.5,
    color: 'rgba(255, 255, 255, 0.78)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  boldHighlight: {
    fontWeight: '700',
    color: COLORS.primary || '#FF3B5C',
  },
  progressPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFE6BD',
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.accent || '#FFBE54',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#331005',
  },
});

export default ShareSuccessModal;
