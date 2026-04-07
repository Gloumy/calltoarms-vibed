import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '../db/schema'

let _auth: ReturnType<typeof betterAuth> | null = null

export function useServerAuth() {
  if (!_auth) {
    const config = useRuntimeConfig()
    const db = useDB()

    _auth = betterAuth({
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
  return _auth
}

export type Session = ReturnType<typeof useServerAuth>['$Infer']['Session']
