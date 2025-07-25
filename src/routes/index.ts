import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { z } from 'zod'
import { Environment } from '../../bindings'
import userRoutes from './users'
import { env } from 'hono/adapter'
import authRoutes from './auth'

const apiRoutes = new Hono<Environment>()

apiRoutes.get(
    '/',
    describeRoute({
        description: 'Say hello to the user',
        responses: {
            200: {
                description: 'Successful response',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    example: 'Hello from API',
                                },
                            },
                        },
                    }
                },
            },
        },
    }),
    zValidator(
        'query',
        z.object({
            name: z.string().optional()
        })
    ),
    (c) => {
        const { name } = c.req.valid('query')
        const bindingsEnv = c.env 
        console.log("[LOG] bindingsEnv", bindingsEnv)
        return c.json({ message: `Hello from API${name ? `, ${name}` : ''}` })
    }
)

apiRoutes.route('/users', userRoutes)
apiRoutes.route('/auth', authRoutes)


export default apiRoutes
export type AppType = typeof apiRoutes
