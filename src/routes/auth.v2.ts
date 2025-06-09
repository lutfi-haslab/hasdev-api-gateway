import { describeRoute } from 'hono-openapi';
import { compare, hash } from 'bcrypt-ts';
import { Context, Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { JWTPayload } from 'hono/utils/jwt/types';
import { Environment } from '../../bindings';
import { users } from '../configs/db/schema.auth';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { setCookie, getCookie } from 'hono/cookie';
import { AuthRepository } from '../lib/repositories/v2/auth';

export const authV2 = new Hono<Environment>();

async function issueJwt(payload: JWTPayload, secret: string) {
    return await sign(payload, secret);
}

// Password Register
authV2.post('/register',
    describeRoute({
        description: 'Register a new user',
        tags: ['Auth V2'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            email: {
                                type: 'string',
                                format: 'email',
                                example: 'user@example.com'
                            },
                            password: {
                                type: 'string',
                                format: 'password',
                                minLength: 8,
                                example: 'securePassword123!'
                            },
                            name: {
                                type: 'string',
                                example: 'John Doe'
                            }
                        },
                        required: ['email', 'password', 'name']
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Registration successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                token: {
                                    type: 'string',
                                    description: 'JWT token for authenticated requests',
                                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                                }
                            }
                        }
                    }
                }
            },
            400: {
                description: 'Bad request',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Email already registered'
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    async (c: Context) => {
        const authRepo = new AuthRepository(c.env.AUTH_DB);
        const { email, password, name } = await c.req.json();

        try {
            const user = await authRepo.register(email, password, name);
            const jwt = await issueJwt({ sub: user.id }, c.env.JWT_SECRET);
            return c.json({ token: jwt });
        } catch (e) {
            console.log("[LOG] e", e);
            return c.json({ error: 'Email already registered' }, 400);
        }
    }
);

// Password Login
authV2.post('/login',
    describeRoute({
        description: 'Authenticate user with email and password',
        tags: ['Auth V2'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            email: {
                                type: 'string',
                                format: 'email',
                                example: 'user@example.com'
                            },
                            password: {
                                type: 'string',
                                format: 'password',
                                example: 'securePassword123!'
                            }
                        },
                        required: ['email', 'password']
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Authentication successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                token: {
                                    type: 'string',
                                    description: 'JWT token for authenticated requests',
                                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                                }
                            }
                        }
                    }
                }
            },
            401: {
                description: 'Unauthorized',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Invalid credentials'
                                }
                            }
                        }
                    }
                }
            }
        },
        parameters: [
            {
                name: 'redirect',
                in: 'query',
                description: 'URL to redirect to after successful login',
                required: false,
                example: 'https://example.com/dashboard'
            }
        ]
    }),
    async (c: Context) => {
        const authRepo = new AuthRepository(c.env.AUTH_DB);
        const { email, password } = await c.req.json();
        const redirect = c.req.query('redirect');

        const user = await authRepo.login(email, password);

        if (!user) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const jwt = await issueJwt({ sub: user.id }, c.env.JWT_SECRET);

        setCookie(c, "token", jwt, { httpOnly: true });
        setCookie(c, "client-token", jwt, { path: "/" });

        if (redirect) {
            return c.redirect(redirect);
        }

        return c.json({ token: jwt });
    }
);

authV2.get('/profile',
    describeRoute({
        description: 'Get authenticated user profile',
        tags: ['Auth V2'],
        security: [{ Bearer: [] }],
        responses: {
            200: {
                description: 'Profile retrieved successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                user: {
                                    $ref: '#/components/schemas/User'
                                }
                            }
                        }
                    }
                }
            },
            401: {
                description: 'Unauthorized',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Unauthorized'
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    async (c: Context) => {
        const authRepo = new AuthRepository(c.env.AUTH_DB);
        const token = getCookie(c, "token") || c.req.header('authorization')?.replace('Bearer ', '');
        if (!token) return c.json({ error: 'Unauthorized' }, 401);
        const payload = await verify(token, c.env.JWT_SECRET);
        const user = await authRepo.getUserById(payload.sub as string);
        return c.json({ user });
    }
);

