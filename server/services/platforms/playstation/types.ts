export interface PlayStationCredentials {
  npsso: string
  username?: string
}

export interface PlayStationAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn?: number
}
