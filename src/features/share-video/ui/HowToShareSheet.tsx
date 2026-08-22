import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Zap } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { COLORS, RADIUS, SHADOWS } from '../../../shared/theme';

interface HowToShareSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  renderBackdrop: (props: any) => React.ReactElement;
}

export default function HowToShareSheet({
  sheetRef,
  renderBackdrop,
}: HowToShareSheetProps) {
  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      enablePanDownToClose
    >
      <BottomSheetView style={styles.content}>
        {/* Header Icon */}
        <View style={styles.iconWrap}>
          <Zap size={28} color={COLORS.primaryText} fill={COLORS.accent} />
        </View>

        <Text style={styles.title}>How to Share Reels</Text>
        <Text style={styles.subtitle}>
          Share 3 Instagram Reels daily to teach our AI your humor & aesthetic and unlock tomorrow's 9:00 AM match drop!
        </Text>

        {/* Methods Guide */}
        <View style={styles.methodsContainer}>
          {/* Method 1: Direct iOS Share Sheet */}
          <View style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>Direct Share (Fastest ⚡)</Text>
                <Text style={styles.methodDesc}>
                  Tap <Text style={styles.boldText}>Share ✈️</Text> on any Reel in Instagram → choose <Text style={styles.boldText}>Share to...</Text> → tap <Text style={styles.boldText}>Vibiy</Text>.
                </Text>
              </View>
            </View>
          </View>

          {/* Method 2: Copy & Paste Link */}
          <View style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>Copy & Paste Link 📋</Text>
                <Text style={styles.methodDesc}>
                  Tap <Text style={styles.boldText}>Share → Copy link</Text> on Instagram, open Vibiy and tap <Text style={styles.boldText}>Paste</Text>.
                </Text>
              </View>
            </View>
          </View>

          {/* Pro Tip */}
          <View style={styles.proTipCard}>
            <Text style={styles.proTipTitle}>💡 iOS Share Sheet Pro-Tip</Text>
            <Text style={styles.proTipText}>
              Don't see Vibiy in the share sheet? Scroll right, tap <Text style={styles.boldText}>More (⋯)</Text>, and add <Text style={styles.boldText}>Vibiy</Text> to your <Text style={styles.boldText}>Favorites</Text> for 1-tap sharing!
            </Text>
          </View>
        </View>

        {/* Dismiss CTA */}
        <TouchableOpacity
          style={styles.gotItBtn}
          onPress={() => sheetRef.current?.dismiss()}
          activeOpacity={0.85}
        >
          <Text style={styles.gotItBtnText}>Got It! Let's Share ✨</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.cardBgIvory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    width: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 6,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  methodsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  methodCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  methodDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textDarkSecondary,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.textDark,
  },
  proTipCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  proTipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  proTipText: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textDarkSecondary,
  },
  gotItBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  gotItBtnText: {
    color: COLORS.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
});
