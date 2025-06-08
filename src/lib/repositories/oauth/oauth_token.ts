import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { oauthTokens } from "../../../db/schema";

export class OAuthTokenRepository {
    private db: ReturnType<typeof drizzle>;
  
    constructor(d1Database: D1Database) {
      this.db = drizzle(d1Database);
    }
  
    
  async create(tokenData: {
    accessToken: string;
    accessTokenExpiresAt: Date;
    refreshToken?: string;
    refreshTokenExpiresAt?: Date;
    scope?: string;
    clientId: string;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    const [token] = await this.db.insert(oauthTokens).values({
      id,
      ...tokenData,
    }).returning();
    return token;
  }

  async findById(id: string) {
    const [token] = await this.db.select().from(oauthTokens).where(eq(oauthTokens.id, id));
    return token ?? null;
  }

  async findByAccessToken(accessToken: string) {
    const [token] = await this.db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.accessToken, accessToken));
    return token ?? null;
  }

  async findByRefreshToken(refreshToken: string) {
    const [token] = await this.db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.refreshToken, refreshToken));
    return token ?? null;
  }

  async findOne({ accessToken }: { accessToken: string }) {
    return this.findByAccessToken(accessToken);
  }
}
