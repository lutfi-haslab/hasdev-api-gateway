import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { CreateBlogPostRequest, UpdateBlogPostRequest, ApiResponse } from './types/api';
import { Environment } from '../../../bindings';


export const blogPostsRoutes = new Hono<Environment>();

const generateId = () => Math.random().toString(36).substr(2, 9);
const createSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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

// Helper function to enrich blog post with author and comments
async function enrichBlogPost(c: any, post: any, currentUserId?: string) {
  const { KOMUNITASKU_DB } = c.env;
  
  // Get author
  const author = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(post.author_id)
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
  
  // Get comments
  const comments = await KOMUNITASKU_DB.prepare('SELECT * FROM blog_comments WHERE blog_post_id = ? ORDER BY created_at ASC')
    .bind(post.id)
    .all();
  
  const enrichedComments = await Promise.all(
    comments.results.map(async (comment: any) => {
      const commentAuthor = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
        .bind(comment.author_id)
        .first();
      
      if (!commentAuthor) return null;
      
      const commentAuthorData = {
        id: commentAuthor.id,
        name: commentAuthor.name,
        email: commentAuthor.email,
        avatar: commentAuthor.avatar,
        bio: commentAuthor.bio || '',
        joinedCommunities: [],
        role: commentAuthor.role,
        createdAt: commentAuthor.created_at,
        updatedAt: commentAuthor.updated_at
      };
      
      // Check comment like status
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
        author: commentAuthorData,
        discussionId: comment.blog_post_id,
        createdAt: comment.created_at,
        likeCount: comment.like_count,
        replies: [],
        isLiked,
        parentId: comment.parent_id
      };
    })
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
  
  // Check like status
  let isLiked = false;
  if (currentUserId) {
    const like = await KOMUNITASKU_DB.prepare('SELECT * FROM likes WHERE user_id = ? AND target_id = ? AND target_type = ?')
      .bind(currentUserId, post.id, 'blogPost')
      .first();
    isLiked = !!like;
  }
  
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt,
    coverImage: post.cover_image,
    communityId: post.community_id,
    author: authorData,
    tags: post.tags ? JSON.parse(post.tags) : [],
    published: Boolean(post.published),
    publishedAt: post.published_at,
    likeCount: post.like_count,
    commentCount: post.comment_count,
    viewCount: post.view_count,
    comments: rootComments,
    isLiked,
    createdAt: post.created_at,
    updatedAt: post.updated_at
  };
}

// Get blog posts by community
blogPostsRoutes.get('/', async (c) => {
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
    
    const posts = await KOMUNITASKU_DB.prepare('SELECT * FROM blog_posts WHERE community_id = ? AND published = ? ORDER BY published_at DESC, created_at DESC')
      .bind(communityId, '1')
      .all();
    
    const enrichedPosts = await Promise.all(
      posts.results.map(async (post: any) => 
        enrichBlogPost(c, post, currentUser?.id)
      )
    );
    
    return c.json({
      data: enrichedPosts.filter(Boolean),
      message: 'Blog posts retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: [],
      message: error instanceof Error ? error.message : 'Failed to get blog posts',
      success: false
    }, 500);
  }
});

// Get blog post by slug
blogPostsRoutes.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const communityId = c.req.query('communityId');
    const communitySlug = c.req.query('communitySlug');
    
    if (!communityId || !communitySlug) {
      return c.json({
        data: null,
        message: 'Community ID or Community Slug are required',
        success: false
      }, 400);
    }
    
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    const post = await KOMUNITASKU_DB.prepare('SELECT * FROM blog_posts WHERE slug = ? AND community_id = ?')
      .bind(slug, communityId)
      .first();
    
    if (!post) {
      return c.json({
        data: null,
        message: 'Blog post not found',
        success: false
      }, 404);
    }
    
    const enrichedPost = await enrichBlogPost(c, post, currentUser?.id);
    
    if (!enrichedPost) {
      return c.json({
        data: null,
        message: 'Blog post author not found',
        success: false
      }, 404);
    }
    
    return c.json({
      data: enrichedPost,
      message: 'Blog post retrieved',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to get blog post',
      success: false
    }, 500);
  }
});

