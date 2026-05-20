import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { CreateClassroomRequest, UpdateClassroomRequest, ApiResponse } from './types/api';
import { Environment } from '../../../bindings';

export const classroomRoutes = new Hono<Environment>();

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

// Helper function to enrich classroom item with author
async function enrichClassroomItem(c: any, item: any) {
  const { KOMUNITASKU_DB } = c.env;
  
  // Get author
  const author = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(item.author_id)
    .first();
  
  if (!author) return null;
  
  const authorData = {
    id: author.id,
    name: author.name,
    email: author.email,
    avatar: author.avatar,
    bio: author.bio || '',
    joinedCommunities: [],
    role: author.role,
    createdAt: author.created_at,
    updatedAt: author.updated_at
  };
  
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    communityId: item.community_id,
    author: authorData,
    type: item.type,
    mediaFiles: item.media_files ? JSON.parse(item.media_files) : [],
    order: item.order_index,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    // Link-specific fields
    linkUrl: item.link_url,
    linkDescription: item.link_description,
    linkSourceType: item.link_source_type
  };
}

// Get classroom items by community
classroomRoutes.get('/', async (c) => {
  try {
    const communityId = c.req.query('communityId');
    if (!communityId) {
      return c.json({
        data: [],
        message: 'Community ID is required',
        success: false
      }, 400);
    }
    
    const { KOMUNITASKU_DB } = c.env;
    
    const items = await KOMUNITASKU_DB.prepare('SELECT * FROM classroom_items WHERE community_id = ? ORDER BY order_index ASC, created_at ASC')
      .bind(communityId)
      .all();
    
    const enrichedItems = await Promise.all(
      items.results.map(async (item: any) => 
        enrichClassroomItem(c, item)
      )
    );
    
    return c.json({
      data: enrichedItems.filter(Boolean),
      message: 'Classroom items retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: [],
      message: error instanceof Error ? error.message : 'Failed to get classroom items',
      success: false
    }, 500);
  }
});

// Get classroom item by ID
classroomRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    const item = await KOMUNITASKU_DB.prepare('SELECT * FROM classroom_items WHERE id = ?')
      .bind(id)
      .first();
    
    if (!item) {
      return c.json({
        data: null,
        message: 'Classroom item not found',
        success: false
      }, 404);
    }
    
    const enrichedItem = await enrichClassroomItem(c, item);
    
    if (!enrichedItem) {
      return c.json({
        data: null,
        message: 'Classroom item author not found',
        success: false
      }, 404);
    }
    
    return c.json({
      data: enrichedItem,
      message: 'Classroom item retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to get classroom item',
      success: false
    }, 500);
  }
});

// Create classroom item
classroomRoutes.post('/', async (c) => {
  try {
    const data: CreateClassroomRequest = await c.req.json();
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: null,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const itemId = generateId();
    const now = new Date().toISOString();
    
    await KOMUNITASKU_DB.prepare(`
      INSERT INTO classroom_items (
        id, title, content, community_id, author_id, type, media_files, 
        order_index, link_url, link_description, link_source_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      itemId,
      data.title,
      data.content,
      data.communityId,
      currentUser.id,
      data.type,
      JSON.stringify(data.mediaFiles || []),
      data.order || 0,
      data.linkUrl || null,
      data.linkDescription || null,
      data.linkSourceType || null,
      now,
      now
    ).run();
    
    // Get the created item
    const item = await KOMUNITASKU_DB.prepare('SELECT * FROM classroom_items WHERE id = ?')
      .bind(itemId)
      .first();
    
    const enrichedItem = await enrichClassroomItem(c, item);
    
    return c.json({
      data: enrichedItem,
      message: 'Classroom item created',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to create classroom item',
      success: false
    }, 500);
  }
});

// Update classroom item
classroomRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data: UpdateClassroomRequest = await c.req.json();
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: null,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const existing = await KOMUNITASKU_DB.prepare('SELECT * FROM classroom_items WHERE id = ?')
      .bind(id)
      .first();
    
    if (!existing) {
      return c.json({
        data: null,
        message: 'Classroom item not found',
        success: false
      }, 404);
    }
    
    // Build update query dynamically
    const updates = ['updated_at = ?'];
    const values = [new Date().toISOString()];
    
    if (data.title) { updates.push('title = ?'); values.push(data.title); }
    if (data.content) { updates.push('content = ?'); values.push(data.content); }
    if (data.type) { updates.push('type = ?'); values.push(data.type); }
    if (data.mediaFiles) { updates.push('media_files = ?'); values.push(JSON.stringify(data.mediaFiles)); }
    if (data.order !== undefined) { updates.push('order_index = ?'); values.push(data.order.toString()); }
    if (data.linkUrl !== undefined) { updates.push('link_url = ?'); values.push(data.linkUrl); }
    if (data.linkDescription !== undefined) { updates.push('link_description = ?'); values.push(data.linkDescription); }
    if (data.linkSourceType !== undefined) { updates.push('link_source_type = ?'); values.push(data.linkSourceType); }
    
    values.push(id);
    
    await KOMUNITASKU_DB.prepare(`UPDATE classroom_items SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
    
    // Get updated item
    const updated = await KOMUNITASKU_DB.prepare('SELECT * FROM classroom_items WHERE id = ?')
      .bind(id)
      .first();
    
    const enrichedItem = await enrichClassroomItem(c, updated);
    
    return c.json({
      data: enrichedItem,
      message: 'Classroom item updated',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to update classroom item',
      success: false
    }, 500);
  }
});

// Delete classroom item
classroomRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    await KOMUNITASKU_DB.prepare('DELETE FROM classroom_items WHERE id = ?')
      .bind(id)
      .run();
    
    return c.json({
      data: true,
      message: 'Classroom item deleted',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to delete classroom item',
      success: false
    }, 500);
  }
});
