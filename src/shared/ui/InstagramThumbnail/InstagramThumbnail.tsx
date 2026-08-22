import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Play } from 'lucide-react-native';
import { COLORS, RADIUS } from '../../theme';
import SkeletonImage from '../SkeletonImage/SkeletonImage';
import { CONFIG } from '../../config';

const getInstagramThumbnail = (url: string) => {
  if (!url) return null;
  return `${CONFIG.API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(url)}`;
};

interface InstagramThumbnailProps {
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  size?: number;
}

export default function InstagramThumbnail({
  url,
  thumbnailUrl: directThumbnailUrl,
  width,
  height,
  borderRadius = RADIUS.sm,
  size = 60,
}: InstagramThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const thumbnailUrl = !hasError
    ? directThumbnailUrl || (url ? getInstagramThumbnail(url) : null)
    : null;

  useEffect(() => {
    if (thumbnailUrl) {
      Image.prefetch(thumbnailUrl).catch(() => {});
    }
  }, [thumbnailUrl]);

  const w = width || size;
  const h = height || size;

  return (
    <View style={[styles.thumbContainer, { width: w, height: h, borderRadius }]}>
      {thumbnailUrl ? (
        <SkeletonImage
          source={{
            uri: thumbnailUrl,
            cache: 'force-cache',
            headers: {
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          showLoader={false}
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={styles.thumbFallback}>
          <Play size={Math.min(w, h) * 0.35} color={COLORS.textMuted} fill={COLORS.textMuted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbContainer: {
    backgroundColor: COLORS.cardBg,
    overflow: 'hidden',
  },
  thumbFallback: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