// Create blog post
blogPostsRoutes.post('/', async (c) => {
  try {
    const data: CreateBlogPostRequest = await c.req.json();
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: null,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const postId = generateId();
    const slug = createSlug(data.title);
    const now = new Date().toISOString();
    
    await KOMUNITASKU_DB.prepare(`
      INSERT INTO blog_posts (
        id, title, slug, content, excerpt, cover_image, community_id, 
        author_id, tags, published, published_at, like_count, comment_count, 
        view_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      data.title,
      slug,
      data.content,
      data.excerpt || '',
      data.coverImage || null,
      data.communityId,
      currentUser.id,
      JSON.stringify(data.tags || []),
      data.published ? '1' : '0',
      data.published ? now : null,
      0,
      0,
      0,
      now,
      now
    ).run();
    
    // Get the created post
    const post = await KOMUNITASKU_DB.prepare('SELECT * FROM blog_posts WHERE id = ?')
      .bind(postId)
      .first();
    
    const enrichedPost = await enrichBlogPost(c, post, currentUser.id);
    
    return c.json({
      data: enrichedPost,
      message: 'Blog post created',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to create blog post',
      success: false
    }, 500);
  }
});

// Update blog post
blogPostsRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data: UpdateBlogPostRequest = await c.req.json();
    const { KOMUNITASKU_DB } = c.env;
    const currentUser = await getCurrentUser(c);
    
    if (!currentUser) {
      return c.json({
        data: null,
        message: 'Authentication required',
        success: false
      }, 401);
    }
    
    const existing = await KOMUNITASKU_DB.prepare('SELECT * FROM blog_posts WHERE id = ?')
      .bind(id)
      .first();
    
    if (!existing) {
      return c.json({
        data: null,
        message: 'Blog post not found',
        success: false
      }, 404);
    }
    
    // Build update query dynamically
    const updates = ['updated_at = ?'];
    const values = [new Date().toISOString()];
    
    if (data.title) { 
      updates.push('title = ?', 'slug = ?'); 
      values.push(data.title, createSlug(data.title)); 
    }
    if (data.content) { updates.push('content = ?'); values.push(data.content); }
    if (data.excerpt !== undefined) { updates.push('excerpt = ?'); values.push(data.excerpt); }
    if (data.coverImage !== undefined) { updates.push('cover_image = ?'); values.push(data.coverImage); }
    if (data.tags) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.published !== undefined) { 
      updates.push('published = ?'); 
      values.push(data.published ? '1' : '0');
      if (data.published && !existing.published) {
        updates.push('published_at = ?');
        values.push(new Date().toISOString());
      }
    }
    
    values.push(id);
    
    await KOMUNITASKU_DB.prepare(`UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
    
    // Get updated post
    const updated = await KOMUNITASKU_DB.prepare('SELECT * FROM blog_posts WHERE id = ?')
      .bind(id)
      .first();
    
    const enrichedPost = await enrichBlogPost(c, updated, currentUser.id);
    
    return c.json({
      data: enrichedPost,
      message: 'Blog post updated',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to update blog post',
      success: false
    }, 500);
  }
});

// Delete blog post
blogPostsRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    await KOMUNITASKU_DB.prepare('DELETE FROM blog_posts WHERE id = ?')
      .bind(id)
      .run();
    
    return c.json({
      data: true,
      message: 'Blog post deleted',
      success: true
    });
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to delete blog post',
      success: false
    }, 500);
  }
});

