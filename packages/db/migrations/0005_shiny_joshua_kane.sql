CREATE TABLE IF NOT EXISTS "siwe_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonce" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "siwe_nonces_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
-- skills / user_skills were previously created by a non-journaled migration
-- (0001_add_skills.sql). They are folded into the tracked chain here with
-- IF NOT EXISTS so this is safe whether or not the orphan was applied.
CREATE TABLE IF NOT EXISTS "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"synonyms" jsonb DEFAULT '[]'::jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name"),
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"attestation_count" integer DEFAULT 0 NOT NULL,
	"last_attested_at" timestamp,
	"proficiency_level" text DEFAULT 'demonstrated' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN IF NOT EXISTS "required_skills" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_siwe_nonces_nonce" ON "siwe_nonces" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_slug" ON "skills" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_category" ON "skills" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_skills_unique" ON "user_skills" USING btree ("user_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_skills_user_id" ON "user_skills" USING btree ("user_id");