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
import type { XboxAccountMetadata, XboxAuthCodeInput, XboxTokens } from './types'

const MS_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
const XBL_USER_AUTH_URL = 'https://user.auth.xboxlive.com/user/authenticate'
const XSTS_AUTH_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'
const XBL_PROFILE_URL = 'https://profile.xboxlive.com/users/me/profile/settings'
const TITLE_HISTORY_URL = (xuid: string) =>
  `https://titlehub.xboxlive.com/users/xuid(${xuid})/titles/titlehistory/decoration/detail,image,scid`
const USER_STATS_URL = (xuid: string, scid: string) =>
  `https://userstats.xboxlive.com/users/xuid(${xuid})/scids/${scid}/stats/minutesPlayed,gameTime,timePlayed,playtime`
const ACHIEVEMENTS_URL = (xuid: string, titleId: string) =>
  `https://achievements.xboxlive.com/users/xuid(${xuid})/achievements?titleId=${titleId}&maxItems=1000`

const XSTS_TTL_MS = 3600 * 1000

interface MicrosoftTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface XblAuthResponse {
  Token: string
  DisplayClaims: {
    xui: Array<{ uhs: string, xid?: string }>
  }
}

interface XboxImage { url: string, imageType: string }
interface XboxTitleHistoryEntry { lastTimePlayed?: string }
interface XboxTitle {
  titleId: string | number
  name: string
  serviceConfigId?: string
  displayImage?: string
  images?: XboxImage[]
  devices?: string[]
  titleHistory?: XboxTitleHistoryEntry
}
interface XboxTitleHistoryResponse { titles: XboxTitle[] }

interface XboxStat { name: string, value?: string }
interface XboxStatList { stats?: XboxStat[] }
interface XboxStatsResponse { statlistscollection?: XboxStatList[] }

interface XboxAchievementMediaAsset { type: string, url: string }
interface XboxAchievementReward { type: string, value?: string }
interface XboxAchievementProgression { timeUnlocked?: string }
interface XboxAchievementRarity { currentPercentage?: number }
interface XboxAchievement {
  id: string
  name: string
  description?: string
  lockedDescription?: string
  progressState: string
  progression?: XboxAchievementProgression
  mediaAssets?: XboxAchievementMediaAsset[]
  rewards?: XboxAchievementReward[]
  rarity?: XboxAchievementRarity
}
interface XboxAchievementsResponse { achievements: XboxAchievement[] }

interface XboxProfileSetting { id: string, value: string }
interface XboxProfileResponse {
  profileUsers: Array<{ id: string, settings: XboxProfileSetting[] }>
}

export class XboxService extends PlatformService {
  readonly platform: GamingPlatform = 'xbox'
  private tokens: XboxTokens | null = null
  private readonly clientId: string

  constructor() {
    super()
    const clientId = useRuntimeConfig().microsoftClientId
    if (!clientId) {
      throw new Error('Microsoft client ID is required (set NUXT_MICROSOFT_CLIENT_ID)')
    }
    this.clientId = clientId
  }

  validateCredentials(_credentials: PlatformCredentials): boolean {
    // Xbox uses an OAuth code flow handled by callback.get.ts; there's no static credential to validate.
    return true
  }

  // Required by the abstract base, but Xbox auth happens via the OAuth callback —
  // there's no usable input from a `PlatformCredentials` blob, so callers should use
  // `authenticateWithCode()` directly.
  async authenticate(_credentials: PlatformCredentials): Promise<SyncResult<UserProfile>> {
    return this.fail('Xbox authentication uses the OAuth code flow — call authenticateWithCode() instead')
  }

  async authenticateWithCode(input: XboxAuthCodeInput): Promise<SyncResult<UserProfile>> {
    try {
      const msToken = await this.exchangeCodeForMsToken(input)
      const xbl = await this.fetchXblUserToken(msToken.access_token)
      const xsts = await this.fetchXstsToken(xbl.Token)

      const userHash = xsts.DisplayClaims?.xui?.[0]?.uhs
      const xuid = xsts.DisplayClaims?.xui?.[0]?.xid
      if (!userHash || !xuid) {
        return this.fail('Xbox Live did not return a usable XUID')
      }

      this.tokens = {
        msAccessToken: msToken.access_token,
        msRefreshToken: msToken.refresh_token,
        xblUserToken: xbl.Token,
        xstsToken: xsts.Token,
        userHash,
        xuid,
        msTokenExpiresAt: Date.now() + msToken.expires_in * 1000,
        xstsTokenExpiresAt: Date.now() + XSTS_TTL_MS
      }

      const profile = await this.fetchProfile()
      return this.ok(profile)
    } catch (error) {
      return this.wrapError(error, 'Xbox authentication failed')
    }
  }

