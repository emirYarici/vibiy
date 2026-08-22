import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock, Flame, Sparkles } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS } from '../../shared/theme';

interface DailyDropCountdownProps {
  totalMatchesCount?: number;
  maxMatchesCapacity?: number;
}

export default function DailyDropCountdown({
  totalMatchesCount = 0,
  maxMatchesCapacity = 3,
}: DailyDropCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
  }>({
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Target next drop at 09:00 AM
      const nextDrop = new Date(now);
      nextDrop.setHours(9, 0, 0, 0);

      // If current time is past 9 AM today, next drop countdown is tomorrow 9 AM
      if (now.getTime() > nextDrop.getTime()) {
        nextDrop.setDate(nextDrop.getDate() + 1);
      }

      const diffMs = nextDrop.getTime() - now.getTime();
      const totalSecs = Math.max(0, Math.floor(diffMs / 1000));

      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      const pad = (n: number) => String(n).padStart(2, '0');

      setTimeLeft({
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCapped = totalMatchesCount >= maxMatchesCapacity;
  const availableSlots = Math.max(0, maxMatchesCapacity - totalMatchesCount);

  const getDropForecastText = () => {
    if (isCapped) {
      return 'Match limit reached. Message or unmatch to unlock slots for tomorrow.';
    }
    if (totalMatchesCount === 2) {
      return '1 new match will drop tomorrow at 9:00 AM.';
    }
    if (totalMatchesCount === 1) {
      return '2 new matches will drop tomorrow at 9:00 AM.';
    }
    return '3 new curated matches will drop tomorrow at 9:00 AM.';
  };

  return (
    <View style={[styles.glassContainer, isCapped && styles.glassContainerCapped]}>
      {/* Top Row: Header & Timer */}
      <View style={styles.topRow}>
        <View style={styles.labelGroup}>
          <View style={styles.flameCircle}>
            <Flame size={14} color={COLORS.accent} fill={COLORS.accent} />
          </View>
          <Text style={styles.labelText}>
            {isCapped ? 'MATCH LIMIT (3/3)' : 'NEXT VIBE DROP'}
          </Text>
        </View>

        {/* Right: Sleek Digital Timer */}
        <View style={styles.timerPill}>
          <Clock size={11} color={COLORS.accent} />
          <Text style={styles.timerDigits}>
            {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Row: Status Badge & Dynamic Forecast Text */}
      <View style={styles.bottomRow}>
        <View
          style={[
            styles.statusBadge,
            isCapped ? styles.statusBadgeCapped : styles.statusBadgeOpen,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              isCapped ? styles.statusBadgeTextCapped : styles.statusBadgeTextOpen,
            ]}
          >
            {isCapped
              ? '3/3 FULL'
              : `${availableSlots} ${availableSlots === 1 ? 'SLOT' : 'SLOTS'} LEFT`}
          </Text>
        </View>

        <Text style={styles.forecastText} numberOfLines={2}>
          {getDropForecastText()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glassContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...SHADOWS.sm,
  },
  glassContainerCapped: {
    borderColor: 'rgba(255, 190, 84, 0.35)',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flameCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 190, 84, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  timerDigits: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  statusBadgeOpen: {
    backgroundColor: 'rgba(255, 190, 84, 0.18)',
    borderColor: 'rgba(255, 190, 84, 0.4)',
  },
  statusBadgeCapped: {
    backgroundColor: 'rgba(255, 80, 60, 0.2)',
    borderColor: 'rgba(255, 80, 60, 0.45)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusBadgeTextOpen: {
    color: COLORS.accent,
  },
  statusBadgeTextCapped: {
    color: '#FF6B6B',
  },
  forecastText: {
    flex: 1,
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    lineHeight: 16,
  },
});
