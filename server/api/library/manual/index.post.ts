import { eq } from 'drizzle-orm'
import { games, userPlatformGames } from '../../../db/schema'
import { ensureManualAccount } from '../../../utils/library'

interface ManualGameBody {
  // IGDB game id (preferred — pulls cover/name from the catalog).
  gameId?: number
  // Free-form name when no IGDB match.
  name?: string
  iconUrl?: string | null
  coverUrl?: string | null
  playtimeTotal?: number
  isCompleted?: boolean
  completedAt?: string | null
  lastPlayed?: string | null
}

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const userId = session.user.id

  const body = await readBody<ManualGameBody>(event)

  // Resolve the catalog row when an IGDB id was provided so we can backfill cover/name.
  let catalogGame: typeof games.$inferSelect | undefined
  if (body?.gameId) {
    const [row] = await db.select().from(games).where(eq(games.id, body.gameId)).limit(1)
    catalogGame = row
  }

  const name = (body?.name?.trim() || catalogGame?.name)?.trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Nom du jeu requis' })
  }

  const account = await ensureManualAccount(userId)
  const id = crypto.randomUUID()
  const playtimeTotal = Math.max(0, Number(body?.playtimeTotal ?? 0)) || 0
  const isCompleted = Boolean(body?.isCompleted)

  await db.insert(userPlatformGames).values({
    id,
    platformAccountId: account.id,
    // For manual entries this just needs to be unique within the account; the row id works.
    platformGameId: id,
    gameId: catalogGame?.id ?? null,
    name,
    playtimeTotal,
    iconUrl: body?.iconUrl ?? catalogGame?.coverUrl ?? null,
    coverUrl: body?.coverUrl ?? catalogGame?.coverUrl ?? null,
    isInstalled: false,
    isCompleted,
    completedAt: isCompleted && body?.completedAt ? new Date(body.completedAt) : null,
    lastPlayed: body?.lastPlayed ? new Date(body.lastPlayed) : null
  })

  return { success: true, id }
})
