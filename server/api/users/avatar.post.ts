import { eq } from 'drizzle-orm'
import { user } from '../../db/schema'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = useDB()
  const me = session.user.id

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucun fichier envoye' })
  }

  const file = formData.find(f => f.name === 'avatar')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'Champ "avatar" requis' })
  }

  // Validate type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!file.type || !allowedTypes.includes(file.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Format non supporte (JPEG, PNG, WebP, GIF uniquement)' })
  }

  // Validate size (2MB max)
  if (file.data.length > 2 * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: 'Image trop volumineuse (2 Mo max)' })
  }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const filename = `${me}.${ext}`

  // Write file to public/avatars/
  const avatarDir = join(process.cwd(), 'public', 'avatars')
  await mkdir(avatarDir, { recursive: true })
  await writeFile(join(avatarDir, filename), file.data)

  // Update user image in DB
  const avatarUrl = `/avatars/${filename}?t=${Date.now()}`
  await db.update(user).set({ image: avatarUrl, updatedAt: new Date() }).where(eq(user.id, me))

  return { url: avatarUrl }
})
