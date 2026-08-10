import { StyleSheet, Platform } from 'react-native';
import { THEME_CONFIG, RADIUS_CONFIG } from './themeConfig';

export const COLORS = {
  // Screen & Surface Colors
  bg: THEME_CONFIG.background,
  bgLight: THEME_CONFIG.background,
  cardBg: THEME_CONFIG.cardBackground,
  cardBgIvory: THEME_CONFIG.cardBackground,
  cardBgHover: 'rgba(0, 0, 0, 0.04)',
  cardBgTranslucent: 'rgba(255, 255, 255, 0.9)',
  cardBgGlass: 'rgba(255, 255, 255, 0.2)',
  cardBorder: 'rgba(0, 0, 0, 0.08)',
  cardBorderSoft: 'rgba(255, 255, 255, 0.25)',

  // Typography
  textPrimary: THEME_CONFIG.textOnBackground,
  textSecondary: THEME_CONFIG.textOnBackgroundSecondary,
  textMuted: THEME_CONFIG.textOnBackgroundSecondary,
  textDark: THEME_CONFIG.textOnCard,
  textDarkSecondary: THEME_CONFIG.textOnCardSecondary,
  textCardMuted: THEME_CONFIG.textOnCardSecondary,

  // Buttons, Highlights & Actions
  inputBg: THEME_CONFIG.cardBackground,
  primary: THEME_CONFIG.buttonBackground,
  primaryText: THEME_CONFIG.buttonTextColor,
  secondary: 'rgba(255, 255, 255, 0.2)',
  accent: THEME_CONFIG.buttonBackground,
  accentText: THEME_CONFIG.buttonTextColor,
  accentHover: THEME_CONFIG.buttonBackground,
  accentLight: 'rgba(255, 255, 255, 0.18)',
  accentHeart: THEME_CONFIG.buttonBackground,

  // Indicators & Badges
  bottomBarBg: THEME_CONFIG.cardBackground,
  activeIndicator: THEME_CONFIG.activeIndicator,
  success: THEME_CONFIG.activeIndicator,
  danger: THEME_CONFIG.danger,
  warn: THEME_CONFIG.warning,
  white: '#FFFFFF',
  pillBg: 'rgba(255, 255, 255, 0.22)',
  pillBgSolid: THEME_CONFIG.cardBackground,
};

export const RADIUS = RADIUS_CONFIG;

export const SHADOWS = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  floating: {
    shadowColor: THEME_CONFIG.buttonBackground,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
};

export const COMMON_STYLES = StyleSheet.create({
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  glassCard: {
    backgroundColor: COLORS.cardBgGlass,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorderSoft,
    ...SHADOWS.md,
  },
  circularButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  pillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
