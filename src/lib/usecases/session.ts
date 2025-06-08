import { decode, sign, verify } from 'hono/jwt'
import { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { UserRepository } from '../repositories/oauth/user';

export async function createSession(c: Context, userId: string) {
    const secret = c.env.JWT_SECRET;
    const payload = {
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 60 * 5, // Token expires in 5 minutes
    }
    const token = await sign(payload, secret);

    setCookie(c, 'session_token', token, {
        httpOnly: true,
        secure: c.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: 'Lax',
        path: '/',
    });

    return token;
}

export async function getSession(c: Context) {
    // Try reading from cookie first
    let token = getCookie(c, 'session_token');

    // Try reading from Authorization header if no cookie
    if (!token) {
        const authHeader = c.req.header('authorization') || '';
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
    }

    if (!token) return null;

    try {
        const userRepo = new UserRepository(c.env.DB);
        const decoded = await verify(token, c.env.JWT_SECRET);
        console.log("LOG: Decoded", decoded);

        const user = await userRepo.findById(decoded.sub as string);
        if (!user) return null;

        return {
            user: {
                id: user.id,
                email: user.email,
                isAdmin: user.isAdmin,
                name: user.profileName
            }
        };
    } catch (error) {
        console.error('Session verification failed:', error);
        return null;
    }
}

export async function deleteSession(c: Context) {
    deleteCookie(c, 'session_token');
}

export const verifyToken = async (c: Context, token: string) =>
    verify(token, c.env.JWT_SECRET);

// Optional: Create a middleware for session management
export const sessionMiddleware = async (c: Context, next: () => Promise<void>) => {
    const session = await getSession(c);
    c.set('session', session);
    await next();
};

// Optional: Create a middleware that requires authentication
export const requireAuth = async (c: Context, next: () => Promise<void>) => {
    const session = await getSession(c);
    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('session', session);
    c.set('user', session.user);
    await next();
};

// Optional: Create a middleware that requires admin role
export const requireAdmin = async (c: Context, next: () => Promise<void>) => {
    const session = await getSession(c);
    if (!session || !session.user.isAdmin) {
        return c.json({ error: 'Forbidden' }, 403);
    }
    c.set('session', session);
    c.set('user', session.user);
    await next();
};