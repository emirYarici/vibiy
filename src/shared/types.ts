export interface ShareHistoryItem {
  id: string;
  url: string;
  timestamp: string;
  type: 'post' | 'reel' | 'other';
  shortcode: string;
  summary?: string;
  username?: string;
  thumbnail_url?: string;
  created_at?: string;
}

export interface MatchProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  instagram: string;
}

export interface LoginProps {
  onLoginSuccess: (session: any, isDemo: boolean) => void;
}

export interface MainAppProps {
  session: any;
  onLogout: () => void;
  isDemoMode?: boolean;
}

export interface MatchesTabProps {
  userPhoto: string | null;
}

export interface MatchRecord {
  id: string;
  user_a: string;
  user_b: string;
  similarity_score: number;
  match_type?: 'twin_flame' | 'chemistry' | 'opposites_attract';
  status: string;
  created_at: string;
}

export interface DBProfile {
  id: string;
  full_name: string;
  age: number;
  bio: string;
  photos: string[];
}

export interface MessageRecord {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface MatchArchetype {
  type: 'twin_flame' | 'chemistry' | 'opposites_attract';
  label: string;
  badgeText: string;
  subtitle: string;
  bgColor: string;
  textColor: string;
}

/**
 * Returns the archetype definition based on similarity score:
 * - >= 75%: Twin Flame (Flame icon)
 * - 50% - 74%: Good Chemistry (Sparkles icon)
 * - < 50%: Opposites Attract (Magnet icon)
 */
export function getMatchArchetype(score: number): MatchArchetype {
  // Normalize score between 0 and 100
  const normalized = score <= 1 ? Math.round(score * 100) : Math.round(score);
  
  if (normalized >= 75) {
    return {
      type: 'twin_flame',
      label: 'Twin Flame',
      badgeText: `${normalized}% Twin Flame`,
      subtitle: 'Identical video energy & humor',
      bgColor: '#FFBE54',
      textColor: '#331005',
    };
  } else if (normalized >= 50) {
    return {
      type: 'chemistry',
      label: 'Good Chemistry',
      badgeText: `${normalized}% Chemistry`,
      subtitle: 'Harmonic vibe balance',
      bgColor: '#FFE39B',
      textColor: '#4A2A00',
    };
  } else {
    return {
      type: 'opposites_attract',
      label: 'Opposites Attract',
      badgeText: 'Opposites Attract',
      subtitle: 'The contrast wildcard match',
      bgColor: '#FFD3D1',
      textColor: '#7A1510',
    };
  }
}
