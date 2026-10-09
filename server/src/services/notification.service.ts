import { prisma } from '../config/database.js';

// | Error helper   

function createError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode, isOperational: true });
}

// | Shared helper (call this from other services to create notifications) ||─
// Usage: await notify(userId, 'ENROLLMENT', 'Enrolled!', 'You joined React Course', '/courses/react')

export async function notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    link?: string,
): Promise<void> {
    await prisma.notification.create({
        data: {
            userId,
            type: type as any,
            title,
            body,
            link: link ?? null,
            isRead: false,
        },
    });
}

// | Service  

export const notificationService = {

    // Get my notifications (paginated, newest first)
    async getMyNotifications(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { userId } }),
            prisma.notification.count({ where: { userId, isRead: false } }),
        ]);

        return {
            notifications,
            total,
            unreadCount,
            page,
            totalPages: Math.ceil(total / limit),
        };
    },

    // Mark a single notification as read
    async markAsRead(notificationId: string, userId: string) {
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) throw createError('Notification not found', 404);
        if (notification.userId !== userId) throw createError('Forbidden', 403);

        return prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    },

    // Mark all as read
    async markAllAsRead(userId: string) {
        const result = await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { updated: result.count };
    },

    // Delete a single notification
    async deleteNotification(notificationId: string, userId: string) {
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) throw createError('Notification not found', 404);
        if (notification.userId !== userId) throw createError('Forbidden', 403);
        await prisma.notification.delete({ where: { id: notificationId } });
    },

    // Unread count only (for badge in frontend)
    async getUnreadCount(userId: string) {
        return prisma.notification.count({ where: { userId, isRead: false } });
    },
};