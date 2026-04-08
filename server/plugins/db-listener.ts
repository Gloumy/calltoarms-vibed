import pg from 'pg'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  if (!config.databaseUrl) {
    console.warn('[db-listener] DATABASE_URL not set, skipping LISTEN/NOTIFY')
    return
  }

  const client = new pg.Client({ connectionString: config.databaseUrl })

  try {
    await client.connect()
    await client.query('LISTEN session_changes')
    await client.query('LISTEN availability_changes')

    client.on('notification', (msg) => {
      const payload = JSON.parse(msg.payload ?? '{}')

      if (msg.channel === 'session_changes') {
        const data = { type: 'session:update', payload }
        // Notify both session participants and creator's friends
        if (payload.id) {
          broadcastToSessionParticipants(payload.id, data)
        }
        broadcastToFriends(payload.created_by, data)
      }

      if (msg.channel === 'availability_changes') {
        broadcastToFriends(payload.user_id, {
          type: 'availability:update',
          payload
        })
      }
    })

    client.on('error', (err) => {
      console.error('[db-listener] Connection error:', err.message)
    })

    console.log('[db-listener] Listening for session_changes and availability_changes')
  } catch (err: any) {
    console.error('[db-listener] Failed to connect:', err.message)
  }
})
