import { pgTable, uuid, text, boolean, timestamp, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core'

// ─── Users ───────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  avatarUrl: text('avatar_url'),
  language: text('language').default('fr'),
  availableUntil: timestamp('available_until', { withTimezone: true }),
  availableGameId: integer('available_game_id').references(() => games.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  // password_hash and other better-auth fields are managed by better-auth
})

// ─── User Battle Tags ────────────────────────────────────
export const userBattleTags = pgTable('user_battle_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: integer('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.gameId] })
])

// ─── Friendships ─────────────────────────────────────────
export const friendships = pgTable('friendships', {
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: uuid('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'rejected'
  notifDisabled: boolean('notif_disabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.senderId, table.receiverId] })
])

// ─── Communities ─────────────────────────────────────────
export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  gameId: integer('game_id').references(() => games.id),
  isPublic: boolean('is_public').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Community Members ───────────────────────────────────
export const communityMembers = pgTable('community_members', {
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('member'), // 'member' | 'moderator' | 'admin'
  notifPreference: text('notif_preference').default('all'), // 'all' | 'friends_only' | 'none'
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.communityId, table.userId] })
])

// ─── Game Sessions ───────────────────────────────────────
export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  gameId: integer('game_id').references(() => games.id),
  communityId: uuid('community_id').references(() => communities.id),
  visibility: text('visibility').notNull().default('friends'), // 'friends' | 'community' | 'public'
  status: text('status').notNull().default('active'), // 'active' | 'expired' | 'closed'
  maxPlayers: integer('max_players'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  discussion: text('discussion'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Game Session Participations ─────────────────────────
export const gameSessionParticipations = pgTable('game_session_participations', {
  sessionId: uuid('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.sessionId, table.userId] })
])

// ─── Events ──────────────────────────────────────────────
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  communityId: uuid('community_id').references(() => communities.id),
  gameId: integer('game_id').references(() => games.id),
  title: text('title').notNull(),
  description: text('description'),
  visibility: text('visibility').notNull().default('friends'), // 'friends' | 'community' | 'public' | 'invite_only'
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  discussion: text('discussion'),
  sessionId: uuid('session_id').references(() => gameSessions.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Event Participations ────────────────────────────────
export const eventParticipations = pgTable('event_participations', {
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('invited'), // 'invited' | 'accepted' | 'declined'
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => [
  primaryKey({ columns: [table.eventId, table.userId] })
])

// ─── Event Polls ─────────────────────────────────────────
export const eventPolls = pgTable('event_polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Event Poll Options ──────────────────────────────────
export const eventPollOptions = pgTable('event_poll_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  pollId: uuid('poll_id').notNull().references(() => eventPolls.id, { onDelete: 'cascade' }),
  label: text('label').notNull()
})

// ─── Event Poll Votes ────────────────────────────────────
export const eventPollVotes = pgTable('event_poll_votes', {
  optionId: uuid('option_id').notNull().references(() => eventPollOptions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' })
}, (table) => [
  primaryKey({ columns: [table.optionId, table.userId] })
])

// ─── Event Comments ──────────────────────────────────────
export const eventComments = pgTable('event_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Push Subscriptions ──────────────────────────────────
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subscription: jsonb('subscription').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// ─── Notifications ───────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'friend_request' | 'friend_accepted' | 'session_started' | 'event_created' | 'availability'
  payload: jsonb('payload'),
  read: boolean('read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})
