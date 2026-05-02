import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getProfileFromUserName,
  getTitleTrophies,
  getUserPlayedGames,
  getUserTitles,
  getUserTrophiesEarnedForTitle
} from 'psn-api'
import type { Trophy, UserThinTrophy } from 'psn-api'
import { PlatformService } from '../PlatformService'
import type {
  AchievementData,
  GameData,
  GamingPlatform,
  PlatformAccountRow,
  PlatformCredentials,
  SyncResult,
  UserProfile
} from '../types'
import type { PlayStationAuthTokens, PlayStationCredentials } from './types'

const TROPHY_POINTS: Record<string, number> = {
  platinum: 300,
  gold: 90,
  silver: 30,
  bronze: 15
}

export class PlayStationService extends PlatformService {
  readonly platform: GamingPlatform = 'playstation'
  private tokens: PlayStationAuthTokens | null = null
  // Populated by syncGames(): platformGameId → true if PS5 (drives the npServiceName
  // flag we need when calling the trophies endpoint).
  private ps5Map = new Map<string, boolean>()

  validateCredentials(credentials: PlatformCredentials): boolean {
    const c = credentials as unknown as PlayStationCredentials
    return typeof c.npsso === 'string' && c.npsso.length > 0
  }

  async authenticate(credentials: PlatformCredentials): Promise<SyncResult<UserProfile>> {
    try {
      if (!this.validateCredentials(credentials)) {
        return this.fail('Invalid PlayStation credentials (npsso required)')
      }

      const { npsso, username } = credentials as unknown as PlayStationCredentials
      const accessCode = await exchangeNpssoForAccessCode(npsso)
      const authTokens = await exchangeAccessCodeForAuthTokens(accessCode)
      this.tokens = {
        accessToken: authTokens.accessToken,
        refreshToken: authTokens.refreshToken,
        expiresIn: authTokens.expiresIn
      }

      const { profile } = await getProfileFromUserName({ accessToken: this.tokens.accessToken }, 'me')
      return this.ok({
        platformId: profile.accountId,
        username: profile.onlineId ?? username,
        displayName: profile.onlineId ?? username,
        avatarUrl: profile.avatarUrls?.[0]?.avatarUrl,
        profileUrl: profile.onlineId ? `https://psnprofiles.com/${profile.onlineId}` : undefined
      })
    } catch (error) {
      return this.wrapError(error, 'PlayStation authentication failed')
    }
  }

  // Restore the service into an authenticated state from a stored account.
  // Tries the refresh token first (cheaper), falls back to the long-lived NPSSO.
  async hydrate(account: PlatformAccountRow): Promise<SyncResult<UserProfile>> {
    if (account.refreshToken) {
      try {
        const authTokens = await exchangeRefreshTokenForAuthTokens(account.refreshToken)
        this.tokens = {
          accessToken: authTokens.accessToken,
          refreshToken: authTokens.refreshToken,
          expiresIn: authTokens.expiresIn
        }
        return this.ok(this.profileFromAccount(account))
      } catch {
        // Refresh token expired (>2 months) — fall through to NPSSO.
      }
    }

    if (!account.accessToken) {
      return this.fail('No PlayStation NPSSO available — please reconnect your account')
    }

    return this.authenticate({ npsso: account.accessToken, username: account.username ?? '' })
  }

  getTokens(): PlayStationAuthTokens | null {
    return this.tokens
  }

