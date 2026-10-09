import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwtHelpers.js';
import { emailService } from './email.service.js';

export const authService = {

    //  Register 
    async register(data: {
        email: string;
        username: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: 'STUDENT' | 'TEACHER';
    }) {
        // Check duplicates
        const existing = await prisma.user.findFirst({
            where: { OR: [{ email: data.email }, { username: data.username }] },
        });
        if (existing) {
            const field = existing.email === data.email ? 'Email' : 'Username';
            throw Object.assign(new Error(`${field} already in use`), { statusCode: 409 });
        }

        const passwordHash = await bcrypt.hash(data.password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                username: data.username,
                passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
            },
            select: { id: true, email: true, firstName: true, role: true },
        });

        // Create email verification token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await prisma.passwordReset.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            },
        });

        // Send verification email (non-blocking)
        emailService.sendVerification(user.email, user.firstName, rawToken).catch(console.error);

        return user;
    },

    //   Login   ─
    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true, email: true, username: true, firstName: true,
                lastName: true, role: true, avatarUrl: true,
                passwordHash: true, isVerified: true, isActive: true,
            },
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
        }

        if (!user.isActive) {
            throw Object.assign(new Error('Account has been deactivated'), { statusCode: 403 });
        }

        const { passwordHash, ...safeUser } = user;

        // Issue tokens
        const accessToken = signAccessToken({ sub: user.id, role: user.role });
        const refreshToken = await this._createRefreshToken(user.id);

        return { accessToken, refreshToken, user: safeUser };
    },

    //   Refresh  ─
    async refresh(token: string) {
        let payload: { sub: string };
        try {
            payload = verifyRefreshToken(token) as { sub: string };
        } catch {
            throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
        if (!stored || stored.userId !== payload.sub || stored.expiresAt <= new Date()) {
            throw Object.assign(new Error('Refresh token expired or revoked'), { statusCode: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, role: true, isActive: true },
        });

        if (!user || !user.isActive) {
            throw Object.assign(new Error('User not found'), { statusCode: 401 });
        }

        // Atomically consume the old token so concurrent refreshes cannot reuse it.
        const consumed = await prisma.refreshToken.deleteMany({
            where: { tokenHash, userId: user.id, expiresAt: { gt: new Date() } },
        });
        if (consumed.count !== 1) {
            throw Object.assign(new Error('Refresh token expired or revoked'), { statusCode: 401 });
        }

        // Rotate: issue a new one-use refresh token.
        const newRefreshToken = await this._createRefreshToken(user.id);
        const accessToken = signAccessToken({ sub: user.id, role: user.role });

        return { accessToken, refreshToken: newRefreshToken };
    },

    //   Logout   
    async logout(token: string) {
        await this._deleteRefreshToken(token);
    },

    //   Verify Email                            
    async verifyEmail(rawToken: string) {
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });

        if (!record || record.used || record.expiresAt < new Date()) {
            throw Object.assign(new Error('Invalid or expired verification link'), { statusCode: 400 });
        }

        await prisma.$transaction([
            prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
            prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } }),
        ]);
    },

    //   Forgot Password                          ─
    async forgotPassword(email: string) {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, firstName: true },
        });

        // Always return success (don't reveal if email exists)
        if (!user) return;

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await prisma.passwordReset.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
            },
        });

        emailService.sendPasswordReset(user.email, user.firstName, rawToken).catch(console.error);
    },

    //   Reset Password                           
    async resetPassword(rawToken: string, newPassword: string) {
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });

        if (!record || record.used || record.expiresAt < new Date()) {
            throw Object.assign(new Error('Invalid or expired reset link'), { statusCode: 400 });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await prisma.$transaction([
            prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
            prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } }),
            prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
        ]);
    },

    //   Private Helpers                          ─
    async _createRefreshToken(userId: string): Promise<string> {
        const token = signRefreshToken({ sub: userId });
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

        return token;
    },

    async _deleteRefreshToken(token: string) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    },
};
