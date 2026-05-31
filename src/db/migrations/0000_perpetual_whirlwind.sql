CREATE TABLE IF NOT EXISTS "backlinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_page_id" integer NOT NULL,
	"target_page_id" integer,
	"source_url" varchar(2048) NOT NULL,
	"target_url" varchar(2048) NOT NULL,
	"anchor_text" text,
	"rel_attributes" varchar(255),
	"is_external" varchar(10) DEFAULT 'internal' NOT NULL,
	"discovered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_log_id" integer NOT NULL,
	"page_id" integer,
	"position" integer NOT NULL,
	"url" text NOT NULL,
	"is_result_click" varchar(10) DEFAULT 'yes',
	"dwell_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crawl_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"url" varchar(2048) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"error_message" text,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar(2048) NOT NULL,
	"name" varchar(255) NOT NULL,
	"authority_score" double precision DEFAULT 1 NOT NULL,
	"crawl_rate" integer DEFAULT 1 NOT NULL,
	"is_blocklisted" boolean DEFAULT false NOT NULL,
	"blocklist_reason" text,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"last_crawled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domains_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"avatar_url" text,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"url" varchar(2048) NOT NULL,
	"title" text,
	"meta_description" text,
	"headings" text,
	"content" text,
	"word_count" integer DEFAULT 0,
	"content_hash" varchar(64),
	"http_status" integer,
	"content_type" varchar(100),
	"crawl_depth" integer DEFAULT 0,
	"crawled_at" timestamp,
	"last_indexed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pages_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"term" varchar(500) NOT NULL,
	"language" varchar(10) DEFAULT 'en',
	"frequency" integer DEFAULT 1 NOT NULL,
	"result_count" integer DEFAULT 0,
	"is_trending" varchar(10) DEFAULT 'no',
	"last_searched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "search_terms_term_unique" UNIQUE("term")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" varchar(255),
	"query" text NOT NULL,
	"filters" text,
	"results_count" integer DEFAULT 0,
	"response_time_ms" integer DEFAULT 0,
	"page" integer DEFAULT 1,
	"is_success" varchar(10) DEFAULT 'yes',
	"error_message" text,
	"user_agent" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"keyword" varchar(500) NOT NULL,
	"relevance_score" double precision DEFAULT 0,
	"content_quality_score" double precision DEFAULT 0,
	"freshness_score" double precision DEFAULT 0,
	"backlink_score" double precision DEFAULT 0,
	"engagement_score" double precision DEFAULT 0,
	"domain_authority_score" double precision DEFAULT 0,
	"overall_score" double precision DEFAULT 0,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"category" varchar(100) DEFAULT 'general',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"query" text NOT NULL,
	"filters" text,
	"clicked_result_id" integer,
	"clicked_url" varchar(2048),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"query" text NOT NULL,
	"filters" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"theme" text DEFAULT 'system',
	"results_per_page" integer DEFAULT 10,
	"default_sort" text DEFAULT 'relevance',
	"safe_search" text DEFAULT 'moderate',
	"open_in_new_tab" text DEFAULT 'yes',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backlinks" ADD CONSTRAINT "backlinks_source_page_id_pages_id_fk" FOREIGN KEY ("source_page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backlinks" ADD CONSTRAINT "backlinks_target_page_id_pages_id_fk" FOREIGN KEY ("target_page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clicks" ADD CONSTRAINT "clicks_search_log_id_search_logs_id_fk" FOREIGN KEY ("search_log_id") REFERENCES "public"."search_logs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clicks" ADD CONSTRAINT "clicks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_queue" ADD CONSTRAINT "crawl_queue_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pages" ADD CONSTRAINT "pages_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rankings" ADD CONSTRAINT "rankings_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search_history" ADD CONSTRAINT "search_history_clicked_result_id_pages_id_fk" FOREIGN KEY ("clicked_result_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bl_source_idx" ON "backlinks" USING btree ("source_page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bl_target_idx" ON "backlinks" USING btree ("target_page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bl_target_url_idx" ON "backlinks" USING btree ("target_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cl_search_log_idx" ON "clicks" USING btree ("search_log_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cl_page_idx" ON "clicks" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "queue_url_idx" ON "crawl_queue" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "queue_status_idx" ON "crawl_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "queue_domain_idx" ON "crawl_queue" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "queue_priority_idx" ON "crawl_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_domain_idx" ON "pages" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_url_idx" ON "pages" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_content_hash_idx" ON "pages" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_title_search_idx" ON "pages" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "st_term_idx" ON "search_terms" USING btree ("term");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "st_frequency_idx" ON "search_terms" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sl_query_idx" ON "search_logs" USING btree ("query");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sl_created_at_idx" ON "search_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sl_user_id_idx" ON "search_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rk_keyword_idx" ON "rankings" USING btree ("keyword");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rk_page_idx" ON "rankings" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rk_overall_score_idx" ON "rankings" USING btree ("overall_score");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rk_page_keyword_unique" ON "rankings" USING btree ("page_id","keyword");