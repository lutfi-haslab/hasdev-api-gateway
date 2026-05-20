import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { Environment } from '../../../bindings';

export const discussionsRoutes = new Hono<Environment>();

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

// Helper function to enrich discussion with author and comments
async function enrichDiscussion(c: any, discussion: any, currentUserId?: string) {
  const { KOMUNITASKU_DB } = c.env;
  
  // Get author
  const author = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(discussion.author_id)
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
  
  // Get comments (simplified - just count for list view)
  const commentCount = await KOMUNITASKU_DB.prepare('SELECT COUNT(*) as count FROM comments WHERE discussion_id = ?')
    .bind(discussion.id)
    .first();
  
  // Check like status
  let isLiked = false;
  if (currentUserId) {
    const like = await KOMUNITASKU_DB.prepare('SELECT * FROM likes WHERE user_id = ? AND target_id = ? AND target_type = ?')
      .bind(currentUserId, discussion.id, 'discussion')
      .first();
    isLiked = !!like;
  }
  
  return {
    id: discussion.id,
    title: discussion.title,
    content: discussion.content,
    author: authorData,
    communityId: discussion.community_id,
    category: discussion.category,
    isPinned: Boolean(discussion.is_pinned),
    likeCount: discussion.like_count,
    commentCount: commentCount?.count || 0,
    viewCount: discussion.view_count,
    createdAt: discussion.created_at,
    comments: [], // Will be populated when needed
    mediaFiles: discussion.media_files ? JSON.parse(discussion.media_files) : [],
    isLiked
  };
}

// Get discussions by community
discussionsRoutes.get('/', async (c) => {
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
    const currentUser = await getCurrentUser(c);
    
    const discussions = await KOMUNITASKU_DB.prepare('SELECT * FROM discussions WHERE community_id = ? ORDER BY created_at DESC')
      .bind(communityId)
      .all();
    
    const enrichedDiscussions = await Promise.all(
      discussions.results.map(async (discussion: any) => 
        enrichDiscussion(c, discussion, currentUser?.id)
      )
    );
    
    return c.json({
      data: enrichedDiscussions.filter(Boolean),
      message: 'Discussions retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: [],
      message: error instanceof Error ? error.message : 'Failed to get discussions',
      success: false
    }, 500);
  }
});

// Get discussion by ID
discussionsRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    const discussion = await KOMUNITASKU_DB.prepare('SELECT * FROM discussions WHERE id = ?')
      .bind(id)
      .first();
    
    if (!discussion) {
      return c.json({
        data: null,
        message: 'Discussion not found',
        success: false
      }, 404);
    }
    
    const enrichedDiscussion = await enrichDiscussion(c, discussion, currentUser?.id);
    
    if (!enrichedDiscussion) {
      return c.json({
        data: null,
        message: 'Discussion author not found',
        success: false
      }, 404);
    }
    
    return c.json({
      data: enrichedDiscussion,
      message: 'Discussion retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to get discussion',
      success: false
    }, 500);
  }
});

// Create discussion
discussionsRoutes.post('/', async (c) => {
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
    
    const discussionId = generateId();
    const now = new Date().toISOString();
    
    await KOMUNITASKU_DB.prepare(`
      INSERT INTO discussions (
        id, title, content, author_id, community_id, category, 
        is_pinned, like_count, comment_count, view_count, created_at, media_files
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      discussionId,
      data.title,
      data.content,
      currentUser.id,
      data.communityId,
      data.category,
      false,
      0,
      0,
      0,
      now,
      JSON.stringify(data.mediaFiles || [])
    ).run();
    
    // Get the created discussion
    const discussion = await KOMUNITASKU_DB.prepare('SELECT * FROM discussions WHERE id = ?')
      .bind(discussionId)
      .first();
    
    const enrichedDiscussion = await enrichDiscussion(c, discussion, currentUser.id);
    
    return c.json({
      data: enrichedDiscussion,
      message: 'Discussion created',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to create discussion',
      success: false
    }, 500);
  }
});

// Update discussion
discussionsRoutes.put('/:id', async (c) => {
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
    
    const existing = await KOMUNITASKU_DB.prepare('SELECT * FROM discussions WHERE id = ?')
      .bind(id)
      .first();
    
    if (!existing) {
      return c.json({
        data: null,
        message: 'Discussion not found',
        success: false
      }, 404);
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (data.title) { updates.push('title = ?'); values.push(data.title); }
    if (data.content) { updates.push('content = ?'); values.push(data.content); }
    if (data.category) { updates.push('category = ?'); values.push(data.category); }
    if (data.mediaFiles) { updates.push('media_files = ?'); values.push(JSON.stringify(data.mediaFiles)); }
    
    values.push(id);
    
    if (updates.length > 0) {
      await KOMUNITASKU_DB.prepare(`UPDATE discussions SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    }
    
    // Get updated discussion
    const updated = await KOMUNITASKU_DB.prepare('SELECT * FROM discussions WHERE id = ?')
      .bind(id)
      .first();
    
    const enrichedDiscussion = await enrichDiscussion(c, updated, currentUser.id);
    
    return c.json({
      data: enrichedDiscussion,
      message: 'Discussion updated',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to update discussion',
      success: false
    }, 500);
  }
});

