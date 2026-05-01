CREATE TABLE "user_platform_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"platform_id" text NOT NULL,
	"username" text,
	"display_name" text,
	"avatar_url" text,
	"profile_url" text,
	"access_token" text,
	"refresh_token" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_platform_accounts_user_platform_unique" UNIQUE("user_id","platform")
);
--> statement-breakpoint
CREATE TABLE "user_platform_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"platform_game_id" text NOT NULL,
	"achievement_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"is_unlocked" boolean DEFAULT false NOT NULL,
	"unlocked_at" timestamp with time zone,
	"earned_rate" real,
	"rarity" real,
	"points" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_platform_achievements_game_achievement_unique" UNIQUE("platform_game_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_platform_games" (
	"id" text PRIMARY KEY NOT NULL,
	"platform_account_id" text NOT NULL,
	"platform_game_id" text NOT NULL,
	"game_id" integer,
	"name" text NOT NULL,
	"playtime_total" integer DEFAULT 0 NOT NULL,
	"playtime_recent" integer,
	"last_played" timestamp with time zone,
	"icon_url" text,
	"cover_url" text,
	"is_installed" boolean DEFAULT false NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_platform_games_account_game_unique" UNIQUE("platform_account_id","platform_game_id")
);
--> statement-breakpoint
ALTER TABLE "user_platform_accounts" ADD CONSTRAINT "user_platform_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_platform_achievements" ADD CONSTRAINT "user_platform_achievements_platform_game_id_user_platform_games_id_fk" FOREIGN KEY ("platform_game_id") REFERENCES "public"."user_platform_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_platform_games" ADD CONSTRAINT "user_platform_games_platform_account_id_user_platform_accounts_id_fk" FOREIGN KEY ("platform_account_id") REFERENCES "public"."user_platform_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_platform_games" ADD CONSTRAINT "user_platform_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;