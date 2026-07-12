import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Home, Heart, User } from 'lucide-react-native';

const ACTIVE_BLUE = '#F54E00'; // PostHog Orange
const ICON_INACTIVE = '#4D4F46'; // Olive Ink

interface TabBarProps {
  activeTab: 'profile' | 'matches' | 'share';
  setActiveTab: (tab: 'profile' | 'matches' | 'share') => void;
}

export default function TabBar({ activeTab, setActiveTab }: TabBarProps) {
  const tabs = [
    { key: 'share' as const, icon: Home },
    { key: 'matches' as const, icon: Heart },
    { key: 'profile' as const, icon: User },
  ];

  return (
    <View style={styles.outerBackground}>
      <View style={styles.shadowWrapper}>
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
                {isActive ? (
                  <View style={styles.activeIconWrapper}>
                    <Icon size={24} color={ACTIVE_BLUE} fill={ACTIVE_BLUE} strokeWidth={2.2} />
                  </View>
                ) : (
                  <Icon size={24} color={ICON_INACTIVE} strokeWidth={2} style={styles.inactiveIcon} />
                )}

                {/* Bevelled connector blob under the active tab (pointing upwards) */}
                {isActive && (
                  <View style={styles.pointerClip}>
                    <View style={styles.pointerBlob} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  shadowWrapper: {
    // PostHog uses borders rather than shadows for depth
    elevation: 0,
  },
  pill: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fdfdf8', // Warm Parchment
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#bfc1b7', // Sage Border
    height: 56,
    paddingHorizontal: 10,
    overflow: 'hidden', // clips pointer clip boundary at the bottom edge
  },
  tabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '100%',
  },
  activeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIcon: {},
  // Bevelled connector pointer clip pointing UPWARDS
  pointerClip: {
    position: 'absolute',
    bottom: 0, // sits at the bottom edge inside the pill
    width: 24,
    height: 12,
    overflow: 'hidden',
    alignItems: 'center',
    zIndex: 10,
  },
  pointerBlob: {
    width: 24,
    height: 24,
    borderRadius: 6, // softens the corners -> bevelled look
    backgroundColor: ACTIVE_BLUE,
    transform: [{ rotate: '45deg' }],
    marginTop: 5, // pushes center down so only the top corner peaks up
  },
});

