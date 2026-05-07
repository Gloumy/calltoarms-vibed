export type ActivityType =
  | 'friend_accepted'
  | 'session_started'
  | 'event_created'
  | 'event_invited'
  | 'community_invited'
  | 'game_completed'
  | 'achievements_unlocked'

export interface ActivityActor {
  id: string
  username: string
  name: string
  image: string | null
}

export interface ActivityGame {
  id: number | null
  name: string
  coverUrl: string | null
}

export interface ActivityItem {
  id: string
  type: ActivityType
  timestamp: string
  actor: ActivityActor
  game?: ActivityGame
  count?: number
  sessionId?: string
  sessionStatus?: 'active' | 'closed'
  eventId?: string
  eventTitle?: string
  eventStatus?: 'upcoming' | 'past'
  communityId?: string
  communityName?: string
}

export interface ActivityStats {
  totalFriends: number
  activeThisWeek: number
  totalGamesInCircle: number
  commonGames: number
}

export interface ActivityResponse {
  stats: ActivityStats | null
  items: ActivityItem[]
  nextCursor: string | null
}

export interface ComparisonSideStats {
  playtimeTotal: number
  achievementsUnlocked: number
  achievementsTotal: number
  achievementPercentage: number
  isCompleted: boolean
  lastPlayed: string | null
  platforms: string[]
}

export interface ComparisonResponse {
  game: { id: number, name: string, coverUrl: string | null }
  friend: { id: string, username: string, name: string, image: string | null, stats: ComparisonSideStats }
  me: { hasGame: boolean, stats: ComparisonSideStats | null }
}
