import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import * as messageController from '../controllers/message.controller.js';

const router: ReturnType<typeof Router> = Router();

// | Validation   |

const sendMessageSchema = z.object({
    body: z.object({
        receiverId: z.string().min(1, 'receiverId is required'),
        body: z.string().min(1, 'Message body is required').max(2000),
    }),
});

// | Routes (all require auth) ||||||||||||||||||||||||─

// Get unread count (check BEFORE /conversations so it's not shadowed)
router.get(
    '/unread-count',
    auth,
    messageController.getUnreadCount,
);

// Get all conversations list
router.get(
    '/conversations',
    auth,
    messageController.getConversationList,
);

// Get conversation with a specific user
router.get(
    '/conversations/:userId',
    auth,
    messageController.getConversation,
);

// Send a message
router.post(
    '/',
    auth,
    validate(sendMessageSchema),
    messageController.sendMessage,
);

export default router;