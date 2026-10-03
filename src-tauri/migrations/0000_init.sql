CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`content_rating` text DEFAULT 'general' NOT NULL,
	`genre_tags` text DEFAULT '[]' NOT NULL,
	`art_style` text,
	`default_negative_prompt` text,
	`settings` text,
	`cover_image_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_name` ON `projects` (`name`);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`aliases` text DEFAULT '[]',
	`role` text,
	`bio` text,
	`age` text,
	`gender` text,
	`species` text,
	`anatomy` text,
	`locked_traits` text DEFAULT '[]',
	`variable_traits` text DEFAULT '[]',
	`base_prompt` text,
	`negative_prompt` text,
	`lora_tags` text DEFAULT '[]',
	`reference_images` text DEFAULT '[]',
	`color_hex` text,
	`graph_x` real,
	`graph_y` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_characters_project` ON `characters` (`project_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_character_project_name` ON `characters` (`project_id`,`name`);
--> statement-breakpoint
CREATE TABLE `world_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`parent_id` text,
	`type` text DEFAULT 'custom' NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`lore_text` text,
	`attributes` text,
	`prompt_fragment` text,
	`continuity_notes` text,
	`reference_images` text DEFAULT '[]',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_world_entities_project` ON `world_entities` (`project_id`,`type`);
--> statement-breakpoint
CREATE INDEX `idx_world_entities_parent` ON `world_entities` (`parent_id`);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`synopsis` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`order_index` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chapters_project` ON `chapters` (`project_id`,`order_index`);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`title` text DEFAULT 'Untitled Scene' NOT NULL,
	`order_index` real DEFAULT 0 NOT NULL,
	`mode` text DEFAULT 'simple' NOT NULL,
	`prose_content` text DEFAULT '' NOT NULL,
	`structured` text,
	`parsed_beats` text,
	`location_id` text,
	`time_of_day` text,
	`weather` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `world_entities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_scenes_chapter` ON `scenes` (`chapter_id`,`order_index`);
--> statement-breakpoint
CREATE INDEX `idx_scenes_location` ON `scenes` (`location_id`);
--> statement-breakpoint
CREATE TABLE `outfits` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'casual' NOT NULL,
	`description` text,
	`layers` text,
	`prompt_fragment` text,
	`thumbnail_path` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_outfits_character` ON `outfits` (`character_id`);
--> statement-breakpoint
CREATE TABLE `expressions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`character_id` text,
	`name` text NOT NULL,
	`category` text,
	`intensity` integer DEFAULT 50 NOT NULL,
	`prompt_fragment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_expressions_scope` ON `expressions` (`project_id`,`character_id`);
--> statement-breakpoint
CREATE TABLE `scene_characters` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`character_id` text NOT NULL,
	`outfit_id` text,
	`expression_id` text,
	`emotional_state` text,
	`pose` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`expression_id`) REFERENCES `expressions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_scene_character` ON `scene_characters` (`scene_id`,`character_id`);
--> statement-breakpoint
CREATE INDEX `idx_scene_characters_char` ON `scene_characters` (`character_id`);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`from_character_id` text NOT NULL,
	`to_character_id` text NOT NULL,
	`directed` integer DEFAULT true NOT NULL,
	`label` text,
	`vectors` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_relationships_project` ON `relationships` (`project_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_relationship_pair` ON `relationships` (`from_character_id`,`to_character_id`);
--> statement-breakpoint
CREATE TABLE `relationship_events` (
	`id` text PRIMARY KEY NOT NULL,
	`relationship_id` text NOT NULL,
	`chapter_id` text,
	`scene_id` text,
	`order_index` real DEFAULT 0 NOT NULL,
	`deltas` text,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`relationship_id`) REFERENCES `relationships`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_relationship_events_rel` ON `relationship_events` (`relationship_id`,`order_index`);
--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`in_world_time` text,
	`order_index` real DEFAULT 0 NOT NULL,
	`chapter_id` text,
	`scene_id` text,
	`affected_character_ids` text DEFAULT '[]',
	`affected_entity_ids` text DEFAULT '[]',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_timeline_project` ON `timeline_events` (`project_id`,`order_index`);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`scene_id` text,
	`page_number` real DEFAULT 0 NOT NULL,
	`canvas_size` text DEFAULT '{"width":1240,"height":1754,"dpi":150}' NOT NULL,
	`gutter` integer DEFAULT 16 NOT NULL,
	`reading_direction` text DEFAULT 'rtl' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_pages_chapter` ON `pages` (`chapter_id`,`page_number`);
--> statement-breakpoint
CREATE TABLE `panels` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`scene_id` text,
	`order_index` real DEFAULT 0 NOT NULL,
	`rect` text NOT NULL,
	`shape` text DEFAULT 'rect' NOT NULL,
	`clip_points` text,
	`camera_direction` text,
	`prompt_positive` text,
	`prompt_negative` text,
	`prompt_loras` text,
	`prompt_payload` text,
	`generated_image_path` text,
	`seed` integer,
	`status` text DEFAULT 'empty' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_panels_page` ON `panels` (`page_id`,`order_index`);
--> statement-breakpoint
CREATE INDEX `idx_panels_scene` ON `panels` (`scene_id`);
--> statement-breakpoint
CREATE TABLE `panel_layers` (
	`id` text PRIMARY KEY NOT NULL,
	`panel_id` text NOT NULL,
	`type` text NOT NULL,
	`z_index` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`content` text,
	`character_id` text,
	`konva` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`panel_id`) REFERENCES `panels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_panel_layers_panel` ON `panel_layers` (`panel_id`,`z_index`);
--> statement-breakpoint
CREATE TABLE `ai_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`label` text NOT NULL,
	`provider` text NOT NULL,
	`agent_role` text DEFAULT 'general' NOT NULL,
	`endpoint` text NOT NULL,
	`model` text,
	`params` text,
	`api_key_ref` text,
	`enabled` integer DEFAULT true NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_settings_scope` ON `ai_settings` (`project_id`,`agent_role`);
--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`template` text NOT NULL,
	`negative_template` text,
	`default_loras` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_prompt_templates_project` ON `prompt_templates` (`project_id`);
--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`agent_role` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`input` text,
	`output` text,
	`error` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_agent_runs_project` ON `agent_runs` (`project_id`,`status`);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`label` text,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_snapshots_entity` ON `snapshots` (`entity_type`,`entity_id`,`version`);
--> statement-breakpoint
CREATE INDEX `idx_snapshots_project` ON `snapshots` (`project_id`);
