import { DBProfile, MatchRecord, MessageRecord, ShareHistoryItem } from './types';

export const DEMO_PROFILES: DBProfile[] = [
  {
    id: 'demo-u1',
    full_name: 'Sarah',
    age: 24,
    bio: "Product Designer 🎨 • Travel addict ✈️ • Coffee enthusiast ☕. Let's exchange playlists!",
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600',
    ],
  },
  {
    id: 'demo-u2',
    full_name: 'Liam',
    age: 26,
    bio: 'Software Engineer by day, Rock Climber by night 🧗‍♂️. Craft beer lover. Tell me your favorite travel destination!',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600',
    ],
  },
  {
    id: 'demo-u3',
    full_name: 'Chloe',
    age: 23,
    bio: 'Photography student 📸 • Dog lover 🐶 • Weekend hiker. Looking for someone to capture memories with.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600',
    ],
  },
];

export const DEMO_MATCHES: MatchRecord[] = [
  {
    id: 'demo-m1',
    user_a: 'demo-guest-user',
    user_b: 'demo-u1',
    similarity_score: 0.89,
    status: 'active',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-m2',
    user_a: 'demo-guest-user',
    user_b: 'demo-u2',
    similarity_score: 0.82,
    status: 'active',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-m3',
    user_a: 'demo-guest-user',
    user_b: 'demo-u3',
    similarity_score: 0.77,
    status: 'active',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEFAULT_DEMO_MESSAGES: MessageRecord[] = [
  {
    id: 'dm-msg1',
    match_id: 'demo-m1',
    sender_id: 'demo-u1',
    content: "Hey! Loved your Instagram reels! Let's match up?",
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'dm-msg2',
    match_id: 'demo-m1',
    sender_id: 'demo-guest-user',
    content: 'Thanks Sarah! Your design style is super cool too!',
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'dm-msg3',
    match_id: 'demo-m2',
    sender_id: 'demo-u2',
    content: 'Are you down for coffee this week? ☕',
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
];

export const DEMO_PARTNER_HISTORY: Record<string, ShareHistoryItem[]> = {
  'demo-u1': [
    {
      id: 'h-s1',
      url: 'https://www.instagram.com/reel/C8rXa-vMx72/',
      timestamp: 'Yesterday',
      type: 'reel',
      shortcode: 'C8rXa-vMx72',
      summary: 'Aesthetic travel vlog of Amalfi coast, showing lemons, cliffside towns, and crystal clear Mediterranean waters. 🍋🇮🇹'
    },
    {
      id: 'h-s2',
      url: 'https://www.instagram.com/p/C9Pzm-tsoP2/',
      timestamp: '3 days ago',
      type: 'post',
      shortcode: 'C9Pzm-tsoP2',
      summary: 'Design trends for 2026: focusing on dark mode gradients, clean typography, and interactive interfaces. 🎨✨'
    }
  ],
  'demo-u2': [
    {
      id: 'h-l1',
      url: 'https://www.instagram.com/reel/C7pXx-vMb89/',
      timestamp: '2 days ago',
      type: 'reel',
      shortcode: 'C7pXx-vMb89',
      summary: 'Insane climbing route beta! Climbing a V8 dyno route in a neon bouldering gym. 🧗‍♂️⚡'
    },
    {
      id: 'h-l2',
      url: 'https://www.instagram.com/reel/C6pXx-vMb89/',
      timestamp: '5 days ago',
      type: 'reel',
      shortcode: 'C6pXx-vMb89',
      summary: 'Reviewing top craft breweries in Denver, focusing on citrus notes and rich, foggy IPAs. 🍺🌾'
    }
  ],
  'demo-u3': [
    {
      id: 'h-c1',
      url: 'https://www.instagram.com/p/C8oXa-vMs55/',
      timestamp: 'Yesterday',
      type: 'post',
      shortcode: 'C8oXa-vMs55',
      summary: 'Golden hour portraits shot on 35mm film in Portland, featuring warm lighting and soft grain. 📸🌅'
    },
    {
      id: 'h-c2',
      url: 'https://www.instagram.com/reel/C5oXa-vMs55/',
      timestamp: '1 week ago',
      type: 'reel',
      shortcode: 'C5oXa-vMs55',
      summary: 'Cinematic hike compilation through Yosemite, reaching Glacier Point at sunrise. 🌲🏔️'
    }
  ]
};
