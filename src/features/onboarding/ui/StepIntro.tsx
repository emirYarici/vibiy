import React from 'react';
import { View, Text } from 'react-native';
import { Zap, Send, Share2, Sparkles, Flame } from 'lucide-react-native';
import { COLORS } from '../../../shared/theme';

interface StepIntroProps {
  styles: any;
}

export default function StepIntro({ styles }: StepIntroProps) {
  return (
    <View style={styles.stepContent}>
      <View style={styles.shareHeaderBadge}>
        <Zap size={14} color={COLORS.textDark} />
        <Text style={styles.shareHeaderBadgeText}>INSTAGRAM DIRECT SHARE</Text>
      </View>

      <Text style={styles.stepTitle}>Share with 1 Tap</Text>
      <Text style={styles.stepSubtitle}>
        Send Instagram Reels directly to Vibiy using the native iOS Share Sheet — no copying links needed!
      </Text>

      {/* 3 Step Visual Sequence */}
      <View style={styles.shareGuideContainer}>
        {/* Step 1 */}
        <View style={styles.shareStepCard}>
          <View style={styles.shareStepNumberCircle}>
            <Text style={styles.shareStepNumberText}>1</Text>
          </View>
          <View style={styles.shareStepBody}>
            <View style={styles.shareStepTitleRow}>
              <Text style={styles.shareStepTitle}>Find a Reel on Instagram</Text>
              <Send size={16} color={COLORS.textDarkSecondary} />
            </View>
            <Text style={styles.shareStepDesc}>
              When watching a Reel that matches your vibe, tap the <Text style={styles.boldText}>Share ✈️</Text> icon.
            </Text>
          </View>
        </View>

        {/* Step 2 */}
        <View style={styles.shareStepCard}>
          <View style={styles.shareStepNumberCircle}>
            <Text style={styles.shareStepNumberText}>2</Text>
          </View>
          <View style={styles.shareStepBody}>
            <View style={styles.shareStepTitleRow}>
              <Text style={styles.shareStepTitle}>Choose Vibiy in Share Sheet</Text>
              <Share2 size={16} color={COLORS.textDarkSecondary} />
            </View>
            <Text style={styles.shareStepDesc}>
              Tap <Text style={styles.boldText}>Share to...</Text> and select <Text style={styles.boldText}>Vibiy</Text> from your iOS share menu.
            </Text>
          </View>
        </View>

        {/* Step 3 */}
        <View style={styles.shareStepCard}>
          <View style={styles.shareStepNumberCircle}>
            <Text style={styles.shareStepNumberText}>3</Text>
          </View>
          <View style={styles.shareStepBody}>
            <View style={styles.shareStepTitleRow}>
              <Text style={styles.shareStepTitle}>Auto-Synced & Analyzed</Text>
              <Sparkles size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.shareStepDesc}>
              Vibiy instantly receives the reel, analyzes the vibe with AI, and counts it toward your daily goal!
            </Text>
          </View>
        </View>

        {/* Pro Tip Callout */}
        <View style={styles.proTipCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 14 }}>💡</Text>
            <Text style={styles.proTipTitle}>iOS Share Setup</Text>
          </View>
          <Text style={styles.proTipText}>
            Don't see Vibiy in the share row? Scroll right, tap <Text style={styles.boldText}>More (⋯)</Text>, and add <Text style={styles.boldText}>Vibiy</Text> to your <Text style={styles.boldText}>Favorites</Text>.
          </Text>
        </View>

        {/* Rule of 3 Banner */}
        <View style={styles.ruleBanner}>
          <View style={styles.ruleFlameIconBg}>
            <Flame size={20} color={COLORS.danger} fill={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ruleBannerTitle}>3 Reels Every Day 🔥</Text>
            <Text style={styles.ruleBannerSub}>
              Share 3 Reels daily before midnight to receive your next batch of matched connections.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
