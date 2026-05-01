import { pgTable, text, boolean, timestamp, integer, jsonb, primaryKey, real, unique } from 'drizzle-orm/pg-core'

// ─── Better Auth: user ───────────────────────────────────
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Custom fields
  username: text('username').notNull().unique(),
  language: text('language').default('fr'),
  isAdmin: boolean('is_admin').default(false),
  availableUntil: timestamp('available_until', { withTimezone: true }),
  availableGameId: integer('available_game_id').references(() => games.id)
})

// ─── Better Auth: session ────────────────────────────────
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

// ─── Better Auth: account ────────────────────────────────
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

// ─── Better Auth: verification ───────────────────────────
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
})

// Alias for app code
export const users = user

// ─── User Battle Tags ────────────────────────────────────
export const userBattleTags = pgTable('user_battle_tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  tag: text('tag').notNull(),
  isPublic: boolean('is_public').default(true)
})

// ─── User Platform Accounts ──────────────────────────────
// Compte d'une plateforme de jeu (Steam, PSN, Xbox, ...) lié à un user.
// Stocke les credentials et metadata utilisés pour la synchronisation de la bibliothèque.
export const userPlatformAccounts = pgTable('user_platform_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // 'steam' | 'playstation' | 'xbox' | 'nintendo' | 'gog' | 'riot'
  platformId: text('platform_id').notNull(),
  username: text('username'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  profileUrl: text('profile_url'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  isActive: boolean('is_active').notNull().default(true),
  lastSync: timestamp('last_sync', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  unique('user_platform_accounts_user_platform_unique').on(table.userId, table.platform)
])

// ─── User Platform Games ─────────────────────────────────
// Jeu possédé par un user sur une plateforme donnée (via le platform account).
// `gameId` (optionnel) lie au catalogue IGDB quand un match est trouvé.
export const userPlatformGames = pgTable('user_platform_games', {
  id: text('id').primaryKey(),
  platformAccountId: text('platform_account_id').notNull().references(() => userPlatformAccounts.id, { onDelete: 'cascade' }),
  platformGameId: text('platform_game_id').notNull(),
  gameId: integer('game_id').references(() => games.id),
  name: text('name').notNull(),
  playtimeTotal: integer('playtime_total').notNull().default(0), // minutes
  playtimeRecent: integer('playtime_recent'), // minutes (2 dernières semaines)
  lastPlayed: timestamp('last_played', { withTimezone: true }),
  iconUrl: text('icon_url'),
  coverUrl: text('cover_url'),
  isInstalled: boolean('is_installed').notNull().default(false),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  unique('user_platform_games_account_game_unique').on(table.platformAccountId, table.platformGameId)
])

// ─── User Platform Achievements ──────────────────────────
// Succès / trophées obtenus (ou non) sur un jeu d'une plateforme.
export const userPlatformAchievements = pgTable('user_platform_achievements', {
  id: text('id').primaryKey(),
  platformGameId: text('platform_game_id').notNull().references(() => userPlatformGames.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  iconUrl: text('icon_url'),
  isUnlocked: boolean('is_unlocked').notNull().default(false),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }),
  earnedRate: real('earned_rate'),
  rarity: real('rarity'),
  points: integer('points'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  unique('user_platform_achievements_game_achievement_unique').on(table.platformGameId, table.achievementId)
])

// ─── Games ───────────────────────────────────────────────
export const games = pgTable('games', {
  id: integer('id').primaryKey(), // IGDB native ID
  name: text('name').notNull(),
  slug: text('slug'),
  coverUrl: text('cover_url'),
  summary: text('summary'),
  genres: jsonb('genres'),
  platforms: jsonb('platforms'),
  firstReleaseDate: integer('first_release_date'),
  igdbFetchedAt: timestamp('igdb_fetched_at', { withTimezone: true }).defaultNow()
})

// ─── User Favorited Games ────────────────────────────────
export const userFavoritedGames = pgTable('user_favorited_games', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  gameId: integer('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.gameId] })
])

// ─── Friendships ─────────────────────────────────────────
export const friendships = pgTable('friendships', {
  senderId: text('sender_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'rejected'
  notifDisabled: boolean('notif_disabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.senderId, table.receiverId] })
])

// ─── Communities ─────────────────────────────────────────
export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  gameId: integer('game_id').references(() => games.id),
  isPublic: boolean('is_public').default(true),
  inviteCode: text('invite_code').unique(),
  createdBy: text('created_by').references(() => user.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Community Members ───────────────────────────────────
export const communityMembers = pgTable('community_members', {
  communityId: text('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').default('member'), // 'member' | 'moderator' | 'admin'
  status: text('status').notNull().default('active'), // 'active' | 'invited' | 'declined'
  notifPreference: text('notif_preference').default('all'), // 'all' | 'friends_only' | 'none'
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.communityId, table.userId] })
])

// ─── Game Sessions ───────────────────────────────────────
export const gameSessions = pgTable('game_sessions', {
  id: text('id').primaryKey(),
  createdBy: text('created_by').notNull().references(() => user.id),
  gameId: integer('game_id').references(() => games.id),
  communityId: text('community_id').references(() => communities.id),
  visibility: text('visibility').notNull().default('friends'), // 'friends' | 'community' | 'public'
  status: text('status').notNull().default('active'), // 'active' | 'expired' | 'closed'
  maxPlayers: integer('max_players'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  discussion: text('discussion'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Game Session Participations ─────────────────────────
export const gameSessionParticipations = pgTable('game_session_participations', {
  sessionId: text('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.sessionId, table.userId] })
])

// ─── Events ──────────────────────────────────────────────
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  createdBy: text('created_by').notNull().references(() => user.id),
  communityId: text('community_id').references(() => communities.id),
  gameId: integer('game_id').references(() => games.id),
  title: text('title').notNull(),
  description: text('description'),
  visibility: text('visibility').notNull().default('friends'), // 'friends' | 'community' | 'public' | 'invite_only'
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  discussion: text('discussion'),
  sessionId: text('session_id').references(() => gameSessions.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Event Participations ────────────────────────────────
export const eventParticipations = pgTable('event_participations', {
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('invited'), // 'invited' | 'accepted' | 'declined' | 'maybe'
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.eventId, table.userId] })
])

// ─── Event Polls ─────────────────────────────────────────
export const eventPolls = pgTable('event_polls', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Event Poll Options ──────────────────────────────────
export const eventPollOptions = pgTable('event_poll_options', {
  id: text('id').primaryKey(),
  pollId: text('poll_id').notNull().references(() => eventPolls.id, { onDelete: 'cascade' }),
  label: text('label').notNull()
})

// ─── Event Poll Votes ────────────────────────────────────
export const eventPollVotes = pgTable('event_poll_votes', {
  optionId: text('option_id').notNull().references(() => eventPollOptions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
}, (table) => [
  primaryKey({ columns: [table.optionId, table.userId] })
])

// ─── Session Messages ────────────────────────────────────
export const sessionMessages = pgTable('session_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id),
  content: text('content').notNull(),
  type: text('type').notNull().default('message'), // 'message' | 'system'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Event Comments ──────────────────────────────────────
export const eventComments = pgTable('event_comments', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Push Subscriptions ──────────────────────────────────
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  subscription: jsonb('subscription').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Notifications ───────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'friend_request' | 'friend_accepted' | 'session_started' | 'event_created' | 'availability'
  payload: jsonb('payload'),
  read: boolean('read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})
