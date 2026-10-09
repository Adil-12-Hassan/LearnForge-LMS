import 'dotenv/config';
import app from './app.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';

const PORT = process.env.PORT || 4000;

const start = async () => {
    try {
        // Test DB connection
        await prisma.$connect();
        console.log('✅ Database connected');

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`🚀 LearnForge server running on http://localhost:${PORT}`);
            console.log(`📦 Environment: ${process.env.NODE_ENV}`);
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('\n🛑 Shutting down...');
            server.close();
            await prisma.$disconnect();
            redis.disconnect();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

start();