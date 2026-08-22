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
import { COLORS } from '../shared/theme';
import AppLoader from './AppLoader';

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
  showLoader = false,
  loaderColor = COLORS.accent,
  loaderSize = 'small',
  onLoadStart,
  onLoadEnd,
  onError,
  ...rest
}: SkeletonImageProps) {
  const [isLoading, setIsLoading] = useState(true);
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

  const uri = (source && typeof source === 'object' && 'uri' in source) ? source.uri : null;

  useEffect(() => {
    if (uri) {
      setIsLoading(true);
    }
  }, [uri]);

  const handleLoadSuccess = (e: any) => {
    setIsLoading(false);
    (rest as any).onLoad?.(e);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
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
      <Image
        {...rest}
        source={finalSource}
        style={[styles.imageFull, style]}
        onLoad={handleLoadSuccess}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />

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

      {/* Centered Spinner Loader */}
      {showLoader && isLoading && (
        <View style={styles.loaderCenter}>
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