  async hydrate(account: PlatformAccountRow): Promise<SyncResult<UserProfile>> {
    if (!account.refreshToken) {
      return this.fail('No Xbox refresh token stored — please reconnect')
    }
    try {
      const msToken = await this.refreshMsToken(account.refreshToken)
      const xbl = await this.fetchXblUserToken(msToken.access_token)
      const xsts = await this.fetchXstsToken(xbl.Token)

      const meta = (account.metadata ?? {}) as XboxAccountMetadata
      const userHash = xsts.DisplayClaims?.xui?.[0]?.uhs ?? meta.userHash
      const xuid = xsts.DisplayClaims?.xui?.[0]?.xid ?? meta.xuid ?? account.platformId
      if (!userHash || !xuid) {
        return this.fail('Xbox Live did not return a usable XUID')
      }

      this.tokens = {
        msAccessToken: msToken.access_token,
        msRefreshToken: msToken.refresh_token,
        xblUserToken: xbl.Token,
        xstsToken: xsts.Token,
        userHash,
        xuid,
        msTokenExpiresAt: Date.now() + msToken.expires_in * 1000,
        xstsTokenExpiresAt: Date.now() + XSTS_TTL_MS
      }

      return this.ok({
        platformId: xuid,
        username: account.username ?? undefined,
        displayName: account.displayName ?? undefined,
        avatarUrl: account.avatarUrl ?? undefined,
        profileUrl: account.profileUrl ?? undefined
      })
    } catch (error) {
      return this.wrapError(error, 'Xbox token refresh failed')
    }
  }

  getTokens(): XboxTokens | null {
    return this.tokens
  }

  async syncGames(account: PlatformAccountRow): Promise<SyncResult<GameData[]>> {
    try {
      if (!this.tokens) {
        return this.fail('XboxService is not authenticated')
      }

      const data = await this.xboxFetch<XboxTitleHistoryResponse>(TITLE_HISTORY_URL(this.tokens.xuid))
      if (!data.titles) {
        return this.ok<GameData[]>([])
      }

      const lastSyncMs = account.lastSync?.getTime()
      const games: GameData[] = []

      // Walk titles sequentially: Xbox has a per-stats endpoint we need to hit per title,
      // and parallelizing aggressively gets rate-limited.
      for (const title of data.titles) {
        // Skip Win32 (Xbox app on PC) — caller is interested in console history.
        if (title.devices?.[0] === 'Win32') continue

        const lastPlayed = title.titleHistory?.lastTimePlayed
          ? new Date(title.titleHistory.lastTimePlayed)
          : undefined

        // Incremental: skip titles untouched since last sync.
        if (lastSyncMs && lastPlayed && lastPlayed.getTime() < lastSyncMs) continue

        const playtimeTotal = title.serviceConfigId
          ? await this.fetchPlaytimeMinutes(title.serviceConfigId)
          : 0

        games.push({
          platformGameId: String(title.titleId),
          name: title.name,
          playtimeTotal,
          playtimeRecent: undefined,
          lastPlayed,
          iconUrl: title.displayImage ?? title.images?.find(img => img.imageType === 'Logo')?.url,
          coverUrl: title.displayImage ?? title.images?.find(img => img.imageType === 'Poster')?.url,
          isInstalled: false
        })
      }

      return this.ok(games)
    } catch (error) {
      return this.wrapError(error, 'Failed to sync Xbox games')
    }
  }

  async syncAchievements(_account: PlatformAccountRow, gameId: string): Promise<SyncResult<AchievementData[]>> {
    try {
      if (!this.tokens) {
        return this.fail('XboxService is not authenticated')
      }

      const data = await this.xboxFetch<XboxAchievementsResponse>(ACHIEVEMENTS_URL(this.tokens.xuid, gameId))
      if (!data.achievements) {
        return this.ok([])
      }

      const achievements: AchievementData[] = data.achievements.map((a) => {
        const gamerscore = a.rewards?.find(r => r.type === 'Gamerscore')?.value
        return {
          achievementId: a.id,
          name: a.name,
          description: a.description ?? a.lockedDescription,
          iconUrl: a.mediaAssets?.find(asset => asset.type === 'Icon')?.url,
          isUnlocked: a.progressState === 'Achieved',
          unlockedAt: a.progression?.timeUnlocked ? new Date(a.progression.timeUnlocked) : undefined,
          rarity: a.rarity?.currentPercentage,
          earnedRate: a.rarity?.currentPercentage,
          points: gamerscore ? parseInt(gamerscore, 10) : 0
        }
      })

      return this.ok(achievements)
    } catch (error) {
      return this.wrapError(error, 'Failed to sync Xbox achievements')
    }
  }

  // ─── Internal: OAuth cascade ───────────────────────────────────────────

