import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  StyleProp,
  ViewStyle,
  ImageProps,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../shared/theme';

export interface SkeletonImageProps extends ImageProps {
  containerStyle?: StyleProp<ViewStyle>;
  skeletonStyle?: StyleProp<ViewStyle>;
  showSkeleton?: boolean;
  showLoader?: boolean;
  loaderColor?: string;
  loaderSize?: 'small' | 'large';
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
  const [isLoading, setIsLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(0.35)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

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

  const handleLoadStart = () => {
    setIsLoading(true);
    imageOpacity.setValue(0);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
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

  return (
    <View
      style={[
        styles.container,
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
      {/* Shimmering Skeleton Background */}
      {showSkeleton && isLoading && (
        <Animated.View
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

      {/* Centered Activity Spinner Loader */}
      {showLoader && isLoading && (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size={loaderSize} color={loaderColor} />
        </View>
      )}

      {/* Image with smooth fade-in */}
      <Animated.Image
        {...rest}
        source={source}
        style={[style, { opacity: imageOpacity }]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
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
});
