const configuredOrigins = process.env.CLIENT_URL || 'http://localhost:5173';

export const allowedOrigins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
