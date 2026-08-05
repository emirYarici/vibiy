import { StyleSheet, Platform } from 'react-native';

export const COLORS = {
  bg: '#fdfdf8', // Warm Parchment
  cardBg: '#ffffff',
  cardBgHover: '#eeefe9', // Sage Cream
  cardBorder: '#bfc1b7', // Sage Border
  cardBorderSoft: '#b6b7af', // Light Border
  textPrimary: '#23251d', // Deep Olive
  textSecondary: '#4d4f46', // Olive Ink
  textMuted: '#65675e', // Muted Olive
  inputBg: '#eeefe9', // Sage Cream
  primary: '#1e1f23', // Dark Primary
  secondary: '#e5e7e0', // Light Sage
  accent: '#F54E00', // PostHog Orange
  bottomBarBg: '#eeefe9',
  success: '#16a34a',
  danger: '#ef4444',
  warn: '#F7A501', // Amber Gold
};

export const RADIUS = {
  xs: 2,
  sm: 4, // Button, inputs
  md: 6, // Cards, list items
  lg: 12,
  pill: 9999,
};

export const COMMON_STYLES = StyleSheet.create({
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
});

