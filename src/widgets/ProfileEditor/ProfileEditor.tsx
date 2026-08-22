import React, { useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Camera, Check, Eye } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { COLORS, RADIUS, SHADOWS } from '../../shared/theme';
import SkeletonImage from '../../shared/ui/SkeletonImage/SkeletonImage';
import AppLoader from '../../shared/ui/AppLoader/AppLoader';

interface ProfileEditorProps {
  userName: string;
  setUserName: (val: string) => void;
  userAge: string;
  setUserAge: (val: string) => void;
  userBio: string;
  setUserBio: (val: string) => void;
  userOccupation: string;
  setUserOccupation: (val: string) => void;
  userGender: 'man' | 'woman' | 'non_binary' | null;
  setUserGender: (val: 'man' | 'woman' | 'non_binary' | null) => void;
  userPreference: 'men' | 'women' | 'everyone' | null;
  setUserPreference: (val: 'men' | 'women' | 'everyone' | null) => void;
  profilePhotos: (string | null)[];
  uploadingIndex: number | null;
  handlePhotoSelect: (index: number) => void;
  handlePhotoDelete: (index: number) => void;
  handleSaveProfile: () => void;
  isSaving: boolean;
  onLogout?: () => void;
  renderBackdrop: (props: any) => React.ReactElement;
  saveModalRef: React.RefObject<BottomSheetModal | null>;
  setActiveTab: (tab: 'preview' | 'edit') => void;
}