// Like/Unlike blog post
blogPostsRoutes.post('/:id/like', async (c) => {
  try {
    const postId = c.req.param('id');
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
      .bind(currentUser.id, postId, 'blogPost')
      .first();
    
    if (existing) {
      // Unlike
      await KOMUNITASKU_DB.prepare('DELETE FROM likes WHERE user_id = ? AND target_id = ? AND target_type = ?')
        .bind(currentUser.id, postId, 'blogPost')
        .run();
      
      // Update like count
      await KOMUNITASKU_DB.prepare('UPDATE blog_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = ?')
        .bind(postId)
        .run();
      
      return c.json({
        data: false,
        message: 'Blog post unliked',
        success: true
      });
    } else {
      // Like
      await KOMUNITASKU_DB.prepare('INSERT INTO likes (user_id, target_id, target_type, created_at) VALUES (?, ?, ?, ?)')
        .bind(currentUser.id, postId, 'blogPost', new Date().toISOString())
        .run();
      
      // Update like count
      await KOMUNITASKU_DB.prepare('UPDATE blog_posts SET like_count = like_count + 1 WHERE id = ?')
        .bind(postId)
        .run();
      
      return c.json({
        data: true,
        message: 'Blog post liked',
        success: true
      });
    }
  } catch (error) {
    return c.json({
      data: false,
      message: error instanceof Error ? error.message : 'Failed to like blog post',
      success: false
    }, 500);
  }
});

// Check like status
blogPostsRoutes.get('/:id/like-status', async (c) => {
  try {
    const postId = c.req.param('id');
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
      .bind(currentUser.id, postId, 'blogPost')
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
blogPostsRoutes.post('/:id/view', async (c) => {
  try {
    const postId = c.req.param('id');
    const { KOMUNITASKU_DB } = c.env;
    
    await KOMUNITASKU_DB.prepare('UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?')
      .bind(postId)
      .run();
    
    const post = await KOMUNITASKU_DB.prepare('SELECT view_count FROM blog_posts WHERE id = ?')
      .bind(postId)
      .first();
    
    return c.json({
      data: post?.view_count || 0,
      message: 'Blog post view incremented',
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

// Add comment to blog post
blogPostsRoutes.post('/:id/comments', async (c) => {
  try {
    const postId = c.req.param('id');
    const { content, parentId } = await c.req.json();
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
      INSERT INTO blog_comments (
        id, content, author_id, blog_post_id, parent_id, like_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      commentId,
      content,
      currentUser.id,
      postId,
      parentId || null,
      0,
      now
    ).run();
    
    // Update blog post comment count
    await KOMUNITASKU_DB.prepare('UPDATE blog_posts SET comment_count = comment_count + 1 WHERE id = ?')
      .bind(postId)
      .run();
    
    // Get the created comment with author
    const comment = await KOMUNITASKU_DB.prepare('SELECT * FROM blog_comments WHERE id = ?')
      .bind(commentId)
      .first();
    
    const author = await KOMUNITASKU_DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(currentUser.id)
      .first();
    
    if (!comment || !author) {
      return c.json({
        data: null,
        message: 'Failed to retrieve comment or author data',
        success: false
      }, 500);
    }
    
    const authorData = {
      id: author.id as string,
      name: author.name as string,
      email: author.email as string,
      avatar: author.avatar as string,
      bio: (author.bio as string) || '',
      joinedCommunities: [],
      role: author.role as 'admin' | 'member',
      createdAt: author.created_at as string,
      updatedAt: author.updated_at as string
    };
    
    const enrichedComment = {
      id: comment.id as string,
      content: comment.content as string,
      author: authorData,
      discussionId: comment.blog_post_id as string,
      createdAt: comment.created_at as string,
      likeCount: comment.like_count as number,
      replies: [],
      isLiked: false,
      parentId: comment.parent_id as string | null
    };
    
    return c.json({
      data: enrichedComment,
      message: 'Comment added',
      success: true
    });
  } catch (error) {
    return c.json({
      data: null,
      message: error instanceof Error ? error.message : 'Failed to add comment',
      success: false
    }, 500);
  }
});

// Like/Unlike blog post comment
blogPostsRoutes.post('/:postId/comments/:commentId/like', async (c) => {
  try {
    const postId = c.req.param('postId');
    const commentId = c.req.param('commentId');
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
      await KOMUNITASKU_DB.prepare('UPDATE blog_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = ?')
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
      await KOMUNITASKU_DB.prepare('UPDATE blog_comments SET like_count = like_count + 1 WHERE id = ?')
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
