import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { sessions, users } from "../../../../configs/db/schema.auth";

export class UserRepository {
    private db: ReturnType<typeof drizzle>;
  
    constructor(d1Database: D1Database) {
      this.db = drizzle(d1Database);
    }
  

  async create(userData: {
    email: string;
    password: string;
    isAdmin?: boolean;
    emailVerified?: boolean;
    profile?: { name?: string; picture?: string };
  }) {
    const id = crypto.randomUUID();
    const [user] = await this.db
      .insert(users)
      .values({
        id,
        email: userData.email,
        password: userData.password,
        isAdmin: userData.isAdmin ? 1 : 0,
        emailVerified: userData.emailVerified ? 1 : 0,
        profileName: userData.profile?.name,
        profilePicture: userData.profile?.picture,
      })
      .returning();

    return user;
  }

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async findOne(filter: Partial<{ email: string; id: string }>) {
    let query = this.db.select().from(users);
    // @ts-ignore
    if (filter.email) query = query.where(eq(users.email, filter.email));
    // @ts-ignore
    if (filter.id) query = query.where(eq(users.id, filter.id));
    const [user] = await query;
    return user ?? null;
  }

  async update(id: string, updateData: Partial<typeof users.$inferInsert>) {
    const [user] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await this.db.delete(users).where(eq(users.id, id)).returning();
    return !!result;
  }

  async addSession(userId: string, session: { sessionToken: string; expiresAt: Date }) {
    const [res] = await this.db
      .insert(sessions)
      .values({
        sessionToken: session.sessionToken,
        userId,
        expiresAt: session.expiresAt,
      })
      .returning();
    return !!res;
  }

  async removeSession(sessionToken: string) {
    const result = await this.db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    return result;
  }

  async verifyEmail(userId: string) {
    const [res] = await this.db
      .update(users)
      .set({ emailVerified: 1 })
      .where(eq(users.id, userId))
      .returning();
    return !!res;
  }
}
