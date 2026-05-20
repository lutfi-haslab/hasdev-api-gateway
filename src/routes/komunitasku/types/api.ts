import { User } from '.';
import type { MediaFile } from '.';

// API Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateCommunityRequest {
  name: string;
  description: string;
  shortDescription: string;
  coverImage: string;
  logo: string;
  category: string;
  tags: string[];
  isPrivate: boolean;
  socialLinks: {
    instagram?: string;
    youtube?: string;
    website?: string;
  };
}

export interface UpdateCommunityRequest extends Partial<CreateCommunityRequest> {
  id: string;
}

export interface CreateDiscussionRequest {
  title: string;
  content: string;
  communityId: string;
  category: 'general' | 'introductions' | 'questions' | 'wins';
  mediaFiles?: MediaFile[];
}

export interface UpdateDiscussionRequest extends Partial<CreateDiscussionRequest> {
  id: string;
}

export interface CreateCommentRequest {
  content: string;
  discussionId: string;
  parentId?: string; // For replies
}

export interface UpdateCommentRequest extends Partial<CreateCommentRequest> {
  id: string;
}

export interface CreateClassroomRequest {
  title: string;
  content: string;
  communityId: string;
  type: 'text' | 'link';
  mediaFiles?: MediaFile[];
  order?: number;
  // Link-specific
  linkUrl?: string;
  linkDescription?: string;
  linkSourceType?: 'youtube' | 'canva' | 'pdf' | 'xls' | 'ppt' | 'other';
}

export interface UpdateClassroomRequest extends Partial<CreateClassroomRequest> {
  id: string;
}

export interface CreateBlogPostRequest {
  title: string;
  content: string; // MDX content
  communityId: string;
  excerpt?: string;
  coverImage?: string;
  tags?: string[];
  published: boolean;
}

export interface UpdateBlogPostRequest extends Partial<CreateBlogPostRequest> {
  id: string;
}

// Use the core MediaFile type to avoid mismatches
export type { MediaFile } from '.';

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Re-export existing types
export * from '.';