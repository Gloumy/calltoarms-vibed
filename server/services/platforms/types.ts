import type { userPlatformAccounts } from '../../db/schema'

export type GamingPlatform = 'steam' | 'playstation' | 'xbox' | 'nintendo' | 'gog'

export interface UserProfile {
  platformId: string
  username?: string
  displayName?: string
  avatarUrl?: string
  profileUrl?: string
  accessToken?: string
  refreshToken?: string
}

export interface GameData {
  platformGameId: string
  name: string
  playtimeTotal: number
  playtimeRecent?: number
  lastPlayed?: Date
  iconUrl?: string
  coverUrl?: string
  isInstalled?: boolean
}

export interface AchievementData {
  achievementId: string
  name: string
  description?: string
  iconUrl?: string
  isUnlocked: boolean
  unlockedAt?: Date
  rarity?: number
  points?: number
  earnedRate?: number
}

export type PlatformCredentials = Record<string, string | number | boolean>

export type SyncResult<T>
  = | { success: true, data: T }
    | { success: false, error: string }

export type PlatformAccountRow = typeof userPlatformAccounts.$inferSelect
