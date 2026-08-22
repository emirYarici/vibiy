import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  StyleProp,
  ViewStyle,
  Image,
  ImageProps,
} from 'react-native';
import { COLORS } from '../../theme';
import AppLoader from '../AppLoader/AppLoader';

// Global cache tracking already loaded image URIs for instant rendering
const LOADED_IMAGE_CACHE = new Set<string>();

export interface SkeletonImageProps extends ImageProps {
  containerStyle?: StyleProp<ViewStyle>;
  skeletonStyle?: StyleProp<ViewStyle>;
  showSkeleton?: boolean;
  showLoader?: boolean;
  loaderColor?: string;
  loaderSize?: 'small' | 'large' | number;
}

export default function SkeletonImage({
  source,
  style,
  containerStyle,
  skeletonStyle,
  showSkeleton = true,
  showLoader = true,
  loaderColor = COLORS.accent,
  loaderSize = 'small',
  onLoadStart,
  onLoadEnd,
  onError,
  ...rest
}: SkeletonImageProps) {
  const uri = (source && typeof source === 'object' && 'uri' in source) ? (source as any).uri : null;
  const isLocalAsset = typeof source === 'number';
  const isAlreadyCached = Boolean(uri && LOADED_IMAGE_CACHE.has(uri));

  // If local asset or already cached, start with isLoading = false (no loader flicker)
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (isLocalAsset || isAlreadyCached || !source) return false;
    return true;
  });

  const prevUriRef = useRef<string | null>(uri);
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Only reset isLoading when URI genuinely changes to a non-cached URI
  useEffect(() => {
    if (uri !== prevUriRef.current) {
      prevUriRef.current = uri;
      if (uri && !LOADED_IMAGE_CACHE.has(uri)) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
    }
  }, [uri]);

  // Safety fallback: if native iOS image event was missed due to cache hit
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleLoadSuccess = (e: any) => {
    if (uri) LOADED_IMAGE_CACHE.add(uri);
    setIsLoading(false);
    (rest as any).onLoad?.(e);
  };

  const handleLoadStart = () => {
    if (uri && LOADED_IMAGE_CACHE.has(uri)) return;
    setIsLoading(true);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    if (uri) LOADED_IMAGE_CACHE.add(uri);
    setIsLoading(false);
    onLoadEnd?.();
  };

  const handleError = (e: any) => {
    setIsLoading(false);
    onError?.(e);
  };

  const flattenedStyle = (StyleSheet.flatten(style) || {}) as any;
  const borderRadius = flattenedStyle.borderRadius || 0;
  const borderTopLeftRadius = flattenedStyle.borderTopLeftRadius || borderRadius;
  const borderTopRightRadius = flattenedStyle.borderTopRightRadius || borderRadius;
  const borderBottomLeftRadius = flattenedStyle.borderBottomLeftRadius || borderRadius;
  const borderBottomRightRadius = flattenedStyle.borderBottomRightRadius || borderRadius;

  const finalSource = source;

  return (
    <View
      style={[
        styles.container,
        style,
        containerStyle,
        {
          borderRadius,
          borderTopLeftRadius,
          borderTopRightRadius,
          borderBottomLeftRadius,
          borderBottomRightRadius,
        },
      ]}
    >
      {/* Standard Image Component */}
      {finalSource ? (
        <Image
          {...rest}
          source={finalSource}
          style={[styles.imageFull, style]}
          resizeMode={rest.resizeMode || (flattenedStyle.resizeMode as any) || 'cover'}
          onLoad={handleLoadSuccess}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
        />
      ) : null}

      {/* Shimmering Skeleton Background */}
      {showSkeleton && isLoading && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.skeleton,
            {
              opacity: pulseAnim,
              borderRadius,
              borderTopLeftRadius,
              borderTopRightRadius,
              borderBottomLeftRadius,
              borderBottomRightRadius,
            },
            skeletonStyle,
          ]}
        />
      )}

      {/* Centered AppLoader */}
      {showLoader && isLoading && (
        <View style={styles.loaderCenter} pointerEvents="none">
          <AppLoader size={loaderSize} color={loaderColor} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  skeleton: {
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
    zIndex: 1,
  },
  loaderCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  imageFull: {
    width: '100%',
    height: '100%',
  },
});
