CREATE TABLE IF NOT EXISTS "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar(2048) NOT NULL,
	"alt_text" text,
	"caption" text,
	"page_title" text,
	"page_url" varchar(2048),
	"context_content" text,
	"width" integer,
	"height" integer,
	"file_size" integer,
	"mime_type" varchar(50),
	"dominant_color" varchar(20),
	"content_hash" varchar(64),
	"is_indexed" boolean DEFAULT false,
	"indexed_at" timestamp,
	"search_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "images_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar(2048) NOT NULL,
	"headline" text NOT NULL,
	"description" text,
	"body" text,
	"author" varchar(500),
	"publisher_id" integer,
	"publish_date" timestamp,
	"updated_date" timestamp,
	"featured_image" text,
	"category" varchar(100),
	"source" varchar(500),
	"content_hash" varchar(64),
	"is_indexed" boolean DEFAULT false,
	"indexed_at" timestamp,
	"view_count" integer DEFAULT 0,
	"search_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "news_articles_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_publishers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(2048) NOT NULL,
	"logo_url" text,
	"domain_url" varchar(2048),
	"is_approved" boolean DEFAULT false,
	"is_banned" boolean DEFAULT false,
	"ban_reason" text,
	"total_articles" integer DEFAULT 0,
	"total_views" integer DEFAULT 0,
	"last_article_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "news_publishers_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar(2048) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"duration" integer,
	"channel_name" varchar(500),
	"channel_url" varchar(2048),
	"publish_date" timestamp,
	"view_count" integer DEFAULT 0,
	"tags" text,
	"source" varchar(100),
	"embed_url" text,
	"quality" varchar(20),
	"content_hash" varchar(64),
	"is_indexed" boolean DEFAULT false,
	"indexed_at" timestamp,
	"search_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "videos_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_intelligence" (
	"id" serial PRIMARY KEY NOT NULL,
	"term" varchar(500) NOT NULL,
	"type" varchar(50) DEFAULT 'trending' NOT NULL,
	"frequency" integer DEFAULT 1,
	"score" double precision DEFAULT 0,
	"period" varchar(20),
	"expires_at" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_publisher_id_news_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."news_publishers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_page_url_idx" ON "images" USING btree ("page_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_mime_type_idx" ON "images" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_color_idx" ON "images" USING btree ("dominant_color");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_width_idx" ON "images" USING btree ("width");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_height_idx" ON "images" USING btree ("height");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_url_idx" ON "images" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_headline_idx" ON "news_articles" USING btree ("headline");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_category_idx" ON "news_articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_publisher_idx" ON "news_articles" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_publish_date_idx" ON "news_articles" USING btree ("publish_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "news_url_idx" ON "news_articles" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_content_hash_idx" ON "news_articles" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "publisher_url_idx" ON "news_publishers" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "publisher_name_idx" ON "news_publishers" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_title_idx" ON "videos" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_channel_idx" ON "videos" USING btree ("channel_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_publish_date_idx" ON "videos" USING btree ("publish_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_duration_idx" ON "videos" USING btree ("duration");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_quality_idx" ON "videos" USING btree ("quality");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_url_idx" ON "videos" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "si_term_type_idx" ON "search_intelligence" USING btree ("term","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "si_type_idx" ON "search_intelligence" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "si_score_idx" ON "search_intelligence" USING btree ("score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "si_period_idx" ON "search_intelligence" USING btree ("period");