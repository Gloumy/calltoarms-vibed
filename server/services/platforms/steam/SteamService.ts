import { PlatformService } from '../PlatformService'
import type {
  GamingPlatform,
  UserProfile,
  GameData,
  AchievementData,
  PlatformCredentials,
  SyncResult,
  PlatformAccountRow
} from '../types'
import type {
  SteamCredentials,
  SteamApiResponse,
  SteamPlayersResponse,
  SteamGamesResponse,
  SteamAchievementsResponse,
  SteamGameSchemaResponse,
  SteamUserProfile,
  SteamGame,
  SteamAchievement
} from './types'

export class SteamService extends PlatformService {
  readonly platform: GamingPlatform = 'steam'
  private readonly baseUrl = 'https://api.steampowered.com'
  private readonly apiKey: string

  constructor() {
    super()
    const apiKey = useRuntimeConfig().steamApiKey
    if (!apiKey) {
      throw new Error('Steam API key is required (set NUXT_STEAM_API_KEY)')
    }
    this.apiKey = apiKey
  }

  validateCredentials(credentials: PlatformCredentials): boolean {
    const c = credentials as unknown as SteamCredentials
    return !!(c.steamId && typeof c.steamId === 'string' && /^\d{17}$/.test(c.steamId))
  }

  async authenticate(credentials: PlatformCredentials): Promise<SyncResult<UserProfile>> {
    try {
      if (!this.validateCredentials(credentials)) {
        return this.fail('Invalid Steam credentials')
      }

      const { steamId } = credentials as unknown as SteamCredentials
      const profileResult = await this.fetchUserProfile(steamId)
      if (!profileResult.success) {
        return this.fail(profileResult.error)
      }

      return this.ok(this.toUserProfile(profileResult.data))
    } catch (error) {
      return this.wrapError(error, 'Steam authentication failed')
    }
  }

  async getUserProfile(account: PlatformAccountRow): Promise<SyncResult<UserProfile>> {
    const result = await this.fetchUserProfile(account.platformId)
    if (!result.success) {
      return this.fail(result.error)
    }
    return this.ok(this.toUserProfile(result.data))
  }

  async syncGames(account: PlatformAccountRow): Promise<SyncResult<GameData[]>> {
    try {
      const url = `${this.baseUrl}/IPlayerService/GetOwnedGames/v0001/?key=${this.apiKey}&steamid=${account.platformId}&format=json&include_appinfo=true&include_played_free_games=true`

      const response = await fetch(url)
      if (!response.ok) {
        return this.fail(`Steam API error: ${response.statusText}`)
      }

      const data: SteamApiResponse<SteamGamesResponse> = await response.json()
      if (!data.response.games) {
        return this.ok<GameData[]>([])
      }

      const games: GameData[] = data.response.games.map((game: SteamGame) => ({
        platformGameId: game.appid.toString(),
        name: game.name,
        playtimeTotal: game.playtime_forever,
        playtimeRecent: game.playtime_2weeks,
        lastPlayed: game.rtime_last_played ? new Date(game.rtime_last_played * 1000) : undefined,
        iconUrl: game.img_icon_url
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
          : undefined,
        coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`,
        // Steam API doesn't expose installation state.
        isInstalled: false
      }))

      return this.ok(games)
    } catch (error) {
      return this.wrapError(error, 'Failed to sync Steam games')
    }
  }

  async syncAchievements(
    account: PlatformAccountRow,
    gameId: string,
    existingAchievements?: Set<string>
  ): Promise<SyncResult<{ achievements: AchievementData[], mostRecentUnlock?: Date }>> {
    try {
      // 1) Game schema (achievement metadata: display name, icon, ...).
      const schemaUrl = `${this.baseUrl}/ISteamUserStats/GetSchemaForGame/v2/?key=${this.apiKey}&appid=${gameId}`
      const schemaResponse = await fetch(schemaUrl)
      if (!schemaResponse.ok) {
        return this.fail(`Steam schema API error: ${schemaResponse.statusText}`)
      }
      const schemaData: SteamGameSchemaResponse = await schemaResponse.json()
      if (!schemaData.game?.availableGameStats?.achievements) {
        return this.ok({ achievements: [], mostRecentUnlock: undefined })
      }

      // 2) Player achievements (unlocked / not, unlock time).
      const achievementsUrl = `${this.baseUrl}/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${gameId}&key=${this.apiKey}&steamid=${account.platformId}`
      const achievementsResponse = await fetch(achievementsUrl)
      if (!achievementsResponse.ok) {
        return this.fail(`Steam achievements API error: ${achievementsResponse.statusText}`)
      }
      const achievementsData: SteamAchievementsResponse = await achievementsResponse.json()
      if (!achievementsData.playerstats?.success || !achievementsData.playerstats.achievements) {
        return this.ok({ achievements: [], mostRecentUnlock: undefined })
      }

      // 3) Merge schema + player data.
      const achievements: AchievementData[] = achievementsData.playerstats.achievements.map((achievement: SteamAchievement) => {
        const schemaAchievement = schemaData.game.availableGameStats.achievements.find(
          a => a.name === achievement.apiname
        )
        return {
          achievementId: achievement.apiname,
          name: schemaAchievement?.displayName || achievement.name || achievement.apiname,
          description: schemaAchievement?.description || achievement.description,
          iconUrl: schemaAchievement?.icon,
          isUnlocked: achievement.achieved === 1,
          unlockedAt: achievement.achieved === 1 && achievement.unlocktime > 0
            ? new Date(achievement.unlocktime * 1000)
            : undefined,
          // Steam doesn't expose rarity or points per achievement.
          rarity: undefined,
          points: undefined
        }
      })

      // 4) If caller passes the set of already-known unlocks, find the most recent newly-unlocked
      //    achievement so the UI can surface "X new achievements unlocked".
      let mostRecentUnlock: Date | undefined
      if (existingAchievements) {
        const newAchievements = achievements.filter(
          ach => ach.isUnlocked && !existingAchievements.has(ach.achievementId)
        )
        if (newAchievements.length > 0) {
          mostRecentUnlock = newAchievements
            .filter(ach => ach.unlockedAt)
            .reduce<Date | undefined>((latest, current) => {
              if (!current.unlockedAt) return latest
              if (!latest) return current.unlockedAt
              return current.unlockedAt > latest ? current.unlockedAt : latest
            }, undefined)
        }
      }

      return this.ok({ achievements, mostRecentUnlock })
    } catch (error) {
      return this.wrapError(error, 'Failed to sync Steam achievements')
    }
  }

  private async fetchUserProfile(steamId: string): Promise<SyncResult<SteamUserProfile>> {
    try {
      const url = `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v0002/?key=${this.apiKey}&steamids=${steamId}`
      const response = await fetch(url)
      if (!response.ok) {
        return this.fail(`Steam API error: ${response.statusText}`)
      }

      const data: SteamApiResponse<SteamPlayersResponse> = await response.json()
      const player = data.response.players?.[0]
      if (!player) {
        return this.fail('Steam user not found')
      }

      return this.ok(player)
    } catch (error) {
      return this.wrapError(error, 'Failed to fetch Steam profile')
    }
  }

  private toUserProfile(player: SteamUserProfile): UserProfile {
    return {
      platformId: player.steamid,
      username: player.personaname,
      displayName: player.personaname,
      avatarUrl: player.avatarfull,
      profileUrl: player.profileurl
    }
  }
}
