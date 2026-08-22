import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { ShieldAlert, X, Check, AlertTriangle } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';
import { useReportUser, useBlockUser } from '../shared/queries/useSafety';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reporterId: string;
  reportedUserId: string;
  reportedUserName?: string;
  matchId?: string;
  isDemoMode?: boolean;
  onReportSuccess?: () => void;
}

const REPORT_REASONS = [
  'Inappropriate messages or photos',
  'Harassment, bullying, or hate speech',
  'Spam, advertising, or scam links',
  'Fake profile or stolen photos',
  'Underage user',
  'Other reason',
];

export default function ReportModal({
  visible,
  onClose,
  reporterId,
  reportedUserId,
  reportedUserName = 'User',
  matchId,
  isDemoMode = false,
  onReportSuccess,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);

  const reportMutation = useReportUser();
  const blockMutation = useBlockUser();

  const isSubmitting = reportMutation.isPending || blockMutation.isPending;

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a reason for reporting.');
      return;
    }

    try {
      // 1. Submit report
      await reportMutation.mutateAsync({
        reporterId,
        reportedUserId,
        matchId,
        reason: selectedReason,
        details: details.trim(),
        isDemoMode,
      });

      // 2. Also block and purge if checked
      if (alsoBlock) {
        await blockMutation.mutateAsync({
          blockerId: reporterId,
          blockedUserId: reportedUserId,
          matchId,
          isDemoMode,
        });
      }

      Alert.alert(
        'Report Submitted',
        `Thank you for helping keep Vibiy safe. We review reports within 24 hours${
          alsoBlock ? ' and have blocked this user for you.' : '.'
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onReportSuccess) onReportSuccess();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.iconContainer}>
                    <ShieldAlert size={20} color={COLORS.danger} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Report {reportedUserName}</Text>
                    <Text style={styles.modalSubtitle}>Help us maintain a safe community</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={20} color={COLORS.textDarkSecondary} />
                </TouchableOpacity>
              </View>

              {/* Reasons List */}
              <Text style={styles.sectionLabel}>Select a reason:</Text>
              <View style={styles.reasonsList}>
                {REPORT_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonItem, isSelected && styles.reasonItemSelected]}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.reasonText, isSelected && styles.reasonTextSelected]}
                        numberOfLines={1}
                      >
                        {reason}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkIcon}>
                          <Check size={14} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Details Input */}
              <Text style={styles.sectionLabel}>Additional details (optional):</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Tell us what happened..."
                placeholderTextColor={COLORS.textDarkSecondary}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={3}
                maxLength={300}
              />

              {/* Also Block Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAlsoBlock(!alsoBlock)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, alsoBlock && styles.checkboxActive]}>
                  {alsoBlock && <Check size={12} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  Block this user and permanently end chat
                </Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 16, 5, 0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(228, 40, 31, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    marginTop: 4,
  },
  reasonsList: {
    gap: 6,
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(51, 16, 5, 0.1)',
  },
  reasonItemSelected: {
    backgroundColor: 'rgba(228, 40, 31, 0.12)',
    borderColor: COLORS.danger,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: '700',
    color: COLORS.danger,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(51, 16, 5, 0.1)',
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 13,
    color: COLORS.textDark,
    minHeight: 65,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.textDarkSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  checkboxLabel: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(51, 16, 5, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
  },
  submitButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});
