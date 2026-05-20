export type User = {
    id: string;
    email: string;
    password: string;
    isAdmin: number;
    emailVerified: number;
    profileName: string;
    profilePicture: string;
    provider: string;
    providerId: string;
    avatarUrl: string;
    createdAt: string;
}