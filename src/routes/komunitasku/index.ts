// src/api/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './auth';
import { blogPostsRoutes } from './blog-posts';
import { classroomRoutes } from './classroom';
import { commentsRoutes } from './comments';
import { communitiesRoutes } from './communities';
import { discussionsRoutes } from './discussion';
import { Environment } from '../../../bindings';

const app = new Hono<Environment>();

// Middleware
app.use('*', cors());

// Routes
app.route('/auth', authRoutes);
app.route('/communities', communitiesRoutes);
app.route('/discussions', discussionsRoutes);
app.route('/comments', commentsRoutes);
app.route('/classroom', classroomRoutes);
app.route('/blog-posts', blogPostsRoutes);

export default app;
