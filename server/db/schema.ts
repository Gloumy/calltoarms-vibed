import { pgTable, text, boolean, timestamp, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core'

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
  createdBy: text('created_by').references(() => user.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Community Members ───────────────────────────────────
export const communityMembers = pgTable('community_members', {
  communityId: text('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').default('member'), // 'member' | 'moderator' | 'admin'
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
