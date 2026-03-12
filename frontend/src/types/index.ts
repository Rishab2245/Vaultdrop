export type SecretCategory =
  | 'CORPORATE'
  | 'POLITICAL'
  | 'CELEBRITY'
  | 'PERSONAL'
  | 'INDUSTRY'
  | 'PARANORMAL'
  | 'ZERO_DAY';

export type SecretStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'GHOST_LOCKED'
  | 'REJECTED'
  | 'WINNER'
  | 'ARCHIVED';

export interface Secret {
  id: string;
  category: SecretCategory;
  content?: string;
  hintText?: string;
  isGhost: boolean;
  peekPrice?: number;
  unlockPrice?: number;
  status: SecretStatus;
  rankScore: number;
  voteCount: number;
  reactionCount: number;
  shareCount: number;
  peekCount: number;
  reportCount: number;
  commentCount: number;
  aiExplosiveScore?: number;
  poolDate?: string;
  createdAt: string;
  hasVoted: boolean;
  hasPeeked: boolean;
  hasUnlocked: boolean;
  codename?: string;
  bowl?: Bowl;
  mediaUrl?: string;
  mediaType?: string; // 'image' | 'video' | 'document'
  linkUrl?: string;
  linkTitle?: string;
  linkDomain?: string;
}

export interface AnonSession {
  id: string;
  codename: string;
  credibilityScore: number;
  earnings: number;
  createdAt: string;
}

export interface DailyPool {
  id: string;
  poolDate: string;
  totalAmount: number;
  status: string;
  entryCount: number;
  timeUntilDrawMs: number;
}

export interface Bowl {
  id: string;
  slug: string;
  name: string;
  description?: string;
  coverEmoji: string;
  isPrivate: boolean;
  entryFee?: number;
  memberCount: number;
  secretCount: number;
  createdAt: string;
  isMember: boolean;
}

export interface HallOfFameEntry {
  id: string;
  codename: string;
  winDate: string;
  prizeAmount: number;
  rankScore: number;
  snippet: string;
  category: SecretCategory;
}

export interface Comment {
  id: string;
  codename: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  replies?: Comment[];
}

export interface Reaction {
  type: ReactionType;
  count: number;
  hasReacted: boolean;
}

export type ReactionType = 'SHOCKED' | 'WATCHING' | 'SKULL' | 'FIRE' | 'LIT';

export interface FeedFilters {
  category?: SecretCategory | 'ALL';
  sort?: 'HOT' | 'NEW' | 'TOP';
  ghostOnly?: boolean;
  bowlSlug?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

export interface SecretConnection {
  edges: Array<{ node: Secret; cursor: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  secret: Secret;
  score: number;
}

export interface VaultStats {
  totalSecrets: number;
  totalEarnings: number;
  totalVotes: number;
  totalViews: number;
}
