import { compare, hash } from "bcrypt-ts";
import { drizzle } from "drizzle-orm/d1";
import { users } from "../../../../configs/db/schema.auth";
import { eq, and } from "drizzle-orm";


export class AuthRepository {
    private db: ReturnType<typeof drizzle>;

    constructor(d1Database: D1Database) {
        this.db = drizzle(d1Database);
    }

    async register(email: string, password: string, name: string) {
        const id = crypto.randomUUID();
        const password_hash = await hash(password, 10);
        const [user] = await this.db
            .insert(users)
            .values({
                id,
                email,
                password: password_hash,
                isAdmin: 0,
                emailVerified: 0,
                profileName: name,
                profilePicture: '',
            })
            .returning();

        return user;
    }

    async login(email: string, password: string) {
        const [user] = await this.db.select().from(users).where(eq(users.email, email));

        if (!user || !(await compare(password, user.password))) {
            return null;
        }

        return user;
    }

    async getUserById(id: string) {
        const [user] = await this.db.select().from(users).where(eq(users.id, id));

        return user;
    }

    async upsertUser(data: {
        provider: string;
        provider_id: string;
        email: string;
        profileName: string;
        avatar_url?: string;
    }) {
        const { provider, provider_id, email, profileName, avatar_url } = data;

        const [user] = await this.db
            .select({ id: users.id })
            .from(users)
            .where(
                and(
                    eq(users.provider, provider),
                    eq(users.providerId, provider_id)
                )
            );

        if (user) return user.id;

        const [userResponse] = await this.db.insert(users).values({
            id: crypto.randomUUID(),
            email,
            password: '',
            isAdmin: 0,
            emailVerified: 0,
            provider,
            providerId: provider_id,
            profileName,
            avatarUrl: avatar_url,
        }).returning();

        return userResponse.id;
    }
}