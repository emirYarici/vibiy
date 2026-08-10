/**
 * ==============================================================================
 * APP THEME & COLOR SYSTEM CONFIGURATION
 * ==============================================================================
 * You can easily customize the app's entire appearance from this single file.
 * To change the colors, simply edit the ACTIVE_THEME values or select a preset!
 */

export interface ThemeColors {
  background: string;
  buttonBackground: string;
  buttonTextColor: string;
  cardBackground: string;
  textOnBackground: string;
  textOnBackgroundSecondary: string;
  textOnCard: string;
  textOnCardSecondary: string;
  activeIndicator: string;
  danger: string;
  warning: string;
}

// Preset Themes for 1-click swapping
export const THEME_PRESETS = {
  // New Variant: Rojo background, Xanthous golden buttons, Dutch White text/cards
  ROJO_DUTCH_XANTHOUS: {
    background: '#E4281F', // Rojo (warm vibrant red)
    buttonBackground: '#FFBE54', // Xanthous (golden yellow)
    buttonTextColor: '#331005', // Deep espresso for maximum readability on yellow
    cardBackground: '#FCEEC9', // Dutch White (creamy warm surface)
    textOnBackground: '#FCEEC9', // Dutch White text on Rojo bg
    textOnBackgroundSecondary: '#FFE6BD', // Warm cream secondary text
    textOnCard: '#331005', // Deep espresso text inside cards
    textOnCardSecondary: '#78432C', // Warm cinnamon secondary text inside cards
    activeIndicator: '#FFBE54', // Xanthous gold indicator
    danger: '#E4281F',
    warning: '#FFBE54',
  },

  // Previous Variant: Purplish background, Greenish buttons, Whitish text, Ivory cards
  PEAR_INDIGO_IVORY: {
    background: '#A88AED', // Purplish / Indigo
    buttonBackground: '#CBD83B', // Greenish / Pear
    buttonTextColor: '#231D38', // Dark Plum for crisp readability
    cardBackground: '#FFFEEC', // Warm Ivory
    textOnBackground: '#FFFEEC', // Whitish / Ivory headers
    textOnBackgroundSecondary: '#F3EFFF', // Soft whitish lavender
    textOnCard: '#231D38', // Dark Plum inside cards
    textOnCardSecondary: '#5E5873', // Muted Plum
    activeIndicator: '#CBD83B', // Pear Green
    danger: '#EF4444',
    warning: '#F59E0B',
  },

  // Reference: Mindate Sky Blue / Mint Pastel theme
  MINDATE_PASTEL: {
    background: '#EBF4F8',
    buttonBackground: '#0EA5E9',
    buttonTextColor: '#FFFFFF',
    cardBackground: '#FFFFFF',
    textOnBackground: '#0F172A',
    textOnBackgroundSecondary: '#475569',
    textOnCard: '#0F172A',
    textOnCardSecondary: '#64748B',
    activeIndicator: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
  },

  // Sleek Dark Mode
  MIDNIGHT_DARK: {
    background: '#0F172A',
    buttonBackground: '#38BDF8',
    buttonTextColor: '#0F172A',
    cardBackground: '#1E293B',
    textOnBackground: '#FFFFFF',
    textOnBackgroundSecondary: '#94A3B8',
    textOnCard: '#F8FAFC',
    textOnCardSecondary: '#94A3B8',
    activeIndicator: '#38BDF8',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
};

/**
 * ⚡ ACTIVE COLOR CONFIGURATION
 * Simply switch the active preset below!
 */
export const THEME_CONFIG: ThemeColors = THEME_PRESETS.ROJO_DUTCH_XANTHOUS;
// export const THEME_CONFIG: ThemeColors = THEME_PRESETS.PEAR_INDIGO_IVORY;
// export const THEME_CONFIG: ThemeColors = THEME_PRESETS.MINDATE_PASTEL;
// export const THEME_CONFIG: ThemeColors = THEME_PRESETS.MIDNIGHT_DARK;

/**
 * Border Radius System
 */
export const RADIUS_CONFIG = {
  xs: 6,
  sm: 14,
  md: 20,
  lg: 26,
  xl: 32,
  card: 28,
  pill: 9999,
};
