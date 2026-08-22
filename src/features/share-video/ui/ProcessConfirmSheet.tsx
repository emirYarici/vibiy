import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { COLORS, RADIUS, SHADOWS } from '../../../shared/theme';

interface ProcessConfirmSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  reelLabel: string;
  sharedCount: number;
  pendingUrl: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  renderBackdrop: (props: any) => React.ReactElement;
}

export default function ProcessConfirmSheet({
  sheetRef,
  reelLabel,
  sharedCount,
  pendingUrl,
  onCancel,
  onConfirm,
  renderBackdrop,
}: ProcessConfirmSheetProps) {
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
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Sparkles size={28} color={COLORS.textDark} />
        </View>

        {/* Heading */}
        <Text style={styles.title}>Share This Reel?</Text>
        <Text style={styles.body}>
          You are sharing a video.{' '}
          <Text style={styles.highlight}>
            This will be your {reelLabel} reel of the day!
          </Text>
          {sharedCount < 2
            ? `\n\nYou need ${3 - sharedCount - 1} more video${3 - sharedCount - 1 === 1 ? '' : 's'} to unlock tomorrow morning's match drop. 🔥`
            : sharedCount === 2
            ? "\n\nThis fills all 3 slots! Your curated match drop will happen tomorrow morning at 9:00 AM! ☀️✨"
            : '\n\nAll 3 slots are full! Your matches will drop tomorrow morning at 9:00 AM. 🎉'}
        </Text>

        {/* URL pill */}
        {pendingUrl ? (
          <View style={styles.urlPill}>
            <Text style={styles.urlText} numberOfLines={1}>
              {pendingUrl.replace('https://www.instagram.com', 'instagram.com')}
            </Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={styles.confirmText}>Share It! 🚀</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
    ...SHADOWS.sm,
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
    marginBottom: 24,
  },
  highlight: {
    color: COLORS.textDark,
    fontWeight: '800',
  },
  urlPill: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 28,
    maxWidth: '100%',
  },
  urlText: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(94, 88, 115, 0.15)',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
});
