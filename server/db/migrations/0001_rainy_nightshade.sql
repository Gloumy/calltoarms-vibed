ALTER TABLE "communities" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_invite_code_unique" UNIQUE("invite_code");