  async syncGames(_account: PlatformAccountRow): Promise<SyncResult<GameData[]>> {
    try {
      if (!this.tokens) {
        return this.fail('PlayStationService is not authenticated — call authenticate() or hydrate() first')
      }

      const authTokens = { accessToken: this.tokens.accessToken }
      const userTitles = await getUserTitles(authTokens, 'me')
      if (!userTitles?.trophyTitles) {
        return this.ok<GameData[]>([])
      }

      // Trophy titles only carry "last trophy unlocked" timestamps. Cross-reference
      // with played-games for actual playtime (Sony only exposes this via a separate API).
      const playedGames = await getUserPlayedGames(authTokens, 'me', { limit: 100, offset: 0 })
      const playedByName = new Map(
        (playedGames.titles ?? []).map(t => [normalizeTitle(t.name), t])
      )

      this.ps5Map.clear()
      const games: GameData[] = userTitles.trophyTitles.map((title) => {
        this.ps5Map.set(title.npCommunicationId, !!title.trophyTitlePlatform?.includes('PS5'))
        const played = playedByName.get(normalizeTitle(title.trophyTitleName))
        return {
          platformGameId: title.npCommunicationId,
          name: title.trophyTitleName,
          playtimeTotal: played ? isoDurationToMinutes(played.playDuration) : 0,
          playtimeRecent: undefined,
          lastPlayed: title.lastUpdatedDateTime ? new Date(title.lastUpdatedDateTime) : undefined,
          iconUrl: title.trophyTitleIconUrl,
          coverUrl: title.trophyTitleIconUrl,
          isInstalled: false
        }
      })

      return this.ok(games)
    } catch (error) {
      return this.wrapError(error, 'Failed to sync PlayStation games')
    }
  }

  isPs5Game(platformGameId: string): boolean {
    return this.ps5Map.get(platformGameId) ?? false
  }

  async syncAchievements(
    _account: PlatformAccountRow,
    gameId: string,
    opts?: { isPs5Game?: boolean }
  ): Promise<SyncResult<AchievementData[]>> {
    try {
      if (!this.tokens) {
        return this.fail('PlayStationService is not authenticated')
      }

      const authTokens = { accessToken: this.tokens.accessToken }
      const isPs5 = opts?.isPs5Game ?? this.ps5Map.get(gameId) ?? false
      const npServiceName = isPs5 ? undefined : ('trophy' as const)

      const gameTrophies = await getTitleTrophies(authTokens, gameId, 'all', { npServiceName })
      if (!gameTrophies?.trophies) {
        return this.ok([])
      }

      const userTrophies = await getUserTrophiesEarnedForTitle(authTokens, 'me', gameId, 'all', {
        npServiceName
      })
      const userTrophyById = new Map<number, UserThinTrophy>(
        (userTrophies?.trophies ?? []).map((t: UserThinTrophy) => [t.trophyId, t])
      )

      const achievements: AchievementData[] = gameTrophies.trophies.map((trophy: Trophy) => {
        const earned = userTrophyById.get(trophy.trophyId)
        return {
          achievementId: `${gameId}_${trophy.trophyId}`,
          name: trophy.trophyName ?? 'Trophée inconnu',
          description: trophy.trophyDetail ?? '',
          iconUrl: trophy.trophyIconUrl,
          isUnlocked: earned?.earned ?? false,
          unlockedAt: earned?.earnedDateTime ? new Date(earned.earnedDateTime) : undefined,
          rarity: earned?.trophyRare,
          earnedRate: trophy.trophyEarnedRate ? Number(trophy.trophyEarnedRate) : undefined,
          points: TROPHY_POINTS[trophy.trophyType] ?? 0
        }
      })

      return this.ok(achievements)
    } catch (error) {
      // 404 / "no trophies" is expected for some games — surface as empty rather than error.
      if (error instanceof Error && /404|not found|no trophies/i.test(error.message)) {
        return this.ok([])
      }
      return this.wrapError(error, `Failed to sync PlayStation trophies for ${gameId}`)
    }
  }

  private profileFromAccount(account: PlatformAccountRow): UserProfile {
    return {
      platformId: account.platformId,
      username: account.username ?? account.platformId,
      displayName: account.displayName ?? account.username ?? account.platformId,
      avatarUrl: account.avatarUrl ?? undefined,
      profileUrl: account.profileUrl ?? (account.username
        ? `https://psnprofiles.com/${account.username}`
        : undefined)
    }
  }
}

function normalizeTitle(name: string): string {
  return name.replace(/[™®©]/g, '').trim().toLowerCase()
}

// ISO 8601 duration ("PT1H30M") → minutes.
function isoDurationToMinutes(duration: string | undefined): number {
  if (!duration || !duration.startsWith('PT')) return 0
  const match = duration.substring(2).match(/(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] ?? '0')
  const minutes = parseInt(match[2] ?? '0')
  const seconds = parseFloat(match[3] ?? '0')
  return Math.round(hours * 60 + minutes + seconds / 60)
}
