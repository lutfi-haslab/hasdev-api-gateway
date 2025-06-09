import { Hono } from "hono";
import { Environment } from "../../bindings";
import { TodoRepository } from "../lib/repositories/todo";
import { getCookie } from "hono/cookie";
import { describeRoute } from "hono-openapi";


const todoRoutes = new Hono<Environment>();

todoRoutes.post('/',
    describeRoute({
        description: 'Create a new todo',
        tags: ['Todo'],
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            text: {
                                type: 'string',
                                example: 'Buy groceries'
                            },
                            userId: {
                                type: 'string',
                                example: 'user123'
                            },
                            planDate: {
                                type: 'string',
                                format: 'date',
                                example: '2023-01-01'
                            },
                            isDone: {
                                type: 'boolean',
                                example: false
                            }
                        },
                        required: ['text', 'userId']
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Todo created successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                todo: {
                                    $ref: '#/components/schemas/Todo'
                                }
                            }
                        }
                    }
                }
            }
        }
    }), async (c) => {
        const todoRepo = new TodoRepository(c.env.TODO_DB);
        const { text, userId, planDate, isDone } = await c.req.json();
        const todo = await todoRepo.create({ text, userId, planDate, isDone });
        return c.json({ todo });
    })

todoRoutes.get('/', describeRoute({
    description: 'Get all todos for a user',
    tags: ['Todo'],
    parameters: [
        {
            name: 'userId',
            in: 'query',
            description: 'User ID',
            required: true,
            example: 'user123'
        }
    ],
    responses: {
        200: {
            description: 'Todos retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            todos: {
                                type: 'array',
                                items: {
                                    $ref: '#/components/schemas/Todo'
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}), async (c) => {
    const todoRepo = new TodoRepository(c.env.TODO_DB);
    const userId = c.req.query('userId') as string;
    const todos = await todoRepo.findAllByUserId(userId);
    return c.json({ data: todos });
})

todoRoutes.get('/:id', describeRoute({
    description: 'Get a todo by ID',
    tags: ['Todo'],
    parameters: [
        {
            name: 'id',
            in: 'path',
            description: 'Todo ID',
            required: true,
            example: 'todo123'
        }
    ],
    responses: {
        200: {
            description: 'Todo retrieved successfully',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            todo: {
                                $ref: '#/components/schemas/Todo'
                            }
                        }
                    }
                }
            }
        }
    }
}), async (c) => {
    const todoRepo = new TodoRepository(c.env.TODO_DB);
    const { id } = c.req.param()
    const todo = await todoRepo.findById(id);
    return c.json({ todo });
})

export default todoRoutes;
