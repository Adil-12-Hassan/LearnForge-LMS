import { prisma } from '../config/database.js';

// | Error helper   

function createError(message: string, statusCode: number) {
    return Object.assign(new Error(message), { statusCode, isOperational: true });
}

// | Service  

export const messageService = {

    // Send a message to another user
    async sendMessage(senderId: string, receiverId: string, body: string) {
        if (senderId === receiverId) throw createError('You cannot message yourself', 400);

        const receiver = await prisma.user.findUnique({
            where: { id: receiverId },
            select: { id: true, isActive: true },
        });
        if (!receiver) throw createError('Recipient not found', 404);
        if (!receiver.isActive) throw createError('Recipient account is inactive', 400);

        return prisma.message.create({
            data: { senderId, receiverId, body },
            include: {
                sender: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
    },

    // Get conversation between the current user and another user (paginated)
    async getConversation(userId: string, otherUserId: string, page = 1, limit = 30) {
        const other = await prisma.user.findUnique({
            where: { id: otherUserId },
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        });
        if (!other) throw createError('User not found', 404);

        const skip = (page - 1) * limit;
        const where = {
            OR: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId },
            ],
        };

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    sender: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                    },
                },
            }),
            prisma.message.count({ where }),
        ]);

        // Mark unread messages from the other user as read
        await prisma.message.updateMany({
            where: { senderId: otherUserId, receiverId: userId, isRead: false },
            data: { isRead: true },
        });

        return {
            otherUser: other,
            messages: messages.reverse(), // oldest first for chat display
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    },

    // Get list of all conversations (most recent message per contact)
    async getConversationList(userId: string) {
        // Get all messages involving this user
        const messages = await prisma.message.findMany({
            where: {
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
        });

        // Deduplicate: one entry per contact, with latest message + unread count
        const seen = new Set<string>();
        const threads: Array<{
            contact: object;
            lastMessage: object;
            unreadCount: number;
        }> = [];

        for (const msg of messages) {
            const contactId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            if (seen.has(contactId)) continue;
            seen.add(contactId);

            const contact = msg.senderId === userId ? msg.receiver : msg.sender;

            const unreadCount = await prisma.message.count({
                where: { senderId: contactId, receiverId: userId, isRead: false },
            });

            threads.push({
                contact,
                lastMessage: {
                    id: msg.id,
                    body: msg.body,
                    createdAt: msg.createdAt,
                    isRead: msg.isRead,
                    fromMe: msg.senderId === userId,
                },
                unreadCount,
            });
        }

        return threads;
    },

    // Total unread count for the current user
    async getUnreadCount(userId: string) {
        return prisma.message.count({
            where: { receiverId: userId, isRead: false },
        });
    },
};