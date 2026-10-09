import { prisma } from '../config/database.js';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis.js';
import { slugify } from '../utils/slugify.js';

export const categoryService = {

    async getTree() {
        // Try Redis cache first
        const cached = await redis.get(REDIS_KEYS.categoryTree());
        if (cached) return JSON.parse(cached);

        const categories = await prisma.category.findMany({
            where: { parentId: null },
            include: { children: true },
            orderBy: { name: 'asc' },
        });

        await redis.setex(REDIS_KEYS.categoryTree(), REDIS_TTL.categoryTree, JSON.stringify(categories));
        return categories;
    },

    async create(name: string, description?: string, parentId?: string) {
        const slug = slugify(name);
        const category = await prisma.category.create({
            data: { name, slug, description, parentId },
        });
        await redis.del(REDIS_KEYS.categoryTree());
        return category;
    },

    async update(id: string, data: { name?: string; description?: string }) {
        const updated = await prisma.category.update({
            where: { id },
            data: {
                ...data,
                ...(data.name && { slug: slugify(data.name) }),
            },
        });
        await redis.del(REDIS_KEYS.categoryTree());
        return updated;
    },

    async delete(id: string) {
        await prisma.category.delete({ where: { id } });
        await redis.del(REDIS_KEYS.categoryTree());
    },
};