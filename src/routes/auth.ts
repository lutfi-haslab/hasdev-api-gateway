import { Hono } from "hono";
import { Environment } from "../../bindings";
import { describeRoute } from "hono-openapi";
import { UserRepository } from "../lib/repositories/oauth/user";
import { compare, hash } from "bcrypt-ts";
import { createSession } from "../lib/usecases/session";

const authRoutes = new Hono<Environment>()


authRoutes.post('/register',
    describeRoute({
        description: 'Register user',
        tags: ['Auth'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            email: {
                                type: 'string',
                            },
                            password: {
                                type: 'string',
                            },
                            profileName: {
                                type: 'string',
                            },
                            isAdmin: {
                                type: 'integer',
                            },
                        },
                        required: ['email', 'password', 'profileName', 'isAdmin'],
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Successful response',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                user: {
                                    type: 'object',
                                    properties: {
                                        id: {
                                            type: 'string',
                                            example: '8adbe59e-1b49de85b2a5',
                                        },
                                        email: {
                                            type: 'string',
                                            example: 'test@gmail.com',
                                        },
                                        password: {
                                            type: 'string',
                                            example: '$2b$12$gU94/dWSuKk4rQRpCaInVlkNTG',
                                        },
                                        isAdmin: {
                                            type: 'integer',
                                            example: 1,
                                        },
                                        emailVerified: {
                                            type: 'integer',
                                            example: 0,
                                        },
                                        profileName: {
                                            type: 'string',
                                            example: null,
                                        },
                                        profilePicture: {
                                            type: 'string',
                                            example: null,
                                        },
                                        createdAt: {
                                            type: 'string',
                                            example: '+057405-12-01T04:05:10.000Z',
                                        },
                                    },
                                    required: [
                                        'id',
                                        'email',
                                        'password',
                                        'isAdmin',
                                        'emailVerified',
                                        'profileName',
                                        'profilePicture',
                                        'createdAt',
                                    ],
                                },
                            },
                            required: ['user'],
                        }
                    },
                },
            },
        }
    }),
    async (c) => {
        const userRepo = new UserRepository(c.env.AUTH_DB);
        const { email, password, profileName, isAdmin } = await c.req.json()
        const existing = await userRepo.findByEmail(email)
        if (existing) {
            return c.json({ error: 'User already exists' }, 400)
        }
        const result = await hash(password, 12);
        const user = await userRepo.create({ email, password: result, profile: { name: profileName }, isAdmin })
        const token = await createSession(c, user.id)
        return c.json({ user, token })
    })


authRoutes.post('/login',
    describeRoute({
        description: 'Login user',
        tags: ['Auth'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            email: {
                                type: 'string',
                            },
                            password: {
                                type: 'string',
                            },
                        },
                        required: ['email', 'password'],
                    },
                },
            },
        },
        responses: {
            200: {
                description: 'Successful response',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                user: {
                                    type: 'object',
                                    properties: {
                                        id: {
                                            type: 'string',
                                            example: '8adbe59e-1b49de85b2a5',
                                        },
                                        email: {
                                            type: 'string',
                                            example: 'test@gmail.com',
                                        },
                                        password: {
                                            type: 'string',
                                            example: '$2b$12$gU94/dWSuKk4rQRpCaInVlkNTG',
                                        },
                                        isAdmin: {
                                            type: 'integer',
                                            example: 1,
                                        },
                                        emailVerified: {
                                            type: 'integer',
                                            example: 0,
                                        },
                                        profileName: {
                                            type: 'string',
                                            example: null,
                                        },
                                        profilePicture: {
                                            type: 'string',
                                            example: null,
                                        },
                                        createdAt: {
                                            type: 'string',
                                            example: '+057405-12-01T04:05:10.000Z',
                                        },
                                    },
                                    required: [
                                        'id',
                                        'email',
                                        'password',
                                        'isAdmin',
                                        'emailVerified',
                                        'profileName',
                                        'profilePicture',
                                        'createdAt',
                                    ],
                                },
                                token: {
                                    type: 'string',
                                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                                },
                            },
                            required: ['user', 'token'],
                        }
                    },
                },
            },
        }
    }),
    async (c) => {
        const userRepo = new UserRepository(c.env.AUTH_DB);
        const { email, password } = await c.req.json()
        const user = await userRepo.findByEmail(email)
        if (!user) {
            return c.json({ error: 'User not found' }, 404)
        }
        const valid = await compare(password, user.password)
        if (!valid) {
            return c.json({ error: 'Invalid password' }, 401)
        }
        const token = await createSession(c, user.id)
        return c.json({ user, token })
    })
export default authRoutes
