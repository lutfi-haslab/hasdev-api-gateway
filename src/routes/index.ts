import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { z } from 'zod'
import { Environment } from '../../bindings'
import authRoutes from './auth'
import { authV2 } from './auth.v2'
import userRoutes from './users'
import toolsRoutes from './tools'
import todoRoutes from './todo'
import aiRoutes from './ai'
import emailRoutes from './email'
import hasnotesRoutes from './hasnotes'
import inagovApiRoute from './inagov_api'
import komunitaskuRoutes from './komunitasku'

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

apiRoutes.route('/auth', authRoutes)
apiRoutes.route('/auth/v2', authV2)
apiRoutes.route('/users', userRoutes)
apiRoutes.route('/tools', toolsRoutes)
apiRoutes.route('/todo', todoRoutes)
apiRoutes.route('/ai', aiRoutes)
apiRoutes.route('/email', emailRoutes)
apiRoutes.route('/hasnotes', hasnotesRoutes)
apiRoutes.route('/inagov', inagovApiRoute)
apiRoutes.route('/komunitasku', komunitaskuRoutes)

export default apiRoutes
