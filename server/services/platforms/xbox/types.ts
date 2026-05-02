export interface XboxTokens {
  msAccessToken: string
  msRefreshToken: string
  xblUserToken: string
  xstsToken: string
  userHash: string
  xuid: string
  msTokenExpiresAt: number
  xstsTokenExpiresAt: number
}

export interface XboxAuthCodeInput {
  code: string
  codeVerifier: string
  redirectUri: string
}

export interface XboxAccountMetadata {
  userHash?: string
  xuid?: string
  xblUserToken?: string
  msAccessToken?: string
  msTokenExpiresAt?: number
  xstsTokenExpiresAt?: number
  gamerscore?: string
}
