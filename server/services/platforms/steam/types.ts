// Steam Web API request/response types (snake_case as returned by the API).

export interface SteamCredentials {
  steamId: string
}

export interface SteamUserProfile {
  steamid: string
  personaname: string
  profileurl: string
  avatar: string
  avatarmedium: string
  avatarfull: string
  personastate: number
  communityvisibilitystate: number
  profilestate: number
  lastlogoff: number
  commentpermission: number
}

export interface SteamGame {
  appid: number
  name: string
  playtime_forever: number
  playtime_2weeks?: number
  img_icon_url: string
  img_logo_url: string
  has_community_visible_stats?: boolean
  playtime_windows_forever?: number
  playtime_mac_forever?: number
  playtime_linux_forever?: number
  rtime_last_played?: number
}

export interface SteamAchievement {
  apiname: string
  achieved: number
  unlocktime: number
  name?: string
  description?: string
}

export interface SteamGameSchema {
  gameName: string
  gameVersion: string
  availableGameStats: {
    achievements: Array<{
      name: string
      displayName: string
      description: string
      icon: string
      icongray: string
      hidden: number
    }>
  }
}

export interface SteamApiResponse<T> {
  response: T
}

export interface SteamPlayersResponse {
  players: SteamUserProfile[]
}

export interface SteamGamesResponse {
  game_count: number
  games: SteamGame[]
}

export interface SteamAchievementsResponse {
  playerstats: {
    steamID: string
    gameName: string
    achievements: SteamAchievement[]
    success: boolean
  }
}

export interface SteamGameSchemaResponse {
  game: SteamGameSchema
}
