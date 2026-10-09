import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import courseRoutes from './routes/course.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import sectionRoutes from './routes/section.routes.js';
import lectureRoutes from './routes/lecture.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import reviewRoutes from './routes/review.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import messageRoutes from './routes/message.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import { allowedOrigins } from './config/origins.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { generalLimiter } from './middleware/rateLimiter.js';

const app: Express = express();

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
        if (!req.secure) {
            return res.status(426).json({
                success: false,
                error: 'HTTPS is required',
            });
        }
        next();
    });
}

// Security headers
app.use(helmet());

// CORS
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Origin is not allowed by CORS'));
        },
        credentials: true,
    })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (_req, res) => {
    res.json({ status: 'LearnForge Backend - API is running' });
});

// Logging (dev only)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use('/api/v1', csrfProtection, generalLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/courses/:courseId/sections', sectionRoutes);
app.use('/api/v1/sections/:sId/lectures', lectureRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/admin', adminRoutes);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — must be last
app.use(errorHandler);

export default app;
