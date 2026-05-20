import { Hono } from 'hono';
import { Environment } from '../../bindings';
import { describeRoute } from 'hono-openapi';
import { PagesRepository, TodoItemsRepository, PageLinksRepository, UserPinsRepository, EncryptedSecretsRepository } from '../lib/repositories/hasnotes';
import { getCookie } from 'hono/cookie';
import { nanoid } from 'nanoid';
import { verify } from 'hono/jwt';
import { encrypt } from '../lib/utils/cryptTool';

type Variables = {
    userId: string
}

type HasnotesEnv = Environment & {
    Variables: Variables
};
const hasnotesRoutes = new Hono<HasnotesEnv>();

hasnotesRoutes.use('*', async (c, next) => {
    const token = getCookie(c, "token") || c.req.header('authorization')?.replace('Bearer ', '');
    if (!token) return c.json({ error: 'Unauthorized' }, 401);
    const payload = await verify(token, c.env.JWT_SECRET);
    const userId = payload.sub as string;
    c.set("userId", userId);
    await next();
});

hasnotesRoutes.get('/pages', describeRoute({
    description: 'Get all pages',
    tags: ['HasNotes - Pages'],
    responses: {
        200: {
            description: 'Success',
            content: {
                'application/json': {
                    schema: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/Page'
                        }
                    }
                }
            }
        }
    }
}), async (c) => {
    const repository = new PagesRepository(c.env.HASNOTES_DB);
    const userId = c.get('userId');
    const pages = await repository.findAll(userId);
    return c.json(pages);
});

// Pages Routes
hasnotesRoutes.post('/pages',
    describeRoute({
        description: 'Create a new page',
        tags: ['HasNotes - Pages'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            content: { type: 'object' },
                            type: { type: 'string', enum: ['note', 'todo'] },
                            parentId: { type: 'string', nullable: true },
                            isPinned: { type: 'boolean' }
                        },
                        required: ['title', 'type']
                    }
                }
            }
        }
    }), async (c) => {
        const repository = new PagesRepository(c.env.HASNOTES_DB);
        const body = await c.req.json();
        console.log("Create Page", JSON.stringify(body));
        const userId = c.get('userId');
        const page = await repository.create({
            id: nanoid(),
            ...body,
            parentId: body.parentId === "" || body.parentId === null ? null : body.parentId,
            userId
        });
        return c.json(page);
    });

hasnotesRoutes.get('/pages/:id',
    describeRoute({
        description: 'Get a page by id',
        tags: ['HasNotes - Pages'],
        parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }]
    }), async (c) => {
        const repository = new PagesRepository(c.env.HASNOTES_DB);
        const page = await repository.findById(c.req.param('id'));
        if (!page) return c.notFound();
        return c.json(page);
    });

hasnotesRoutes.put('/pages/:id',
    describeRoute({
        description: 'Update a page',
        tags: ['HasNotes - Pages'],
        parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            content: { type: 'object' },
                            type: { type: 'string', enum: ['note', 'todo'] },
                            parentId: { type: 'string', nullable: true },
                            isPinned: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    }), async (c) => {
        const repository = new PagesRepository(c.env.HASNOTES_DB);
        const body = await c.req.json();
        const page = await repository.update(c.req.param('id'), {
            ...body,
            parentId: body.parentId === "" || body.parentId === null ? null : body.parentId,
        });
        return c.json(page);
    });

hasnotesRoutes.delete('/pages/:id',
    describeRoute({
        description: 'Delete a page',
        tags: ['HasNotes - Pages'],
        parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }]
    }), async (c) => {
        const repository = new PagesRepository(c.env.HASNOTES_DB);
        const page = await repository.delete(c.req.param('id'));
        return c.json(page);
    });

hasnotesRoutes.get('/pages/:pageId/todos', 
    describeRoute({
        description: 'Get All Todo Item',
        tags: ['HasNotes - Todo Items']
    }), async (c) => {
        const repository = new TodoItemsRepository(c.env.HASNOTES_DB);
        const todos = await repository.findByPageId(c.req.param('pageId'));
        return c.json(todos);
    }
)
// Todo Items Routes
hasnotesRoutes.post('/pages/:pageId/todos',
    describeRoute({
        description: 'Create a new todo item',
        tags: ['HasNotes - Todo Items'],
        parameters: [{
            name: 'pageId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            text: { type: 'string' },
                            completed: { type: 'boolean' },
                            content: { type: 'object' },
                        },
                        required: ['text']
                    }
                }
            }
        }
    }), async (c) => {
        const repository = new TodoItemsRepository(c.env.HASNOTES_DB);
        const body = await c.req.json();
        const todo = await repository.create({
            id: nanoid(),
            ...body,
            pageId: c.req.param('pageId')
        });
        return c.json(todo);
    });

