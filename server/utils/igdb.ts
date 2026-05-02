let token: { value: string, expiresAt: number } | null = null

async function getIGDBToken() {
  if (token && token.expiresAt > Date.now()) return token.value

  const config = useRuntimeConfig()
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      grant_type: 'client_credentials'
    })
  })
  const data = await res.json()
  token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return token.value
}

export async function searchIGDB(query: string) {
  const config = useRuntimeConfig()
  const accessToken = await getIGDBToken()

  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': config.twitchClientId,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain'
    },
    body: `fields id, name, slug, cover.url, summary, genres.name, platforms.name, first_release_date;
           search "${query}";
           limit 10;`
  })
  const games = await res.json()

  return games.map((g: any) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    coverUrl: g.cover?.url?.replace('t_thumb', 't_cover_big') ?? null,
    summary: g.summary ?? null,
    genres: g.genres?.map((genre: any) => genre.name) ?? [],
    platforms: g.platforms?.map((p: any) => p.name) ?? [],
    firstReleaseDate: g.first_release_date ?? null
  }))
}

export async function fetchPopularIGDBGames(limit = 500) {
  const config = useRuntimeConfig()
  const accessToken = await getIGDBToken()

  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': config.twitchClientId,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain'
    },
    body: `fields id, name, slug, cover.url, summary, genres.name, platforms.name, first_release_date;
           where follows > 100 & category = 0;
           sort follows desc;
           limit ${limit};`
  })
  const games = await res.json()

  return games.map((g: any) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    coverUrl: g.cover?.url?.replace('t_thumb', 't_cover_big') ?? null,
    summary: g.summary ?? null,
    genres: g.genres?.map((genre: any) => genre.name) ?? [],
    platforms: g.platforms?.map((p: any) => p.name) ?? [],
    firstReleaseDate: g.first_release_date ?? null
  }))
}
