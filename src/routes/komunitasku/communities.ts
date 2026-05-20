// src/api/routes/communities.ts
import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Environment } from '../../../bindings';

export const communitiesRoutes = new Hono<Environment>();

const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper function to get current user from token
async function getCurrentUser(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return null;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = await verify(token, c.env.JWT_SECRET);
    
    const user = await c.env.KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(payload.userId)
      .first();
    
    return user;
  } catch {
    return null;
  }
}

// Helper function to enrich community with member data
async function enrichCommunity(c: any, community: any, currentUserId?: string) {
  const { KOMUNITASKU_DB } = c.env;
  
  // Get members
  const members = await KOMUNITASKU_DB.prepare(`
    SELECT u.* FROM users u 
    JOIN user_communities uc ON u.id = uc.user_id 
    WHERE uc.community_id = ?
  `).bind(community.id).all();
  
  const memberList = members.results.map((m: any) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    avatar: m.avatar,
    bio: m.bio || '',
    joinedCommunities: [], // Will be populated if needed
    role: m.role,
    createdAt: m.created_at,
    updatedAt: m.updated_at
  }));
  
  // Get creator
  const creator = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(community.created_by)
    .first();
  
  const createdBy = creator ? {
    id: creator.id,
    name: creator.name,
    email: creator.email,
    avatar: creator.avatar,
    bio: creator.bio || '',
    joinedCommunities: [],
    role: creator.role,
    createdAt: creator.created_at,
    updatedAt: creator.updated_at
  } : null;
  
  const isJoined = currentUserId ? 
    memberList.some((member: { id: string; }) => member.id === currentUserId) : false;
  
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    shortDescription: community.short_description,
    coverImage: community.cover_image,
    logo: community.logo,
    category: community.category,
    memberCount: memberList.length,
    adminCount: community.admin_count,
    onlineCount: community.online_count,
    price: community.price,
    isFree: Boolean(community.is_free),
    isPrivate: Boolean(community.is_private),
    createdBy: createdBy,
    createdAt: community.created_at,
    tags: community.tags ? JSON.parse(community.tags) : [],
    socialLinks: community.social_links ? JSON.parse(community.social_links) : {},
    members: memberList,
    isJoined
  };
}

communitiesRoutes.get('/', async (c) => {
  try {
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    const communities = await KOMUNITASKU_DB.prepare('SELECT * FROM communities').all();
    
    const enrichedCommunities = await Promise.all(
      communities.results.map(async (community: any) => 
        enrichCommunity(c, community, currentUser?.id)
      )
    );
    
    return c.json({
      data: enrichedCommunities,
      message: 'Communities retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: [],
      message: error instanceof Error ? error.message : 'Failed to get communities',
      success: false
    }, 500);
  }
});

communitiesRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    const community = await KOMUNITASKU_DB.prepare('SELECT * FROM communities WHERE id = ?')
      .bind(id)
      .first();
    
    if (!community) {
      return c.json({
        data: null,
        message: 'Community not found',
        success: false
      }, 404);
    }
    
    const enrichedCommunity = await enrichCommunity(c, community, currentUser?.id);
    
    return c.json({
      data: enrichedCommunity,
      message: 'Community retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to get community',
      success: false
    }, 500);
  }
});

