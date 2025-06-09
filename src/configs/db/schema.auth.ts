import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// === USER ===
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: integer("is_admin").default(0).notNull(),
  emailVerified: integer("email_verified").default(0).notNull(),
  profileName: text("profile_name"),
  profilePicture: text("profile_picture").default(""),
  provider: text("provider").default(""),
  providerId: text("provider_id").default(""),
  avatarUrl: text("avatar_url").default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// === SESSION ===
export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// === OAUTH CLIENT ===
export const oauthClients = sqliteTable("oauth_clients", {
  id: text("id").primaryKey(),
  clientId: text("client_id").unique().notNull(),
  clientSecret: text("client_secret").notNull(),
  name: text("name").notNull(),
  redirectUris: text("redirect_uris", { mode: "json" }).notNull(), // array as JSON
  userId: text("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const oauthClientsRelations = relations(oauthClients, ({ one }) => ({
  user: one(users, { fields: [oauthClients.userId], references: [users.id] }),
}));

// === OAUTH TOKEN ===
export const oauthTokens = sqliteTable("oauth_tokens", {
  id: text("id").primaryKey(),
  accessToken: text("access_token").unique().notNull(),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }).notNull(),
  refreshToken: text("refresh_token"),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  clientId: text("client_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const oauthTokensRelations = relations(oauthTokens, ({ one }) => ({
  user: one(users, { fields: [oauthTokens.userId], references: [users.id] }),
}));

// === OAUTH CODE ===
export const oauthCodes = sqliteTable("oauth_codes", {
  id: text("id").primaryKey(),
  code: text("code").unique().notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  redirectUri: text("redirect_uri").notNull(),
  scope: text("scope"),
  clientId: text("client_id").notNull(),
  userId: text("user_id").notNull(),
  nonce: text("nonce"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

export const oauthCodesRelations = relations(oauthCodes, ({ one }) => ({
  user: one(users, { fields: [oauthCodes.userId], references: [users.id] }),
}));

