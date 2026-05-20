import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const pages = sqliteTable('pages', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content', { mode: 'json' }).default('{}'),
    type: text('type', { enum: ['note', 'todo'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    parentId: text('parent_id').references((): ReturnType<typeof text> => pages.id).default(""),
    isPinned: integer('is_pinned', { mode: 'boolean' }).default(false),
    userId: text('user_id').notNull()
});

export const todoItems = sqliteTable('todo_items', {
    id: text('id').primaryKey(),
    text: text('text').notNull(),
    content: text('content', { mode: 'json' }).default('{}'),
    completed: integer('completed', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    pageId: text('page_id').references(() => pages.id).notNull()
});

export const pageLinks = sqliteTable('page_links', {
    id: text('id').primaryKey(),
    sourcePageId: text('source_page_id').references(() => pages.id).notNull(),
    targetPageId: text('target_page_id').references(() => pages.id).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});

export const userPins = sqliteTable('user_pins', {
    id: text('id').primaryKey(),
    userId: text('user_id').unique(),
    pinHash: text('pin_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});

export const encryptedSecrets = sqliteTable('encrypted_secrets', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    encryptedData: text('encrypted_data').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});