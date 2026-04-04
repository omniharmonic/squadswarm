ALTER TABLE "contracts" ADD COLUMN "collaboration_links" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "project_context" text;