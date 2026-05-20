// src/api/routes/auth.ts
import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { LoginRequest, RegisterRequest, AuthResponse, ApiResponse } from './types/api';
import { Environment } from '../../../bindings';

export const authRoutes = new Hono<Environment>();

const generateId = () => Math.random().toString(36).substr(2, 9);

authRoutes.post('/login', async (c) => {
  try {
    const data: LoginRequest = await c.req.json();
    const { KOMUNITASKU_DB, JWT_SECRET } = c.env;
    
    // Find user by email
    const user = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE email = ?')
      .bind(data.email)
      .first();
    
    if (!user) {
      return c.json({
        data: null,
        message: 'User not found',
        success: false
      }, 404);
    }
    
    // In real app, verify password hash
    const token = await sign({ userId: user.id, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }, JWT_SECRET);
    
    // Store session
    await KOMUNITASKU_DB.prepare('INSERT OR REPLACE INTO auth_sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
      .bind(user.id, token, Date.now() + 24 * 60 * 60 * 1000)
      .run();
    
    // Get joined communities
    const joinedCommunities = await KOMUNITASKU_DB.prepare('SELECT community_id FROM user_communities WHERE user_id = ?')
      .bind(user.id)
      .all();
    
    const userResponse = {
      id: user.id as string,
      name: user.name as string || '',
      email: user.email as string || '',
      avatar: user.avatar as string || '',
      bio: user.bio as string || '',
      joinedCommunities: joinedCommunities.results.map((j: any) => j.community_id),
      role: user.role as "admin" | "member",
      createdAt: user.created_at as string,
      updatedAt: user.updated_at as string
    };
    
    const response: ApiResponse<AuthResponse> = {
      data: { user: userResponse, token },
      message: 'Login successful',
      success: true
    };
    
    return c.json(response);
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Login failed',
      success: false
    }, 500);
  }
});

authRoutes.post('/register', async (c) => {
  try {
    const data: RegisterRequest = await c.req.json();
    const { KOMUNITASKU_DB, JWT_SECRET } = c.env;
    
    // Check if email exists
    const existing = await KOMUNITASKU_DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(data.email)
      .first();
    
    if (existing) {
      return c.json({
        data: null,
        message: 'Email already exists',
        success: false
      }, 400);
    }
    
    const userId = generateId();
    const now = new Date().toISOString();
    
    // Create user
    await KOMUNITASKU_DB.prepare(`
      INSERT INTO users (id, name, email, avatar, bio, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      data.name,
      data.email,
      data.avatar || `https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2`,
      data.bio || '',
      'member',
      now,
      now
    ).run();
    
    const token = await sign({ userId, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }, JWT_SECRET);
    
    // Store session
    await KOMUNITASKU_DB.prepare('INSERT INTO auth_sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
      .bind(userId, token, Date.now() + 24 * 60 * 60 * 1000)
      .run();
    
    const user = {
      id: userId,
      name: data.name,
      email: data.email,
      avatar: data.avatar || `https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2`,
      bio: data.bio || '',
      joinedCommunities: [],
      role: 'member' as const,
      createdAt: now,
      updatedAt: now
    };
    
    const response: ApiResponse<AuthResponse> = {
      data: { user, token },
      message: 'Registration successful',
      success: true
    };
    
    return c.json(response);
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Registration failed',
      success: false
    }, 500);
  }
});

authRoutes.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({
        data: null,
        message: 'No authenticated user',
        success: false
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { KOMUNITASKU_DB, JWT_SECRET } = c.env;
    
    const payload = await verify(token, JWT_SECRET);
    const userId = payload.userId;
    
    // Check session
    const session = await KOMUNITASKU_DB.prepare('SELECT * FROM auth_sessions WHERE user_id = ? AND token = ? AND expires_at > ?')
      .bind(userId, token, Date.now())
      .first();
    
    if (!session) {
      return c.json({
        data: null,
        message: 'Session expired',
        success: false
      });
    }
    
    // Get user
    const user = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();
    
    if (!user) {
      return c.json({
        data: null,
        message: 'User not found',
        success: false
      });
    }
    
    // Get joined communities
    const joinedCommunities = await KOMUNITASKU_DB.prepare('SELECT community_id FROM user_communities WHERE user_id = ?')
      .bind(userId)
      .all();
    
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio || '',
      joinedCommunities: joinedCommunities.results.map((j: any) => j.community_id),
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
    
    return c.json({
      data: userResponse,
      message: 'User retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: 'Authentication failed',
      success: false
    });
  }
});

authRoutes.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { KOMUNITASKU_DB } = c.env;
      
      await KOMUNITASKU_DB.prepare('DELETE FROM auth_sessions WHERE token = ?')
        .bind(token)
        .run();
    }
    
    return c.json({
      data: true,
      message: 'Logout successful',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: 'Logout failed',
      success: false
    }, 500);
  }
});
