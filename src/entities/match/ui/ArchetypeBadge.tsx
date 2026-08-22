import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Sparkles, Magnet } from 'lucide-react-native';
import { MatchArchetype } from '../../../shared/types';
import { RADIUS, SHADOWS } from '../../../shared/theme';

export const ArchetypeIcon = ({
  type,
  size = 14,
  color,
}: {
  type: MatchArchetype['type'];
  size?: number;
  color: string;
}) => {
  switch (type) {
    case 'twin_flame':
      return <Flame size={size} color={color} strokeWidth={2.4} fill={color} />;
    case 'chemistry':
      return <Sparkles size={size} color={color} strokeWidth={2.2} fill={color} />;
    case 'opposites_attract':
      return <Magnet size={size} color={color} strokeWidth={2.4} />;
    default:
      return <Sparkles size={size} color={color} strokeWidth={2.2} />;
  }
};

export const ArchetypePillBadge = ({
  archetype,
  showIcon = true,
  size = 'md',
}: {
  archetype: MatchArchetype;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';
  const iconSize = isSmall ? 10 : isLarge ? 13 : 11;

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: archetype.bgColor },
        isSmall && styles.pillSm,
        isLarge && styles.pillLg,
      ]}
    >
      {showIcon && (
        <ArchetypeIcon type={archetype.type} size={iconSize} color={archetype.textColor} />
      )}
      <Text
        style={[
          styles.text,
          { color: archetype.textColor },
          isSmall && styles.textSm,
          isLarge && styles.textLg,
        ]}
      >
        {archetype.badgeText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  pillSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  pillLg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    ...SHADOWS.sm,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  textSm: {
    fontSize: 9,
    fontWeight: '800',
  },
  textLg: {
    fontSize: 12,
    fontWeight: '800',
  },
});
