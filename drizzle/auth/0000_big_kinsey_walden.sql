CREATE TABLE `oauth_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text NOT NULL,
	`name` text NOT NULL,
	`redirect_uris` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_clients_client_id_unique` ON `oauth_clients` (`client_id`);--> statement-breakpoint
CREATE TABLE `oauth_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL,
	`redirect_uri` text NOT NULL,
	`scope` text,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`nonce` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_codes_code_unique` ON `oauth_codes` (`code`);--> statement-breakpoint
CREATE TABLE `oauth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`access_token_expires_at` integer NOT NULL,
	`refresh_token` text,
	`refresh_token_expires_at` integer,
	`scope` text,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_tokens_access_token_unique` ON `oauth_tokens` (`access_token`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`is_admin` integer DEFAULT 0 NOT NULL,
	`email_verified` integer DEFAULT 0 NOT NULL,
	`profile_name` text,
	`profile_picture` text DEFAULT '',
	`provider` text DEFAULT '',
	`provider_id` text DEFAULT '',
	`avatar_url` text DEFAULT '',
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);