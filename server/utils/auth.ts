import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '../db/schema'

// Wrap betterAuth() in a typed factory so `ReturnType<typeof initAuth>` keeps
// the literal config (notably `additionalFields.username`) instead of widening
// to the generic `ReturnType<typeof betterAuth>` — that's what was hiding the
// `username` field on `session.user` everywhere.
function initAuth() {
  const config = useRuntimeConfig()
  const db = useDB()
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema
    }),
    secret: config.betterAuthSecret,
    baseURL: config.baseUrl,
    basePath: '/api/auth',
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60
      }
    },
    user: {
      additionalFields: {
        username: {
          type: 'string',
          required: true,
          unique: true
        }
      }
    }
  })
}

let _auth: ReturnType<typeof initAuth> | undefined

export function useServerAuth() {
  if (!_auth) _auth = initAuth()
  return _auth
}

export type Session = ReturnType<typeof initAuth>['$Infer']['Session']
