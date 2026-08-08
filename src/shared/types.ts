export interface ShareHistoryItem {
  id: string;
  url: string;
  timestamp: string;
  type: 'post' | 'reel' | 'other';
  shortcode: string;
  summary?: string;
  username?: string;
  thumbnail_url?: string;
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

