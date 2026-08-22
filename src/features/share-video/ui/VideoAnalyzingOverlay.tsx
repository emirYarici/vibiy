import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import LottieLoader from '../../../shared/ui/LottieLoader/LottieLoader';
import { COLORS, RADIUS, SHADOWS } from '../../../shared/theme';

const DEFAULT_LOADING_MESSAGES = [
  'Fetching reel metadata...',
  'Analyzing your vibe...',
  'Running AI on content...',
  'Computing taste vectors...',
  'Almost there...',
];

interface VideoAnalyzingOverlayProps {
  visible: boolean;
  title?: string;
  messages?: string[];
}

export const VideoAnalyzingOverlay: React.FC<VideoAnalyzingOverlayProps> = ({
  visible,
  title = 'Analyzing Reel',
  messages = DEFAULT_LOADING_MESSAGES,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (visible) {
      // Fade in backdrop & card
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      // Cycle messages with smooth crossfade
      setMsgIndex(0);
      textFadeAnim.setValue(1);
      const interval = setInterval(() => {
        Animated.timing(textFadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          setMsgIndex((i) => (i + 1) % messages.length);
          Animated.timing(textFadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }).start();
        });
      }, 2200);

      return () => {
        clearInterval(interval);
      };
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, messages]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          {/* Lottie Animation Header */}
          <View style={styles.lottieContainer}>
            <LottieLoader size={170} />
          </View>

          {/* Typography */}
          <Text style={styles.title}>{title}</Text>
          <Animated.View style={[styles.subtitleContainer, { opacity: textFadeAnim }]}>
            <Text style={styles.subtitle}>{messages[msgIndex]}</Text>
          </Animated.View>

          {/* Step Progress Dots */}
          <View style={styles.dotsContainer}>
            {messages.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === msgIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </Animated.View>
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
    maxWidth: 320,
    backgroundColor: COLORS.cardBgIvory || '#FCEEC9',
    borderRadius: RADIUS.xl || 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  lottieContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark || '#331005',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitleContainer: {
    minHeight: 22,
    justifyContent: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textDarkSecondary || '#78432C',
    textAlign: 'center',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  dotActive: {
    width: 20,
    backgroundColor: COLORS.textDark || '#331005',
  },
});

export default VideoAnalyzingOverlay;
