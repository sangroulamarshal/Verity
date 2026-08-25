-- Supabase Auth now owns credentials, sessions, Google OAuth, and email
-- verification — this app's own `sessions` table and `users.password_hash`
-- are no longer used.
--
-- BREAKING: Supabase Auth cannot import existing argon2 password hashes
-- (it manages its own credential storage), so there is no automatic path
-- to migrate existing accounts. This clears the users table so every
-- account is re-created through Supabase Auth on next sign-up/sign-in.
-- If you have real user data you need to preserve, back it up and plan a
-- manual re-provisioning step (create each user in Supabase Auth via the
-- admin API, then re-insert the row here with the resulting
-- supabase_user_id) before running this migration — do not run it as-is
-- against a database with accounts you care about.
DELETE FROM "users";
--> statement-breakpoint
DROP TABLE "sessions";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "supabase_user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_supabase_user_id_unique" UNIQUE("supabase_user_id");
