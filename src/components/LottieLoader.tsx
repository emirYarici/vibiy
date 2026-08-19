import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import LottieView from 'lottie-react-native';

interface LottieLoaderProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  loop?: boolean;
  autoPlay?: boolean;
  speed?: number;
  source?: any;
}

export const LottieLoader: React.FC<LottieLoaderProps> = ({
  size = 180,
  style,
  loop = true,
  autoPlay = true,
  speed = 1,
  source = require('../../assets/loading.json'),
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <LottieView
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LottieLoader;
