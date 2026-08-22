import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../shared/theme';

export interface AppLoaderProps {
  size?: number | 'small' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
  strokeWidth?: number;
}

export default function AppLoader({
  size = 'small',
  color = COLORS.accent,
  style,
  strokeWidth,
}: AppLoaderProps) {
  const numericSize =
    typeof size === 'number'
      ? size
      : size === 'large'
      ? 36
      : 20;

  const actualStrokeWidth = strokeWidth || Math.max(2, numericSize * 0.12);
  const radius = (numericSize - actualStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * 0.3; // 70% visible arc

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 900,
        easing: Easing.linear,
      }),
      -1, // infinite
      false // do not reverse
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View
      style={[
        styles.container,
        { width: numericSize, height: numericSize },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: numericSize,
            height: numericSize,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        <Svg width={numericSize} height={numericSize} viewBox={`0 0 ${numericSize} ${numericSize}`}>
          {/* Subtle track circle */}
          <Circle
            cx={numericSize / 2}
            cy={numericSize / 2}
            r={radius}
            stroke={color}
            strokeWidth={actualStrokeWidth}
            strokeOpacity={0.2}
            fill="none"
          />
          {/* Spinning highlighted arc */}
          <Circle
            cx={numericSize / 2}
            cy={numericSize / 2}
            r={radius}
            stroke={color}
            strokeWidth={actualStrokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
