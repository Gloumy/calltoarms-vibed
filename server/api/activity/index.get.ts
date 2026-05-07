import { and, eq, inArray, isNotNull, lt, sql, desc, gt, or } from 'drizzle-orm'
import { events, gameSessions, notifications, userPlatformAccounts, userPlatformAchievements, userPlatformGames, users, games } from '../../db/schema'

const NOTIF_TYPES_FEED = ['friend_accepted', 'session_started', 'event_created', 'event_invited', 'community_invited'] as const
type FeedNotifType = typeof NOTIF_TYPES_FEED[number]

type ActivityType = FeedNotifType | 'game_completed' | 'achievements_unlocked'
type Filter = 'all' | 'sessions' | 'events' | 'games'

interface Actor {
  id: string
  username: string
  name: string
  image: string | null
}

interface ActivityGame {
  id: number | null
  name: string
  coverUrl: string | null
}

interface ActivityItem {
  id: string
  type: ActivityType
  timestamp: string
  actor: Actor
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

interface ActivityStats {
  totalFriends: number
  activeThisWeek: number
  totalGamesInCircle: number
  commonGames: number
}

interface ActivityResponse {
  stats: ActivityStats | null
  items: ActivityItem[]
  nextCursor: string | null
}

const NOTIF_TYPES_BY_FILTER: Record<Filter, FeedNotifType[]> = {
  all: [...NOTIF_TYPES_FEED],
  sessions: ['session_started'],
  events: ['event_created', 'event_invited'],
  games: []
}

export default defineEventHandler(async (event): Promise<ActivityResponse> => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id
  const q = getQuery(event)
  const filter = (typeof q.type === 'string' && ['all', 'sessions', 'events', 'games'].includes(q.type)) ? q.type as Filter : 'all'
  const beforeIso = typeof q.before === 'string' && q.before.length > 0 ? q.before : null
  const beforeDate = beforeIso ? new Date(beforeIso) : null
  const limit = 30
  const includeNotifs = NOTIF_TYPES_BY_FILTER[filter].length > 0
  const includeGames = filter === 'all' || filter === 'games'

  const friendIds = await getFriendIds(me)

  // Stats only on first page
  const stats = beforeIso ? null : await computeStats(db, me, friendIds)

  // ─── Source A: notifications ──────────────────────────────
  const notifRows = includeNotifs
    ? await db
        .select({
          id: notifications.id,
          type: notifications.type,
          payload: notifications.payload,
          createdAt: notifications.createdAt
        })
        .from(notifications)
        .where(and(
          eq(notifications.userId, me),
          inArray(notifications.type, NOTIF_TYPES_BY_FILTER[filter]),
          beforeDate ? lt(notifications.createdAt, beforeDate) : sql`true`
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
    : []

  // ─── Source B: completions ────────────────────────────────
  const completionRows = includeGames && friendIds.length > 0
    ? await db
        .select({
          id: userPlatformGames.id,
          gameId: userPlatformGames.gameId,
          name: userPlatformGames.name,
          coverUrl: userPlatformGames.coverUrl,
          completedAt: userPlatformGames.completedAt,
          userId: userPlatformAccounts.userId
        })
        .from(userPlatformGames)
        .innerJoin(userPlatformAccounts, eq(userPlatformGames.platformAccountId, userPlatformAccounts.id))
        .where(and(
          inArray(userPlatformAccounts.userId, friendIds),
          eq(userPlatformGames.isCompleted, true),
          isNotNull(userPlatformGames.completedAt),
          beforeDate ? lt(userPlatformGames.completedAt, beforeDate) : sql`true`
        ))
        .orderBy(desc(userPlatformGames.completedAt))
        .limit(limit)
    : []

  // ─── Source C: achievements aggregated by (user, game-row, day) ──
  // We aggregate at the userPlatformGames level (which is per-user-per-platform-game),
  // grouping by the day so a 20-trophy burst becomes a single feed entry.
  const achievementRows = includeGames && friendIds.length > 0
    ? await db
        .select({
          platformGameId: userPlatformGames.id,
          gameId: userPlatformGames.gameId,
          gameName: userPlatformGames.name,
          coverUrl: userPlatformGames.coverUrl,
          userId: userPlatformAccounts.userId,
          day: sql<string>`date_trunc('day', ${userPlatformAchievements.unlockedAt})`.as('day'),
          maxTimestamp: sql<Date>`max(${userPlatformAchievements.unlockedAt})`.as('max_ts'),
          count: sql<number>`count(*)::int`.as('cnt')
        })
        .from(userPlatformAchievements)
        .innerJoin(userPlatformGames, eq(userPlatformAchievements.platformGameId, userPlatformGames.id))
        .innerJoin(userPlatformAccounts, eq(userPlatformGames.platformAccountId, userPlatformAccounts.id))
        .where(and(
          inArray(userPlatformAccounts.userId, friendIds),
          eq(userPlatformAchievements.isUnlocked, true),
          isNotNull(userPlatformAchievements.unlockedAt),
          beforeDate ? lt(userPlatformAchievements.unlockedAt, beforeDate) : sql`true`
        ))
        .groupBy(
          userPlatformGames.id,
          userPlatformGames.gameId,
          userPlatformGames.name,
          userPlatformGames.coverUrl,
          userPlatformAccounts.userId,
          sql`date_trunc('day', ${userPlatformAchievements.unlockedAt})`
        )
        .orderBy(desc(sql`max(${userPlatformAchievements.unlockedAt})`))
        .limit(limit)
    : []

  // ─── Resolve actors ───────────────────────────────────────
  const actorIds = new Set<string>()
  const sessionIds = new Set<string>()
  const eventIds = new Set<string>()
  const gameIds = new Set<number>()
  for (const row of notifRows) {
    const actorId = extractActorId(row.type, row.payload)
    if (actorId) actorIds.add(actorId)
    const p = (row.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, unknown>
    if (row.type === 'session_started' && typeof p.sessionId === 'string') sessionIds.add(p.sessionId)
    if ((row.type === 'event_created' || row.type === 'event_invited') && typeof p.eventId === 'string') eventIds.add(p.eventId)
    if (row.type === 'session_started' && typeof p.gameId === 'number') gameIds.add(p.gameId)
  }
  for (const row of completionRows) actorIds.add(row.userId)
  for (const row of achievementRows) actorIds.add(row.userId)

  const [actorsList, sessionInfos, eventInfos] = await Promise.all([
    actorIds.size > 0
      ? db
          .select({ id: users.id, username: users.username, name: users.name, image: users.image })
          .from(users)
          .where(inArray(users.id, [...actorIds]))
      : Promise.resolve([]),
    sessionIds.size > 0
      ? db
          .select({ id: gameSessions.id, status: gameSessions.status, gameId: gameSessions.gameId, expiresAt: gameSessions.expiresAt })
          .from(gameSessions)
          .where(inArray(gameSessions.id, [...sessionIds]))
      : Promise.resolve([]),
    eventIds.size > 0
      ? db
          .select({ id: events.id, title: events.title, scheduledAt: events.scheduledAt, gameId: events.gameId })
          .from(events)
          .where(inArray(events.id, [...eventIds]))
      : Promise.resolve([])
  ])
  for (const s of sessionInfos) if (s.gameId != null) gameIds.add(s.gameId)
  for (const e of eventInfos) if (e.gameId != null) gameIds.add(e.gameId)

  const gameInfos = gameIds.size > 0
    ? await db
        .select({ id: games.id, name: games.name, coverUrl: games.coverUrl })
        .from(games)
        .where(inArray(games.id, [...gameIds]))
    : []

  const actorMap = new Map<string, Actor>(actorsList.map(a => [a.id, a]))
  const sessionMap = new Map(sessionInfos.map(s => [s.id, s]))
  const eventMap = new Map(eventInfos.map(e => [e.id, e]))
  const gameMap = new Map(gameInfos.map(g => [g.id, g]))

  // ─── Build items ──────────────────────────────────────────
  const now = Date.now()
  const items: ActivityItem[] = []

  for (const row of notifRows) {
    const item = buildNotifItem(row, actorMap, sessionMap, eventMap, gameMap, now)
    if (item) items.push(item)
  }
  for (const row of completionRows) {
    const actor = actorMap.get(row.userId)
    if (!actor || !row.completedAt) continue
    items.push({
      id: `completion:${row.id}`,
      type: 'game_completed',
      timestamp: row.completedAt.toISOString(),
      actor,
      game: { id: row.gameId, name: row.name, coverUrl: row.coverUrl }
    })
  }
  for (const row of achievementRows) {
    const actor = actorMap.get(row.userId)
    if (!actor) continue
    const ts = row.maxTimestamp instanceof Date ? row.maxTimestamp : new Date(row.maxTimestamp)
    items.push({
      id: `achievements:${row.platformGameId}:${ts.toISOString().slice(0, 10)}`,
      type: 'achievements_unlocked',
      timestamp: ts.toISOString(),
      actor,
      game: { id: row.gameId, name: row.gameName, coverUrl: row.coverUrl },
      count: row.count
    })
  }

  // Merge + sort + slice
  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const page = items.slice(0, limit)
  const nextCursor = page.length === limit && items.length > limit
    ? page[page.length - 1]!.timestamp
    : null

  return { stats, items: page, nextCursor }
})

async function computeStats(db: ReturnType<typeof useDB>, me: string, friendIds: string[]): Promise<ActivityStats> {
  if (friendIds.length === 0) {
    return { totalFriends: 0, activeThisWeek: 0, totalGamesInCircle: 0, commonGames: 0 }
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // "Actifs cette semaine" = friend a joué (lastPlayed récent sur sa lib synchronisée)
  // OU a lancé une session récemment. Sans la branche sessions, un ami qui n'a pas
  // synchronisé sa lib n'est jamais flaggé actif même s'il bouge sur la plateforme.
  const [libraryActive, sessionActive] = await Promise.all([
    db
      .select({ userId: userPlatformAccounts.userId })
      .from(userPlatformGames)
      .innerJoin(userPlatformAccounts, eq(userPlatformGames.platformAccountId, userPlatformAccounts.id))
      .where(and(
        inArray(userPlatformAccounts.userId, friendIds),
        isNotNull(userPlatformGames.lastPlayed),
        gt(userPlatformGames.lastPlayed, oneWeekAgo)
      ))
      .groupBy(userPlatformAccounts.userId),
    db
      .select({ userId: gameSessions.createdBy })
      .from(gameSessions)
      .where(and(
        inArray(gameSessions.createdBy, friendIds),
        gt(gameSessions.createdAt, oneWeekAgo)
      ))
      .groupBy(gameSessions.createdBy)
  ])
  const activeUserIds = new Set<string>([
    ...libraryActive.map(r => r.userId),
    ...sessionActive.map(r => r.userId)
  ])

  // ─── Jeux dans le cercle / en commun ──────────────────────
  // Match strategy: each owned-game row contributes potentially 2 keys:
  //   - igdb:<gameId>            (when IGDB match succeeded during sync)
  //   - <platform>:<platformId>  (always available)
  // Two rows are "the same game" if they share ANY key. This catches:
  //   - same Steam account on two users (platform key identical)
  //   - cross-platform via IGDB (igdb key identical)
  //   - one side has IGDB match and the other doesn't, same platform (platform key still matches)
  // Without the platform key, sync coverage to IGDB caps the stats artificially.
  const allRows = await db
    .select({
      userId: userPlatformAccounts.userId,
      platform: userPlatformAccounts.platform,
      platformGameId: userPlatformGames.platformGameId,
      gameId: userPlatformGames.gameId
    })
    .from(userPlatformGames)
    .innerJoin(userPlatformAccounts, eq(userPlatformGames.platformAccountId, userPlatformAccounts.id))
    .where(inArray(userPlatformAccounts.userId, [me, ...friendIds]))

  function keysFor(row: { platform: string, platformGameId: string, gameId: number | null }): string[] {
    const ks: string[] = [`${row.platform}:${row.platformGameId}`]
    if (row.gameId != null) ks.push(`igdb:${row.gameId}`)
    return ks
  }

  // Per-user: collapse rows into distinct "logical games", picking a canonical key per game.
  // Canonical key: prefer igdb when present (catches cross-platform), else platform+id.
  // We track all keys per game so the intersection step can match flexibly.
  function logicalGames(rows: typeof allRows) {
    const games = new Map<string, Set<string>>() // canonicalKey → all keys
    for (const r of rows) {
      const ks = keysFor(r)
      const canonical = r.gameId != null ? `igdb:${r.gameId}` : ks[0]!
      const existing = games.get(canonical)
      if (existing) {
        for (const k of ks) existing.add(k)
      } else {
        games.set(canonical, new Set(ks))
      }
    }
    return games
  }

  const myRows = allRows.filter(r => r.userId === me)
  const friendRows = allRows.filter(r => r.userId !== me)

  const myGames = logicalGames(myRows)
  const friendGames = logicalGames(friendRows)

  // Friend keyset (union of all keys that any friend's game has).
  const friendKeyset = new Set<string>()
  for (const [, keys] of friendGames) {
    for (const k of keys) friendKeyset.add(k)
  }

  // Common = my games that share at least one key with any friend's game.
  let commonGames = 0
  for (const [, keys] of myGames) {
    for (const k of keys) {
      if (friendKeyset.has(k)) {
        commonGames++
        break
      }
    }
  }

  return {
    totalFriends: friendIds.length,
    activeThisWeek: activeUserIds.size,
    totalGamesInCircle: friendGames.size,
    commonGames
  }
}

function extractActorId(type: string, payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  switch (type) {
    case 'friend_accepted': return typeof p.acceptedBy === 'string' ? p.acceptedBy : null
    case 'session_started':
    case 'event_created':
    case 'event_invited': return typeof p.creatorId === 'string' ? p.creatorId : null
    case 'community_invited': return typeof p.invitedBy === 'string' ? p.invitedBy : null
    default: return null
  }
}

interface NotifRow {
  id: string
  type: string
  payload: unknown
  createdAt: Date | null
}

interface SessionInfo { id: string, status: string, gameId: number | null, expiresAt: Date }
interface EventInfo { id: string, title: string, scheduledAt: Date, gameId: number | null }
interface GameInfo { id: number, name: string, coverUrl: string | null }

function buildNotifItem(
  row: NotifRow,
  actorMap: Map<string, Actor>,
  sessionMap: Map<string, SessionInfo>,
  eventMap: Map<string, EventInfo>,
  gameMap: Map<number, GameInfo>,
  now: number
): ActivityItem | null {
  if (!row.createdAt) return null
  const actorId = extractActorId(row.type, row.payload)
  if (!actorId) return null
  const actor = actorMap.get(actorId)
  if (!actor) return null
  const p = (row.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, unknown>
  const timestamp = row.createdAt.toISOString()
  const id = `notif:${row.id}`

  switch (row.type) {
    case 'friend_accepted':
      return { id, type: 'friend_accepted', timestamp, actor }
    case 'session_started': {
      const sessionId = typeof p.sessionId === 'string' ? p.sessionId : undefined
      const sessionInfo = sessionId ? sessionMap.get(sessionId) : undefined
      const gameId = sessionInfo?.gameId ?? (typeof p.gameId === 'number' ? p.gameId : null)
      const gameInfo = gameId != null ? gameMap.get(gameId) : undefined
      const sessionStatus: 'active' | 'closed' | undefined = sessionInfo
        ? (sessionInfo.status === 'active' && sessionInfo.expiresAt.getTime() > now ? 'active' : 'closed')
        : undefined
      return {
        id,
        type: 'session_started',
        timestamp,
        actor,
        sessionId,
        sessionStatus,
        game: gameInfo
          ? { id: gameInfo.id, name: gameInfo.name, coverUrl: gameInfo.coverUrl }
          : (gameId != null ? { id: gameId, name: typeof p.gameName === 'string' ? p.gameName : '', coverUrl: null } : undefined)
      }
    }
    case 'event_created':
    case 'event_invited': {
      const eventId = typeof p.eventId === 'string' ? p.eventId : undefined
      const eventInfo = eventId ? eventMap.get(eventId) : undefined
      const eventStatus: 'upcoming' | 'past' | undefined = eventInfo
        ? (eventInfo.scheduledAt.getTime() > now ? 'upcoming' : 'past')
        : undefined
      const gameId = eventInfo?.gameId ?? null
      const gameInfo = gameId != null ? gameMap.get(gameId) : undefined
      return {
        id,
        type: row.type as 'event_created' | 'event_invited',
        timestamp,
        actor,
        eventId,
        eventTitle: eventInfo?.title ?? (typeof p.eventTitle === 'string' ? p.eventTitle : undefined),
        eventStatus,
        game: gameInfo ? { id: gameInfo.id, name: gameInfo.name, coverUrl: gameInfo.coverUrl } : undefined
      }
    }
    case 'community_invited':
      return {
        id,
        type: 'community_invited',
        timestamp,
        actor,
        communityId: typeof p.communityId === 'string' ? p.communityId : undefined,
        communityName: typeof p.communityName === 'string' ? p.communityName : undefined
      }
    default:
      return null
  }
}
