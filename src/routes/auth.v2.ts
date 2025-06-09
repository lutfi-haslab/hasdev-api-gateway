import { compare, hash } from 'bcrypt-ts';
import { Context, Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { JWTPayload } from 'hono/utils/jwt/types';
import { Environment } from '../../bindings';
import { users } from '../db/schema';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { setCookie, getCookie } from 'hono/cookie';

export const authV2 = new Hono<Environment>();

async function issueJwt(payload: JWTPayload, secret: string) {
    return await sign(payload, secret);
}

// Password Register
authV2.post('/register', async (c: Context) => {
    const db = drizzle(c.env.DB);
    const { email, password, name } = await c.req.json();
    const password_hash = await hash(password, 10);
    const id = crypto.randomUUID();

    try {
        const [user] = await db
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


        const jwt = await issueJwt({ sub: user.id }, c.env.JWT_SECRET);
        return c.json({ token: jwt });
    } catch (e) {
        console.log("[LOG] e", e);
        return c.json({ error: 'Email already registered' }, 400);
    }

});

// Password Login
authV2.post('/login', async (c: Context) => {
    const db = drizzle(c.env.DB);
    const { email, password } = await c.req.json();
    const redirect = c.req.query('redirect');

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || !(await compare(password, user.password))) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    const jwt = await issueJwt({ sub: user.id }, c.env.JWT_SECRET);

    setCookie(c, "token", jwt, { httpOnly: true }); // Secure auth cookie
    setCookie(c, "client-token", jwt, { path: "/" }); // Accessible via JS

    if (redirect) {
        return c.redirect(redirect);
    }

    return c.json({ token: jwt });
});

authV2.get('/profile', async (c: Context) => {
    const db = drizzle(c.env.DB);
    const token = getCookie(c, "token") || c.req.header('authorization')?.replace('Bearer ', '');
    if (!token) return c.json({ error: 'Unauthorized' }, 401);
    const payload = await verify(token, c.env.JWT_SECRET);
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub as string));
    return c.json({ user });
});

// Google OAuth Start
authV2.get('/google', (c: Context) => {
    const redirect = c.req.query('redirect');
    const q = new URLSearchParams({
        client_id: c.env.GOOGLE_CLIENT_ID,
        redirect_uri: c.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        ...(redirect && { state: encodeURIComponent(redirect) }),
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
});

// Google OAuth Callback
authV2.get('/google/callback', async (c: Context) => {
    const code = c.req.query('code') as string;
    const redirect = c.req.query('state') ? decodeURIComponent(c.req.query('state')!) : null;

    const tokenRes = await fetch(`https://oauth2.googleapis.com/token`, {
        method: 'POST',
        body: new URLSearchParams({
            code,
            client_id: c.env.GOOGLE_CLIENT_ID,
            client_secret: c.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: c.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenRes.ok) return c.json({ error: 'Token exchange failed' }, 401);
    const { access_token }: {
        access_token: string;
    } = await tokenRes.json();

    const profile: {
        sub: string;
        email: string;
        name: string;
        picture: string;
    } = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
    }).then(r => r.json());

    const userId = await upsertUser(c, {
        provider: 'google',
        provider_id: profile.sub,
        email: profile.email,
        profileName: profile.name,
        avatar_url: profile.picture,
    });

    const jwt = await issueJwt({ sub: userId }, c.env.JWT_SECRET);

    setCookie(c, "token", jwt, { httpOnly: true }); // Secure auth cookie
    setCookie(c, "client-token", jwt, { path: "/" }); // Accessible via JS

    if (redirect) {
        return c.redirect(redirect);
    }

    return c.json({
        token: jwt, user: {
            name: profile.name,
            email: profile.email,
            avatar_url: profile.picture,
        }
    });
});

// GitHub OAuth Start
authV2.get('/github', (c: Context) => {
    const q = new URLSearchParams({
        client_id: c.env.GITHUB_CLIENT_ID,
        redirect_uri: c.env.GITHUB_REDIRECT_URI,
        scope: 'read:user user:email',
    });
    return c.redirect(`https://github.com/login/oauth/authorize?${q}`);
});

// GitHub OAuth Callback
authV2.get('/github/callback', async (c: Context) => {
    const code = c.req.query('code') as string;

    const tokenRes = await fetch(`https://github.com/login/oauth/access_token`, {
        method: 'POST',
        body: new URLSearchParams({
            code,
            client_id: c.env.GITHUB_CLIENT_ID,
            client_secret: c.env.GITHUB_CLIENT_SECRET,
            redirect_uri: c.env.GITHUB_REDIRECT_URI,
        }),
        headers: { Accept: 'application/json' },
    });

    const { access_token }: {
        access_token: string;
    } = await tokenRes.json();
    if (!access_token) return c.json({ error: 'GitHub token exchange failed' }, 401);

    const profile: {
        id: number;
        login: string;
        name: string;
        avatar_url: string;
    } = await fetch(`https://api.github.com/user`, {
        headers: { Authorization: `Bearer ${access_token}` },
    }).then(r => r.json());

    const emails: {
        email: string;
        primary: boolean;
        verified: boolean;
    }[] = await fetch(`https://api.github.com/user/emails`, {
        headers: { Authorization: `Bearer ${access_token}` },
    }).then(r => r.json());

    const primaryEmail = emails.find((e: any) => e.primary)?.email;

    const userId = await upsertUser(c, {
        provider: 'github',
        provider_id: profile.id.toString(),
        email: primaryEmail ?? '',
        profileName: profile.name ?? profile.login,
        avatar_url: profile.avatar_url,
    });

    const jwt = await issueJwt({ sub: userId }, c.env.JWT_SECRET);
    return c.json({ token: jwt });
});

// Upsert helper for Google/GitHub
async function upsertUser(c: Context, data: {
    provider: string;
    provider_id: string;
    email: string;
    profileName: string;
    avatar_url?: string;
}) {
    const db = drizzle(c.env.DB);
    const { provider, provider_id, email, profileName, avatar_url } = data;

    const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.provider, provider),
                eq(users.providerId, provider_id)
            )
        );

    if (user) return user.id;

    const [userResponse] = await db.insert(users).values({
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
