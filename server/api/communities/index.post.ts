import { communities, communityMembers } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const { name, description, gameId, isPublic = true } = await readBody(event)

  if (!name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Nom requis' })
  }

  // Generate slug from name
  const slug = name.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36)

  const id = crypto.randomUUID()

  await db.insert(communities).values({
    id,
    name: name.trim(),
    slug,
    description: description?.trim() || null,
    gameId: gameId ?? null,
    isPublic,
    createdBy: me
  })

  // Creator auto-joins as admin
  await db.insert(communityMembers).values({
    communityId: id,
    userId: me,
    role: 'admin',
    notifPreference: 'all'
  })

  return { id, slug }
})
