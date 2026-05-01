import type {
  GamingPlatform,
  UserProfile,
  GameData,
  PlatformCredentials,
  SyncResult,
  PlatformAccountRow
} from './types'

// Base contract for a gaming platform integration (Steam, PSN, Xbox, ...).
// Each implementation handles its own auth flow and game/achievement sync.
// Achievement sync signatures vary per platform (per-game vs per-account),
// so it's not part of the base — each service exposes its own.
export abstract class PlatformService {
  abstract readonly platform: GamingPlatform

  abstract authenticate(credentials: PlatformCredentials): Promise<SyncResult<UserProfile>>
  abstract syncGames(account: PlatformAccountRow): Promise<SyncResult<GameData[]>>

  // Steam doesn't expire tokens; default no-op. PSN/Xbox override.
  refreshToken(account: PlatformAccountRow): Promise<SyncResult<PlatformAccountRow>> {
    return Promise.resolve(this.ok(account))
  }

  protected ok<T>(data: T): SyncResult<T> {
    return { success: true, data }
  }

  protected fail<T = never>(error: string): SyncResult<T> {
    return { success: false, error }
  }

  protected wrapError<T = never>(error: unknown, prefix: string): SyncResult<T> {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return this.fail<T>(`${prefix}: ${msg}`)
  }
}
