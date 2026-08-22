import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Camera } from 'lucide-react-native';
import { COLORS } from '../../../shared/theme';
import AppLoader from '../../../shared/ui/AppLoader/AppLoader';
import SkeletonImage from '../../../shared/ui/SkeletonImage/SkeletonImage';

interface StepPhotosProps {
  photos: (string | null)[];
  uploadingIndex: number | null;
  handlePhotoSelect: (index: number) => void;
  handlePhotoDelete: (index: number) => void;
  styles: any;
}

export default function StepPhotos({
  photos,
  uploadingIndex,
  handlePhotoSelect,
  handlePhotoDelete,
  styles,
}: StepPhotosProps) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Upload your photos</Text>
      <Text style={styles.stepSubtitle}>
        Add a stunning primary cover photo, plus additional photos to complete your vibe.
      </Text>

      {/* Primary Cover Card */}
      <Text style={styles.slotSectionLabel}>PRIMARY COVER PHOTO</Text>
      <View style={styles.primaryCoverSlot}>
        {uploadingIndex === 0 ? (
          <View style={styles.slotLoader}>
            <AppLoader size="large" color={COLORS.accent} />
            <Text style={styles.uploadingText}>Uploading photo...</Text>
          </View>
        ) : photos[0] ? (
          <View style={styles.slotImageContainer}>
            <SkeletonImage source={{ uri: photos[0] }} style={styles.slotImage} resizeMode="cover" />
            <View style={styles.coverActionButtons}>
              <TouchableOpacity
                style={styles.changeCoverBtn}
                onPress={() => handlePhotoSelect(0)}
              >
                <Camera size={14} color={COLORS.white} />
                <Text style={styles.changeCoverBtnText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteCoverBtn}
                onPress={() => handlePhotoDelete(0)}
              >
                <Text style={styles.deleteBadgeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryUploadTrigger}
            onPress={() => handlePhotoSelect(0)}
            activeOpacity={0.8}
          >
            <View style={styles.primaryUploadIconBg}>
              <Camera size={28} color={COLORS.textDark} strokeWidth={2} />
            </View>
            <Text style={styles.primaryUploadTitle}>Add Primary Photo</Text>
            <Text style={styles.primaryUploadSubtitle}>
              This is the main portrait matches will see on your card
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Additional Photos Section */}
      <Text style={[styles.slotSectionLabel, { marginTop: 24 }]}>
        MORE PHOTOS ({photos.slice(1).filter(Boolean).length}/5)
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.secondaryPhotosScroll}
      >
        {[1, 2, 3, 4, 5].map((index) => {
          const photoUri = photos[index];
          return (
            <View key={index} style={styles.secondaryPhotoSlot}>
              {uploadingIndex === index ? (
                <View style={styles.slotLoader}>
                  <AppLoader size="small" color={COLORS.accent} />
                </View>
              ) : photoUri ? (
                <View style={styles.slotImageContainer}>
                  <SkeletonImage source={{ uri: photoUri }} style={styles.slotImage} />
                  <TouchableOpacity
                    style={styles.secondaryDeleteBtn}
                    onPress={() => handlePhotoDelete(index)}
                  >
                    <Text style={styles.deleteBadgeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.secondaryUploadTrigger}
                  onPress={() => handlePhotoSelect(index)}
                  activeOpacity={0.7}
                >
                  <Camera size={18} color={COLORS.textDarkSecondary} strokeWidth={1.8} />
                  <Text style={styles.secondaryUploadText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
