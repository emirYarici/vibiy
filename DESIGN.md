---
name: Vibiy
description: Video-first dating and social connection mobile application
colors:
  primary: "#E4281F"
  button-bg: "#FFBE54"
  button-text: "#331005"
  card-bg: "#FCEEC9"
  text-bg: "#FCEEC9"
  text-bg-secondary: "#FFE6BD"
  text-card: "#331005"
  text-card-secondary: "#78432C"
  active: "#FFBE54"
  danger: "#E4281F"
  warning: "#FFBE54"
rounded:
  xs: "6px"
  sm: "14px"
  md: "20px"
  card: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.button-bg}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.pill}"
    padding: "7px 12px"
  card-container:
    backgroundColor: "{colors.card-bg}"
    rounded: "{rounded.card}"
---

# Design System: Vibiy

## Overview

**Creative North Star: "The Velvet Cinema Club"**

A warm, immersive, screen-focused visual world. High contrast between rich espresso tones, deep crimson backdrops (Rojo), and golden yellow highlights (Xanthous) creates an intimate, theatrical feel. Smooth overlay gradients and frosted glass panels anchor video cards, letting short-form content take center stage.

**Key Characteristics:**
- Immersive dark cinema vibes with rich warm colors.
- Tactile physical-like components (frosted glass overlays, high border radii).
- High contrast for readability on cards and image thumbnails.

## Colors

Warm contrast between vibrant crimson (#E4281F), golden highlights (#FFBE54), and warm creamy whites (#FCEEC9).

### Primary
- **Rojo Red** (#E4281F): Vibrant primary background for main screens.

### Secondary
- **Xanthous Gold** (#FFBE54): Highlights, buttons, and active indicator colors.

### Neutral
- **Dutch White** (#FCEEC9): Creamy cards, primary text, and frosted panels.
- **Deep Espresso** (#331005): Dark contrast text inside cards and button labels.
- **Warm Cinnamon** (#78432C): Muted secondary text inside cards.

### Named Rules
**The Theme-Invariant Semantic Rule.** All styling must consume colors from `src/shared/theme.ts` via the active `THEME_CONFIG`. Hardcoded hex values are strictly forbidden in page files.

## Typography

**Display Font:** San Francisco (System)
**Body Font:** San Francisco (System)

**Character:** Dynamic Type-aware layout using clean, highly readable geometric sans-serif fonts.

### Hierarchy
- **Display** (800, 32px, line-height: 1.1): Used for screen headers and logo.
- **Headline** (800, 16px, line-height: 1.2): Section titles and profile names.
- **Body** (400, 15px, line-height: 1.4): Bios and paragraphs.
- **Label** (800, 11px, case: uppercase): Badge text and secondary actions.

## Layout

Layout constraints follow iOS HIG principles for touch target design and readability:
- 16pt page side margins.
- Cards (width 220px, height 300px) stacked horizontally with 14px gap.
- Container-based layouts using React Native Flexbox.

### Named Rules
**The Safe Area Rule.** All main screens must wrap layouts in `SafeAreaView` from `react-native-safe-area-context` to avoid rendering under iOS notches and home indicators.

## Elevation & Depth

Tactile layering featuring flat surfaces at rest with soft ambient shadows.

### Shadow Vocabulary
- **Ambient Shadow (sm)** (`shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, shadowOpacity: 0.1`): Used on floating badges.
- **Tactile Card Shadow (md)** (`shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, shadowOpacity: 0.14`): Used on profile cards.
- **Floating Active Shadow (floating)** (`shadowColor: buttonBackground, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.35`): Used on action buttons.

### Named Rules
**The Tactile Layering Rule.** Cards use depth-layered semi-transparent dark overlays (`rgba(28, 11, 5, 0.88)`) to maintain maximum readability on dynamic image backgrounds.

## Shapes

Rounded, organic shapes with soft, premium corner treatment.

### Named Rules
**The Smooth Corner Rule.** Cards use a corner radius of 28px (`RADIUS.card`), while smaller interactive components (pills, badges, buttons) use pill shapes (radius 9999px) for friendly tactile interaction.

## Components

For each component, lead with a short character line, then specify shape, color assignment, states, and any distinctive behavior.

### Buttons
- **Shape:** Pill-shaped (9999px radius).
- **Primary:** Xanthous background (#FFBE54), Deep Espresso text (#331005), padding `7px 12px`.
- **Compare Vibes Button:** Transparent background with Xanthous border and gold icons.

### Cards / Containers
- **Corner Style:** Rounded cards (22px or 28px radius).
- **Background:** Dutch White (#FCEEC9).
- **Shadow Strategy:** Tactile Card Shadow (md).
- **Internal Padding:** md (20px).

### Navigation
- **Style:** TabBar floating bottom bar utilizing `activeIndicator` (#FFBE54) for active tabs and a frosted glass overlay.

## Do's and Don'ts

Concrete visual guardrails grounded in the iOS implementation.

### Do:
- **Do** wrap every root-level page in `SafeAreaView` to prevent notches from clipping navigation.
- **Do** use `getMatchArchetype` logic to color match badges dynamically based on similarity score.
- **Do** ensure interactive elements have a minimum touch target size of 44x44 pt.

### Don't:
- **Don't** use hardcoded hex values in UI source files. Import all colors from `COLORS` in `src/shared/theme.ts`.
- **Don't** disable or intercept the default iOS left-edge swipe back gesture.
- **Don't** use generic loading spinners; use `SkeletonImage.tsx` shimmer effects for remote thumbnails.
