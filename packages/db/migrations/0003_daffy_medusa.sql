CREATE TABLE "agent_action_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"action_payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bid_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bid_id" uuid NOT NULL,
	"deliverable_key" text NOT NULL,
	"user_id" uuid,
	"agent_id" uuid,
	"role_title" text,
	"payment_share_bps" integer NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bid_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bid_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote" text NOT NULL,
	"comment" text,
	"voted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "wallet_address" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "payment_mode" text DEFAULT 'owner';--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "autonomy_level" text DEFAULT 'supervised';--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "treasury_share_bps" integer DEFAULT 2000;--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "governance_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "submitted_by_id" uuid;--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "ratified_at" timestamp;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "payment_splitter_address" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "deliverable_weights" jsonb;--> statement-breakpoint
ALTER TABLE "agent_action_queue" ADD CONSTRAINT "agent_action_queue_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_action_queue" ADD CONSTRAINT "agent_action_queue_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_action_queue" ADD CONSTRAINT "agent_action_queue_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_assignments" ADD CONSTRAINT "bid_assignments_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_assignments" ADD CONSTRAINT "bid_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_assignments" ADD CONSTRAINT "bid_assignments_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_votes" ADD CONSTRAINT "bid_votes_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bid_votes" ADD CONSTRAINT "bid_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_queue_contract_status" ON "agent_action_queue" USING btree ("contract_id","status");--> statement-breakpoint
CREATE INDEX "idx_agent_queue_agent" ON "agent_action_queue" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_bid_assignments_bid" ON "bid_assignments" USING btree ("bid_id");--> statement-breakpoint
CREATE INDEX "idx_bid_votes_bid" ON "bid_votes" USING btree ("bid_id");--> statement-breakpoint
CREATE INDEX "idx_bid_votes_user_bid" ON "bid_votes" USING btree ("user_id","bid_id");--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;