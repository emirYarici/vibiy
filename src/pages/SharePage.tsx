import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Clipboard,
  Animated,
  TouchableWithoutFeedback,
  NativeModules,
} from 'react-native';

import { COLORS, RADIUS } from '../shared/theme';
import { ShareHistoryItem } from '../shared/types';

const getApiUrl = () => {
  // Use the localhost.run HTTPS URL to bypass iOS App Transport Security and local network restrictions
  return 'https://57781e953d5e81.lhr.life';
};

interface SharePageProps {
  session?: any;
  initialSharedUrl?: string | null;
  onClearInitialUrl?: () => void;
  history: ShareHistoryItem[];
  onUpdateHistory: (history: ShareHistoryItem[]) => void;
}

export default function SharePage({ session, initialSharedUrl, onClearInitialUrl, history, onUpdateHistory }: SharePageProps) {
  const [inputText, setInputText] = useState('');
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animated values for visual effects
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Listen to initialSharedUrl passed from root and process immediately
  useEffect(() => {
    if (initialSharedUrl) {
      processSharedUrl(initialSharedUrl);
      if (onClearInitialUrl) {
        onClearInitialUrl();
      }
    }
  }, [initialSharedUrl]);

  // Animate card entry when sharedUrl changes
  useEffect(() => {
    if (sharedUrl) {
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(cardScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sharedUrl]);


  const processSharedUrl = async (url: string) => {
    setIsProcessing(true);
    let shouldKeepLoading = false;
    
    try {
      // Extract shortcode and type locally first
      let type: 'post' | 'reel' | 'other' = 'other';
      let shortcode = 'N/A';

      if (url.includes('/p/')) {
        type = 'post';
        const parts = url.split('/p/');
        if (parts[1]) {
          shortcode = parts[1].split('/')[0] || 'N/A';
        }
      } else if (url.includes('/reel/')) {
        type = 'reel';
        const parts = url.split('/reel/');
        if (parts[1]) {
          shortcode = parts[1].split('/')[0] || 'N/A';
        }
      }

      // Get dynamic API URL based on bundle source
      const baseUrl = getApiUrl();
      const endpoint = `${baseUrl}/api/process-video`;

      // Log outgoing request details
      const requestBody = { url };
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ? session.access_token.slice(0, 15) + '...' : 'NONE'}`,
      };
      console.log('Sending request to /api/process-video:', {
        endpoint,
        headers: requestHeaders,
        body: requestBody,
      });

      // Make backend request to process video
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'bypass-tunnel-reminder': 'true', // Bypasses localtunnel warning landing page
          'User-Agent': 'VibiyApp/1.0', // Custom User-Agent to bypass localtunnel browser check
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Received response from /api/process-video:', responseData);
      
      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to process video vector.');
      }

      if (responseData.status === 'processing') {
        console.log('Video is still processing, scheduled next poll in 4 seconds...');
        shouldKeepLoading = true;
        setTimeout(() => {
          processSharedUrl(url);
        }, 4000);
        return;
      }

      const summary = responseData.summary || 'No summary returned by API.';
      const username = responseData.username || undefined;
      const thumbnail_url = responseData.thumbnail_url || undefined;
      setSharedUrl(url);

      // Add to history if it doesn't already exist, or update existing with summary
      const itemExists = history.some(item => item.url === url);
      let updatedHistory: ShareHistoryItem[];
      if (itemExists) {
        updatedHistory = history.map(item => item.url === url ? { ...item, summary, username, thumbnail_url } : item);
      } else {
        const newItem: ShareHistoryItem = {
          id: responseData.id || Math.random().toString(),
          url,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type,
          shortcode,
          summary,
          username,
          thumbnail_url,
        };
        updatedHistory = [newItem, ...history];
      }
      onUpdateHistory(updatedHistory);

      Alert.alert(
        'Success',
        'Instagram video processed successfully!'
      );

    } catch (err: any) {
      console.error('Error processing shared URL:', err);
      Alert.alert('Processing Failed', err.message || 'Unable to process Instagram video.');
    } finally {
      if (!shouldKeepLoading) {
        setIsProcessing(false);
      }
    }
  };

  const handleManualSubmit = () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter or paste an Instagram URL.');
      return;
    }
    if (!inputText.includes('instagram.com')) {
      Alert.alert('Invalid URL', 'Please enter a valid Instagram URL (e.g., https://instagram.com/p/...)');
      return;
    }
    processSharedUrl(inputText.trim());
    setInputText('');
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePaste = async () => {
    const text = await Clipboard.getString();
    if (text.includes('instagram.com')) {
      setInputText(text);
    } else {
      Alert.alert('Clipboard Empty', 'Clipboard does not contain an Instagram link.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      {/* Input Card */}
      <View style={styles.glassCard}>
        <Text style={styles.cardTitle}>Simulate / Paste Link</Text>
        <Text style={styles.cardDescription}>
          Paste an Instagram URL manually or use the Share Sheet on Instagram.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="https://www.instagram.com/p/..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {inputText ? (
            <TouchableOpacity onPress={() => setInputText('')} style={styles.clearInputButton}>
              <Text style={styles.clearInputText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handlePaste} style={styles.pasteButton}>
              <Text style={styles.pasteButtonText}>Paste</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableWithoutFeedback
          onPress={handleManualSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={[styles.primaryButton, { transform: [{ scale: buttonScale }] }]}>
            <Text style={styles.primaryButtonText}>
              {isProcessing ? 'Processing...' : 'Process Instagram URL'}
            </Text>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>

      {/* Shared URL Detail Card */}
      {sharedUrl && (
        <Animated.View
          style={[
            styles.sharedCard,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          <View style={styles.sharedHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ACTIVE SHARE</Text>
            </View>
            <TouchableOpacity onPress={() => setSharedUrl(null)}>
              <Text style={styles.closeCardText}>Dismiss</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sharedContent}>
            <Text style={styles.sharedUrlLabel}>Received URL</Text>
            <Text style={styles.sharedUrlText} numberOfLines={2}>
              {sharedUrl}
            </Text>

            <View style={styles.metadataGrid}>
              <View style={styles.metadataItem}>
                <Text style={styles.metaLabel}>Type</Text>
                <Text style={styles.metaValue}>
                  {sharedUrl.includes('/reel/') ? '🎬 Reel' : '📸 Post'}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Text style={styles.metaLabel}>Shortcode</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {(() => {
                    const regex = /\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
                    const match = sharedUrl.match(regex);
                    return match ? match[1] : 'Unknown';
                  })()}
                </Text>
              </View>
            </View>

            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionPrimary]}
                onPress={() => {
                  Linking.openURL(sharedUrl).catch(() =>
                    Alert.alert('Error', 'Cannot open Instagram app.')
                  );
                }}
              >
                <Text style={styles.actionButtonText}>Open Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionSecondary]}
                onPress={() => {
                  Clipboard.setString(sharedUrl);
                  Alert.alert('Copied', 'URL copied to clipboard.');
                }}
              >
                <Text style={[styles.actionButtonText, styles.actionSecondaryText]}>Copy Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* History List */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Shared History</Text>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No links shared yet.</Text>
            <Text style={styles.emptySubtext}>Shared links will appear here automatically.</Text>
          </View>
        ) : (
          history.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyItem}
              onPress={() => setSharedUrl(item.url)}
            >
              <View style={styles.historyIconContainer}>
                <Text style={styles.historyIcon}>{item.type === 'reel' ? '🎬' : '📸'}</Text>
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyShortcode} numberOfLines={1}>
                  Instagram {item.type} ({item.shortcode})
                </Text>
                <Text style={styles.historyTime}>{item.timestamp}</Text>
              </View>
              <Text style={styles.historyArrow}>➔</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: COLORS.bg,
  },
  glassCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 24,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  pasteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.cardBgHover,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  pasteButtonText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearInputButton: {
    padding: 8,
  },
  clearInputText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  primaryButton: {
    height: 50,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.28,
  },
  sharedCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 24,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  sharedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  closeCardText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sharedContent: {
    width: '100%',
  },
  sharedUrlLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sharedUrlText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 20,
  },
  metadataGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  metadataItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '800',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionSecondary: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionSecondaryText: {
    color: COLORS.textPrimary,
  },
  summaryContainer: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.secondary,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  historySection: {
    marginTop: 40,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  emptyState: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.cardBgHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyIcon: {
    fontSize: 18,
  },
  historyDetails: {
    flex: 1,
  },
  historyShortcode: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  historyArrow: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginLeft: 8,
  },
});
