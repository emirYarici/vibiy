import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { COLORS, RADIUS } from '../shared/theme';

interface MessageItem {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: boolean;
}

const MOCK_MESSAGES: MessageItem[] = [
  {
    id: '1',
    name: 'Jessica',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    lastMessage: 'Hey! Loved your Instagram video! Let\'s match up?',
    time: '2m ago',
    unread: true,
  },
  {
    id: '2',
    name: 'Tyler',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    lastMessage: 'Are you down for coffee this week? ☕',
    time: '1h ago',
    unread: false,
  },
  {
    id: '3',
    name: 'Ashley',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    lastMessage: 'That reel you shared was hilarious 😂',
    time: 'Yesterday',
    unread: false,
  },
];

export default function ChatPage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Chat with your mutual matches</Text>
      </View>

      <View style={styles.inboxList}>
        {MOCK_MESSAGES.map((msg) => (
          <TouchableOpacity key={msg.id} style={styles.messageCard} activeOpacity={0.7}>
            <Image source={{ uri: msg.avatar }} style={styles.avatar} />
            
            <View style={styles.details}>
              <View style={styles.row}>
                <Text style={styles.name}>{msg.name}</Text>
                <Text style={styles.time}>{msg.time}</Text>
              </View>
              <Text style={[styles.lastMessage, msg.unread && styles.unreadText]} numberOfLines={1}>
                {msg.lastMessage}
              </Text>
            </View>

            {msg.unread && <View style={styles.unreadBadge} />}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  inboxList: {
    gap: 12,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    marginRight: 14,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  time: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  lastMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  unreadText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginLeft: 8,
  },
});
