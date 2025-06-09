import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { oauthClients } from "../../../../configs/db/schema.auth";

export class OAuthClientRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(d1Database: D1Database) {
    this.db = drizzle(d1Database);
  }

  async create(clientData: {
    clientId: string;
    clientSecret: string;
    name: string;
    redirectUris: string[];
    userId: string;
  }) {
    const id = crypto.randomUUID();
    const [client] = await this.db
      .insert(oauthClients)
      .values({
        id,
        ...clientData,
      })
      .returning();
    return client;
  }

  async findById(id: string) {
    const [client] = await this.db.select().from(oauthClients).where(eq(oauthClients.id, id));
    return client ?? null;
  }

  async findByClientId(clientId: string) {
    const [client] = await this.db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId));
    return client ?? null;
  }
}
