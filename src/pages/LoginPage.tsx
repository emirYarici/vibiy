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
import { COLORS, COMMON_STYLES, RADIUS } from '../shared/theme';
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

  const handleEmailLoginSubmit = async () => {
    if (!emailText.trim() || !passwordText.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      setEmailSigningIn(true);

      if (!isSupabaseConfigured) {
        // Simulate login success in Demo Mode
        await new Promise<void>((resolve) => setTimeout(resolve, 800));
        
        onLoginSuccess(
          {
            user: {
              id: 'demo-email-user',
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

      // Log in via Supabase with email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailText.trim(),
        password: passwordText.trim(),
      });

      if (error) throw error;
      onLoginSuccess(data, false);
      bottomSheetRef.current?.close();
      
    } catch (err: any) {
      Alert.alert('Sign-In Failed', err.message || 'Incorrect email or password.');
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
            Sign in securely using your Apple ID to build your Tinder-style profile, upload photos, and connect with matched friends.
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
                <Text style={styles.emailLoginText}>Login with Email</Text>
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
          <Text style={styles.sheetTitle}>Test User Login</Text>
          <Text style={styles.sheetDescription}>
            Enter your test user credentials to sign in.
          </Text>

          <View style={styles.sheetInputGroup}>
            <Text style={styles.sheetLabel}>Email Address</Text>
            <BottomSheetTextInput
              style={styles.sheetInput}
              placeholder="user@example.com"
              placeholderTextColor={COLORS.textMuted}
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
              placeholderTextColor={COLORS.textMuted}
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
            <TouchableOpacity style={styles.sheetSubmitBtn} onPress={handleEmailLoginSubmit}>
              <Text style={styles.sheetSubmitBtnText}>Sign In</Text>
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
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  loginGlassCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 28,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  loginDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 30,
  },
  authButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  appleBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.sm,
  },
  demoBypassBtn: {
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  demoBypassText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.28,
  },
  emailLoginBtn: {
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBgHover,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  emailLoginText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.28,
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 16,
  },
  sheetContent: {
    padding: 24,
    flex: 1,
    backgroundColor: COLORS.cardBg,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sheetDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  sheetInputGroup: {
    marginBottom: 16,
  },
  sheetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sheetInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    fontSize: 14,
    height: 48,
  },
  sheetSubmitBtn: {
    height: 50,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  sheetSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.28,
  },
});
