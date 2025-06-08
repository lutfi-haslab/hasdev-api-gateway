import { Hono } from "hono";
import { Environment } from "../../bindings";
import { describeRoute } from "hono-openapi";
import { UserRepository } from "../lib/repositories/oauth/user";

const userRoutes = new Hono<Environment>()


userRoutes.get('/:id',
    describeRoute({
        description: 'Get user by id',
        tags: ['User'],
        parameters: [
            {
                name: 'id',
                in: 'path',
                required: true,
                schema: {
                    type: 'string',
                },
            },
        ],
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
        const userRepo = new UserRepository(c.env.DB);
        const { id } = c.req.param()
        const user = await userRepo.findById(id);
        console.log("[LOG] user", user);
        return c.json({ user })
    })

export default userRoutes
