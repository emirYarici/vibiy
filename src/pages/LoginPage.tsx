import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { appleAuth, AppleButton } from '@invertase/react-native-apple-authentication';
import BottomSheet, { BottomSheetView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import { supabase, isSupabaseConfigured } from '../shared/api/supabase';
import { COLORS, COMMON_STYLES, RADIUS, SHADOWS } from '../shared/theme';
import { LoginProps } from '../shared/types';

export default function LoginPage({ onLoginSuccess }: LoginProps) {
  const [signingIn, setSigningIn] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [passwordText, setPasswordText] = useState('');
  const [emailSigningIn, setEmailSigningIn] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Bottom Sheet Ref
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Background animated aurora values
  const aurora1X = useRef(new Animated.Value(0)).current;
  const aurora2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in intro elements
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Loop floating backgrounds
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(aurora1X, { toValue: 50, duration: 4000, useNativeDriver: true }),
          Animated.timing(aurora1X, { toValue: -50, duration: 4000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(aurora2Y, { toValue: -60, duration: 5000, useNativeDriver: true }),
          Animated.timing(aurora2Y, { toValue: 40, duration: 5000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const handleAppleLogin = async () => {
    try {
      setSigningIn(true);
      
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
      });

      const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);

      if (credentialState === appleAuth.State.AUTHORIZED) {
        if (!isSupabaseConfigured) {
          Alert.alert(
            'Demo Setup Needed',
            'Apple Auth credentials retrieved successfully! Since Supabase is not yet configured, we will log you in as a guest.',
            [
              {
                text: 'Proceed as Guest',
                onPress: () => {
                  onLoginSuccess(
                    {
                      user: {
                        id: appleAuthRequestResponse.user,
                        email: appleAuthRequestResponse.email || 'apple-user@vibiy.com',
                        user_metadata: {
                          full_name:
                            (appleAuthRequestResponse.fullName?.givenName || '') +
                            ' ' +
                            (appleAuthRequestResponse.fullName?.familyName || ''),
                        },
                      },
                    },
                    true
                  );
                },
              },
            ]
          );
          return;
        }

        // Authenticate with Supabase using ID Token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: appleAuthRequestResponse.identityToken!,
          nonce: appleAuthRequestResponse.nonce || undefined,
        });

        if (error) throw error;
        onLoginSuccess(data, false);
      } else {
        throw new Error('Apple Sign-In authorization failed.');
      }
    } catch (err: any) {
      if (err.code !== appleAuth.Error.CANCELED) {
        Alert.alert('Authentication Failed', err.message || 'Unable to sign in with Apple.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleOpenEmailSheet = () => {
    bottomSheetRef.current?.expand();
  };

  const handleEmailAuthSubmit = async () => {
    if (!emailText.trim() || !passwordText.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      setEmailSigningIn(true);

      if (!isSupabaseConfigured) {
        // Simulate login/signup success in Demo Mode
        await new Promise<void>((resolve) => setTimeout(resolve, 800));
        
        onLoginSuccess(
          {
            user: {
              id: 'demo-email-user-' + Date.now(),
              email: emailText.trim(),
              user_metadata: {
                full_name: emailText.trim().split('@')[0],
              },
            },
          },
          true
        );
        bottomSheetRef.current?.close();
        return;
      }

      // 1. Try signing in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailText.trim(),
        password: passwordText.trim(),
      });

      if (!signInError && signInData.session) {
        onLoginSuccess(signInData.session, false);
        bottomSheetRef.current?.close();
        return;
      }

      // 2. If invalid credentials or user not found, try signing up automatically
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: emailText.trim(),
        password: passwordText.trim(),
      });

      if (signUpError) {
        throw signInError || signUpError;
      }

      if (signUpData.session) {
        onLoginSuccess(signUpData.session, false);
      } else {
        // Retry sign in if user was created
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: emailText.trim(),
          password: passwordText.trim(),
        });

        if (retryError) throw retryError;
        onLoginSuccess(retryData.session, false);
      }

      bottomSheetRef.current?.close();
      
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setEmailSigningIn(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.8}
      />
    ),
    []
  );

  const handleDemoBypass = () => {
    onLoginSuccess(
      {
        user: {
          id: 'demo-guest-user',
          email: 'guest@vibiy.com',
          user_metadata: { full_name: 'Guest User' },
        },
      },
      true
    );
  };

  return (
    <View style={styles.loginContainer}>
      <Animated.View style={[styles.loginContent, { opacity: fadeAnim }]}>
        <View style={styles.loginHeader}>
          <Text style={COMMON_STYLES.logoText}>vibiy</Text>
          <Text style={styles.loginTagline}>Instagram Companion & Matching</Text>
        </View>

        <View style={styles.loginGlassCard}>
          <Text style={styles.loginTitle}>Welcome upfront</Text>
          <Text style={styles.loginDescription}>
            Sign in securely using Apple ID or email to build your profile, upload photos, and connect with matched friends.
          </Text>

          {signingIn ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.authButtonsContainer}>
              <AppleButton
                buttonStyle={AppleButton.Style.BLACK}
                buttonType={AppleButton.Type.SIGN_IN}
                style={styles.appleBtn}
                onPress={handleAppleLogin}
              />

              <TouchableOpacity style={styles.emailLoginBtn} onPress={handleOpenEmailSheet}>
                <Text style={styles.emailLoginText}>Sign In with Email</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.demoBypassBtn} onPress={handleDemoBypass}>
                <Text style={styles.demoBypassText}>Continue as Guest (Demo Mode)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.footerNote}>
          By signing in, you agree to our Terms of Service & Privacy Policy.
        </Text>
      </Animated.View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['50%']}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: COLORS.cardBorder }}
        backgroundStyle={{
          backgroundColor: COLORS.cardBg,
          borderTopLeftRadius: RADIUS.lg,
          borderTopRightRadius: RADIUS.lg,
          borderWidth: 1.5,
          borderColor: COLORS.cardBorder,
        }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Sign In / Register</Text>
          <Text style={styles.sheetDescription}>
            Enter your email & password to sign in or create your account automatically.
          </Text>

          <View style={styles.sheetInputGroup}>
            <Text style={styles.sheetLabel}>Email Address</Text>
            <BottomSheetTextInput
              style={styles.sheetInput}
              placeholder="user@example.com"
              placeholderTextColor={COLORS.textDarkSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={emailText}
              onChangeText={setEmailText}
            />
          </View>

          <View style={styles.sheetInputGroup}>
            <Text style={styles.sheetLabel}>Password</Text>
            <BottomSheetTextInput
              style={styles.sheetInput}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textDarkSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={passwordText}
              onChangeText={setPasswordText}
            />
          </View>

          {emailSigningIn ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
          ) : (
            <TouchableOpacity style={styles.sheetSubmitBtn} onPress={handleEmailAuthSubmit}>
              <Text style={styles.sheetSubmitBtnText}>Continue</Text>
            </TouchableOpacity>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  auroraPos1: {
    top: -50,
    right: -50,
  },
  auroraPos2: {
    bottom: -50,
    left: -50,
  },
  loginContent: {
    width: '100%',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loginTagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  loginGlassCard: {
    backgroundColor: COLORS.cardBgIvory,
    borderRadius: RADIUS.card,
    padding: 28,
    ...SHADOWS.lg,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  loginDescription: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  authButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  appleBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.pill,
  },
  emailLoginBtn: {
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    ...SHADOWS.floating,
  },
  emailLoginText: {
    color: COLORS.accentText,
    fontSize: 15,
    fontWeight: '800',
  },
  demoBypassBtn: {
    height: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: 'transparent',
  },
  demoBypassText: {
    color: COLORS.textDarkSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  footerNote: {
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 18,
  },
  sheetContent: {
    padding: 24,
    flex: 1,
    backgroundColor: COLORS.cardBgIvory,
    borderTopLeftRadius: RADIUS.card,
    borderTopRightRadius: RADIUS.card,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sheetDescription: {
    fontSize: 14,
    color: COLORS.textDarkSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  sheetInputGroup: {
    marginBottom: 16,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDarkSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetInput: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    color: COLORS.textDark,
    fontSize: 15,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(94, 88, 115, 0.15)',
  },
  sheetSubmitBtn: {
    height: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...SHADOWS.floating,
  },
  sheetSubmitBtnText: {
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: '800',
  },
});
