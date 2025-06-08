
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { oauthCodes } from "../../../db/schema";

export class OAuthCodeRepository {
    private db: ReturnType<typeof drizzle>;
  
    constructor(d1Database: D1Database) {
      this.db = drizzle(d1Database);
    }
  
  async create(codeData: {
    code: string;
    expiresAt: Date;
    redirectUri: string;
    scope?: string;
    clientId: string;
    userId: string;
    nonce?: string;
  }) {
    const id = crypto.randomUUID();
    const [code] = await this.db
      .insert(oauthCodes)
      .values({
        id,
        ...codeData,
      })
      .returning();
    return code;
  }

  async findById(id: string) {
    const [code] = await this.db.select().from(oauthCodes).where(eq(oauthCodes.id, id));
    return code ?? null;
  }

  async findByCode(code: string) {
    const [result] = await this.db.select().from(oauthCodes).where(eq(oauthCodes.code, code));
    return result ?? null;
  }

  async deleteOne(code: string) {
    await this.db.delete(oauthCodes).where(eq(oauthCodes.code, code));
  }
}