export default function ProfileEditor({
  userName,
  setUserName,
  userAge,
  setUserAge,
  userBio,
  setUserBio,
  userOccupation,
  setUserOccupation,
  userGender,
  setUserGender,
  userPreference,
  setUserPreference,
  profilePhotos,
  uploadingIndex,
  handlePhotoSelect,
  handlePhotoDelete,
  handleSaveProfile,
  isSaving,
  onLogout,
  renderBackdrop,
  saveModalRef,
  setActiveTab,
}: ProfileEditorProps) {
  return (
    <View style={styles.editSection}>
      {/* Primary Cover Slot */}
      <Text style={styles.editSectionHeading}>PRIMARY COVER PHOTO</Text>
      <View style={[styles.primaryCoverBox, profilePhotos[0] ? styles.primaryCoverBoxFilled : null]}>
        {uploadingIndex === 0 ? (
          <View style={styles.slotLoader}>
            <AppLoader size="large" color={COLORS.accent} />
          </View>
        ) : profilePhotos[0] ? (
          <View style={styles.coverImageContainer}>
            <SkeletonImage source={{ uri: profilePhotos[0] }} style={styles.coverImage} resizeMode="cover" />
            <View style={styles.coverBtnsRow}>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => handlePhotoSelect(0)}
              >
                <Camera size={14} color={COLORS.white} />
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handlePhotoDelete(0)}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyCoverTrigger}
            onPress={() => handlePhotoSelect(0)}
            activeOpacity={0.8}
          >
            <View style={styles.emptyCoverIconBg}>
              <Camera size={26} color={COLORS.textDark} />
            </View>
            <Text style={styles.emptyCoverTitle}>Add Primary Photo</Text>
            <Text style={styles.emptyCoverSub}>Your main portrait on cards</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Additional Photos Horizontal Strip */}
      <Text style={[styles.editSectionHeading, { marginTop: 24 }]}>
        ADDITIONAL PHOTOS ({profilePhotos.slice(1).filter(Boolean).length}/5)
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.additionalPhotosScroll}
      >
        {[1, 2, 3, 4, 5].map((index) => {
          const photoUri = profilePhotos[index];
          return (
            <View key={index} style={[styles.additionalSlot, photoUri ? styles.additionalSlotFilled : null]}>
              {uploadingIndex === index ? (
                <View style={styles.slotLoader}>
                  <AppLoader size="small" color={COLORS.accent} />
                </View>
              ) : photoUri ? (
                <View style={styles.slotImageContainer}>
                  <SkeletonImage source={{ uri: photoUri }} style={styles.slotImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.additionalDeleteBtn}
                    onPress={() => handlePhotoDelete(index)}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.additionalUploadTrigger}
                  onPress={() => handlePhotoSelect(index)}
                  activeOpacity={0.7}
                >
                  <Camera size={18} color={COLORS.textDarkSecondary} strokeWidth={1.8} />
                  <Text style={styles.additionalUploadText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Profile Form Details */}
      <View style={styles.profileFormCard}>
        <Text style={styles.formCardHeading}>About You</Text>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Pete, Sarah"
            placeholderTextColor={COLORS.textDarkSecondary}
            value={userName}
            onChangeText={setUserName}
          />
        </View>

        {/* Age */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Age</Text>
          <TextInput
            style={styles.textInput}
            placeholder="25"
            placeholderTextColor={COLORS.textDarkSecondary}
            keyboardType="numeric"
            value={userAge}
            onChangeText={setUserAge}
          />
        </View>

        {/* Bio / Intro */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Intro Bio</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Write an intro in your own voice..."
            placeholderTextColor={COLORS.textDarkSecondary}
            multiline
            numberOfLines={4}
            value={userBio}
            onChangeText={setUserBio}
          />
        </View>

        {/* Gender Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>I am a</Text>
          <View style={styles.pillContainer}>
            {(['man', 'woman', 'non_binary'] as const).map((g) => {
              const label = g === 'man' ? 'Man' : g === 'woman' ? 'Woman' : 'Non-binary';
              const isSelected = userGender === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.pillButton, isSelected && styles.pillButtonActive]}
                  onPress={() => setUserGender(g)}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preference Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Interested in</Text>
          <View style={styles.pillContainer}>
            {(['men', 'women', 'everyone'] as const).map((p) => {
              const label = p === 'men' ? 'Men' : p === 'women' ? 'Women' : 'Everyone';
              const isSelected = userPreference === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.pillButton, isSelected && styles.pillButtonActive]}
                  onPress={() => setUserPreference(p)}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Profile Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveProfile}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <AppLoader size="small" color={COLORS.white} />
          ) : (
            <>
              <Check size={18} color={COLORS.white} strokeWidth={2.5} />
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Logout */}
      {onLogout && (
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <Text style={styles.logoutBtnText}>Log Out Session</Text>
        </TouchableOpacity>
      )}

      {/* ── Saved! Confirmation Bottom Sheet Modal ────────────────────── */}
      <BottomSheetModal
        ref={saveModalRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.savedSheetBg}
        handleIndicatorStyle={styles.savedSheetHandle}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.savedSheetContent}>
          {/* Animated/Glow Icon Circle */}
          <View style={styles.savedIconCircle}>
            <Check size={32} color={COLORS.white} strokeWidth={3} />
          </View>

          {/* Heading */}
          <Text style={styles.savedSheetTitle}>Saved!</Text>
          <Text style={styles.savedSheetSubtitle}>
            Your profile details, photos, and preferences have been updated successfully.
          </Text>

          {/* Profile Snapshot Card */}
          <View style={styles.savedPreviewCard}>
            {profilePhotos[0] ? (
              <SkeletonImage source={{ uri: profilePhotos[0] }} style={styles.savedAvatar} />
            ) : (
              <View style={[styles.savedAvatar, styles.savedAvatarFallback]}>
                <Text style={styles.savedAvatarFallbackText}>
                  {(userName || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.savedPreviewInfo}>
              <Text style={styles.savedPreviewName} numberOfLines={1}>
                {userName.trim() || 'Pete'}{userAge.trim() ? `, ${userAge.trim()}` : ''}
              </Text>
              <Text style={styles.savedPreviewOccupation} numberOfLines={1}>
                {userOccupation.trim() || "I'm self-employed"}
              </Text>
              {userBio.trim() ? (
                <Text style={styles.savedPreviewBio} numberOfLines={1}>
                  {userBio.trim()}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.savedActions}>
            <TouchableOpacity
              style={styles.savedPreviewBtn}
              onPress={() => {
                saveModalRef.current?.dismiss();
                setActiveTab('preview');
              }}
              activeOpacity={0.85}
            >
              <Eye size={16} color={COLORS.textDark} strokeWidth={2.2} />
              <Text style={styles.savedPreviewBtnText}>View Preview Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.savedDoneBtn}
              onPress={() => saveModalRef.current?.dismiss()}
              activeOpacity={0.75}
            >
              <Text style={styles.savedDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  editSection: {
    paddingHorizontal: 16,
  },
  editSectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  primaryCoverBox: {
    width: '100%',
    height: 340,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: 'rgba(51, 16, 5, 0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryCoverBoxFilled: {
    borderStyle: 'solid',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  coverImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: RADIUS.card,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.card,
    resizeMode: 'cover',
  },
  coverBtnsRow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  changeBtn: {
    backgroundColor: 'rgba(51, 16, 5, 0.82)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  deleteBtn: {
    backgroundColor: COLORS.danger,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCoverTrigger: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyCoverIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  emptyCoverTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptyCoverSub: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
  },
  additionalPhotosScroll: {
    paddingRight: 16,
  },
  additionalSlot: {
    width: 90,
    height: 120,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(51, 16, 5, 0.12)',
    borderStyle: 'dashed',
    backgroundColor: COLORS.cardBgIvory,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  additionalSlotFilled: {
    borderStyle: 'solid',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  slotImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  slotImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.md,
    resizeMode: 'cover',
  },
  slotLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.danger,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  additionalUploadTrigger: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  additionalUploadText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
  },
  profileFormCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 22,
    marginTop: 28,
    borderWidth: 2,
    borderColor: 'rgba(51, 16, 5, 0.08)',
    ...SHADOWS.sm,
  },
  formCardHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 20,
    letterSpacing: -0.4,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDarkSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.pill,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(51, 16, 5, 0.1)',
  },
  textArea: {
    height: 100,
    borderRadius: RADIUS.md,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: 'rgba(51, 16, 5, 0.08)',
  },
  pillButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOWS.sm,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
  },
  pillTextActive: {
    color: COLORS.textDark,
    fontWeight: '900',
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    height: 52,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    ...SHADOWS.floating,
  },
  saveBtnText: {
    color: COLORS.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
  logoutBtn: {
    marginTop: 24,
    marginHorizontal: 16,
    height: 50,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  savedSheetBg: {
    backgroundColor: COLORS.cardBgIvory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  savedSheetHandle: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    width: 40,
  },
  savedSheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: 'center',
  },
  savedIconCircle: {
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
  savedSheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  savedSheetSubtitle: {
    fontSize: 13,
    color: COLORS.textDarkSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  savedPreviewCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(51,16,5,0.06)',
  },
  savedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  savedAvatarFallback: {
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedAvatarFallbackText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryText,
  },
  savedPreviewInfo: {
    flex: 1,
  },
  savedPreviewName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  savedPreviewOccupation: {
    fontSize: 12,
    color: COLORS.textDarkSecondary,
    marginVertical: 1,
  },
  savedPreviewBio: {
    fontSize: 11,
    color: COLORS.textDarkSecondary,
  },
  savedActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  savedPreviewBtn: {
    flex: 1.3,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...SHADOWS.floating,
  },
  savedPreviewBtnText: {
    color: COLORS.primaryText,
    fontSize: 13,
    fontWeight: '900',
  },
  savedDoneBtn: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(51,16,5,0.08)',
  },
  savedDoneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
});