// Google OAuth Start
authV2.get('/google',
    describeRoute({
        description: 'Initiate Google OAuth flow',
        tags: ['Auth V2'],
        parameters: [
            {
                name: 'redirect',
                in: 'query',
                description: 'URL to redirect to after successful authentication',
                required: false,
                example: 'https://example.com/dashboard'
            }
        ],
        responses: {
            302: {
                description: 'Redirect to Google OAuth consent screen'
            }
        }
    }),
    (c: Context) => {
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
    }
);

// Google OAuth Callback
authV2.get('/google/callback',
    describeRoute({
        description: 'Google OAuth callback endpoint',
        tags: ['Auth V2'],
        parameters: [
            {
                name: 'code',
                in: 'query',
                description: 'Authorization code from Google',
                required: true
            },
            {
                name: 'state',
                in: 'query',
                description: 'Original redirect URL if provided',
                required: false
            }
        ],
        responses: {
            302: {
                description: 'Redirect to original URL with token'
            },
            200: {
                description: 'Authentication successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                token: {
                                    type: 'string',
                                    description: 'JWT token for authenticated requests',
                                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                                },
                                user: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            example: 'John Doe'
                                        },
                                        email: {
                                            type: 'string',
                                            example: 'user@example.com'
                                        },
                                        avatar_url: {
                                            type: 'string',
                                            example: 'https://example.com/avatar.jpg'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            401: {
                description: 'Authentication failed',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Token exchange failed'
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    async (c: Context) => {
        const authRepo = new AuthRepository(c.env.AUTH_DB);
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

        const userId = await authRepo.upsertUser({
            provider: 'google',
            provider_id: profile.sub,
            email: profile.email,
            profileName: profile.name,
            avatar_url: profile.picture,
        });

        const jwt = await issueJwt({ sub: userId }, c.env.JWT_SECRET);

        setCookie(c, "token", jwt, { httpOnly: true });
        setCookie(c, "client-token", jwt, { path: "/" });

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
    }
);

// GitHub OAuth Start
authV2.get('/github',
    describeRoute({
        description: 'Initiate GitHub OAuth flow',
        tags: ['Auth V2'],
        responses: {
            302: {
                description: 'Redirect to GitHub OAuth consent screen'
            }
        }
    }),
    (c: Context) => {
        const q = new URLSearchParams({
            client_id: c.env.GITHUB_CLIENT_ID,
            redirect_uri: c.env.GITHUB_REDIRECT_URI,
            scope: 'read:user user:email',
        });
        return c.redirect(`https://github.com/login/oauth/authorize?${q}`);
    }
);

// GitHub OAuth Callback
authV2.get('/github/callback',
    describeRoute({
        description: 'GitHub OAuth callback endpoint',
        tags: ['Auth V2'],
        parameters: [
            {
                name: 'code',
                in: 'query',
                description: 'Authorization code from GitHub',
                required: true
            }
        ],
        responses: {
            200: {
                description: 'Authentication successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                token: {
                                    type: 'string',
                                    description: 'JWT token for authenticated requests',
                                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                                }
                            }
                        }
                    }
                }
            },
            401: {
                description: 'Authentication failed',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'GitHub token exchange failed'
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    async (c: Context) => {
        const authRepo = new AuthRepository(c.env.AUTH_DB);
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

        const userId = await authRepo.upsertUser({
            provider: 'github',
            provider_id: profile.id.toString(),
            email: primaryEmail ?? '',
            profileName: profile.name ?? profile.login,
            avatar_url: profile.avatar_url,
        });

        const jwt = await issueJwt({ sub: userId }, c.env.JWT_SECRET);
        return c.json({ token: jwt });
    }
);