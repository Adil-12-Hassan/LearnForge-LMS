import type { Request } from 'express';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface AuthUser {
    id: string;
    role: UserRole;
    email: string;
}
export interface AuthRequest extends Request {
    user?: AuthUser;
}
