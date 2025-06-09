PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
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
INSERT INTO `__new_users`("id", "email", "password", "is_admin", "email_verified", "profile_name", "profile_picture", "provider", "provider_id", "avatar_url", "created_at") SELECT "id", "email", "password", "is_admin", "email_verified", "profile_name", "profile_picture", "provider", "provider_id", "avatar_url", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);