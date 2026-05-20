export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    bio?: string;
    joinedCommunities: string[];
    role: 'admin' | 'member';
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Community {
    id: string;
    name: string;
    description: string;
    shortDescription: string;
    coverImage: string;
    logo: string;
    category: string;
    memberCount: number;
    adminCount: number;
    onlineCount: number;
    price: number;
    isFree: boolean;
    isPrivate: boolean;
    createdBy: User;
    createdAt: string;
    tags: string[];
    socialLinks: {
      instagram?: string;
      youtube?: string;
      website?: string;
    };
    members: User[];
    isJoined?: boolean;
  }
  
  export interface Discussion {
    id: string;
    title: string;
    content: string;
    author: User;
    communityId: string;
    category: 'general' | 'introductions' | 'questions' | 'wins';
    isPinned: boolean;
    likeCount: number;
    commentCount: number;
    viewCount: number;
    createdAt: string;
    comments: Comment[];
    mediaFiles?: MediaFile[];
    isLiked?: boolean;
  }
  
  export interface Comment {
    id: string;
    content: string;
    author: User;
    discussionId: string;
    createdAt: string;
    likeCount: number;
    replies: Comment[];
    isLiked?: boolean;
    parentId?: string;
  }
  
  export interface LeaderboardEntry {
    user: User;
    points: number;
    rank: number;
    change: number;
  }
  
  export interface ClassroomItem {
    id: string;
    title: string;
    content: string;
    communityId: string;
    author: User;
    type: 'text' | 'link';
    mediaFiles?: MediaFile[];
    order: number;
    createdAt: string;
    updatedAt: string;
    // Link-specific fields (used when type === 'link')
    linkUrl?: string;
    linkDescription?: string;
    linkSourceType?: 'youtube' | 'canva' | 'pdf' | 'xls' | 'ppt' | 'other';
  }
  
  export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string; // MDX content
    excerpt?: string;
    coverImage?: string;
    communityId: string;
    author: User;
    tags: string[];
    published: boolean;
    publishedAt?: string;
    likeCount: number;
    commentCount: number;
    viewCount: number;
    comments: Comment[];
    isLiked?: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface MediaFile {
    id: string;
    name: string;
    type: 'image' | 'video' | 'pdf' | 'document';
    url: string;
    size: number;
    uploadedAt: string;
  }