hasnotesRoutes.put('/todos/:id',
    describeRoute({
        description: 'Update a todo item',
        tags: ['HasNotes - Todo Items'],
        parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            text: { type: 'string' },
                            completed: { type: 'boolean' },
                            content: { type: 'object' },
                        }
                    }
                }
            }
        }
    }), async (c) => {
        const repository = new TodoItemsRepository(c.env.HASNOTES_DB);
        const body = await c.req.json();
        const todo = await repository.update(c.req.param('id'), body);
        return c.json(todo);
    });

hasnotesRoutes.delete('/todos/:id',
    describeRoute({
        description: 'Delete a todo item',
        tags: ['HasNotes - Todo Items'],
        parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }]
    }), async (c) => {
        const repository = new TodoItemsRepository(c.env.HASNOTES_DB);
        const todo = await repository.delete(c.req.param('id'));
        return c.json(todo);
    });

// Page Links Routes
hasnotesRoutes.post('/pages/:sourceId/links/:targetId',
    describeRoute({
        description: 'Create a link between pages',
        tags: ['HasNotes - Page Links'],
        parameters: [{
            name: 'sourceId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }, {
            name: 'targetId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }]
    }), async (c) => {
        const repository = new PageLinksRepository(c.env.HASNOTES_DB);
        const link = await repository.create({
            id: nanoid(),
            sourcePageId: c.req.param('sourceId'),
            targetPageId: c.req.param('targetId')
        });
        return c.json(link);
    });

hasnotesRoutes.delete('/links/:id',
    describeRoute({
        description: 'Delete a page link',
        tags: ['HasNotes - Page Links'],
        parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }]
    }), async (c) => {
        const repository = new PageLinksRepository(c.env.HASNOTES_DB);
        const link = await repository.delete(c.req.param('id'));
        return c.json(link);
    });

// User Pins Routes
hasnotesRoutes.post('/users/pin',
    describeRoute({
        description: 'Create a user PIN',
        tags: ['HasNotes - User Pins'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            pinHash: { type: 'string' }
                        },
                        required: ['pinHash']
                    }
                }
            }
        }
    }), async (c) => {
        const repository = new UserPinsRepository(c.env.HASNOTES_DB);
        const body = await c.req.json();
        const userId = c.get('userId');
        const pin = await repository.create({
            id: nanoid(),
            userId,
            ...body
        });
        return c.json(pin);
    });

hasnotesRoutes.put('/users/pin',
    describeRoute({
        description: 'Update a user PIN',
        tags: ['HasNotes - User Pins'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            pinHash: { type: 'string' }
                        },
                        required: ['pinHash']
                    }
                }
            }
        }
    }), async (c) => {
        const repository = new UserPinsRepository(c.env.HASNOTES_DB);
        const body = await c.req.json();
        const userId = c.get('userId');
        const pin = await repository.update(userId, body);
        return c.json(pin);
    });

hasnotesRoutes.get('/users/secrets', describeRoute({
    description: 'Get all encrypted secrets for a user',
    tags: ['HasNotes - Secrets'],
}), async (c) => {
    const repository = new EncryptedSecretsRepository(c.env.HASNOTES_DB);
    const userId = c.get('userId');
    const secrets = await repository.findByUserId(userId);
    return c.json(secrets);
});
// Encrypted Secrets Routes
hasnotesRoutes.post('/users/secrets',
    describeRoute({
        description: 'Create an encrypted secret',
        tags: ['HasNotes - Secrets'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            data: { type: 'string' }
                        },
                        required: ['name', 'encryptedData']
                    }
                }
            }
        }
    }), async (c) => {
        const repository = new EncryptedSecretsRepository(c.env.HASNOTES_DB);
        const body = await c.req.json();
        const userId = c.get('userId');
        const encryptedData = await encrypt(body.data, c.env.HASNOTES_ENCRYPTION_KEY);
        console.log('encryptedData', encryptedData);
        const secret = await repository.create({
            id: nanoid(),
            userId,
            encryptedData: encryptedData,
            ...body
        });
        return c.json(secret);
    });

hasnotesRoutes.put('/secrets/:id',
    describeRoute({
        description: 'Update an encrypted secret',
        tags: ['HasNotes - Secrets'],
        parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            encryptedData: { type: 'string' }
                        }
                    }
                }
            }
        }
    }), async (c) => {
        const repository = new EncryptedSecretsRepository(c.env.HASNOTES_DB);
        const body = await c.req.json();
        const secret = await repository.update(c.req.param('id'), body);
        return c.json(secret);
    });

hasnotesRoutes.delete('/secrets/:id',
    describeRoute({
        description: 'Delete an encrypted secret',
        tags: ['HasNotes - Secrets'],
        parameters: [{
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
        }]
    }), async (c) => {
        const repository = new EncryptedSecretsRepository(c.env.HASNOTES_DB);
        const secret = await repository.delete(c.req.param('id'));
        return c.json(secret);
    });

export default hasnotesRoutes;
