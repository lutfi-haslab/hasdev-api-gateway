-- schema.sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT NOT NULL,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  logo TEXT NOT NULL,
  category TEXT NOT NULL,
  member_count INTEGER DEFAULT 1,
  admin_count INTEGER DEFAULT 1,
  online_count INTEGER DEFAULT 1,
  price REAL DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  is_private BOOLEAN DEFAULT false,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  tags TEXT, -- JSON array
  social_links TEXT, -- JSON object
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE discussions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  community_id TEXT NOT NULL,
  category TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  media_files TEXT, -- JSON array
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (community_id) REFERENCES communities(id)
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  discussion_id TEXT NOT NULL,
  parent_id TEXT,
  like_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (discussion_id) REFERENCES discussions(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);

CREATE TABLE classroom_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  community_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  type TEXT NOT NULL,
  media_files TEXT, -- JSON array
  order_index INTEGER DEFAULT 0,
  link_url TEXT,
  link_description TEXT,
  link_source_type TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  community_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  tags TEXT, -- JSON array
  published BOOLEAN DEFAULT false,
  published_at TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (community_id) REFERENCES communities(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE blog_comments (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  blog_post_id TEXT NOT NULL,
  parent_id TEXT,
  like_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id),
  FOREIGN KEY (parent_id) REFERENCES blog_comments(id)
);

CREATE TABLE user_communities (
  user_id TEXT NOT NULL,
  community_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (user_id, community_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (community_id) REFERENCES communities(id)
);

CREATE TABLE likes (
  user_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, target_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE auth_sessions (
  user_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_discussions_community ON discussions(community_id);
CREATE INDEX idx_comments_discussion ON comments(discussion_id);
CREATE INDEX idx_classroom_community ON classroom_items(community_id);
CREATE INDEX idx_blog_posts_community ON blog_posts(community_id);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_comments_post ON blog_comments(blog_post_id);
CREATE INDEX idx_user_communities_user ON user_communities(user_id);
CREATE INDEX idx_user_communities_community ON user_communities(community_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_target ON likes(target_id);
