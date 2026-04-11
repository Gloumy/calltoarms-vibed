import { userBattleTags } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const { platform, tag, isPublic = true } = await readBody(event)

  if (!platform?.trim() || !tag?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Plateforme et tag requis' })
  }

  const id = crypto.randomUUID()

  await db.insert(userBattleTags).values({
    id,
    userId: me,
    platform: platform.trim(),
    tag: tag.trim(),
    isPublic
  })

  return { id }
})