  private async exchangeCodeForMsToken(input: XboxAuthCodeInput): Promise<MicrosoftTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      code: input.code,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
      scope: 'Xboxlive.signin offline_access'
    })

    const response = await fetch(MS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Microsoft token exchange failed: ${text}`)
    }
    return response.json() as Promise<MicrosoftTokenResponse>
  }

  private async refreshMsToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'Xboxlive.signin offline_access'
    })

    const response = await fetch(MS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Microsoft token refresh failed: ${text}`)
    }
    return response.json() as Promise<MicrosoftTokenResponse>
  }

  private async fetchXblUserToken(msAccessToken: string): Promise<XblAuthResponse> {
    const response = await fetch(XBL_USER_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${msAccessToken}`
        }
      })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Xbox Live user auth failed: ${text}`)
    }
    return response.json() as Promise<XblAuthResponse>
  }

  private async fetchXstsToken(userToken: string): Promise<XblAuthResponse> {
    const response = await fetch(XSTS_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        RelyingParty: 'http://xboxlive.com',
        TokenType: 'JWT',
        Properties: {
          UserTokens: [userToken],
          SandboxId: 'RETAIL'
        }
      })
    })
    if (!response.ok) {
      const text = await response.text()
      let xErr: number | undefined
      try {
        xErr = (JSON.parse(text) as { XErr?: number }).XErr
      } catch {
        // not JSON
      }
      throw new Error(this.xstsErrorMessage(xErr) ?? `XSTS authorization failed: ${text}`)
    }
    return response.json() as Promise<XblAuthResponse>
  }

  private xstsErrorMessage(xErr: number | undefined): string | null {
    switch (xErr) {
      case 2148916233:
        return 'Ce compte Microsoft n\'a pas de profil Xbox. Crée d\'abord un profil Xbox.'
      case 2148916235:
        return 'Xbox Live est interdit dans ton pays/région.'
      case 2148916238:
        return 'Ce compte est un compte enfant. L\'autorisation parentale est requise.'
      default:
        return null
    }
  }

  // ─── Internal: Profile / sync helpers ──────────────────────────────────

  private async fetchProfile(): Promise<UserProfile> {
    if (!this.tokens) throw new Error('Not authenticated')
    const url = new URL(XBL_PROFILE_URL)
    url.searchParams.set('settings', 'GameDisplayName,Gamertag,PublicGamerpic,Gamerscore')

    const response = await fetch(url.toString(), {
      headers: this.xblHeaders(3)
    })
    if (!response.ok) {
      throw new Error(`Xbox profile fetch failed: ${response.statusText}`)
    }
    const data = (await response.json()) as XboxProfileResponse
    const settings = data.profileUsers?.[0]?.settings ?? []
    const get = (key: string) => settings.find(s => s.id === key)?.value
    const gamertag = get('Gamertag') ?? this.tokens.xuid

    return {
      platformId: this.tokens.xuid,
      username: gamertag,
      displayName: get('GameDisplayName') ?? gamertag,
      avatarUrl: get('PublicGamerpic'),
      profileUrl: `https://account.xbox.com/profile?gamertag=${encodeURIComponent(gamertag)}`
    }
  }

  private async fetchPlaytimeMinutes(scid: string): Promise<number> {
    if (!this.tokens) return 0
    try {
      const response = await fetch(USER_STATS_URL(this.tokens.xuid, scid), {
        headers: this.xblHeaders(2)
      })
      if (!response.ok) return 0
      const data = (await response.json()) as XboxStatsResponse
      for (const collection of data.statlistscollection ?? []) {
        for (const stat of collection.stats ?? []) {
          if (/playtime|timeplayed|gametime|minutesplayed/i.test(stat.name)) {
            const value = parseFloat(stat.value ?? '0') || 0
            return /hours/i.test(stat.name) ? Math.round(value * 60) : Math.round(value)
          }
        }
      }
      return 0
    } catch {
      // Stats endpoint isn't available for every title — silently treat as 0.
      return 0
    }
  }

  private async xboxFetch<T>(url: string): Promise<T> {
    if (!this.tokens) throw new Error('Not authenticated')
    const response = await fetch(url, { headers: this.xblHeaders(2) })
    if (!response.ok) {
      throw new Error(`Xbox API ${response.status}: ${response.statusText}`)
    }
    return response.json() as Promise<T>
  }

  private xblHeaders(contractVersion: number): Record<string, string> {
    if (!this.tokens) throw new Error('Not authenticated')
    return {
      'Content-Type': 'application/json',
      'x-xbl-contract-version': String(contractVersion),
      'Accept-Language': 'fr-FR',
      'Authorization': `XBL3.0 x=${this.tokens.userHash};${this.tokens.xstsToken}`
    }
  }
}
