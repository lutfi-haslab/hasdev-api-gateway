import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { CreateCommentRequest, UpdateCommentRequest, ApiResponse } from './types/api';
import { Environment } from '../../../bindings';

export const commentsRoutes = new Hono<Environment>();

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

// Helper function to enrich comment with author and replies
async function enrichComment(c: any, comment: any, currentUserId?: string) {
  const { KOMUNITASKU_DB } = c.env;
  
  // Get author
  const author = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(comment.author_id)
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
  
  // Check like status
  let isLiked = false;
  if (currentUserId) {
    const like = await KOMUNITASKU_DB.prepare('SELECT * FROM likes WHERE user_id = ? AND target_id = ? AND target_type = ?')
      .bind(currentUserId, comment.id, 'comment')
      .first();
    isLiked = !!like;
  }
  
  return {
    id: comment.id,
    content: comment.content,
    author: authorData,
    discussionId: comment.discussion_id,
    createdAt: comment.created_at,
    likeCount: comment.like_count,
    replies: [], // Will be populated when building tree
    isLiked,
    parentId: comment.parent_id
  };
}

// Get comments by discussion
commentsRoutes.get('/', async (c) => {
  try {
    const discussionId = c.req.query('discussionId');
    if (!discussionId) {
      return c.json({
        data: [],
        message: 'Discussion ID is required',
        success: false
      }, 400);
    }
    
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    const comments = await KOMUNITASKU_DB.prepare('SELECT * FROM comments WHERE discussion_id = ? ORDER BY created_at ASC')
      .bind(discussionId)
      .all();
    
    // Enrich all comments
    const enrichedComments = await Promise.all(
      comments.results.map(async (comment: any) => 
        enrichComment(c, comment, currentUser?.id)
      )
    );
    
    const validComments = enrichedComments.filter(Boolean);
    
    // Build comment tree
    const commentMap = new Map();
    const rootComments = [];
    
    // First pass: create comment map
    for (const comment of validComments) {
      commentMap.set(comment!.id, { ...comment, replies: [] });
    }
    
    // Second pass: build tree
    for (const comment of validComments) {
      if (!comment!.parentId) {
        rootComments.push(commentMap.get(comment!.id));
      } else {
        const parent = commentMap.get(comment!.parentId);
        if (parent) {
          parent.replies.push(commentMap.get(comment!.id));
        }
      }
    }
    
    return c.json({
      data: rootComments,
      message: 'Comments retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: [],
      message: error instanceof Error ? error.message : 'Failed to get comments',
      success: false
    }, 500);
  }
});

// Create comment
commentsRoutes.post('/', async (c) => {
  try {
    const data: CreateCommentRequest = await c.req.json();
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: null,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const commentId = generateId();
    const now = new Date().toISOString();
    
    await KOMUNITASKU_DB.prepare(`
      INSERT INTO comments (
        id, content, author_id, discussion_id, parent_id, like_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      commentId,
      data.content,
      currentUser.id,
      data.discussionId,
      data.parentId || null,
      0,
      now
    ).run();
    
    // Update discussion comment count
    await KOMUNITASKU_DB.prepare('UPDATE discussions SET comment_count = comment_count + 1 WHERE id = ?')
      .bind(data.discussionId)
      .run();
    
    // Get the created comment
    const comment = await KOMUNITASKU_DB.prepare('SELECT * FROM comments WHERE id = ?')
      .bind(commentId)
      .first();
    
    const enrichedComment = await enrichComment(c, comment, currentUser.id);
    
    return c.json({
      data: enrichedComment,
      message: 'Comment created',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to create comment',
      success: false
    }, 500);
  }
});

// Update comment
commentsRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data: UpdateCommentRequest = await c.req.json();
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: null,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const existing = await KOMUNITASKU_DB.prepare('SELECT * FROM comments WHERE id = ?')
      .bind(id)
      .first();
    
    if (!existing) {
      return c.json({
        data: null,
        message: 'Comment not found',
        success: false
      }, 404);
    }
    
    if (data.content) {
      await KOMUNITASKU_DB.prepare('UPDATE comments SET content = ? WHERE id = ?')
        .bind(data.content, id)
        .run();
    }
    
    // Get updated comment
    const updated = await KOMUNITASKU_DB.prepare('SELECT * FROM comments WHERE id = ?')
      .bind(id)
      .first();
    
    const enrichedComment = await enrichComment(c, updated, currentUser.id);
    
    return c.json({
      data: enrichedComment,
      message: 'Comment updated',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to update comment',
      success: false
    }, 500);
  }
});

// Delete comment
commentsRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    // Get comment to update discussion count
    const comment = await KOMUNITASKU_DB.prepare('SELECT * FROM comments WHERE id = ?')
      .bind(id)
      .first();
    
    if (comment) {
      // Update discussion comment count
      await KOMUNITASKU_DB.prepare('UPDATE discussions SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ?')
        .bind(comment.discussion_id)
        .run();
    }
    
    await KOMUNITASKU_DB.prepare('DELETE FROM comments WHERE id = ?')
      .bind(id)
      .run();
    
    return c.json({
      data: true,
      message: 'Comment deleted',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to delete comment',
      success: false
    }, 500);
  }
});

// Like/Unlike comment
commentsRoutes.post('/:id/like', async (c) => {
  try {
    const commentId = c.req.param('id');
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
      .bind(currentUser.id, commentId, 'comment')
      .first();
    
    if (existing) {
      // Unlike
      await KOMUNITASKU_DB.prepare('DELETE FROM likes WHERE user_id = ? AND target_id = ? AND target_type = ?')
        .bind(currentUser.id, commentId, 'comment')
        .run();
      
      // Update like count
      await KOMUNITASKU_DB.prepare('UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE id = ?')
        .bind(commentId)
        .run();
      
      return c.json({
        data: false,
        message: 'Comment unliked',
        success: true
      });
    } else {
      // Like
      await KOMUNITASKU_DB.prepare('INSERT INTO likes (user_id, target_id, target_type, created_at) VALUES (?, ?, ?, ?)')
        .bind(currentUser.id, commentId, 'comment', new Date().toISOString())
        .run();
      
      // Update like count
      await KOMUNITASKU_DB.prepare('UPDATE comments SET like_count = like_count + 1 WHERE id = ?')
        .bind(commentId)
        .run();
      
      return c.json({
        data: true,
        message: 'Comment liked',
        success: true
      });
    }
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to like comment',
      success: false
    }, 500);
  }
});

// Check like status
commentsRoutes.get('/:id/like-status', async (c) => {
  try {
    const commentId = c.req.param('id');
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
      .bind(currentUser.id, commentId, 'comment')
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
