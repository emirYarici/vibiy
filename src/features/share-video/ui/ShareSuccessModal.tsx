import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import LottieLoader from '../../../shared/ui/LottieLoader/LottieLoader';
import { COLORS, RADIUS, SHADOWS } from '../../../shared/theme';

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
                  source={require('../../../../assets/success.json')}
                  size={190}
                  loop={true}
                  autoPlay={true}
                />
              </View>

              {/* Title & Headline */}
              <Text style={styles.title}>
                {isUnlocked ? 'All 3 Slots Filled! 🔥' : 'Reel Shared! 🎉'}
              </Text>

              {/* Dynamic Body Text */}
              <Text style={styles.body}>
                {isUnlocked ? (
                  <>
                    Awesome! You've filled all{' '}
                    <Text style={styles.boldHighlight}>3/3 video slots</Text> today.
                    {'\n\n'}
                    Your vibe taste profile is locked in! Your next curated compatibility match will happen{' '}
                    <Text style={styles.boldHighlight}>tomorrow morning at 9:00 AM</Text> ☀️✨
                  </>
                ) : (
                  <>
                    Great taste! You've shared{' '}
                    <Text style={styles.boldHighlight}>{sharedCount}/3 reels</Text> today.
                    {'\n\n'}
                    Share <Text style={styles.boldHighlight}>{remaining} more video{remaining === 1 ? '' : 's'}</Text> to unlock your curated match drop tomorrow morning!
                  </>
                )}
              </Text>

              {/* Progress / Drop Schedule Pill */}
              {isUnlocked ? (
                <View style={styles.dropScheduledPill}>
                  <Text style={styles.dropScheduledPillText}>
                    ⏰ Match Drop: Tomorrow Morning at 9:00 AM
                  </Text>
                </View>
              ) : (
                <View style={styles.progressPill}>
                  <Text style={styles.progressPillText}>
                    Today's Progress: {Math.min(sharedCount, 3)}/3 Shared
                  </Text>
                </View>
              )}

              {/* CTA Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>
                  {isUnlocked ? 'Got It! See You Tomorrow ✨' : 'Keep Vibing ✨'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: COLORS.cardBgIvory || '#FCEEC9',
    borderRadius: RADIUS.xl || 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
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
    color: COLORS.textDark || '#331005',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14.5,
    color: COLORS.textDarkSecondary || '#78432C',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  boldHighlight: {
    fontWeight: '700',
    color: '#E4281F',
  },
  progressPill: {
    backgroundColor: 'rgba(255, 190, 84, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  progressPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark || '#331005',
  },
  dropScheduledPill: {
    backgroundColor: 'rgba(228, 40, 31, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(228, 40, 31, 0.25)',
  },
  dropScheduledPillText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#E4281F',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#E4281F',
    paddingVertical: 14,
    borderRadius: RADIUS.lg || 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default ShareSuccessModal;
