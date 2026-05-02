import pg from 'pg'
import 'dotenv/config'

const client = new pg.Client({ connectionString: process.env.NUXT_DATABASE_URL || process.env.DATABASE_URL })

let tokenCache: { value: string, expiresAt: number } | null = null

async function getToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: (process.env.NUXT_TWITCH_CLIENT_ID || process.env.TWITCH_CLIENT_ID)!,
      client_secret: (process.env.NUXT_TWITCH_CLIENT_SECRET || process.env.TWITCH_CLIENT_SECRET)!,
      grant_type: 'client_credentials'
    })
  })
  const data = await res.json()
  tokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return tokenCache.value
}

async function searchGames(query: string) {
  const accessToken = await getToken()

  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': (process.env.NUXT_TWITCH_CLIENT_ID || process.env.TWITCH_CLIENT_ID)!,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain'
    },
    body: `fields id, name, slug, cover.url, summary, genres.name, platforms.name, first_release_date;
           search "${query}";
           limit 10;`
  })
  return res.json()
}

// Popular game search terms to seed the database
const searchTerms = [
  'League of Legends', 'Valorant', 'Counter-Strike', 'Dota',
  'Fortnite', 'Apex Legends', 'Overwatch', 'Minecraft',
  'World of Warcraft', 'Final Fantasy', 'Call of Duty', 'Battlefield',
  'Rocket League', 'Rainbow Six', 'Destiny', 'Diablo',
  'Path of Exile', 'Lost Ark', 'Genshin Impact', 'Palworld',
  'Elden Ring', 'Dark Souls', 'Monster Hunter', 'Baldur\'s Gate',
  'Cyberpunk', 'Grand Theft Auto', 'Red Dead', 'Zelda',
  'Mario Kart', 'Super Smash Bros', 'Splatoon', 'Animal Crossing',
  'Terraria', 'Stardew Valley', 'Among Us', 'Fall Guys',
  'Rust', 'Ark Survival', 'Sea of Thieves', 'No Man\'s Sky',
  'Helldivers', 'Lethal Company', 'Phasmophobia', 'Dead by Daylight',
  'The Forest', 'Satisfactory', 'Factorio', 'Civilization',
  'Age of Empires', 'Starcraft'
]

async function main() {
  await client.connect()
  console.log(`Seeding games from IGDB using ${searchTerms.length} search terms...`)

  const seenIds = new Set<number>()
  let inserted = 0

  for (const term of searchTerms) {
    try {
      const games = await searchGames(term)

      for (const g of games) {
        if (seenIds.has(g.id)) continue
        seenIds.add(g.id)

        const coverUrl = g.cover?.url?.replace('t_thumb', 't_cover_big') ?? null
        const genres = g.genres?.map((genre: any) => genre.name) ?? []
        const platforms = g.platforms?.map((p: any) => p.name) ?? []

        try {
          await client.query(
            `INSERT INTO games (id, name, slug, cover_url, summary, genres, platforms, first_release_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [g.id, g.name, g.slug ?? null, coverUrl, g.summary ?? null,
              JSON.stringify(genres), JSON.stringify(platforms), g.first_release_date ?? null]
          )
          inserted++
        } catch (err: any) {
          console.error(`  Failed: ${g.name} — ${err.message}`)
        }
      }

      console.log(`  "${term}" → ${games.length} results`)
    } catch (err: any) {
      console.error(`  Search "${term}" failed: ${err.message}`)
    }

    // Rate limit: 4 requests/sec for IGDB
    await new Promise(r => setTimeout(r, 260))
  }

  console.log(`\nDone! Inserted ${inserted} unique games`)
  await client.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
