import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { XCircle } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { COLORS, RADIUS, SHADOWS } from '../../../shared/theme';

interface InvalidUrlSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  invalidUrl: string | null;
  onDismiss: () => void;
  renderBackdrop: (props: any) => React.ReactElement;
}

export default function InvalidUrlSheet({
  sheetRef,
  invalidUrl,
  onDismiss,
  renderBackdrop,
}: InvalidUrlSheetProps) {
  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      enablePanDownToClose
      onDismiss={onDismiss}
    >
      <BottomSheetView style={styles.content}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <XCircle size={30} color={COLORS.textDark} />
        </View>

        <Text style={styles.title}>Not an Instagram URL</Text>
        <Text style={styles.body}>
          This doesn't look like an Instagram reel link. Please share a URL from{' '}
          <Text style={styles.highlight}>instagram</Text>.
        </Text>

        {/* Bad URL pill */}
        {invalidUrl ? (
          <View style={styles.urlPill}>
            <Text style={styles.urlText} numberOfLines={2}>
              {invalidUrl}
            </Text>
          </View>
        ) : null}

        <Text style={styles.hint}>
          Example:{' '}
          <Text style={styles.hintCode}>instagram.com/reel/ABC123</Text>
        </Text>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => sheetRef.current?.dismiss()}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissText}>Got it</Text>
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
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(228, 40, 31, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14,
  },
  highlight: {
    color: COLORS.textDark,
    fontWeight: '800',
  },
  urlPill: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(220,50,50,0.2)',
  },
  urlText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    marginBottom: 28,
    textAlign: 'center',
  },
  hintCode: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  dismissBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
});
