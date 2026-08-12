import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Clock, Sparkles, Flame } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS } from '../shared/theme';

interface DailyDropCountdownProps {
  unlockedCount?: number;
  totalDailyMatches?: number;
}

export default function DailyDropCountdown({
  unlockedCount = 3,
  totalDailyMatches = 0,
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

  const isLive = totalDailyMatches > 0;

  return (
    <View style={styles.glassContainer}>
      <View style={styles.topRow}>
        {/* Left: Icon & Badge */}
        <View style={styles.labelGroup}>
          <View style={[styles.flameCircle, isLive && styles.flameCircleLive]}>
            <Flame size={14} color={COLORS.accent} fill={COLORS.accent} />
          </View>
          <Text style={styles.labelText}>
            {isLive ? 'DAILY VIBE DROP' : 'NEXT VIBE DROP'}
          </Text>
          {isLive && (
            <View style={styles.livePill}>
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* Right: Sleek Digital Timer */}
        <View style={styles.timerPill}>
          <Clock size={11} color="rgba(255, 255, 255, 0.75)" />
          <Text style={styles.timerDigits}>
            {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
          </Text>
        </View>
      </View>

      {/* Subtext */}
      <Text style={styles.subtext}>
        {isLive
          ? `${totalDailyMatches} new profile${totalDailyMatches === 1 ? '' : 's'} tailored to your reels today`
          : 'Share 3 reels to unlock your curated drop at 9:00 AM'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glassContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
    backgroundColor: 'rgba(255, 190, 84, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameCircleLive: {
    backgroundColor: 'rgba(255, 190, 84, 0.3)',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  livePill: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  livePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.accentText,
    letterSpacing: 0.5,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  timerDigits: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFBE54',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  subtext: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 6,
    fontWeight: '500',
  },
});