communitiesRoutes.post('/', async (c) => {
  try {
    const data: any = await c.req.json();
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: null,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const communityId = generateId();
    const now = new Date().toISOString();
    
    // Create community
    await KOMUNITASKU_DB.prepare(`
      INSERT INTO communities (
        id, name, description, short_description, cover_image, logo, 
        category, created_by, created_at, tags, social_links, is_private
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      communityId,
      data.name,
      data.description,
      data.shortDescription,
      data.coverImage,
      data.logo,
      data.category,
      currentUser.id,
      now,
      JSON.stringify(data.tags),
      JSON.stringify(data.socialLinks),
      data.isPrivate
    ).run();
    
    // Add creator as member
    await KOMUNITASKU_DB.prepare('INSERT INTO user_communities (user_id, community_id, joined_at) VALUES (?, ?, ?)')
      .bind(currentUser.id, communityId, now)
      .run();
    
    // Get the created community
    const community = await KOMUNITASKU_DB.prepare('SELECT * FROM communities WHERE id = ?')
      .bind(communityId)
      .first();
    
    const enrichedCommunity = await enrichCommunity(c, community, currentUser.id);
    
    return c.json({
      data: enrichedCommunity,
      message: 'Community created',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to create community',
      success: false
    }, 500);
  }
});

communitiesRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data: any = await c.req.json();
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: null,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const existing = await KOMUNITASKU_DB.prepare('SELECT * FROM communities WHERE id = ?')
      .bind(id)
      .first();
    
    if (!existing) {
      return c.json({
        data: null,
        message: 'Community not found',
        success: false
      }, 404);
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (data.name) { updates.push('name = ?'); values.push(data.name); }
    if (data.description) { updates.push('description = ?'); values.push(data.description); }
    if (data.shortDescription) { updates.push('short_description = ?'); values.push(data.shortDescription); }
    if (data.coverImage) { updates.push('cover_image = ?'); values.push(data.coverImage); }
    if (data.logo) { updates.push('logo = ?'); values.push(data.logo); }
    if (data.category) { updates.push('category = ?'); values.push(data.category); }
    if (data.tags) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.socialLinks) { updates.push('social_links = ?'); values.push(JSON.stringify(data.socialLinks)); }
    if (data.isPrivate !== undefined) { updates.push('is_private = ?'); values.push(data.isPrivate); }
    
    values.push(id);
    
    if (updates.length > 0) {
      await KOMUNITASKU_DB.prepare(`UPDATE communities SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }
    
    // Get updated community
    const updated = await KOMUNITASKU_DB.prepare('SELECT * FROM communities WHERE id = ?')
      .bind(id)
      .first();
    
    const enrichedCommunity = await enrichCommunity(c, updated, currentUser.id);
    
    return c.json({
      data: enrichedCommunity,
      message: 'Community updated',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to update community',
      success: false
    }, 500);
  }
});

communitiesRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    await KOMUNITASKU_DB.prepare('DELETE FROM communities WHERE id = ?')
      .bind(id)
      .run();
    
    return c.json({
      data: true,
      message: 'Community deleted',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to delete community',
      success: false
    }, 500);
  }
});

communitiesRoutes.post('/:id/join', async (c) => {
  try {
    const communityId = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: false,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    // Check if already joined
    const existing = await KOMUNITASKU_DB.prepare('SELECT * FROM user_communities WHERE user_id = ? AND community_id = ?')
      .bind(currentUser.id, communityId)
      .first();
    
    if (existing) {
      return c.json({
        data: false,
        message: 'Already joined this community',
        success: false
      }, 400);
    }
    
    await KOMUNITASKU_DB.prepare('INSERT INTO user_communities (user_id, community_id, joined_at) VALUES (?, ?, ?)')
      .bind(currentUser.id, communityId, new Date().toISOString())
      .run();
    
    return c.json({
      data: true,
      message: 'Joined community',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to join community',
      success: false
    }, 500);
  }
});

communitiesRoutes.post('/:id/leave', async (c) => {
  try {
    const communityId = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: false,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    await KOMUNITASKU_DB.prepare('DELETE FROM user_communities WHERE user_id = ? AND community_id = ?')
      .bind(currentUser.id, communityId)
      .run();
    
    return c.json({
      data: true,
      message: 'Left community',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to leave community',
      success: false
    }, 500);
  }
});

communitiesRoutes.get('/:id/members', async (c) => {
  try {
    const communityId = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    const members = await KOMUNITASKU_DB.prepare(`
      SELECT u.* FROM users u 
      JOIN user_communities uc ON u.id = uc.user_id 
      WHERE uc.community_id = ?
    `).bind(communityId).all();
    
    const memberList = members.results.map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      bio: m.bio || '',
      joinedCommunities: [],
      role: m.role,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    }));
    
    return c.json({
      data: memberList,
      message: 'Members retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: [],
      message: error instanceof Error ? error.message : 'Failed to get members',
      success: false
    }, 500);
  }
});

communitiesRoutes.get('/my/communities', async (c) => {
  try {
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: [],
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const communities = await KOMUNITASKU_DB.prepare(`
      SELECT c.* FROM communities c
      JOIN user_communities uc ON c.id = uc.community_id
      WHERE uc.user_id = ?
    `).bind(currentUser.id).all();
    
    const enrichedCommunities = await Promise.all(
      communities.results.map(async (community: any) => 
        enrichCommunity(c, community, currentUser.id)
      )
    );
    
    return c.json({
      data: enrichedCommunities,
      message: 'My communities retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: [],
      message: error instanceof Error ? error.message : 'Failed to get my communities',
      success: false
    }, 500);
  }
});
