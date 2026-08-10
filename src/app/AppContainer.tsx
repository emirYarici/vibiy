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
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { COLORS, RADIUS } from '../shared/theme';
import { ShareHistoryItem } from '../shared/types';

import LoginPage from '../pages/LoginPage';
import ProfilePage from '../pages/ProfilePage';
import MatchesPage from '../pages/MatchesPage';
import SharePage from '../pages/SharePage';
import TabBar from '../components/TabBar';
import ProfileOnboarding from '../pages/ProfileOnboarding';
import ProfileDetailsPage from '../pages/ProfileDetailsPage';
import ChatPage from '../pages/ChatPage';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef<any>();

export default function AppContainer() {
  const [session, setSession] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
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

  // Request notifications permission and fetch FCM token on mount / login
  useEffect(() => {
    if (!session) return;

    const requestPermissionAndToken = async () => {
      try {
        const {
          getMessaging,
          requestPermission,
          AuthorizationStatus,
          getToken,
          registerDeviceForRemoteMessages,
        } = require('@react-native-firebase/messaging');
        const messagingInstance = getMessaging();
        
        // Request Permission
        const authStatus = await requestPermission(messagingInstance);
        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('FCM Notification permission granted. Status:', authStatus);
          
          // Register device for remote messages on iOS
          if (Platform.OS === 'ios') {
            await registerDeviceForRemoteMessages(messagingInstance);
          }

          // Fetch token
          const token = await getToken(messagingInstance);
          console.log('FCM Device Token:', token);
          
          // Optionally save token to Supabase profiles
          if (session?.user?.id && !isDemoMode && isSupabaseConfigured) {
            const { error } = await supabase
              .from('profiles')
              .update({ fcm_token: token })
              .eq('id', session.user.id);
              
            if (error) {
              console.error('Failed to save FCM token to Supabase:', error.message);
            } else {
              console.log('Successfully saved FCM token to Supabase profiles!');
            }
          }
        } else {
          console.log('FCM Notification permission denied.');
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        if (
          errMsg.includes('aps-environment') ||
          errMsg.includes('apns') ||
          err?.code === 'messaging/unknown' ||
          err?.code === 'messaging/unregistered'
        ) {
          console.warn(
            'FCM Setup Warning: Push notifications are not configured for this app in Xcode/Developer portal. ' +
            'Please enable "Push Notifications" in Xcode -> Signing & Capabilities.'
          );
        } else {
          console.error('Error during FCM setup:', err);
        }
      }
    };

    requestPermissionAndToken();

    // Listen to notifications in foreground and tap events (background + cold-start)
    let unsubscribeForeground = () => {};
    let unsubscribeOpened = () => {};

    try {
      const {
        getMessaging,
        onMessage,
        onNotificationOpenedApp,
        getInitialNotification,
      } = require('@react-native-firebase/messaging');
      const messagingInstance = getMessaging();

      // 1. Foreground Notification Banner/Alert
      unsubscribeForeground = onMessage(messagingInstance, async (remoteMessage: any) => {
        const matchId = remoteMessage?.data?.matchId;
        Alert.alert(
          remoteMessage.notification?.title || 'New Message',
          remoteMessage.notification?.body || 'You have received a new message.',
          matchId
            ? [
                { text: 'Dismiss', style: 'cancel' },
                {
                  text: 'View Chat',
                  onPress: () => {
                    if (navigationRef.isReady()) {
                      navigationRef.navigate('Chat', { matchId, session, isDemoMode });
                    }
                  },
                },
              ]
            : [{ text: 'OK' }]
        );
      });

      // 2. Background State -> User taps notification banner
      unsubscribeOpened = onNotificationOpenedApp(messagingInstance, (remoteMessage: any) => {
        console.log('📲 [DEEPLINK] Notification clicked from background:', remoteMessage?.data);
        const matchId = remoteMessage?.data?.matchId;
        if (matchId && navigationRef.isReady()) {
          navigationRef.navigate('Chat', { matchId, session, isDemoMode });
        }
      });

      // 3. Cold Start (App Quit) -> User opened app by tapping notification
      getInitialNotification(messagingInstance).then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('📲 [DEEPLINK] Notification clicked from quit state:', remoteMessage?.data);
          const matchId = remoteMessage?.data?.matchId;
          if (matchId) {
            // Wait for navigation container to mount
            setTimeout(() => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('Chat', { matchId, session, isDemoMode });
              }
            }, 600);
          }
        }
      });
    } catch (err) {
      console.warn('FCM notification listeners skipped (Firebase not configured).');
    }

    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [session, isDemoMode]);

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
              summary,
              username,
              thumbnail_url
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
                username: video.username || undefined,
                thumbnail_url: video.thumbnail_url || undefined,
                created_at: item.created_at,
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

  // Check profile completeness when session changes
  useEffect(() => {
    const checkProfileStatus = async () => {
      if (!session) {
        setIsProfileComplete(null);
        return;
      }

      try {
        if (isDemoMode) {
          const cachedName = await AsyncStorage.getItem('@profile_name');
          const cachedPhotos = await AsyncStorage.getItem('@profile_photos');
          const cachedGender = await AsyncStorage.getItem('@profile_gender');
          const cachedPreference = await AsyncStorage.getItem('@profile_preference');
          const cachedLat = await AsyncStorage.getItem('@profile_latitude');
          const photoArray = cachedPhotos ? JSON.parse(cachedPhotos) : [];
          
          const complete = !!(cachedName && photoArray[0] && cachedGender && cachedPreference && cachedLat);
          setIsProfileComplete(complete);
        } else if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, photos, gender, preference, location')
            .eq('id', session.user.id)
            .single();

          if (error && error.code === 'PGRST116') {
            // No profile row exists
            setIsProfileComplete(false);
          } else if (data) {
            const hasName = !!data.full_name;
            const hasPhoto = !!(data.photos && data.photos.length > 0 && data.photos[0]);
            const hasGender = !!data.gender;
            const hasPreference = !!data.preference;
            const hasLocation = !!data.location;
            setIsProfileComplete(hasName && hasPhoto && hasGender && hasPreference && hasLocation);
          } else {
            setIsProfileComplete(false);
          }
        } else {
          setIsProfileComplete(true);
        }
      } catch (err) {
        console.error('Failed to check profile status:', err);
        setIsProfileComplete(true); // Fallback to avoid blocking on check error
      }
    };

    checkProfileStatus();
  }, [session, isDemoMode]);

  // Auto-fetch/update location on app mount
  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === 'ios') {
        try {
          const auth = await Geolocation.requestAuthorization('whenInUse');
          return auth === 'granted';
        } catch (err) {
          return false;
        }
      }
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Vibiy needs access to your location to find matches near you.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    };

    const fetchAndSaveLocation = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      Geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Cache locally
          await AsyncStorage.setItem('@profile_latitude', String(lat));
          await AsyncStorage.setItem('@profile_longitude', String(lng));

          // Save to Supabase if session exists
          try {
            const currentSessionStr = await AsyncStorage.getItem('@supabase_session');
            const currentSession = currentSessionStr ? JSON.parse(currentSessionStr) : null;
            const guestSession = await AsyncStorage.getItem('@guest_session');
            const isDemo = guestSession === 'true';

            if (!isDemo && isSupabaseConfigured && currentSession?.user?.id) {
              await supabase
                .from('profiles')
                .update({
                  location: `POINT(${lng} ${lat})`
                })
                .eq('id', currentSession.user.id);
            }
          } catch (err) {
            console.error('Failed to auto-update location in Supabase:', err);
          }
        },
        (error) => {
          console.log('Auto geolocation error on App mount:', error);
          AsyncStorage.getItem('@guest_session').then((guestSession) => {
            if (guestSession === 'true') {
              AsyncStorage.setItem('@profile_latitude', '39.9334');
              AsyncStorage.setItem('@profile_longitude', '32.8597');
            }
          });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    fetchAndSaveLocation();
  }, []);

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
      setIsProfileComplete(null);
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

  // Show onboarding wizard if profile is incomplete
  if (isProfileComplete === false) {
    return (
      <ProfileOnboarding
        session={session}
        isDemoMode={isDemoMode}
        onOnboardingComplete={() => setIsProfileComplete(true)}
      />
    );
  }

  const renderContent = (navigation: any) => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePage session={session} onLogout={handleLogout} isDemoMode={isDemoMode} />;
      case 'matches':
        return (
          <MatchesPage
            session={session}
            isDemoMode={isDemoMode}
            navigation={navigation}
          />
        );
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
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard">
          {(props) => (
            <View style={styles.container}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flexContainer}
              >
                {/* Screen Layout */}
                <View style={styles.mainLayoutContent}>
                  {/* Upper Brand Info */}
                  {activeTab !== 'matches' && (
                    <View style={styles.topBrandBar}>
                      <Text style={styles.minimalBrandTitle}>vibiy</Text>
                    </View>
                  )}

                  {/* Content Body */}
                  <View style={[styles.screenBody, activeTab === 'matches' && styles.screenBodyMatches]}>
                    {renderContent(props.navigation)}
                  </View>

                  {/* Floating Bottom Tab Bar */}
                  <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
                </View>
              </KeyboardAvoidingView>
            </View>
          )}
        </Stack.Screen>
        <Stack.Screen name="ProfileDetails" component={ProfileDetailsPage} />
        <Stack.Screen name="Chat" component={ChatPage} />
      </Stack.Navigator>
    </NavigationContainer>
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
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  mainLayoutContent: {
    flex: 1,
  },
  topBrandBar: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 8,
  },
  minimalBrandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  screenBody: {
    flex: 1,
  },
  screenBodyMatches: {
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
  },
});
