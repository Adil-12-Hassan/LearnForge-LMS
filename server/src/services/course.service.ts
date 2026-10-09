import { prisma } from '../config/database.js';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis.js';
import { slugify, uniqueSlug } from '../utils/slugify.js';
import crypto from 'crypto';

export const courseService = {

    //   List public courses (with search + filter + pagination)      ─
    async list(params: {
        page: number; limit: number; skip: number;
        search?: string; category?: string;
        level?: string; minPrice?: number; maxPrice?: number;
        sort?: string; language?: string;
    }) {
        const { page, limit, skip, search, category, level, sort, language } = params;

        // Cache key based on query
        const queryHash = crypto
            .createHash('md5')
            .update(JSON.stringify(params))
            .digest('hex');
        const cacheKey = REDIS_KEYS.courseList(queryHash);
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const where: any = { status: 'PUBLISHED' };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { shortDesc: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (category) where.category = { slug: category };
        if (level) where.level = level.toUpperCase();
        if (language) where.language = language;

        const orderBy: any =
            sort === 'newest' ? { createdAt: 'desc' } :
                sort === 'price-asc' ? { price: 'asc' } :
                    sort === 'price-desc' ? { price: 'desc' } :
                        { createdAt: 'desc' };

        const [courses, total] = await prisma.$transaction([
            prisma.course.findMany({
                where, skip, take: limit, orderBy,
                select: {
                    id: true, slug: true, title: true, shortDesc: true,
                    thumbnailUrl: true, price: true, level: true, language: true,
                    totalDuration: true, totalLectures: true, createdAt: true,
                    instructor: { select: { firstName: true, lastName: true, avatarUrl: true, username: true } },
                    category: { select: { name: true, slug: true } },
                    _count: { select: { enrollments: true, reviews: true } },
                },
            }),
            prisma.course.count({ where }),
        ]);

        const result = { courses, total };
        await redis.setex(cacheKey, REDIS_TTL.courseList, JSON.stringify(result));
        return result;
    },

    //   Get single course by slug                     ─
    async getBySlug(slug: string) {
        const cached = await redis.get(REDIS_KEYS.courseDetail(slug));
        if (cached) return JSON.parse(cached);

        const course = await prisma.course.findUnique({
            where: { slug, status: 'PUBLISHED' },
            include: {
                instructor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, username: true, bio: true, headline: true } },
                category: { select: { name: true, slug: true } },
                tags: { include: { tag: true } },
                sections: {
                    orderBy: { position: 'asc' },
                    include: {
                        lectures: {
                            orderBy: { position: 'asc' },
                            select: { id: true, title: true, type: true, duration: true, isFree: true, position: true },
                        },
                    },
                },
                reviews: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: { student: { select: { firstName: true, avatarUrl: true } } },
                },
                _count: { select: { enrollments: true, reviews: true } },
            },
        });

        if (!course) return null;
        await redis.setex(REDIS_KEYS.courseDetail(slug), REDIS_TTL.courseDetail, JSON.stringify(course));
        return course;
    },

    //   Create course (Teacher)                      ─
    async create(instructorId: string, data: {
        title: string; description: string; shortDesc: string;
        categoryId: string; level: string; language: string; price: number;
        thumbnailUrl?: string; previewVideoUrl?: string;
    }) {
        let slug = slugify(data.title);
        const existing = await prisma.course.findUnique({ where: { slug } });
        if (existing) slug = uniqueSlug(data.title, Date.now().toString().slice(-4));

        return prisma.course.create({
            data: {
                ...data,
                slug,
                instructorId,
                price: data.price,
                level: data.level as any,
            },
        });
    },

    //   Update course    
    async update(id: string, instructorId: string, data: any) {
        const course = await prisma.course.findFirst({ where: { id, instructorId } });
        if (!course) throw Object.assign(new Error('Course not found'), { statusCode: 404 });

        const updated = await prisma.course.update({ where: { id }, data });

        // Invalidate cache
        await redis.del(REDIS_KEYS.courseDetail(course.slug));
        return updated;
    },

    //   Publish / unpublish                        ─
    async setStatus(id: string, instructorId: string, status: string) {
        const course = await prisma.course.findFirst({ where: { id, instructorId } });
        if (!course) throw Object.assign(new Error('Course not found'), { statusCode: 404 });

        const updated = await prisma.course.update({ where: { id }, data: { status: status as any } });
        await redis.del(REDIS_KEYS.courseDetail(course.slug));
        return updated;
    },

    //   Delete course    
    async delete(id: string, instructorId: string) {
        const course = await prisma.course.findFirst({
            where: { id, instructorId, status: 'DRAFT' },
        });
        if (!course) throw Object.assign(
            new Error('Only draft courses can be deleted'), { statusCode: 400 }
        );
        await prisma.course.delete({ where: { id } });
        await redis.del(REDIS_KEYS.courseDetail(course.slug));
    },

    //   Teacher: list own courses                     ─
    async listByInstructor(instructorId: string) {
        return prisma.course.findMany({
            where: { instructorId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, slug: true, title: true, status: true,
                price: true, thumbnailUrl: true, createdAt: true,
                totalLectures: true, totalDuration: true,
                _count: { select: { enrollments: true } },
            },
        });
    },
};