import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, RADIUS } from '../shared/theme';
import { ShareHistoryItem } from '../shared/types';

import LoginPage from '../pages/LoginPage';
import ProfilePage from '../pages/ProfilePage';
import MatchesPage from '../pages/MatchesPage';
import SharePage from '../pages/SharePage';
import TabBar from '../components/TabBar';

export default function AppContainer() {
  const [session, setSession] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'matches' | 'share'>('matches');
  const [sharedUrlFromLink, setSharedUrlFromLink] = useState<string | null>(null);
  const [shareHistory, setShareHistory] = useState<ShareHistoryItem[]>([]);

  // Load history from AsyncStorage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem('@share_history');
        if (stored) {
          setShareHistory(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load share history:', err);
      }
    };
    loadHistory();
  }, []);

  // Fetch user's shared video history from Supabase on session change
  useEffect(() => {
    const fetchDbHistory = async () => {
      if (!session?.user?.id || isDemoMode || !isSupabaseConfigured) return;
      
      try {
        const { data, error } = await supabase
          .from('userid_videos')
          .select(`
            id,
            created_at,
            videos (
              id,
              url,
              summary
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const dbHistory: ShareHistoryItem[] = data
            .filter((item: any) => item.videos !== null)
            .map((item: any) => {
              const video = item.videos;
              const url = video.url;

              let type: 'post' | 'reel' | 'other' = 'other';
              let shortcode = 'N/A';
              if (url.includes('/p/')) {
                type = 'post';
                const parts = url.split('/p/');
                if (parts[1]) shortcode = parts[1].split('/')[0] || 'N/A';
              } else if (url.includes('/reel/')) {
                type = 'reel';
                const parts = url.split('/reel/');
                if (parts[1]) shortcode = parts[1].split('/')[0] || 'N/A';
              }

              const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return {
                id: video.id || item.id,
                url,
                timestamp: timeStr,
                type,
                shortcode,
                summary: video.summary || undefined,
              };
            });

          setShareHistory(dbHistory);
          await AsyncStorage.setItem('@share_history', JSON.stringify(dbHistory));
        }
      } catch (err) {
        console.error('Failed to sync share history from database:', err);
      }
    };

    fetchDbHistory();
  }, [session, isDemoMode]);

  const handleUpdateHistory = async (newHistory: ShareHistoryItem[]) => {
    setShareHistory(newHistory);
    try {
      await AsyncStorage.setItem('@share_history', JSON.stringify(newHistory));
    } catch (err) {
      console.error('Failed to save share history:', err);
    }
  };

  // Handle incoming deep link URLs at the root level
  useEffect(() => {
    const handleIncomingUrl = (url: string) => {
      console.log('Received deep link URL at root:', url);
      if (url.startsWith('vibiy://share')) {
        const queryString = url.split('?')[1];
        if (queryString) {
          const pairs = queryString.split('&');
          const urlPair = pairs.find(p => p.startsWith('url='));
          if (urlPair) {
            const rawSharedUrl = decodeURIComponent(urlPair.split('=')[1]);
            setSharedUrlFromLink(rawSharedUrl);
            setActiveTab('share');
          }
        }
      }
    };

    // 1. Handle deep link when app is in background/foreground
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    // 2. Handle initial deep link when app is launched from scratch
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleIncomingUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Check current session on launch
  useEffect(() => {
    const initAuth = async () => {
      try {
        const guestFlag = await AsyncStorage.getItem('@guest_session');
        if (guestFlag === 'true') {
          setIsDemoMode(true);
          setSession({
            user: {
              id: 'demo-guest-user',
              email: 'guest@vibiy.com',
              user_metadata: { full_name: 'Guest User' },
            },
          });
          setLoading(false);
          return;
        }

        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        setSession(supabaseSession);
      } catch (err) {
        console.error('Failed to initialize session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isDemoMode) {
        setSession(newSession);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isDemoMode]);

  const handleLoginSuccess = async (userSession: any, isDemo: boolean = false) => {
    if (isDemo) {
      await AsyncStorage.setItem('@guest_session', 'true');
      setIsDemoMode(true);
    }
    setSession(userSession);
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem('@guest_session');
      setIsDemoMode(false);
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setSession(null);
    } catch (err) {
      Alert.alert('Logout Error', 'An error occurred during logout.');
    } finally {
      setLoading(false);
    }
  };

  // Pulse loading animation
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ opacity: pulseAnim, transform: [{ scale: pulseAnim }] }}>
          <Text style={styles.loadingLogo}>vibiy</Text>
        </Animated.View>
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePage session={session} onLogout={handleLogout} />;
      case 'matches':
        return <MatchesPage userPhoto={null} />;
      case 'share':
        return (
          <SharePage
            session={session}
            initialSharedUrl={sharedUrlFromLink}
            onClearInitialUrl={() => setSharedUrlFromLink(null)}
            history={shareHistory}
            onUpdateHistory={handleUpdateHistory}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexContainer}
      >
        {/* Screen Layout */}
        <View style={styles.mainLayoutContent}>
          {/* Upper Brand Info - Minimal Text Only */}
          <Text style={styles.minimalBrandTitle}>vibiy</Text>

          {/* Content Body */}
          <View style={styles.screenBody}>{renderContent()}</View>

          {/* Floating Bottom Tab Bar */}
          <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  flexContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 3,
  },
  mainLayoutContent: {
    flex: 1,
  },
  minimalBrandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 30,
    marginBottom: 8,
  },
  screenBody: {
    flex: 1,
    paddingBottom: 95, // Offset to prevent floating tab bar from covering content
  },
});
