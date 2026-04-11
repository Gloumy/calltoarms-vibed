# Call to Arms

Application web permettant de notifier et inviter des amis pour lancer des sessions de jeu.

## Stack

- **Framework**: Nuxt 4 (app/ directory structure)
- **UI**: Nuxt UI v4 + Tailwind CSS v4
- **DB**: PostgreSQL + Drizzle ORM
- **Auth**: better-auth (toujours accéder via le composable `useAuth()`, jamais directement)
- **Realtime**: Nitro WebSocket + PostgreSQL LISTEN/NOTIFY
- **Notifications**: Web Push API avec VAPID (auto-hébergé)
- **PWA**: @vite-pwa/nuxt
- **Données jeux**: API IGDB (Twitch)
- **Package manager**: pnpm

## Commandes

```bash
pnpm dev          # serveur de dev
pnpm build        # build production
pnpm lint         # eslint
pnpm typecheck    # vérification types
pnpm drizzle-kit generate   # générer migrations
pnpm drizzle-kit migrate    # appliquer migrations
```

## Structure du projet

```
calltoarms/
├── app/                    # Code frontend (Nuxt 4 app/ dir)
│   ├── assets/css/         # Tailwind + custom CSS
│   ├── components/         # Composants Vue (auto-importés)
│   │   ├── game/
│   │   ├── session/
│   │   ├── event/
│   │   ├── community/
│   │   ├── friend/
│   │   └── layout/         # SidebarLeft, SidebarRight
│   ├── composables/        # useAuth, useGameSearch, usePushNotifications, useWebSocket
│   ├── layouts/            # default.vue (connecté), auth.vue (non connecté)
│   ├── middleware/          # auth.ts
│   └── pages/              # Routes: /, /games, /events, /communities, /profile, /auth/*
├── server/
│   ├── api/                # Endpoints Nitro (auto-routés)
│   ├── db/
│   │   ├── schema.ts       # Schéma Drizzle complet (15 tables)
│   │   └── migrations/
│   ├── plugins/            # db-listener.ts (LISTEN/NOTIFY)
│   ├── routes/             # _ws.ts (WebSocket handler)
│   └── utils/              # db.ts, igdb.ts, push.ts, broadcast.ts
├── scripts/                # seed-games.ts
├── nuxt.config.ts
├── drizzle.config.ts
└── .env
```

## Conventions

- **SSR**: désactivé (`ssr: false`), app fonctionne en mode SPA
- **Auth**: ne jamais appeler better-auth directement, toujours passer par `useAuth()`
- **Auth serveur**: utiliser `useServerAuth()` (lazy-init) et `useDB()` (lazy-init) — jamais d'init eagre dans server/utils
- **Better-auth tables**: `user` (singulier), `session`, `account`, `verification` — IDs en `text`, pas uuid
- **PWA**: module chargé uniquement en production
- **Couleur accent**: violet `#534AB7` (primary dans app.config.ts)
- **Langue**: interface en français
- **TypeScript**: v5.x obligatoire (Nuxt UI incompatible avec v6)
- **Layout connecté**: sidebar gauche (200px) + contenu central + sidebar droite (210px, amis)
- **Layout auth**: centré, sans sidebars
- **Composants Nuxt UI**: préfixés `U` (UButton, UCard, UAvatar, UIcon, etc.)
- **Composants auto-import**: `pathPrefix: false` — pas de préfixe de dossier (ex: `FriendRow` et non `FriendFriendRow`)
- **Icons**: collections `lucide` et `simple-icons` via Iconify (`i-lucide-*`, `i-simple-icons-*`)

## DB Schema (tables principales)

user (better-auth), session (better-auth), account (better-auth), verification (better-auth), user_battle_tags, games, user_favorited_games, friendships, communities, community_members, game_sessions, game_session_participations, events, event_participations, event_polls, event_poll_options, event_poll_votes, event_comments, push_subscriptions, notifications

## Variables d'environnement

Voir `.env.example` pour la liste complète. `DATABASE_URL`, `BETTER_AUTH_SECRET` et `BASE_URL` sont nécessaires pour le dev.

## Plan d'implémentation

- [x] Phase 1 — Setup (Nuxt 4, Drizzle, PWA, structure)
- [x] Phase 2 — Auth (better-auth, login/register, middleware)
- [x] Phase 3 — Schéma DB (triggers LISTEN/NOTIFY, seed IGDB, WebSocket handler, broadcast)
- [x] Phase 4 — Amis (demandes, liste, statuts, sidebar realtime)
- [x] Phase 5 — Notifications push (VAPID, service worker, subscriptions)
- [x] Phase 6 — Sessions (création, rejoindre, expiration, feed, disponibilité, recherche jeux)
- [x] Phase 7 — Jeux (page jeux, grille, favoris, recherche IGDB)
- [x] Phase 8 — Événements (CRUD, participation, sondages, commentaires)
- [x] Phase 9 — Communautés (CRUD, membres, préférences notif)
- [x] Phase 10 — Profil & Admin
