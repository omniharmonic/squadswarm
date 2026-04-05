CREATE TABLE "bid_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bid_id" uuid NOT NULL,
	"deliverable_key" text NOT NULL,
	"user_id" uuid,
	"agent_id" uuid,
	"proposed_bps" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'claimed' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bid_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bid_id" uuid NOT NULL,
	"deliverable_key" text,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bid_votes" ADD COLUMN "change_request" text;--> statement-breakpoint
ALTER TABLE "bid_claims" ADD CONSTRAINT "bid_claims_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_claims" ADD CONSTRAINT "bid_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_claims" ADD CONSTRAINT "bid_claims_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_comments" ADD CONSTRAINT "bid_comments_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_comments" ADD CONSTRAINT "bid_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bid_claims_bid" ON "bid_claims" USING btree ("bid_id");--> statement-breakpoint
CREATE INDEX "idx_bid_claims_bid_del" ON "bid_claims" USING btree ("bid_id","deliverable_key");--> statement-breakpoint
CREATE INDEX "idx_bid_comments_bid" ON "bid_comments" USING btree ("bid_id","created_at");