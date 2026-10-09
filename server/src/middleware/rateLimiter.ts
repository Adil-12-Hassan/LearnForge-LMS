import { createHash } from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Request } from 'express';
import { redis } from '../config/redis.js';

const createRedisStore = (prefix: string) => new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) =>
        redis.call(command, ...args) as Promise<RedisReply>,
});

const emailKey = (req: Request): string => {
    const email = req.body?.email;
    if (typeof email === 'string' && email.trim()) {
        return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    }
    return ipKeyGenerator(req.ip ?? '');
};

const standardOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => req.method === 'OPTIONS',
};

export const loginLimiter = rateLimit({
    ...standardOptions,
    windowMs: 15 * 60 * 1000,
    limit: 12,
    store: createRedisStore('learnforge:rl:login-ip:'),
    message: { success: false, error: 'Too many login attempts. Try again later.' },
});

export const loginAccountLimiter = rateLimit({
    ...standardOptions,
    windowMs: 15 * 60 * 1000,
    limit: 30,
    keyGenerator: emailKey,
    store: createRedisStore('learnforge:rl:login-account:'),
    message: { success: false, error: 'Too many login attempts for this account. Try again later.' },
});

export const registerLimiter = rateLimit({
    ...standardOptions,
    windowMs: 60 * 60 * 1000,
    limit: 5,
    store: createRedisStore('learnforge:rl:register:'),
    message: { success: false, error: 'Too many registrations from this IP.' },
});

export const passwordResetLimiter = rateLimit({
    ...standardOptions,
    windowMs: 15 * 60 * 1000,
    limit: 5,
    store: createRedisStore('learnforge:rl:password-reset:'),
    message: { success: false, error: 'Too many password reset requests. Try again later.' },
});

export const uploadLimiter = rateLimit({
    ...standardOptions,
    windowMs: 15 * 60 * 1000,
    limit: 20,
    store: createRedisStore('learnforge:rl:upload:'),
    message: { success: false, error: 'Too many uploads. Try again later.' },
});

export const generalLimiter = rateLimit({
    ...standardOptions,
    windowMs: 60 * 1000,
    limit: 200,
    store: createRedisStore('learnforge:rl:api:'),
    message: { success: false, error: 'Too many requests.' },
});
