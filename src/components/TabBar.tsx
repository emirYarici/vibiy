import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Compass, MessageCircle, User } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';

interface TabBarProps {
  activeTab: 'profile' | 'matches' | 'share';
  setActiveTab: (tab: 'profile' | 'matches' | 'share') => void;
}

export default function TabBar({ activeTab, setActiveTab }: TabBarProps) {
  const tabs = [
    { key: 'share' as const, icon: Compass, label: 'Discover' },
    { key: 'matches' as const, icon: MessageCircle, label: 'Chats' },
    { key: 'profile' as const, icon: User, label: 'Profile' },
  ];

  return (
    <View style={styles.outerBackground} pointerEvents="box-none">
      <View style={styles.pill}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tabTouchable}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                <Icon
                  size={24}
                  color={isActive ? COLORS.textDark : COLORS.textDarkSecondary}
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive && tab.key === 'matches' ? 'rgba(35, 29, 56, 0.15)' : 'transparent'}
                />
                {isActive && <View style={styles.activeDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.pill,
    height: 62,
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...SHADOWS.lg,
  },
  tabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIconWrapper: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.sm,
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textDark,
  },
});
