import { eq, asc, desc } from 'drizzle-orm';
import { Environment } from '../../../../bindings';
import { pages, todoItems, pageLinks, userPins, encryptedSecrets } from '../../../configs/db/schema.hasnotes';
import { drizzle } from 'drizzle-orm/d1';

export class PagesRepository {
    private db: ReturnType<typeof drizzle>;

    constructor(d1Database: D1Database) {
        this.db = drizzle(d1Database);
    }


    async findAll(userId: string, sortDirection: 'asc' | 'desc' = 'desc') {
        return await this.db
            .select()
            .from(pages)
            .where(eq(pages.userId, userId))
            .orderBy(sortDirection === "asc" ? asc(pages.createdAt) : desc(pages.createdAt));
    }

    async create(data: typeof pages.$inferInsert) {
        return await this.db.insert(pages).values(data).returning();
    }

    async findById(id: string) {
        const results = await this.db.select().from(pages).where(eq(pages.id, id));
        return results[0];
    }

    async update(id: string, data: Partial<typeof pages.$inferInsert>) {
        return await this.db.update(pages).set(data).where(eq(pages.id, id)).returning();
    }

    async delete(id: string) {
        return await this.db.delete(pages).where(eq(pages.id, id)).returning();
    }

    async findByUserId(userId: string) {
        return await this.db.select().from(pages).where(eq(pages.userId, userId));
    }
}

export class TodoItemsRepository {
    private db: ReturnType<typeof drizzle>;

    constructor(d1Database: D1Database) {
        this.db = drizzle(d1Database);
    }

    async create(data: typeof todoItems.$inferInsert) {
        return await this.db.insert(todoItems).values(data).returning();
    }

    async findById(id: string) {
        const results = await this.db.select().from(todoItems).where(eq(todoItems.id, id));
        return results[0];
    }

    async update(id: string, data: Partial<typeof todoItems.$inferInsert>) {
        return await this.db.update(todoItems).set(data).where(eq(todoItems.id, id)).returning();
    }

    async delete(id: string) {
        return await this.db.delete(todoItems).where(eq(todoItems.id, id)).returning();
    }

    async findByPageId(pageId: string) {
        return await this.db.select().from(todoItems).where(eq(todoItems.pageId, pageId));
    }
}

export class PageLinksRepository {
    private db: ReturnType<typeof drizzle>;

    constructor(d1Database: D1Database) {
        this.db = drizzle(d1Database);
    }

    async create(data: typeof pageLinks.$inferInsert) {
        return await this.db.insert(pageLinks).values(data).returning();
    }

    async findById(id: string) {
        const results = await this.db.select().from(pageLinks).where(eq(pageLinks.id, id));
        return results[0];
    }

    async delete(id: string) {
        return await this.db.delete(pageLinks).where(eq(pageLinks.id, id)).returning();
    }

    async findBySourcePageId(sourcePageId: string) {
        return await this.db.select().from(pageLinks).where(eq(pageLinks.sourcePageId, sourcePageId));
    }
}

export class UserPinsRepository {
    private db: ReturnType<typeof drizzle>;

    constructor(d1Database: D1Database) {
        this.db = drizzle(d1Database);
    }

    async create(data: typeof userPins.$inferInsert) {
        return await this.db.insert(userPins).values(data).returning();
    }

    async findByUserId(userId: string) {
        const results = await this.db.select().from(userPins).where(eq(userPins.userId, userId));
        return results[0];
    }

    async update(userId: string, data: Partial<typeof userPins.$inferInsert>) {
        return await this.db.update(userPins).set(data).where(eq(userPins.userId, userId)).returning();
    }

    async delete(userId: string) {
        return await this.db.delete(userPins).where(eq(userPins.userId, userId)).returning();
    }
}

export class EncryptedSecretsRepository {
    private db: ReturnType<typeof drizzle>;

    constructor(d1Database: D1Database) {
        this.db = drizzle(d1Database);
    }

    async create(data: typeof encryptedSecrets.$inferInsert) {
        return await this.db.insert(encryptedSecrets).values(data).returning();
    }

    async findById(id: string) {
        const results = await this.db.select().from(encryptedSecrets).where(eq(encryptedSecrets.id, id));
        return results[0];
    }

    async update(id: string, data: Partial<typeof encryptedSecrets.$inferInsert>) {
        return await this.db.update(encryptedSecrets).set(data).where(eq(encryptedSecrets.id, id)).returning();
    }

    async delete(id: string) {
        return await this.db.delete(encryptedSecrets).where(eq(encryptedSecrets.id, id)).returning();
    }

    async findByUserId(userId: string) {
        return await this.db.select().from(encryptedSecrets).where(eq(encryptedSecrets.userId, userId));
    }
}