// Delete discussion
discussionsRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    await KOMUNITASKU_DB.prepare('DELETE FROM discussions WHERE id = ?')
      .bind(id)
      .run();
    
    return c.json({
      data: true,
      message: 'Discussion deleted',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to delete discussion',
      success: false
    }, 500);
  }
});

// Like/Unlike discussion
discussionsRoutes.post('/:id/like', async (c) => {
  try {
    const discussionId = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: false,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const existing = await KOMUNITASKU_DB.prepare('SELECT * FROM likes WHERE user_id = ? AND target_id = ? AND target_type = ?')
      .bind(currentUser.id, discussionId, 'discussion')
      .first();
    
    if (existing) {
      // Unlike
      await KOMUNITASKU_DB.prepare('DELETE FROM likes WHERE user_id = ? AND target_id = ? AND target_type = ?')
        .bind(currentUser.id, discussionId, 'discussion')
        .run();
      
      // Update like count
      await KOMUNITASKU_DB.prepare('UPDATE discussions SET like_count = like_count - 1 WHERE id = ?')
        .bind(discussionId)
        .run();
      
      return c.json({
        data: false,
        message: 'Discussion unliked',
        success: true
      });
    } else {
      // Like
      await KOMUNITASKU_DB.prepare('INSERT INTO likes (user_id, target_id, target_type, created_at) VALUES (?, ?, ?, ?)')
        .bind(currentUser.id, discussionId, 'discussion', new Date().toISOString())
        .run();
      
      // Update like count
      await KOMUNITASKU_DB.prepare('UPDATE discussions SET like_count = like_count + 1 WHERE id = ?')
        .bind(discussionId)
        .run();
      
      return c.json({
        data: true,
        message: 'Discussion liked',
        success: true
      });
    }
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to like discussion',
      success: false
    }, 500);
  }
});

// Check like status
discussionsRoutes.get('/:id/like-status', async (c) => {
  try {
    const discussionId = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: false,
        message: 'Not authenticated',
        success: true
      });
    }
    
    const like = await KOMUNITASKU_DB.prepare('SELECT * FROM likes WHERE user_id = ? AND target_id = ? AND target_type = ?')
      .bind(currentUser.id, discussionId, 'discussion')
      .first();
    
    return c.json({
      data: !!like,
      message: 'Like status retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to get like status',
      success: false
    }, 500);
  }
});

// Increment view count
discussionsRoutes.post('/:id/view', async (c) => {
  try {
    const discussionId = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    await KOMUNITASKU_DB.prepare('UPDATE discussions SET view_count = view_count + 1 WHERE id = ?')
      .bind(discussionId)
      .run();
    
    const discussion = await KOMUNITASKU_DB.prepare('SELECT view_count FROM discussions WHERE id = ?')
      .bind(discussionId)
      .first();
    
    return c.json({
      data: discussion?.view_count || 0,
      message: 'Discussion view incremented',
      success: true
    });
  } catch (error) {
    return c.json({
      data: 0,
      message: error instanceof Error ? error.message : 'Failed to increment view',
      success: false
    }, 500);
  }
});
