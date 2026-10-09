import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not defined in environment variables');
}

export const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
    },
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err: Error) => console.error('❌ Redis error:', err.message));

// Redis key helpers — keeps keys consistent across the app
export const REDIS_KEYS = {
    rateLimit: (ip: string) => `rl:${ip}`,
    courseList: (queryHash: string) => `courses:list:${queryHash}`,
    courseDetail: (slug: string) => `course:${slug}`,
    categoryTree: () => `categories:tree`,
    userProfile: (username: string) => `user:profile:${username}`,
} as const;

// TTL constants (in seconds)
export const REDIS_TTL = {
    courseList: 60 * 5,        // 5 minutes
    courseDetail: 60 * 10,     // 10 minutes
    categoryTree: 60 * 60,     // 1 hour
    userProfile: 60 * 15,      // 15 minutes
} as const;
